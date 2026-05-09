import { SavedView } from '../../utils/SavedView'
import { connectDB } from '../../utils/db'
import { toSavedViewDto } from './response'

export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const userId = event.context.auth.id
    const views = await SavedView.find({
      $or: [
        { creatorId: userId },
        { visibility: 'public' }
      ]
    }).sort({ updatedAt: -1 }).exec()

    return {
      success: true,
      data: views.map(toSavedViewDto)
    }
  } catch (error: any) {
    console.error('List saved views error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '載入視圖列表失敗'
    })
  }
})
