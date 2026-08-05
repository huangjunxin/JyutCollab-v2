import mongoose from 'mongoose'

/**
 * 泛粵字表導出批次（FaanjyutV1Design.md §10.2 導出頁）。
 *
 * v1 只有 backup 一種 scope：全部詞條組 + 全部格 + 註釋/鏈接/域外。
 * 每次導出生成 `id = 'fjx_' + nanoid(16)`（注意：不用 `fje_`——那是 externalEtymon
 * 的穩定 ID 前綴，見 stable-id.ts STABLE_ID_PREFIXES，避免 ID 命名空間撞車），
 * 先建 running 批次，流式寫 `.artifacts/faanjyut/export/<id>.zip`，
 * 完成標 completed + fileSize；任何失敗標 failed + error。
 */
export interface IFaanJyutExportOptions {
  includeDrafts: boolean
  includeAudit: boolean
  includeStyles: boolean
}

export interface IFaanJyutExportBatch {
  id: string
  fileName: string
  fileSize?: number
  options: IFaanJyutExportOptions
  status: 'running' | 'completed' | 'failed'
  /** 相對 artifactsRoot 的路徑（如 `export/<id>.zip`），下載 API 依此做路徑防護 */
  filePath: string
  createdBy: string
  error?: string
  startedAt: Date
  completedAt?: Date
  failedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const FaanJyutExportBatchSchema = new mongoose.Schema<IFaanJyutExportBatch>({
  id: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number },
  options: {
    includeDrafts: { type: Boolean, required: true, default: false },
    includeAudit: { type: Boolean, required: true, default: false },
    includeStyles: { type: Boolean, required: true, default: false }
  },
  status: { type: String, enum: ['running', 'completed', 'failed'], required: true },
  filePath: { type: String, required: true },
  createdBy: { type: String, required: true },
  error: { type: String },
  startedAt: { type: Date, required: true },
  completedAt: { type: Date },
  failedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'faanjyut_export_batches'
})

// 批次查詢索引（由 scripts/migrate-faanjyut-indexes.ts 管理；經 import-models.ts 的
// FAANJYUT_AUX_COLLECTIONS 納入索引計劃）
FaanJyutExportBatchSchema.index({ id: 1 }, { unique: true })
FaanJyutExportBatchSchema.index({ createdAt: -1 })

export const FaanJyutExportBatch = mongoose.models.FaanJyutExportBatch || mongoose.model<IFaanJyutExportBatch>('FaanJyutExportBatch', FaanJyutExportBatchSchema)
