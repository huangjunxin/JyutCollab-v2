import mongoose from 'mongoose'

/**
 * 泛粵字表詞條組引用關係（見封存 NewTablesDesign.md §3.4、ImportDataContract.md §6.4）。
 * 來源：DR（導向）、DQ（孖胎潛在）、代表字 見/歸、評論 @>、人工。
 * P1 只編譯模型；真實創建由 P2 導入流程完成。
 */
export interface IFaanJyutLinkSource {
  sourceRow?: number
  sourceColumn?: string
  importBatchId?: string
}

export interface IFaanJyutLink {
  id: string
  fromLexemeId: string
  toLexemeId?: string
  targetKey?: string
  targetRaw?: string
  type: 'related' | 'twin_potential' | 'redirect_hint' | 'merge_hint' | 'manual' | 'unknown'
  rawSource: 'DR' | 'DQ' | 'representativeChar' | 'comment' | 'manual'
  rawLabel?: string
  rawValue?: string
  status: 'active' | 'unresolved' | 'broken' | 'archived'
  confidence?: number
  source?: IFaanJyutLinkSource
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

const SourceSchema = new mongoose.Schema<IFaanJyutLinkSource>({
  sourceRow: { type: Number },
  sourceColumn: { type: String },
  importBatchId: { type: String }
}, { _id: false })

const FaanJyutLinkSchema = new mongoose.Schema<IFaanJyutLink>({
  id: { type: String, required: true },
  fromLexemeId: { type: String, required: true },
  toLexemeId: { type: String },
  targetKey: { type: String },
  targetRaw: { type: String },
  type: { type: String, enum: ['related', 'twin_potential', 'redirect_hint', 'merge_hint', 'manual', 'unknown'], required: true },
  rawSource: { type: String, enum: ['DR', 'DQ', 'representativeChar', 'comment', 'manual'], required: true },
  rawLabel: { type: String },
  rawValue: { type: String },
  status: { type: String, enum: ['active', 'unresolved', 'broken', 'archived'], required: true },
  confidence: { type: Number },
  source: { type: SourceSchema },
  createdBy: { type: String, required: true },
  updatedBy: { type: String }
}, {
  timestamps: true,
  collection: 'faanjyut_links'
})

// 泛粵引用查詢索引（見 NewTablesDesign.md §3.4；由 scripts/migrate-faanjyut-indexes.ts 管理）
FaanJyutLinkSchema.index({ id: 1 }, { unique: true })
FaanJyutLinkSchema.index({ fromLexemeId: 1 })
FaanJyutLinkSchema.index({ toLexemeId: 1 })
FaanJyutLinkSchema.index({ targetKey: 1 })
FaanJyutLinkSchema.index({ status: 1 })
FaanJyutLinkSchema.index({ rawSource: 1 })
FaanJyutLinkSchema.index({ 'source.importBatchId': 1 })

export const FaanJyutLink = mongoose.models.FaanJyutLink || mongoose.model<IFaanJyutLink>('FaanJyutLink', FaanJyutLinkSchema)
