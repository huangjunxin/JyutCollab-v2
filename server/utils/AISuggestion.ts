import mongoose from 'mongoose'
import type { SuggestionType, UserAction } from './types'

export interface IAISuggestion {
  _id: string
  entryId?: string
  suggestionType: SuggestionType
  originalContent?: string
  suggestedContent: string
  confidenceScore: number
  modelName: string
  promptVersion: string
  userAction: UserAction
  createdAt: Date
}

const AISuggestionSchema = new mongoose.Schema<IAISuggestion>({
  entryId: { type: String },
  suggestionType: {
    type: String,
    enum: ['theme_classification', 'definition', 'example'],
    required: true
  },
  originalContent: { type: String },
  suggestedContent: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5
  },
  modelName: {
    type: String,
    default: 'qwen/qwen3-235b-a22b-07-25'
  },
  promptVersion: {
    type: String,
    default: '1.0'
  },
  userAction: {
    type: String,
    enum: ['accepted', 'rejected', 'modified', 'pending'],
    default: 'pending'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'ai_suggestions'
})

// Indexes
AISuggestionSchema.index({ entryId: 1 })
AISuggestionSchema.index({ suggestionType: 1 })
AISuggestionSchema.index({ userAction: 1 })

export const AISuggestion = mongoose.models.AISuggestion || mongoose.model<IAISuggestion>('AISuggestion', AISuggestionSchema)
