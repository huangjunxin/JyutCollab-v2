/**
 * rollback 單元測試（契約 §9）：
 * 反向順序刪除、批次保留標 rolled_back（含前後計數）、
 * 批次不存在/狀態不允許（running/rolled_back）拒絕且不刪任何文檔。
 */
import { describe, expect, it } from 'vitest'
import { runRollback, type RollbackDb } from '../rollback'
import { ROLLBACK_ORDER } from '../write-import'

interface FakeRollbackDb extends RollbackDb {
  batches: Record<string, Record<string, unknown> | null>
  deleteCalls: string[]
  batchUpdates: Array<Record<string, unknown>>
  counts: Record<string, number>
}

function fakeRollbackDb(options: {
  batch?: Record<string, unknown> | null
  counts?: Record<string, number>
}): FakeRollbackDb {
  const counts = options.counts ?? Object.fromEntries(ROLLBACK_ORDER.map((c) => [c, 3]))
  const deleteCalls: string[] = []
  const batchUpdates: Array<Record<string, unknown>> = []
  const batches: Record<string, Record<string, unknown> | null> = {
    fjb_ok: options.batch === undefined ? { batchId: 'fjb_ok', status: 'completed' } : options.batch
  }
  return {
    batches,
    deleteCalls,
    batchUpdates,
    counts,
    async getImportBatch(batchId) {
      return batches[batchId] ?? null
    },
    async countByBatchId(collection) {
      return deleteCalls.includes(collection) ? 0 : (counts[collection] ?? 0)
    },
    async deleteByBatchId(collection) {
      deleteCalls.push(collection)
      return counts[collection] ?? 0
    },
    async updateImportBatch(_batchId, set) {
      batchUpdates.push(set)
    }
  }
}

describe('faanjyut/rollback 回滾', () => {
  it('completed 批次：按反向順序刪除，標 rolled_back（含前後計數）', async () => {
    const db = fakeRollbackDb({})
    const result = await runRollback(db, 'fjb_ok')
    expect(db.deleteCalls).toEqual(ROLLBACK_ORDER)
    expect(result.status).toBe('rolled_back')
    for (const collection of ROLLBACK_ORDER) {
      expect(result.countsBefore[collection]).toBe(3)
      expect(result.deleted[collection]).toBe(3)
      expect(result.countsAfter[collection]).toBe(0)
    }
    const update = db.batchUpdates.find((u) => u.status === 'rolled_back')
    expect(update).toBeTruthy()
    expect((update as Record<string, Record<string, Record<string, number>>>)?.rollbackCounts?.after?.lexemes).toBe(0)
  })

  it('failed 批次同樣可回滾', async () => {
    const db = fakeRollbackDb({ batch: { batchId: 'fjb_ok', status: 'failed', error: 'x' } })
    const result = await runRollback(db, 'fjb_ok')
    expect(result.status).toBe('rolled_back')
    expect(db.deleteCalls).toEqual(ROLLBACK_ORDER)
  })

  it('批次不存在：拋錯，不刪任何文檔', async () => {
    const db = fakeRollbackDb({ batch: null })
    await expect(runRollback(db, 'fjb_missing')).rejects.toThrow('不存在')
    expect(db.deleteCalls).toEqual([])
  })

  it('running 批次：拒絕回滾，不刪任何文檔', async () => {
    const db = fakeRollbackDb({ batch: { batchId: 'fjb_ok', status: 'running' } })
    await expect(runRollback(db, 'fjb_ok')).rejects.toThrow('running')
    expect(db.deleteCalls).toEqual([])
  })

  it('rolled_back 批次：拒絕重複回滾', async () => {
    const db = fakeRollbackDb({ batch: { batchId: 'fjb_ok', status: 'rolled_back' } })
    await expect(runRollback(db, 'fjb_ok')).rejects.toThrow('rolled_back')
    expect(db.deleteCalls).toEqual([])
  })
})
