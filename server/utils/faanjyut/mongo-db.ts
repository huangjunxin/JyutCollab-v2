/**
 * mongoose 連接 → DryRunDb 適配器（只讀操作；dry-run 不調用任何寫方法）。
 * 連接參數只讀自 FAANJYUT_MONGODB_URI / FAANJYUT_DB_NAME（ImportDataContract.md §8）。
 * P2 追加 adaptMongooseWriteDb：WriteDb + RollbackDb 的真實實現（寫入/回滾用）。
 */
import type mongoose from 'mongoose'
import type { DryRunDb, DryRunIndexDescription } from './dry-run'
import type { WriteDb } from './write-import'
import type { RollbackDb } from './rollback'

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
