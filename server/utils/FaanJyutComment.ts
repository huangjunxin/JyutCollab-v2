import mongoose from 'mongoose'

/**
 * 泛粵字表批注/評論（見封存 NewTablesDesign.md §3.5、ImportDataContract.md §6.3）。
 * v1 只做原表批注只讀保留/展示；平台寫評論 Post-launch。
 * P1 只編譯模型；真實創建由 P2 導入流程完成。
 */
export interface IFaanJyutCommentLegacyMeta {
  sourceRow?: number
  sourceColumn?: string
  sourceCell?: string
  originalAuthor?: string
  originalTimestamp?: Date
  threadId?: string
  originalCommentId?: string
  replyToOriginalCommentId?: string
  ordinal?: number
  sanitized?: boolean
  threadedPlaceholder?: boolean
  importBatchId?: string
  [key: string]: unknown
}

export interface IFaanJyutCommentMentions {
  userIds?: string[]
  lexemeIds?: string[]
  sourceKeys?: string[]
}

export interface IFaanJyutComment {
  id: string
  targetType: 'lexeme' | 'cell' | 'externalEtymon' | 'sense' | 'column'
  targetId: string
  source: 'imported_excel_comment' | 'imported_google_comment' | 'user_comment'
  authorId?: string
  authorDisplay?: string
  content: string
  replyTo?: string
  isResolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  legacyMeta?: IFaanJyutCommentLegacyMeta
  mentions?: IFaanJyutCommentMentions
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const LegacyMetaSchema = new mongoose.Schema<IFaanJyutCommentLegacyMeta>({
  sourceRow: { type: Number },
  sourceColumn: { type: String },
  sourceCell: { type: String },
  originalAuthor: { type: String },
  originalTimestamp: { type: Date },
  threadId: { type: String },
  originalCommentId: { type: String },
  replyToOriginalCommentId: { type: String },
  ordinal: { type: Number },
  sanitized: { type: Boolean },
  threadedPlaceholder: { type: Boolean },
  importBatchId: { type: String }
}, { _id: false, strict: false })

const MentionsSchema = new mongoose.Schema<IFaanJyutCommentMentions>({
  userIds: [{ type: String }],
  lexemeIds: [{ type: String }],
  sourceKeys: [{ type: String }]
}, { _id: false })

const FaanJyutCommentSchema = new mongoose.Schema<IFaanJyutComment>({
  id: { type: String, required: true },
  targetType: { type: String, enum: ['lexeme', 'cell', 'externalEtymon', 'sense', 'column'], required: true },
  targetId: { type: String, required: true },
  source: { type: String, enum: ['imported_excel_comment', 'imported_google_comment', 'user_comment'], required: true },
  authorId: { type: String },
  authorDisplay: { type: String },
  content: { type: String, required: true },
  replyTo: { type: String },
  isResolved: { type: Boolean, required: true, default: false },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  legacyMeta: { type: LegacyMetaSchema },
  mentions: { type: MentionsSchema },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'faanjyut_comments'
})

// 泛粵批注查詢索引（見 NewTablesDesign.md §3.5；由 scripts/migrate-faanjyut-indexes.ts 管理）
FaanJyutCommentSchema.index({ id: 1 }, { unique: true })
FaanJyutCommentSchema.index({ targetType: 1, targetId: 1, createdAt: -1 })
FaanJyutCommentSchema.index({ 'legacyMeta.sourceRow': 1, 'legacyMeta.sourceColumn': 1 })
FaanJyutCommentSchema.index({ authorId: 1 })
FaanJyutCommentSchema.index({ isResolved: 1 })
FaanJyutCommentSchema.index({ source: 1 })
FaanJyutCommentSchema.index({ 'legacyMeta.importBatchId': 1 })

export const FaanJyutComment = mongoose.models.FaanJyutComment || mongoose.model<IFaanJyutComment>('FaanJyutComment', FaanJyutCommentSchema)
