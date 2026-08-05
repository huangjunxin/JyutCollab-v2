import mongoose from 'mongoose'

/**
 * 泛粵字表格級狀態（見封存 NewTablesDesign.md §3.3、ImportDataContract.md §6.2）。
 * 「薄 Cell 表」：主數據仍放 entries/external_etymons/lexemes，本表只補格級語義。
 * P1 只編譯模型；`status.workflow` 六態枚舉為協議預留，v1 導入初值一律 `unreviewed`。
 */
export interface IFaanJyutCellStateStatus {
  workflow: 'unreviewed' | 'pending_review' | 'checked' | 'changes_requested' | 'needs_recheck' | 'locked'
  flags?: {
    modifiedPendingReview?: boolean
    hasQuestion?: boolean
    parseWarning?: boolean
    pendingDelete?: boolean
    hasOldNote?: boolean
    deleted?: boolean
    explicitlyAbsent?: boolean
    explicitlyCleared?: boolean
    [key: string]: unknown
  }
}

export interface IFaanJyutCellStateProjection {
  entryId?: string
  externalEtymonIds?: string[]
  lastProjectedAt?: Date
}

export interface IFaanJyutCellStateSource {
  sourceRow?: number
  sourceColumn?: string
  sourceCell?: string
  importBatchId?: string
}

export interface IFaanJyutCellState {
  id: string
  lexemeId: string
  columnId: string
  raw?: string
  rawOriginal?: string
  normalized?: string
  status: IFaanJyutCellStateStatus
  review?: {
    submittedBy?: string
    submittedAt?: Date
    reviewedBy?: string
    reviewedAt?: Date
    lastAction?: string
    reason?: string
  }
  parse?: {
    parsed?: unknown
    warnings?: string[]
    styleResult?: unknown
  }
  projection?: IFaanJyutCellStateProjection
  source?: IFaanJyutCellStateSource
  editedAfterImport: boolean
  version: number
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const StatusSchema = new mongoose.Schema<IFaanJyutCellStateStatus>({
  workflow: { type: String, enum: ['unreviewed', 'pending_review', 'checked', 'changes_requested', 'needs_recheck', 'locked'], required: true },
  flags: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
}, { _id: false, strict: false })

const ProjectionSchema = new mongoose.Schema<IFaanJyutCellStateProjection>({
  entryId: { type: String },
  externalEtymonIds: [{ type: String }],
  lastProjectedAt: { type: Date }
}, { _id: false })

const SourceSchema = new mongoose.Schema<IFaanJyutCellStateSource>({
  sourceRow: { type: Number },
  sourceColumn: { type: String },
  sourceCell: { type: String },
  importBatchId: { type: String }
}, { _id: false })

const ReviewSchema = new mongoose.Schema({
  submittedBy: { type: String },
  submittedAt: { type: Date },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  lastAction: { type: String },
  reason: { type: String }
}, { _id: false })

const ParseSchema = new mongoose.Schema({
  parsed: { type: mongoose.Schema.Types.Mixed },
  warnings: [{ type: String }],
  styleResult: { type: mongoose.Schema.Types.Mixed }
}, { _id: false, strict: false })

const FaanJyutCellStateSchema = new mongoose.Schema<IFaanJyutCellState>({
  id: { type: String, required: true },
  lexemeId: { type: String, required: true },
  columnId: { type: String, required: true },
  raw: { type: String },
  rawOriginal: { type: String },
  normalized: { type: String },
  status: { type: StatusSchema, required: true },
  review: { type: ReviewSchema },
  parse: { type: ParseSchema },
  projection: { type: ProjectionSchema },
  source: { type: SourceSchema },
  editedAfterImport: { type: Boolean, required: true },
  version: { type: Number, required: true },
  createdBy: { type: String, required: true },
  updatedBy: { type: String }
}, {
  timestamps: true,
  collection: 'faanjyut_cell_states'
})

// 泛粵格查詢索引（見 NewTablesDesign.md §3.3；由 scripts/migrate-faanjyut-indexes.ts 管理）
FaanJyutCellStateSchema.index({ id: 1 }, { unique: true })
FaanJyutCellStateSchema.index({ lexemeId: 1, columnId: 1 }, { unique: true })
FaanJyutCellStateSchema.index({ columnId: 1, 'status.workflow': 1 })
FaanJyutCellStateSchema.index({ lexemeId: 1 })
FaanJyutCellStateSchema.index({ 'source.sourceRow': 1, 'source.sourceColumn': 1 })
FaanJyutCellStateSchema.index({ 'projection.entryId': 1 })
FaanJyutCellStateSchema.index({ editedAfterImport: 1 })
FaanJyutCellStateSchema.index({ 'source.importBatchId': 1 })

export const FaanJyutCellState = mongoose.models.FaanJyutCellState || mongoose.model<IFaanJyutCellState>('FaanJyutCellState', FaanJyutCellStateSchema)
