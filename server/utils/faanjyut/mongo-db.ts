/**
 * mongoose 連接 → DryRunDb 適配器（只讀操作；dry-run 不調用任何寫方法）。
 * 連接參數只讀自 FAANJYUT_MONGODB_URI / FAANJYUT_DB_NAME（ImportDataContract.md §8）。
 * P2 追加 adaptMongooseWriteDb：WriteDb + RollbackDb 的真實實現（寫入/回滾用）。
 */
import type mongoose from 'mongoose'
import type { DryRunDb, DryRunIndexDescription } from './dry-run'
import type { WriteDb } from './write-import'
import type { RollbackDb } from './rollback'
import type { CellsDb, CellsTx, CellStateUpsertArgs } from './cells'
import { cellStateId } from './stable-id'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import { Lexeme } from '../Lexeme'
import { Entry } from '../Entry'
import { FaanJyutColumn } from '../FaanJyutColumn'
import { FaanJyutCellState } from '../FaanJyutCellState'
import { EditHistory } from '../EditHistory'

export function adaptMongooseDb(connection: mongoose.Connection): DryRunDb {
  const db = connection.db
  if (!db) {
    throw new Error('MongoDB 未連接：connection.db 為空（請先 await mongoose.connect(...)）')
  }
  const client = (connection as mongoose.Connection & { getClient?: () => mongoose.mongo.MongoClient }).getClient?.()
    ?? (connection as unknown as { client?: mongoose.mongo.MongoClient }).client
  if (!client) {
    throw new Error('MongoDB 未連接：無法取得 MongoClient')
  }

  return {
    async listCollectionNames() {
      const names = await db.listCollections().toArray()
      return names.map((n) => n.name)
    },
    async estimatedCount(name) {
      return db.collection(name).estimatedDocumentCount()
    },
    async indexes(name) {
      return db.collection(name).indexes() as Promise<DryRunIndexDescription[]>
    },
    async find(name, filter, projection) {
      return db.collection(name).find(filter, { projection }).limit(2000).toArray()
    },
    onCommandStarted(cb) {
      const handler = (event: { commandName?: string; ns?: string }) => {
        if (event.commandName) {
          cb({ commandName: event.commandName, ns: event.ns })
        }
      }
      client.on('commandStarted', handler)
      return () => {
        client.off('commandStarted', handler)
      }
    }
  }
}

const IMPORT_BATCH_COLLECTION = 'faanjyut_import_batches'

function setByPath(filter: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  filter[path] = value
  return filter
}

/**
 * mongoose 連接 → WriteDb + RollbackDb 適配器（P2 寫入/回滾；契約 §9）。
 * insertBatch 用原生 bulkWrite insertOne（ordered），不經 Mongoose model save，
 * 也不調 syncIndexes（索引由 scripts/migrate-faanjyut-indexes.ts 管理）。
 */
export function adaptMongooseWriteDb(connection: mongoose.Connection): WriteDb & RollbackDb {
  const db = connection.db
  if (!db) {
    throw new Error('MongoDB 未連接：connection.db 為空（請先 await mongoose.connect(...)）')
  }

  return {
    async insertBatch(collection, docs) {
      if (docs.length === 0) return 0
      const result = await db.collection(collection).bulkWrite(
        docs.map((document) => ({ insertOne: { document } })),
        { ordered: true }
      )
      return result.insertedCount
    },
    async createImportBatch(doc) {
      await db.collection(IMPORT_BATCH_COLLECTION).insertOne(doc)
    },
    async updateImportBatch(batchId, set) {
      await db.collection(IMPORT_BATCH_COLLECTION).updateOne({ batchId }, { $set: set })
    },
    async getImportBatch(batchId) {
      return db.collection(IMPORT_BATCH_COLLECTION).findOne({ batchId }) as Promise<Record<string, unknown> | null>
    },
    async countByBatchId(collection, batchIdPath, batchId) {
      return db.collection(collection).countDocuments(setByPath({}, batchIdPath, batchId))
    },
    async deleteByBatchId(collection, batchIdPath, batchId) {
      const result = await db.collection(collection).deleteMany(setByPath({}, batchIdPath, batchId))
      return result.deletedCount
    }
  }
}

