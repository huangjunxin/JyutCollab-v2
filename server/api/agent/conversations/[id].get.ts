import { AgentConversation } from '../../../utils/AgentConversation'
import { isValidAgentConversationId } from '../../../utils/agent/persistence'
import { connectDB } from '../../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後查看 AI 對話' })
  }

  const id = getRouterParam(event, 'id')
  if (!isValidAgentConversationId(id)) {
    throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
  }
  await connectDB()
  const conversation = await AgentConversation.findOne({ _id: id, ownerId: event.context.auth.id }).lean()
  if (!conversation) {
    throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
  }

  return {
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      channel: conversation.channel,
      lastMessageAt: new Date(conversation.lastMessageAt).toISOString(),
      messageCount: conversation.messageCount || 0,
      lastSummary: conversation.lastSummary,
      archivedAt: conversation.archivedAt ? new Date(conversation.archivedAt).toISOString() : undefined,
      createdAt: new Date(conversation.createdAt).toISOString(),
      updatedAt: new Date(conversation.updatedAt).toISOString()
    }
  }
})
