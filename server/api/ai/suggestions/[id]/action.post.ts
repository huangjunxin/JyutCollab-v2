import { z } from 'zod'
import { AISuggestion } from '../../../../utils/AISuggestion'
import { connectDB } from '../../../../utils/db'
import { formatZodErrorToMessage } from '../../../../utils/validation'

const ActionSchema = z.object({
  action: z.enum(['accepted', 'rejected', 'modified', 'ignored']),
  entryId: z.string().optional(),
  clientEntryKey: z.string().optional(),
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
        message: '缺少建議 ID'
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

    const suggestion = await AISuggestion.findById(id)
    if (!suggestion) {
      throw createError({
        statusCode: 404,
        message: '找不到 AI 建議記錄'
      })
    }

    const canUpdate = suggestion.suggestedTo === auth.id || auth.role === 'reviewer' || auth.role === 'admin'
    if (!canUpdate) {
      throw createError({
        statusCode: 403,
        message: '無權更新此 AI 建議記錄'
      })
    }

    const data = validated.data
    const now = new Date()

    if (data.entryId !== undefined) suggestion.entryId = data.entryId
    if (data.clientEntryKey !== undefined) suggestion.clientEntryKey = data.clientEntryKey
    if (data.field !== undefined) suggestion.field = data.field

    suggestion.userAction = data.action
    suggestion.actionBy = auth.id

    if (data.action === 'accepted') {
      suggestion.acceptedAt = now
      if (data.acceptedContent !== undefined) suggestion.acceptedContent = data.acceptedContent
    }

    if (data.action === 'rejected') {
      suggestion.rejectedAt = now
    }

    if (data.action === 'modified') {
      suggestion.modifiedAt = now
      if (data.finalContent !== undefined) suggestion.finalContent = data.finalContent
    }

    if (data.action === 'ignored') {
      suggestion.ignoredAt = now
    }

    if (data.metadata) {
      suggestion.metadata = {
        ...(typeof suggestion.metadata === 'object' && suggestion.metadata !== null ? suggestion.metadata as Record<string, unknown> : {}),
        ...data.metadata
      }
    }

    await suggestion.save()

    return {
      success: true,
      data: {
        id: suggestion._id.toString(),
        userAction: suggestion.userAction
      }
    }
  } catch (error: any) {
    console.error('[AI Suggestion Action] Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error?.message || '更新 AI 建議記錄失敗'
    })
  }
})
