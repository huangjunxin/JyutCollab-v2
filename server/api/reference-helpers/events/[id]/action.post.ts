import { z } from 'zod'
import { ReferenceHelperEvent } from '../../../../utils/ReferenceHelperEvent'
import { connectDB } from '../../../../utils/db'
import { formatZodErrorToMessage } from '../../../../utils/validation'

const ActionSchema = z.object({
  action: z.enum(['accepted', 'rejected', 'modified']),
  entryId: z.string().optional(),
  clientEntryKey: z.string().optional(),
  lexemeId: z.string().optional(),
  field: z.string().optional(),
  acceptedContent: z.unknown().optional(),
  finalContent: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const auth = event.context.auth
    if (!auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少參考資料輔助事件 ID'
      })
    }

    const body = await readBody(event)
    const validated = ActionSchema.safeParse(body)

    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({
        statusCode: 400,
        message
      })
    }

    await connectDB()

    const referenceEvent = await ReferenceHelperEvent.findById(id)
    if (!referenceEvent) {
      throw createError({
        statusCode: 404,
        message: '找不到參考資料輔助事件記錄'
      })
    }

    const canUpdate = referenceEvent.shownTo === auth.id || auth.role === 'reviewer' || auth.role === 'admin'
    if (!canUpdate) {
      throw createError({
        statusCode: 403,
        message: '無權更新此參考資料輔助事件記錄'
      })
    }

    const data = validated.data
    const now = new Date()

    if (data.entryId !== undefined) referenceEvent.entryId = data.entryId
    if (data.clientEntryKey !== undefined) referenceEvent.clientEntryKey = data.clientEntryKey
    if (data.lexemeId !== undefined) referenceEvent.lexemeId = data.lexemeId
    if (data.field !== undefined) referenceEvent.field = data.field

    referenceEvent.userAction = data.action
    referenceEvent.actionBy = auth.id

    if (data.action === 'accepted') {
      referenceEvent.acceptedAt = now
      if (data.acceptedContent !== undefined) referenceEvent.acceptedContent = data.acceptedContent
    }

    if (data.action === 'rejected') {
      referenceEvent.rejectedAt = now
    }

    if (data.action === 'modified') {
      referenceEvent.modifiedAt = now
      if (data.finalContent !== undefined) referenceEvent.finalContent = data.finalContent
    }

    if (data.metadata) {
      referenceEvent.metadata = {
        ...(typeof referenceEvent.metadata === 'object' && referenceEvent.metadata !== null ? referenceEvent.metadata as Record<string, unknown> : {}),
        ...data.metadata
      }
    }

    await referenceEvent.save()

    return {
      success: true,
      data: {
        id: referenceEvent._id.toString(),
        userAction: referenceEvent.userAction
      }
    }
  } catch (error: any) {
    console.error('[Reference Helper Action] Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error?.message || '更新參考資料輔助事件失敗'
    })
  }
})
