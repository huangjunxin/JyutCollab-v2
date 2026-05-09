import { nanoid } from 'nanoid'
import { z } from 'zod'
import { SavedView } from '../../utils/SavedView'
import { connectDB } from '../../utils/db'
import { convertToHongKongTraditional } from '../../utils/textConversion'
import { validateSavedViewState } from './validation'
import { toSavedViewDto } from './response'

const CreateSavedViewSchema = z.strictObject({
  name: z.string().trim().min(1, '視圖名稱不能為空').max(100, '視圖名稱過長'),
  visibility: z.enum(['public', 'private']),
  state: z.unknown()
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

    const body = await readBody(event)
    const validated = CreateSavedViewSchema.safeParse(body)
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: validated.error.issues[0]?.message || '請求資料無效'
      })
    }

    const data = validated.data
    const state = validateSavedViewState(data.state)
    const userId = event.context.auth.id
    const creatorName = event.context.auth.displayName || event.context.auth.username

    const view = await SavedView.create({
      id: `view_${nanoid(12)}`,
      name: convertToHongKongTraditional(data.name),
      creatorId: userId,
      creatorName,
      visibility: data.visibility,
      state
    })

    return {
      success: true,
      data: toSavedViewDto(view)
    }
  } catch (error: any) {
    console.error('Create saved view error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '儲存視圖失敗，請稍後再試'
    })
  }
})
