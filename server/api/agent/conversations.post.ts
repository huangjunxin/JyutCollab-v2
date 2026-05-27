import { z } from 'zod'
import { ensureAgentConversation } from '../../utils/agent/persistence'

const BodySchema = z.object({
  title: z.string().trim().max(80).optional(),
  route: z.string().trim().max(500).optional()
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後建立 AI 對話' })
  }

  const parsed = BodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '對話建立格式無效' })
  }

  const conversation = await ensureAgentConversation({
    actorId: event.context.auth.id,
    channel: 'web',
    title: parsed.data.title || '新對話',
    route: parsed.data.route
  })

  return {
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      channel: conversation.channel,
      lastMessageAt: new Date(conversation.lastMessageAt).toISOString(),
      messageCount: conversation.messageCount,
      lastSummary: conversation.lastSummary,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString()
    }
  }
})
