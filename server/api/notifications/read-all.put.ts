/**
 * 標記所有通知為已讀
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

  try {
    await connectDB()

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    )

    return { success: true }
  } catch (error: any) {
    console.error('[Notification Read All API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '標記全部已讀失敗'
    })
  }
})
