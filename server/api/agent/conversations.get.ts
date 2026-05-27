import { z } from 'zod'
import { AgentConversation } from '../../utils/AgentConversation'
import { connectDB } from '../../utils/db'

const QuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(50).default(30)
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後查看 AI 對話' })
  }

  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '對話查詢格式無效' })
  }

  await connectDB()
  const filter: Record<string, unknown> = { ownerId: event.context.auth.id }
  if (!parsed.data.includeArchived) filter.archivedAt = { $exists: false }
  const conversations = await AgentConversation.find(filter)
    .sort({ lastMessageAt: -1 })
    .limit(parsed.data.limit)
    .lean()

  return {
    conversations: conversations.map(conversation => ({
      id: conversation._id.toString(),
      title: conversation.title,
      channel: conversation.channel,
      lastMessageAt: conversation.lastMessageAt?.toISOString?.() || new Date(conversation.lastMessageAt).toISOString(),
      messageCount: conversation.messageCount || 0,
      lastSummary: conversation.lastSummary,
      archivedAt: conversation.archivedAt ? new Date(conversation.archivedAt).toISOString() : undefined,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString()
    }))
  }
})
