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
import type { LexemeCreateDb, LexemeCreateTx } from './lexeme-create'
import type { ExportSource, ExportFileName } from './export-backup'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import { cellStateId } from './stable-id'
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
      // 審計 M34：原生 insertOne 繞過 mongoose timestamps——顯式注入 createdAt/updatedAt
      const now = new Date()
      await db.collection(IMPORT_BATCH_COLLECTION).insertOne({ ...doc, createdAt: now, updatedAt: now })
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

// ---- P5 新建詞條：JC- sourceKey 計數器（同一事務內原子遞增，回滾時序號一併回滾） ----

const FAANJYUT_COUNTERS_COLLECTION = 'faanjyut_counters'
const LEXEME_SOURCE_KEY_COUNTER_ID = 'lexeme_sourceKey'

/**
 * 泛粵寫入事務 helper（§13.1：全平台首個 transaction 先例；P5 復用於新建詞條）。
 * 每格的 Entry + CellState + EditHistory（P4），或 Lexeme + 多格三件套（P5），
 * 在同一 session 提交：withTransaction 內部任一操作拋錯 → 整事務回滾。
 * 傳入的 tx 即 adaptMongooseCellsTx 全量（CellsTx & LexemeCreateTx），
 * P5 新建詞條以 `(tx) => fn(tx as LexemeCreateTx)` 包裝（見 adaptMongooseLexemeCreateDb）。
 */
export async function withMongoTransaction<T>(
  connection: mongoose.Connection,
  fn: (tx: CellsTx) => Promise<T>
): Promise<T> {
  const db = connection.db
  if (!db) {
    throw new Error('MongoDB 未連接：connection.db 為空（請先 await mongoose.connect(...)）')
  }
  const session = await connection.startSession()
  try {
    let result: T | undefined
    await session.withTransaction(async () => {
      result = await fn(adaptMongooseCellsTx(session, db))
    })
    return result as T
  } finally {
    await session.endSession()
  }
}

function adaptMongooseCellsTx(
  session: mongoose.ClientSession,
  db: mongoose.mongo.Db
): CellsTx & LexemeCreateTx {
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
    },
    async createLexeme(doc) {
      const created = new Lexeme(doc as any)
      await created.save({ session })
      return { id: created.id }
    },
    async nextSourceKeySeq() {
      // 原生 driver v7：findOneAndUpdate 直接返回文檔；upsert + returnDocument after 取遞增後 seq。
      // 同一 session → 計數器遞增與 Lexeme 落庫同生共死（事務回滾時序號不跳號）。
      // collection 以 { _id: string } 顯式定型，避免 Document 預設 _id: ObjectId 誤報。
      const counters = db.collection<{ _id: string; seq?: number }>(FAANJYUT_COUNTERS_COLLECTION)
      const doc = await counters.findOneAndUpdate(
        { _id: LEXEME_SOURCE_KEY_COUNTER_ID },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after', session }
      )
      const seq = doc?.seq
      if (typeof seq !== 'number') {
        throw new Error('泛粵計數器異常：未能取得詞條編號序號')
      }
      return seq
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

/**
 * mongoose 連接 → LexemeCreateDb 適配器（P5 新建詞條用）。
 * 事務外列批查走 lean；matrixOrder 由純邏輯以 Date.now() 生成（審計 M38，不再查 max）；
 * Lexeme + 逐格三件套走 withMongoTransaction
 * （adapter 已實現 createLexeme / nextSourceKeySeq，同一事務內原子遞增 JC- 計數器）。
 */
export function adaptMongooseLexemeCreateDb(connection: mongoose.Connection): LexemeCreateDb {
  return {
    async findColumnsByDialectIds(dialectIds) {
      if (dialectIds.length === 0) return []
      return FaanJyutColumn.find({ sourceBook: FAANJYUT_SOURCE_BOOK, dialectId: { $in: dialectIds } })
        .select('id sourceRole status dialectId sourceSheet sourceColumn sourceColumnIndex sourceColumnLetter regionCode')
        .lean()
    },
    withTransaction<T>(fn: (tx: LexemeCreateTx) => Promise<T>) {
      // withMongoTransaction 傳入的 tx 即 adaptMongooseCellsTx 全量（CellsTx & LexemeCreateTx），
      // 包裝 cast 是安全的（P5 方法已由 adapter 實現）
      return withMongoTransaction(connection, (tx) => fn(tx as unknown as LexemeCreateTx))
    }
  }
}

// ---- P5 backup 導出：只讀流式游標（§10.2 導出頁） ----

/** 文件名 → 真實 collection（與 import-contract.ts FILE_TO_COLLECTION 一致） */
const EXPORT_FILE_TO_COLLECTION: Record<string, string> = {
  'columns.ndjson': 'faanjyut_columns',
  'lexemes.ndjson': 'lexemes',
  'entries.ndjson': 'entries',
  'external_etymons.ndjson': 'external_etymons',
  'cell_states.ndjson': 'faanjyut_cell_states',
  'comments.ndjson': 'faanjyut_comments',
  'links.ndjson': 'faanjyut_links'
}

/**
 * 審計 H1：共用集合只取泛粵文檔的 DB 過濾條件（與 export-backup.ts SOURCE_BOOK_FIELD 同規則）。
 * lexemes/external_etymons 在 meta.sourceBook；entries 在頂層 sourceBook；專用表不過濾。
 */
const SOURCE_BOOK_DB_FILTER: Record<string, Record<string, unknown>> = {
  'lexemes.ndjson': { 'meta.sourceBook': FAANJYUT_SOURCE_BOOK },
  'entries.ndjson': { sourceBook: FAANJYUT_SOURCE_BOOK },
  'external_etymons.ndjson': { 'meta.sourceBook': FAANJYUT_SOURCE_BOOK }
}

/**
 * mongoose 連接 → ExportSource 適配器（P5 backup 導出用）。
 * 每集合用 lean 游標分批迭代（entries 8 萬條流式，不整表 load 進內存）；
 * 泛粵 Entry._id 亦走游標（分塊收集，約 2MB）。
 */
export function adaptMongooseExportDb(connection: mongoose.Connection): ExportSource {
  const db = connection.db
  if (!db) {
    throw new Error('MongoDB 未連接：connection.db 為空（請先 await mongoose.connect(...)）')
  }
  return {
    async *iterateDocs(name: ExportFileName) {
      const collection = EXPORT_FILE_TO_COLLECTION[name]
      if (!collection) {
        throw new Error(`無導出對應的 collection：${name}`)
      }
      // 審計 H1：共用集合只取泛粵文檔（純邏輯層另有同規則過濾，雙保險 + 減少掃描）
      const filter = SOURCE_BOOK_DB_FILTER[name]
      // 原生 driver 游標分批（batchSize 2000），8 萬條 entries 流式讀取，不整表 load 進內存
      const cursor = db.collection(collection).find(filter).batchSize(2000)
      for await (const doc of cursor) {
        yield doc as Record<string, unknown>
      }
    },
    async *iterateFaanjyutEntryIds() {
      const cursor = Entry.find({ sourceBook: FAANJYUT_SOURCE_BOOK })
        .select('_id')
        .lean()
        .cursor({ batchSize: 2000 })
      for await (const doc of cursor) {
        yield String((doc as { _id: unknown })._id)
      }
    },
    async *iterateEditHistories() {
      const cursor = EditHistory.find({})
        .lean()
        .cursor({ batchSize: 2000 })
      for await (const doc of cursor) {
        yield doc as Record<string, unknown>
      }
    }
  }
}
