import mongoose from 'mongoose'

export interface ITheme {
  _id: string
  id: number  // 60-498 for L3 themes
  name: string
  nameEn?: string
  parentId?: number
  level: 1 | 2 | 3
  description?: string
  sortOrder: number
  icon?: string
  color?: string
  isActive: boolean
  expressionCount: number
  createdAt: Date
  updatedAt: Date
}

const ThemeSchema = new mongoose.Schema<ITheme>({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  nameEn: { type: String },
  parentId: { type: Number },
  level: {
    type: Number,
    enum: [1, 2, 3],
    required: true
  },
  description: { type: String },
  sortOrder: { type: Number, default: 0 },
  icon: { type: String },
  color: { type: String },
  isActive: { type: Boolean, default: true },
  expressionCount: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'themes'
})

// Indexes
ThemeSchema.index({ id: 1 })
ThemeSchema.index({ parentId: 1 })
ThemeSchema.index({ level: 1 })

export const Theme = mongoose.models.Theme || mongoose.model<ITheme>('Theme', ThemeSchema)
