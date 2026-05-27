import { AgentConversation } from '../../../../utils/AgentConversation'
import { AgentMessage } from '../../../../utils/AgentMessage'
import { connectDB } from '../../../../utils/db'
import { isValidAgentConversationId, serializeAgentMessage } from '../../../../utils/agent/persistence'

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

  const messages = await AgentMessage.find({ conversationId: conversation._id.toString(), ownerId: event.context.auth.id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean()

  return { messages: messages.map(serializeAgentMessage) }
})