// ---- P4 格級寫入：單格事務（§11：MongoDB 須支持 transactions——replica set/Atlas） ----

/**
 * 泛粵單格寫入的事務 helper（§13.1：全平台首個 transaction 先例）。
 * 每格的 Entry + CellState + EditHistory 在同一 session 提交：
 * withTransaction 內部任一操作拋錯 → 整格回滾；批次其他格各自獨立、不受影響。
 */
export async function withMongoTransaction<T>(
  connection: mongoose.Connection,
  fn: (tx: CellsTx) => Promise<T>
): Promise<T> {
  const session = await connection.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await fn(adaptMongooseCellsTx(session))
    })
    return result as T
  } finally {
    await session.endSession()
  }
}

function adaptMongooseCellsTx(session: mongoose.ClientSession): CellsTx {
  return {
    async findEntry(lexemeId, dialectId) {
      return Entry.findOne({ lexemeId, 'dialect.name': dialectId, sourceBook: FAANJYUT_SOURCE_BOOK })
        .session(session)
    },
    async createEntry(doc) {
      const created = new Entry(doc as any)
      await created.save({ session })
      return created as any
    },
    async updateEntry(entry, changes) {
      const doc = entry as any
      if (!doc.phonetic) doc.phonetic = {}
      doc.phonetic.original = changes.phoneticOriginal
      doc.updatedBy = changes.updatedBy
      await doc.save({ session })
      return entry
    },
    async deleteEntry(entry) {
      await (entry as any).deleteOne({ session })
    },
    async upsertCellState(args: CellStateUpsertArgs) {
      const $set: Record<string, unknown> = {
        'status.workflow': 'unreviewed',
        editedAfterImport: true,
        updatedBy: args.userId,
        'status.flags.modifiedPendingReview': args.flags.modifiedPendingReview ?? false,
        'status.flags.explicitlyAbsent': args.flags.explicitlyAbsent ?? false,
        'status.flags.explicitlyCleared': args.flags.explicitlyCleared ?? false
      }
      const $unset: Record<string, unknown> = {}
      if (args.raw !== undefined) {
        $set.raw = args.raw
      } else {
        $unset.raw = ''
      }
      if (args.projectionEntryId != null) {
        $set['projection.entryId'] = args.projectionEntryId
      } else {
        $unset['projection.entryId'] = ''
      }
      const update: Record<string, unknown> = {
        $set,
        $inc: { version: 1 },
        $setOnInsert: { id: cellStateId(args.lexemeId, args.columnId), createdBy: args.userId }
      }
      if (Object.keys($unset).length > 0) {
        update.$unset = $unset
      }
      // 撞 {lexemeId,columnId} unique（E11000）由 processCellEdit 映射為該格 409 語義
      await FaanJyutCellState.findOneAndUpdate(
        { lexemeId: args.lexemeId, columnId: args.columnId },
        update,
        { upsert: true, session }
      )
    },
    async createEditHistory(doc) {
      await EditHistory.create([doc as any], { session })
    }
  }
}

/**
 * mongoose 連接 → CellsDb 適配器（P4 格級寫入用）。
 * 批次級等值查詢走 lean；每格寫入走 withMongoTransaction（單格事務）。
 */
export function adaptMongooseCellsDb(connection: mongoose.Connection): CellsDb {
  return {
    async findColumnsByDialectIds(dialectIds) {
      if (dialectIds.length === 0) return []
      return FaanJyutColumn.find({ sourceBook: FAANJYUT_SOURCE_BOOK, dialectId: { $in: dialectIds } })
        .select('id sourceRole status dialectId sourceSheet sourceColumn sourceColumnIndex sourceColumnLetter regionCode')
        .lean()
    },
    async findLexemes(lexemeIds) {
      if (lexemeIds.length === 0) return []
      return Lexeme.find({ id: { $in: lexemeIds }, 'meta.sourceBook': FAANJYUT_SOURCE_BOOK })
        .select('id meta.sourceKey meta.representativeChar meta.sourceWorkbook meta.sourceSheet meta.sourceRow')
        .lean()
    },
    withTransaction<T>(fn: (tx: CellsTx) => Promise<T>) {
      return withMongoTransaction(connection, fn)
    }
  }
}
