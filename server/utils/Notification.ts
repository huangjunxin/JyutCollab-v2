import mongoose from 'mongoose'

export type NotificationType = 'review_approved' | 'review_rejected' | 'draft_reminder' | 'system'

export interface INotification {
  _id: string
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  metadata?: {
    entryId?: string
    headword?: string
    dialect?: string
    reviewNotes?: string
    reviewedBy?: string
  }
  createdAt: Date
}

const NotificationSchema = new mongoose.Schema<INotification>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['review_approved', 'review_rejected', 'draft_reminder', 'system']
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  actionUrl: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  metadata: {
    entryId: { type: String },
    headword: { type: String },
    dialect: { type: String },
    reviewNotes: { type: String },
    reviewedBy: { type: String }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
})

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 })
NotificationSchema.index({ userId: 1, isRead: 1 })

// Auto-generate id
NotificationSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = new mongoose.Types.ObjectId().toString()
  }
  next()
})

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

/**
 * 創建審核通過通知
 */
export async function createApprovedNotification(
  userId: string,
  entryId: string,
  headword: string,
  dialect: string
) {
  return Notification.create({
    userId,
    type: 'review_approved',
    title: '詞條已通過審核',
    message: `您的詞條「${headword}」已通過審核並發佈`,
    actionUrl: `/entries?search=${entryId}`,
    isRead: false,
    metadata: { entryId, headword, dialect }
  })
}

/**
 * 創建審核拒絕通知
 */
export async function createRejectedNotification(
  userId: string,
  entryId: string,
  headword: string,
  dialect: string,
  reviewNotes?: string,
  reviewedBy?: string
) {
  return Notification.create({
    userId,
    type: 'review_rejected',
    title: '詞條被拒絕',
    message: `您的詞條「${headword}」被拒絕${reviewNotes ? `：${reviewNotes}` : ''}`,
    actionUrl: `/entries?search=${entryId}`,
    isRead: false,
    metadata: { entryId, headword, dialect, reviewNotes, reviewedBy }
  })
}

/**
 * 創建草稿提醒通知
 */
export async function createDraftReminderNotification(
  userId: string,
  entryId: string,
  headword: string
) {
  return Notification.create({
    userId,
    type: 'draft_reminder',
    title: '草稿提醒',
    message: `您有未完成的詞條草稿「${headword || '未命名'}」`,
    actionUrl: `/entries?search=${entryId}`,
    isRead: false,
    metadata: { entryId, headword }
  })
}

/**
 * 創建系統公告通知
 */
export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  return Notification.create({
    userId,
    type: 'system',
    title,
    message,
    actionUrl,
    isRead: false
  })
}

/**
 * 安全建立通知：失敗時記錄錯誤但不拋出異常，避免影響審核主流程
 */
export async function createNotificationSafely(payload: {
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  metadata?: {
    entryId?: string
    headword?: string
    dialect?: string
    reviewNotes?: string
    reviewedBy?: string
  }
}) {
  try {
    return await Notification.create({
      ...payload,
      isRead: false
    })
  } catch (error) {
    console.error('[Notification] 建立通知失敗:', error)
    return null
  }
}

/**
 * 取得詞條的通知接收者：createdBy 與 updatedBy 去重，並排除本次操作者
 */
export function getEntryNotificationRecipients(
  entry: { createdBy?: string; updatedBy?: string },
  actorUserId: string
): string[] {
  return [...new Set([entry.createdBy, entry.updatedBy].filter(Boolean))]
    .filter((userId): userId is string => !!userId && userId !== actorUserId)
}
