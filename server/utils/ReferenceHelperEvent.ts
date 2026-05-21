import mongoose from 'mongoose'

export type ReferenceHelperType =
  | 'jyutdict_pronunciation'
  | 'jyutjyu_template'
  | 'internal_dialect_template'
  | 'manual_reference_search'
  | 'morpheme_search'
  | 'morpheme_linked'
  | 'morpheme_unlinked'
  | 'external_etymon'

export type ReferenceHelperProvider =
  | 'jyutdict'
  | 'jyutjyu'
  | 'internal'
  | 'manual'
  | 'morpheme'
  | 'external_etymon'

export type ReferenceHelperAction = 'accepted' | 'rejected' | 'modified' | 'pending'

export interface IReferenceHelperEvent {
  _id: string
  entryId?: string
  clientEntryKey?: string
  lexemeId?: string
  shownTo: string
  actionBy?: string
  helperType: ReferenceHelperType
  sourceProvider?: ReferenceHelperProvider
  field?: string
  sourceEntryId?: string
  sourceLexemeId?: string
  query?: string
  resultCount?: number
  originalContent?: unknown
  suggestedContent?: unknown
  acceptedContent?: unknown
  finalContent?: unknown
  userAction: ReferenceHelperAction
  acceptedAt?: Date
  rejectedAt?: Date
  modifiedAt?: Date
  metadata?: unknown
  createdAt: Date
  updatedAt: Date
}

export const REFERENCE_HELPER_TYPES: ReferenceHelperType[] = [
  'jyutdict_pronunciation',
  'jyutjyu_template',
  'internal_dialect_template',
  'manual_reference_search',
  'morpheme_search',
  'morpheme_linked',
  'morpheme_unlinked',
  'external_etymon'
]

export const REFERENCE_HELPER_LABELS: Record<ReferenceHelperType, string> = {
  jyutdict_pronunciation: '泛粵典粵拼',
  jyutjyu_template: 'Jyutjyu 參考',
  internal_dialect_template: '其他方言參考',
  manual_reference_search: '手動參考搜尋',
  morpheme_search: '語素搜尋',
  morpheme_linked: '已連結語素',
  morpheme_unlinked: '未連結語素',
  external_etymon: '域外方音'
}

const ReferenceHelperEventSchema = new mongoose.Schema<IReferenceHelperEvent>({
  entryId: { type: String },
  clientEntryKey: { type: String },
  lexemeId: { type: String },
  shownTo: { type: String, required: true },
  actionBy: { type: String },
  helperType: {
    type: String,
    enum: REFERENCE_HELPER_TYPES,
    required: true
  },
  sourceProvider: {
    type: String,
    enum: ['jyutdict', 'jyutjyu', 'internal', 'manual', 'morpheme', 'external_etymon']
  },
  field: { type: String },
  sourceEntryId: { type: String },
  sourceLexemeId: { type: String },
  query: { type: String },
  resultCount: { type: Number, min: 0 },
  originalContent: { type: mongoose.Schema.Types.Mixed },
  suggestedContent: { type: mongoose.Schema.Types.Mixed },
  acceptedContent: { type: mongoose.Schema.Types.Mixed },
  finalContent: { type: mongoose.Schema.Types.Mixed },
  userAction: {
    type: String,
    enum: ['accepted', 'rejected', 'modified', 'pending'],
    default: 'pending'
  },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  modifiedAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'reference_helper_events'
})

ReferenceHelperEventSchema.index({ shownTo: 1, createdAt: -1 })
ReferenceHelperEventSchema.index({ entryId: 1, createdAt: -1 })
ReferenceHelperEventSchema.index({ clientEntryKey: 1 })
ReferenceHelperEventSchema.index({ lexemeId: 1, createdAt: -1 })
ReferenceHelperEventSchema.index({ helperType: 1, userAction: 1 })
ReferenceHelperEventSchema.index({ sourceProvider: 1, userAction: 1 })

export const ReferenceHelperEvent = mongoose.models.ReferenceHelperEvent || mongoose.model<IReferenceHelperEvent>('ReferenceHelperEvent', ReferenceHelperEventSchema)
