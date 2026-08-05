/**
 * mongoose 連接 → DryRunDb 適配器（只讀操作；dry-run 不調用任何寫方法）。
 * 連接參數只讀自 FAANJYUT_MONGODB_URI / FAANJYUT_DB_NAME（ImportDataContract.md §8）。
 */
import type mongoose from 'mongoose'
import type { DryRunDb, DryRunIndexDescription } from './dry-run'

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
