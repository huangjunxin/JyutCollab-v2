import mongoose from 'mongoose'

/**
 * 泛粵字表導入批次（ImportDataContract.md §7、§9）。
 * 真實寫模式預檢通過後生成 `batchId = 'fjb_' + nanoid(16)`，先建 running 批次再寫業務文檔；
 * 失敗標 failed（須先回滾再重試），回滾後批次保留並標 rolled_back。
 */
export interface IFaanJyutImportBatch {
  batchId: string
  mode: 'initial' | 'final_cutover'
  environment: 'local' | 'staging' | 'production'
  status: 'running' | 'completed' | 'failed' | 'rolled_back'
  source: {
    sourceWorkbook: string
    sourceFileSha256: string
    manifestSha256: string
  }
  /** dry-run 預檢的 runId（fjdr_ 前綴） */
  precheckRunId?: string
  /** 寫入產物目錄（schema_dry_run_report.json / import_write_report.json / index-plan.json 所在），導入報告 API 依此讀取 */
  reportDir?: string
  bulkSize: number
  counts: {
    written: Record<string, number>
  }
  error?: string
  startedAt: Date
  completedAt?: Date
  failedAt?: Date
  rolledBackAt?: Date
  rollbackCounts?: {
    before: Record<string, number>
    after: Record<string, number>
  }
  createdAt: Date
  updatedAt: Date
}

const FaanJyutImportBatchSchema = new mongoose.Schema<IFaanJyutImportBatch>({
  batchId: { type: String, required: true },
  mode: { type: String, enum: ['initial', 'final_cutover'], required: true },
  environment: { type: String, enum: ['local', 'staging', 'production'], required: true },
  status: { type: String, enum: ['running', 'completed', 'failed', 'rolled_back'], required: true },
  source: {
    sourceWorkbook: { type: String, required: true },
    sourceFileSha256: { type: String, required: true },
    manifestSha256: { type: String, required: true }
  },
  precheckRunId: { type: String },
  reportDir: { type: String },
  bulkSize: { type: Number, required: true },
  counts: {
    written: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  error: { type: String },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  failedAt: { type: Date },
  rolledBackAt: { type: Date },
  rollbackCounts: {
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed }
  }
}, {
  timestamps: true,
  collection: 'faanjyut_import_batches'
})

// 批次查詢索引（由 scripts/migrate-faanjyut-indexes.ts 管理）
FaanJyutImportBatchSchema.index({ batchId: 1 }, { unique: true })
FaanJyutImportBatchSchema.index({ status: 1 })
FaanJyutImportBatchSchema.index({ startedAt: -1 })

export const FaanJyutImportBatch = mongoose.models.FaanJyutImportBatch || mongoose.model<IFaanJyutImportBatch>('FaanJyutImportBatch', FaanJyutImportBatchSchema)
