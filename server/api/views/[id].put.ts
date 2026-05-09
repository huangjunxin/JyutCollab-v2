import { z } from 'zod'
import { SavedView } from '../../utils/SavedView'
import { connectDB } from '../../utils/db'
import { convertToHongKongTraditional } from '../../utils/textConversion'
import { validateSavedViewState } from './validation'
import { toSavedViewDto } from './response'

const UpdateSavedViewSchema = z.strictObject({
  name: z.string().trim().min(1, '視圖名稱不能為空').max(100, '視圖名稱過長').optional(),
  visibility: z.enum(['public', 'private']).optional(),
  state: z.unknown().optional()
}).refine(data => data.name !== undefined || data.visibility !== undefined || data.state !== undefined, {
  message: '請提供要更新的視圖資料'
})

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
        message: '無權編輯此視圖'
      })
    }

    const body = await readBody(event)
    const validated = UpdateSavedViewSchema.safeParse(body)
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: validated.error.issues[0]?.message || '請求資料無效'
      })
    }

    const data = validated.data
    if (data.name !== undefined) {
      view.name = convertToHongKongTraditional(data.name)
    }
    if (data.visibility !== undefined) {
      view.visibility = data.visibility
    }
    if (data.state !== undefined) {
      view.state = validateSavedViewState(data.state)
    }

    await view.save()

    return {
      success: true,
      data: toSavedViewDto(view)
    }
  } catch (error: any) {
    console.error('Update saved view error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新視圖失敗，請稍後再試'
    })
  }
})
