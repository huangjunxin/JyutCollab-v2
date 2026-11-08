import { describe, expect, it } from 'vitest'
import { recoverImportBatch, type ImportRecoveryDb } from '../recovery'

function makeDb(batch: Record<string, unknown> | null, markResult = true) {
  const updates: Array<Record<string, unknown>> = []
  const db: ImportRecoveryDb = {
    async getImportBatch() {
      return batch
    },
    async markImportBatchInterrupted(_batchId, set) {
      updates.push(set)
      return markResult
    }
  }
  return { db, updates }
}

const startedAt = new Date('2026-08-08T00:00:00.000Z')
const now = new Date('2026-08-08T00:10:00.000Z')

describe('faanjyut/recovery', () => {
  it('將逾期的 running 批次標記為 interrupted', async () => {
    const { db, updates } = makeDb({ batchId: 'fjb_test', status: 'running', startedAt })
    const result = await recoverImportBatch(db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })
    expect(result).toEqual({
      batchId: 'fjb_test',
      status: 'interrupted',
      startedAt: startedAt.toISOString(),
      interruptedAt: now.toISOString()
    })
    expect(updates[0]).toMatchObject({
      status: 'interrupted',
      interruptedAt: now,
      interruptedBy: 'system:faanjyut_recovery',
      updatedAt: now
    })
  })

  it('確認值與 batchId 不符時拒絕', async () => {
    const { db, updates } = makeDb({ status: 'running', startedAt })
    await expect(recoverImportBatch(db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_other',
      now
    })).rejects.toThrow('confirm-no-active-writer')
    expect(updates).toHaveLength(0)
  })

  it('非 running 批次拒絕恢復', async () => {
    const { db } = makeDb({ status: 'completed', startedAt })
    await expect(recoverImportBatch(db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })).rejects.toThrow('僅 running')
  })

  it('最短觀察期內拒絕恢復', async () => {
    const { db } = makeDb({ status: 'running', startedAt: now })
    await expect(recoverImportBatch(db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })).rejects.toThrow('最短觀察期')
  })

  it('批次不存在或 startedAt 無效時拒絕恢復', async () => {
    const missing = makeDb(null)
    await expect(recoverImportBatch(missing.db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })).rejects.toThrow('不存在')
    const invalid = makeDb({ status: 'running', startedAt: 'invalid' })
    await expect(recoverImportBatch(invalid.db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })).rejects.toThrow('startedAt')
  })

  it('狀態在檢查後改變時拒絕恢復', async () => {
    const { db } = makeDb({ status: 'running', startedAt }, false)
    await expect(recoverImportBatch(db, {
      batchId: 'fjb_test',
      confirmedBatchId: 'fjb_test',
      now
    })).rejects.toThrow('狀態已變更')
  })
})
