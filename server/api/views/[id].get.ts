import { SavedView } from '../../utils/SavedView'
import { connectDB } from '../../utils/db'
import { toPublicSavedViewDto, toSavedViewDto } from './response'

export default defineEventHandler(async (event) => {
  try {
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

    const session = await getUserSession(event).catch(() => null)
    const user = session?.user
    const isPrivateView = view.visibility !== 'public'
    const canAccessPrivateView = user && (view.creatorId === user.id || user.role === 'admin')
    if (isPrivateView && !canAccessPrivateView) {
      throw createError({
        statusCode: 404,
        message: '視圖不存在或已被刪除'
      })
    }

    return {
      success: true,
      data: isPrivateView ? toSavedViewDto(view) : toPublicSavedViewDto(view)
    }
  } catch (error: any) {
    console.error('Get saved view error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '載入視圖失敗'
    })
  }
})
