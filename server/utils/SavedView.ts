import mongoose from 'mongoose'

export type SavedViewVisibility = 'public' | 'private'

export interface ISavedView {
  _id: string
  id: string
  name: string
  creatorId: string
  creatorName?: string
  visibility: SavedViewVisibility
  state: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const SavedViewSchema = new mongoose.Schema<ISavedView>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  creatorId: {
    type: String,
    required: true
  },
  creatorName: {
    type: String
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true,
  collection: 'savedviews'
})

SavedViewSchema.index({ creatorId: 1 })
SavedViewSchema.index({ visibility: 1 })
SavedViewSchema.index({ creatorId: 1, visibility: 1 })

export const SavedView = mongoose.models.SavedView || mongoose.model<ISavedView>('SavedView', SavedViewSchema)
