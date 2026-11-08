export const IMPORT_RECOVERY_MIN_AGE_MS = 5 * 60 * 1000

export interface ImportRecoveryDb {
  getImportBatch(batchId: string): Promise<Record<string, unknown> | null>
  markImportBatchInterrupted(batchId: string, set: Record<string, unknown>): Promise<boolean>
}

export interface ImportRecoveryResult {
  batchId: string
  status: 'interrupted'
  startedAt: string
  interruptedAt: string
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

export async function recoverImportBatch(
  db: ImportRecoveryDb,
  options: {
    batchId: string
    confirmedBatchId: string
    now?: Date
    minAgeMs?: number
  }
): Promise<ImportRecoveryResult> {
  const { batchId } = options
  if (options.confirmedBatchId !== batchId) {
    throw new Error('--confirm-no-active-writer 必須等於 batchId，且操作前須確認導入進程已停止')
  }
  const batch = await db.getImportBatch(batchId)
  if (!batch) throw new Error(`ImportBatch 不存在：${batchId}`)
  if (batch.status !== 'running') {
    throw new Error(`ImportBatch ${batchId} 狀態為 '${String(batch.status ?? '')}'，僅 running 可標記為 interrupted`)
  }
  const startedAt = dateValue(batch.startedAt)
  if (!startedAt) throw new Error(`ImportBatch ${batchId} 缺少有效 startedAt，拒絕自動恢復`)
  const now = options.now ?? new Date()
  const minAgeMs = options.minAgeMs ?? IMPORT_RECOVERY_MIN_AGE_MS
  if (now.getTime() - startedAt.getTime() < minAgeMs) {
    throw new Error(`ImportBatch ${batchId} 仍在最短觀察期內，請確認進程狀態並稍後再試`)
  }

  const interruptedAt = now
  const marked = await db.markImportBatchInterrupted(batchId, {
    status: 'interrupted',
    interruptedAt,
    interruptedBy: 'system:faanjyut_recovery',
    interruptionReason: '操作員確認導入進程已停止',
    updatedAt: interruptedAt
  })
  if (!marked) {
    throw new Error(`ImportBatch ${batchId} 狀態已變更，請重新讀取後再操作`)
  }
  return {
    batchId,
    status: 'interrupted',
    startedAt: startedAt.toISOString(),
    interruptedAt: interruptedAt.toISOString()
  }
}
