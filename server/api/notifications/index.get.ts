/**
 * 獲取當前用戶的通知列表
 */
import { Notification } from '../../utils/Notification'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const userId = event.context.auth.id
  const query = getQuery(event)
  const page = parseInt(query.page as string) || 1
  const perPage = parseInt(query.perPage as string) || 20
  const unreadOnly = query.unreadOnly === 'true'

  try {
    await connectDB()

    const filter: any = { userId }
    if (unreadOnly) {
      filter.isRead = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId, isRead: false })
    ])

    return {
      data: notifications,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      },
      unreadCount
    }
  } catch (error: any) {
    console.error('[Notifications API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取通知失敗'
    })
  }
})
