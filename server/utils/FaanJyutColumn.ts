import mongoose from 'mongoose'

/**
 * 泛粵字表列級元信息（見封存 NewTablesDesign.md §3.2、ImportDataContract.md §6.1）。
 * P1 只編譯模型供 dry-run 校驗與索引計劃使用，不創建 collection；
 * 真實創建由 P2 導入流程完成（importer 不調 syncIndexes）。
 */
export interface IFaanJyutColumnOrder {
  originalOrder: number
  regionOrder?: number
}

export interface IFaanJyutColumnStyle {
  color?: string
  defaultTextColor?: string
}

export interface IFaanJyutColumnSourceMeta {
  mark?: string
  rawMark?: unknown
  headerRows?: Record<string, unknown>
  note?: string
  [key: string]: unknown
}

export interface IFaanJyutColumnPermissions {
  editableRoles?: string[]
  reviewerRoles?: string[]
  editableUserIds?: string[]
  reviewerUserIds?: string[]
}

export interface IFaanJyutColumn {
  id: string
  sourceBook: string
  sourceSheet: string
  sourceColumn: string | null
  sourceColumnIndex: number
  sourceColumnLetter?: string
  sourceRole: 'domestic' | 'external' | 'boundary' | 'meta' | 'check' | 'skipped'
  projectionTarget: 'entry' | 'externalEtymon' | 'lexemeMeta' | 'link' | 'comment' | 'none' | 'custom'
  label: string
  shortLabel?: string
  fullName?: string
  fullNameNote?: string
  aliases?: string[]
  dialectId?: string
  languageCode?: string
  regionCode?: string
  order: IFaanJyutColumnOrder
  style?: IFaanJyutColumnStyle
  sourceMeta?: IFaanJyutColumnSourceMeta
  permissions?: IFaanJyutColumnPermissions
  status: 'active' | 'inactive' | 'draft' | 'suspected_missing'
  importBatchId?: string
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const OrderSchema = new mongoose.Schema<IFaanJyutColumnOrder>({
  originalOrder: { type: Number, required: true },
  regionOrder: { type: Number }
}, { _id: false })

const StyleSchema = new mongoose.Schema<IFaanJyutColumnStyle>({
  color: { type: String },
  defaultTextColor: { type: String }
}, { _id: false, strict: false })

const SourceMetaSchema = new mongoose.Schema<IFaanJyutColumnSourceMeta>({
  mark: { type: String },
  rawMark: { type: mongoose.Schema.Types.Mixed },
  headerRows: { type: mongoose.Schema.Types.Mixed },
  note: { type: String }
}, { _id: false, strict: false })

const PermissionsSchema = new mongoose.Schema<IFaanJyutColumnPermissions>({
  editableRoles: [{ type: String }],
  reviewerRoles: [{ type: String }],
  editableUserIds: [{ type: String }],
  reviewerUserIds: [{ type: String }]
}, { _id: false })

const FaanJyutColumnSchema = new mongoose.Schema<IFaanJyutColumn>({
  id: { type: String, required: true },
  sourceBook: { type: String, required: true },
  sourceSheet: { type: String, required: true },
  sourceColumn: { type: String, default: null },
  sourceColumnIndex: { type: Number, required: true },
  sourceColumnLetter: { type: String },
  sourceRole: { type: String, enum: ['domestic', 'external', 'boundary', 'meta', 'check', 'skipped'], required: true },
  projectionTarget: { type: String, enum: ['entry', 'externalEtymon', 'lexemeMeta', 'link', 'comment', 'none', 'custom'], required: true },
  label: { type: String, required: true },
  shortLabel: { type: String },
  fullName: { type: String },
  fullNameNote: { type: String },
  aliases: [{ type: String }],
  dialectId: { type: String },
  languageCode: { type: String },
  regionCode: { type: String },
  order: { type: OrderSchema, required: true },
  style: { type: StyleSchema },
  sourceMeta: { type: SourceMetaSchema },
  permissions: { type: PermissionsSchema },
  status: { type: String, enum: ['active', 'inactive', 'draft', 'suspected_missing'], required: true },
  importBatchId: { type: String },
  createdBy: { type: String, required: true },
  updatedBy: { type: String }
}, {
  timestamps: true,
  collection: 'faanjyut_columns'
})

// 泛粵列查詢索引（見 NewTablesDesign.md §3.2；由 scripts/migrate-faanjyut-indexes.ts 管理）
FaanJyutColumnSchema.index({ id: 1 }, { unique: true })
FaanJyutColumnSchema.index({ sourceBook: 1, sourceSheet: 1, sourceColumnIndex: 1 }, { unique: true })
FaanJyutColumnSchema.index({ sourceBook: 1, sourceSheet: 1, sourceColumn: 1 })
FaanJyutColumnSchema.index({ sourceRole: 1, status: 1 })
FaanJyutColumnSchema.index({ dialectId: 1 })
FaanJyutColumnSchema.index({ languageCode: 1 })
FaanJyutColumnSchema.index({ importBatchId: 1 })
FaanJyutColumnSchema.index(
  { sourceBook: 1, dialectId: 1 },
  { unique: true, partialFilterExpression: { sourceRole: 'domestic', status: 'active' } }
)
FaanJyutColumnSchema.index(
  { sourceBook: 1, languageCode: 1 },
  { unique: true, partialFilterExpression: { sourceRole: 'external', status: 'active' } }
)

export const FaanJyutColumn = mongoose.models.FaanJyutColumn || mongoose.model<IFaanJyutColumn>('FaanJyutColumn', FaanJyutColumnSchema)
