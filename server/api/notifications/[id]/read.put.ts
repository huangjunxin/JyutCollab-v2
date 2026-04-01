/**
 * 標記通知為已讀
 */
import { Notification } from '../../../utils/Notification'
import { connectDB } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const userId = event.context.auth.id
  const notificationId = getRouterParam(event, 'id')

  if (!notificationId) {
    throw createError({
      statusCode: 400,
      message: '缺少通知ID'
    })
  }

  try {
    await connectDB()

    const notification = await Notification.findOneAndUpdate(
      { id: notificationId, userId },
      { isRead: true },
      { new: true }
    )

    if (!notification) {
      throw createError({
        statusCode: 404,
        message: '通知不存在或無權訪問'
      })
    }

    // 獲取剩餘未讀數量
    const unreadCount = await Notification.countDocuments({ userId, isRead: false })

    return {
      success: true,
      notification,
      unreadCount
    }
  } catch (error: any) {
    console.error('[Notification Read API]', error?.message || error)
    throw createError({
      statusCode: error.statusCode || 500,
      message: error?.message || '標記已讀失敗'
    })
  }
})
