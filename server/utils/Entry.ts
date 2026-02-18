import mongoose from 'mongoose'
import type { Region, EntryStatus, EntryType, Register, MorphemeRef } from './types'

// Interfaces
export interface IExample {
  text: string
  jyutping?: string
  translation?: string
  explanation?: string
  scenario?: string
  source?: 'user_generated' | 'ai_generated' | 'literature' | 'media'
  isFeatured?: boolean
}

export interface ISubSense {
  label: string
  definition: string
  examples?: IExample[]
}

export interface ISense {
  definition: string
  label?: string
  examples?: IExample[]
  /** Cloudinary public_id 列表，用於釋義配圖 */
  images?: string[]
  subSenses?: ISubSense[]
}

export interface IPhonetic {
  original?: string | string[]
  jyutping?: string[]
  toneSandhi?: string[]
}

export interface IHeadword {
  display: string
  search: string
  normalized: string
  isPlaceholder: boolean
}

export interface IDialect {
  name: string
  regionCode?: string
}

export interface IEntryRef {
  type: 'word' | 'section'
  target: string
  url?: string
}

export interface IThemeClassification {
  level1?: string
  level2?: string
  level3?: string
  level1Id?: number
  level2Id?: number
  level3Id?: number
}

export interface IEntryMeta {
  category?: string
  pos?: string
  etymology?: string
  register?: Register
  region?: string
  usage?: string
  notes?: string
  [key: string]: any
}

export interface IEntry {
  _id: string
  id: string
  lexemeId?: string
  morphemeRefs?: MorphemeRef[]
  sourceBook?: string
  dialect: IDialect
  headword: IHeadword
  phonetic: IPhonetic
  entryType: EntryType
  senses: ISense[]
  refs?: IEntryRef[]
  theme: IThemeClassification
  meta: IEntryMeta
  status: EntryStatus
  createdBy: string
  updatedBy?: string
  reviewedBy?: string
  reviewedAt?: Date
  reviewNotes?: string
  viewCount: number
  likeCount: number
  createdAt: Date
  updatedAt: Date
}

// Schemas
const ExampleSchema = new mongoose.Schema<IExample>({
  text: { type: String, required: true },
  jyutping: { type: String },
  translation: { type: String },
  explanation: { type: String },
  scenario: { type: String },
  source: {
    type: String,
    enum: ['user_generated', 'ai_generated', 'literature', 'media'],
    default: 'user_generated'
  },
  isFeatured: { type: Boolean, default: false }
}, { _id: false })

const SubSenseSchema = new mongoose.Schema<ISubSense>({
  label: { type: String, required: true },
  definition: { type: String, required: true },
  examples: [ExampleSchema]
}, { _id: false })

const SenseSchema = new mongoose.Schema<ISense>({
  definition: { type: String, required: true },
  label: { type: String },
  examples: [ExampleSchema],
  images: [{ type: String }],
  subSenses: [SubSenseSchema]
}, { _id: false })

const PhoneticSchema = new mongoose.Schema<IPhonetic>({
  original: { type: mongoose.Schema.Types.Mixed },
  jyutping: [{ type: String }],
  toneSandhi: [{ type: String }]
}, { _id: false })

const HeadwordSchema = new mongoose.Schema<IHeadword>({
  display: { type: String, required: true },
  normalized: { type: String, required: true },
  isPlaceholder: { type: Boolean, default: false },
  // 異形／其他詞形列表
  variants: [{ type: String }]
}, { _id: false })

const DialectSchema = new mongoose.Schema<IDialect>({
  name: { type: String, required: true },
  regionCode: { type: String }
}, { _id: false })

const EntryRefSchema = new mongoose.Schema<IEntryRef>({
  type: { type: String, enum: ['word', 'section'], required: true },
  target: { type: String, required: true },
  url: { type: String }
}, { _id: false })

const ThemeClassificationSchema = new mongoose.Schema<IThemeClassification>({
  level1: { type: String },
  level2: { type: String },
  level3: { type: String },
  level1Id: { type: Number },
  level2Id: { type: Number },
  level3Id: { type: Number }
}, { _id: false })

const EntryMetaSchema = new mongoose.Schema<IEntryMeta>({
  category: { type: String },
  pos: { type: String },
  etymology: { type: String },
  register: { type: String, enum: ['口語', '書面', '粗俗', '文雅', '中性'] },
  region: { type: String },
  usage: { type: String },
  notes: { type: String }
}, { _id: false, strict: false })

// Main Entry Schema
const EntrySchema = new mongoose.Schema<IEntry>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  lexemeId: {
    type: String
  },
  morphemeRefs: [{
    targetEntryId: { type: String },
    position: { type: Number },
    char: { type: String },
    jyutping: { type: String },
    note: { type: String }
  }],
  sourceBook: { type: String },
  dialect: { type: DialectSchema, required: true },
  headword: { type: HeadwordSchema, required: true },
  phonetic: { type: PhoneticSchema, default: () => ({}) },
  entryType: {
    type: String,
    enum: ['character', 'word', 'phrase'],
    default: 'word'
  },
  senses: [SenseSchema],
  refs: [EntryRefSchema],
  theme: { type: ThemeClassificationSchema, default: () => ({}) },
  meta: { type: EntryMetaSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'approved', 'rejected'],
    default: 'draft'
  },
  createdBy: {
    type: String,
    required: true
  },
  updatedBy: { type: String },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
  viewCount: { type: Number, default: 0 },
  likeCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'entries'
})

// Indexes
EntrySchema.index({ 'headword.display': 1, 'dialect.name': 1 }, { unique: true })
// 其他索引
EntrySchema.index({ status: 1 })
EntrySchema.index({ createdBy: 1 })
EntrySchema.index({ 'theme.level1Id': 1, 'theme.level2Id': 1, 'theme.level3Id': 1 })
EntrySchema.index({ 'dialect.name': 1 })
EntrySchema.index({ entryType: 1 })
EntrySchema.index({ createdAt: -1 })

// Pre-save hook：僅確保 normalized 存在；search/variants 由 API 層負責
EntrySchema.pre('save', function() {
  if (this.headword) {
    if (!this.headword.normalized || this.headword.normalized.trim() === '') {
      this.headword.normalized = this.headword.display
    }
  }
})

export const Entry = mongoose.models.Entry || mongoose.model<IEntry>('Entry', EntrySchema)
