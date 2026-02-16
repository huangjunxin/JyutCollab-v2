import mongoose from 'mongoose'

interface IUserDialectPermission {
  dialectName: string
  role?: 'contributor' | 'reviewer'
}

export interface IUser {
  _id: string
  username: string
  email: string
  passwordHash: string
  displayName?: string
  avatarUrl?: string
  location?: string
  nativeDialect?: string
  role: 'contributor' | 'reviewer' | 'admin'
  bio?: string
  dialectPermissions: IUserDialectPermission[]
  contributionCount: number
  reviewCount: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new mongoose.Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  avatarUrl: {
    type: String
  },
  location: {
    type: String,
    maxlength: 100
  },
  nativeDialect: {
    type: String
  },
  role: {
    type: String,
    enum: ['contributor', 'reviewer', 'admin'],
    default: 'contributor'
  },
  bio: {
    type: String,
    maxlength: 500
  },
  dialectPermissions: [{
    dialectName: { type: String, required: true },
    role: { type: String, enum: ['contributor', 'reviewer'] }
  }],
  contributionCount: {
    type: Number,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'users'
})

// email/username already have unique: true on schema, which creates indexes — no extra index() needed

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
