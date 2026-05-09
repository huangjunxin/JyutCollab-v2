import { SavedView } from '../../utils/SavedView'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少視圖ID'
      })
    }

    const view = await SavedView.findOne({ id }).exec()
    if (!view) {
      throw createError({
        statusCode: 404,
        message: '視圖不存在或已被刪除'
      })
    }

    const userId = event.context.auth.id
    const userRole = event.context.auth.role
    const isOwner = view.creatorId === userId
    if (!isOwner && userRole !== 'admin') {
      throw createError({
        statusCode: 403,
        message: '無權刪除此視圖'
      })
    }

    await view.deleteOne()

    return {
      success: true,
      message: '視圖已刪除'
    }
  } catch (error: any) {
    console.error('Delete saved view error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '刪除視圖失敗，請稍後再試'
    })
  }
})
