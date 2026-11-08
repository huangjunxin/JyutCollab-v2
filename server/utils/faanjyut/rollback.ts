/**
 * 回滾（ImportDataContract.md §9；ImplementationPlan P2）。
 *
 * 按寫入順序的反向（ROLLBACK_ORDER）刪除帶 batchId 的業務文檔；
 * ImportBatch 本身保留並標 rolled_back（含前後計數快照）。批次必須處於
 * completed/failed/interrupted 狀態才允許回滾；running 批次拒絕（避免刪到寫一半的數據流），
 * rolled_back 批次拒絕（重複回滾無意義）。
 *
 * 通過 RollbackDb 抽象訪問數據庫（真實實現見 mongo-db.ts；單元測試用 fake）。
 */
import { COLLECTION_BATCH_ID_PATH, ROLLBACK_ORDER } from './write-import'

/** 回滾所需的 DB 接口（真實/測試可注入） */
export interface RollbackDb {
  getImportBatch(batchId: string): Promise<Record<string, unknown> | null>
  countByBatchId(collection: string, batchIdPath: string, batchId: string): Promise<number>
  deleteByBatchId(collection: string, batchIdPath: string, batchId: string): Promise<number>
  updateImportBatch(batchId: string, set: Record<string, unknown>): Promise<void>
}

export interface RollbackResult {
  batchId: string
  status: 'rolled_back'
  countsBefore: Record<string, number>
  deleted: Record<string, number>
  countsAfter: Record<string, number>
  startedAt: string
  completedAt: string
}

/**
 * 執行回滾。批次不存在、狀態不允許（running/rolled_back）時拋錯，不刪任何文檔。
 */
export async function runRollback(db: RollbackDb, batchId: string): Promise<RollbackResult> {
  const batch = await db.getImportBatch(batchId)
  if (!batch) {
    throw new Error(`ImportBatch 不存在：${batchId}`)
  }
  const status = String(batch.status ?? '')
  if (status !== 'completed' && status !== 'failed' && status !== 'interrupted') {
    throw new Error(`ImportBatch ${batchId} 狀態為 '${status}'，僅 completed/failed/interrupted 可回滾；未刪除任何文檔`)
  }

  const startedAt = new Date()
  const countsBefore: Record<string, number> = {}
  const deleted: Record<string, number> = {}
  const countsAfter: Record<string, number> = {}

  for (const collection of ROLLBACK_ORDER) {
    const batchIdPath = COLLECTION_BATCH_ID_PATH[collection]
    countsBefore[collection] = await db.countByBatchId(collection, batchIdPath, batchId)
  }
  for (const collection of ROLLBACK_ORDER) {
    const batchIdPath = COLLECTION_BATCH_ID_PATH[collection]
    deleted[collection] = await db.deleteByBatchId(collection, batchIdPath, batchId)
  }
  for (const collection of ROLLBACK_ORDER) {
    const batchIdPath = COLLECTION_BATCH_ID_PATH[collection]
    countsAfter[collection] = await db.countByBatchId(collection, batchIdPath, batchId)
  }

  const completedAt = new Date()
  await db.updateImportBatch(batchId, {
    status: 'rolled_back',
    rolledBackAt: completedAt,
    rollbackCounts: { before: countsBefore, after: countsAfter }
  })

  return {
    batchId,
    status: 'rolled_back',
    countsBefore,
    deleted,
    countsAfter,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString()
  }
}
