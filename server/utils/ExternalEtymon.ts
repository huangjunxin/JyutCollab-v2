import mongoose from 'mongoose'

/** 泛粵字表域外整理項 meta（見 NewTablesDesign.md §2.2、ImportDataContract.md §5.3） */
export interface IExternalEtymonMeta {
  sourceBook?: 'faanjyut'
  sourceWorkbook?: string
  sourceSheet?: string
  sourceColumn?: string
  sourceColumnIndex?: number
  sourceRow?: number
  sourceCell?: string
  segmentIndex?: number
  importBatchId?: string
  parseWarnings?: string[]
  softDeleted?: boolean
  editedAfterImport?: boolean
  [key: string]: any
}

export interface IExternalEtymon {
  id: string
  lexemeId: string
  languageCode: string
  dialectName?: string
  scriptForm: string
  phonetic?: string
  gloss?: string
  sourceType?: 'fieldwork' | 'dictionary' | 'literature' | 'corpus'
  sourceDetail?: string
  note?: string
  /** 域外原始格內容（泛粵導入保留 raw） */
  raw?: string
  meta?: IExternalEtymonMeta
  createdBy: string
}

const ExternalEtymonMetaSchema = new mongoose.Schema<IExternalEtymonMeta>({
  sourceBook: { type: String, enum: ['faanjyut'] },
  sourceWorkbook: { type: String },
  sourceSheet: { type: String },
  sourceColumn: { type: String },
  sourceColumnIndex: { type: Number },
  sourceRow: { type: Number },
  sourceCell: { type: String },
  segmentIndex: { type: Number },
  importBatchId: { type: String },
  parseWarnings: [{ type: String }],
  softDeleted: { type: Boolean },
  editedAfterImport: { type: Boolean }
}, { _id: false, strict: false })

const ExternalEtymonSchema = new mongoose.Schema<IExternalEtymon>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  lexemeId: {
    type: String,
    required: true,
    index: true
  },
  languageCode: {
    type: String,
    required: true
  },
  dialectName: {
    type: String
  },
  scriptForm: {
    type: String,
    required: true
  },
  phonetic: {
    type: String
  },
  gloss: {
    type: String
  },
  sourceType: {
    type: String,
    enum: ['fieldwork', 'dictionary', 'literature', 'corpus']
  },
  sourceDetail: {
    type: String
  },
  note: {
    type: String
  },
  raw: {
    type: String
  },
  meta: { type: ExternalEtymonMetaSchema, default: () => ({}) },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'external_etymons'
})

// 泛粵字表查詢索引（見 NewTablesDesign.md §2.2；殘留/新增索引由 scripts/migrate-faanjyut-indexes.ts 管理）
ExternalEtymonSchema.index({ lexemeId: 1, languageCode: 1 })
ExternalEtymonSchema.index({ 'meta.importBatchId': 1 })
ExternalEtymonSchema.index({ 'meta.sourceRow': 1, 'meta.sourceColumn': 1 })
ExternalEtymonSchema.index({ 'meta.softDeleted': 1 })

export const ExternalEtymon = mongoose.models.ExternalEtymon || mongoose.model<IExternalEtymon>('ExternalEtymon', ExternalEtymonSchema)
