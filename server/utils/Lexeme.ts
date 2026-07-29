import mongoose from 'mongoose'

/** 泛粵字表行級 meta（見 NewTablesDesign.md §2.1、ImportDataContract.md §5.1） */
export interface ILexemeMeta {
  sourceBook?: string
  sourceWorkbook?: string
  sourceSheet?: string
  sourceRow?: number
  matrixOrder?: number
  sourceKey?: string
  keyAliases?: string[]
  compositePronunciation?: {
    raw?: string
    display?: string
    markers?: {
      hasQuestion?: boolean
      hasBang?: boolean
    }
  }
  representativeChar?: {
    raw?: string
    display?: string
    warnings?: string[]
  }
  commonCharCandidates?: string
  definitionRaw?: string
  sourceFlags?: string[]
  importBatchId?: string
  editedAfterImport?: boolean
  createdBy?: string
  updatedBy?: string
  lastChangeReason?: string
  [key: string]: any
}

export interface ILexemeStatus {
  publicationStatus?: 'draft' | 'published' | 'archived'
  qualityStatus?: 'unreviewed_import' | 'needs_work' | 'checked' | 'locked' | 'pending_delete'
}

export interface ILexeme {
  id: string
  /** 備註／詞義範圍等（可選） */
  notes?: string
  meta?: ILexemeMeta
  status?: ILexemeStatus
}

const LexemeMetaSchema = new mongoose.Schema<ILexemeMeta>({
  sourceBook: { type: String },
  sourceWorkbook: { type: String },
  sourceSheet: { type: String },
  sourceRow: { type: Number },
  matrixOrder: { type: Number },
  sourceKey: { type: String },
  keyAliases: [{ type: String }],
  compositePronunciation: {
    raw: { type: String },
    display: { type: String },
    markers: {
      hasQuestion: { type: Boolean },
      hasBang: { type: Boolean }
    }
  },
  representativeChar: {
    raw: { type: String },
    display: { type: String },
    warnings: [{ type: String }]
  },
  commonCharCandidates: { type: String },
  definitionRaw: { type: String },
  sourceFlags: [{ type: String }],
  importBatchId: { type: String },
  editedAfterImport: { type: Boolean },
  createdBy: { type: String },
  updatedBy: { type: String },
  lastChangeReason: { type: String }
}, { _id: false, strict: false })

const LexemeStatusSchema = new mongoose.Schema<ILexemeStatus>({
  publicationStatus: { type: String, enum: ['draft', 'published', 'archived'] },
  qualityStatus: { type: String, enum: ['unreviewed_import', 'needs_work', 'checked', 'locked', 'pending_delete'] }
}, { _id: false })

const LexemeSchema = new mongoose.Schema<ILexeme>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  notes: {
    type: String
  },
  meta: { type: LexemeMetaSchema, default: () => ({}) },
  status: { type: LexemeStatusSchema, default: () => ({}) }
}, {
  timestamps: true,
  collection: 'lexemes'
})

// 泛粵字表查詢索引（見 NewTablesDesign.md §2.1；殘留/新增索引由 scripts/migrate-faanjyut-indexes.ts 管理）
LexemeSchema.index(
  { 'meta.sourceBook': 1, 'meta.sourceKey': 1 },
  { unique: true, partialFilterExpression: { 'meta.sourceBook': 'faanjyut' } }
)
LexemeSchema.index({ 'meta.sourceBook': 1, 'meta.sourceRow': 1 })
LexemeSchema.index({ 'meta.sourceBook': 1, 'status.publicationStatus': 1, 'meta.matrixOrder': 1, id: 1 })
LexemeSchema.index({ 'meta.importBatchId': 1 })
LexemeSchema.index({ 'status.publicationStatus': 1, 'status.qualityStatus': 1 })

export const Lexeme = mongoose.models.Lexeme || mongoose.model<ILexeme>('Lexeme', LexemeSchema)
