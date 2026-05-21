import mongoose from 'mongoose'
import type { SuggestionType, UserAction } from './types'

export interface IAISuggestion {
  _id: string
  entryId?: string
  clientEntryKey?: string
  suggestedTo: string
  actionBy?: string
  suggestionType: Extract<SuggestionType, 'theme_classification' | 'definition' | 'example' | 'register'>
  field: string
  originalContent?: unknown
  suggestedContent: unknown
  acceptedContent?: unknown
  finalContent?: unknown
  confidenceScore?: number
  modelName: string
  promptVersion: string
  userAction: UserAction
  acceptedAt?: Date
  rejectedAt?: Date
  modifiedAt?: Date
  metadata?: unknown
  createdAt: Date
  updatedAt: Date
}

const AISuggestionSchema = new mongoose.Schema<IAISuggestion>({
  entryId: { type: String },
  clientEntryKey: { type: String },
  suggestedTo: { type: String, required: true },
  actionBy: { type: String },
  suggestionType: {
    type: String,
    enum: ['theme_classification', 'definition', 'example', 'register'],
    required: true
  },
  field: { type: String, required: true },
  originalContent: { type: mongoose.Schema.Types.Mixed },
  suggestedContent: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  acceptedContent: { type: mongoose.Schema.Types.Mixed },
  finalContent: { type: mongoose.Schema.Types.Mixed },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  modelName: {
    type: String,
    default: 'deepseek-v4-flash'
  },
  promptVersion: {
    type: String,
    default: '1.0'
  },
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
  collection: 'ai_suggestions'
})

// Indexes
AISuggestionSchema.index({ suggestedTo: 1, createdAt: -1 })
AISuggestionSchema.index({ entryId: 1, createdAt: -1 })
AISuggestionSchema.index({ clientEntryKey: 1 })
AISuggestionSchema.index({ suggestionType: 1, userAction: 1 })
AISuggestionSchema.index({ field: 1 })

export const AISuggestion = mongoose.models.AISuggestion || mongoose.model<IAISuggestion>('AISuggestion', AISuggestionSchema)
