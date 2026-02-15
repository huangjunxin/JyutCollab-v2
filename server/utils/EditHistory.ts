import mongoose from 'mongoose'

export interface IEditHistory {
  _id: string
  entryId: string
  userId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  changedFields: string[]
  action: 'create' | 'update' | 'delete' | 'status_change'
  comment?: string
  createdAt: Date
  isReverted: boolean
  revertedAt?: Date
  revertedBy?: string
}

const EditHistorySchema = new mongoose.Schema<IEditHistory>({
  entryId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  beforeSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  afterSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  changedFields: [{
    type: String
  }],
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'status_change'],
    required: true
  },
  comment: {
    type: String
  },
  isReverted: {
    type: Boolean,
    default: false
  },
  revertedAt: {
    type: Date
  },
  revertedBy: {
    type: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'edit_histories'
})

// Indexes
EditHistorySchema.index({ entryId: 1, createdAt: -1 })
EditHistorySchema.index({ userId: 1 })

export const EditHistory = mongoose.models.EditHistory || mongoose.model<IEditHistory>('EditHistory', EditHistorySchema)
