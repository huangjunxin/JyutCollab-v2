import { AgentConversation } from '../../../../utils/AgentConversation'
import { isValidAgentConversationId } from '../../../../utils/agent/persistence'
import { connectDB } from '../../../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後封存 AI 對話' })
  }

  const id = getRouterParam(event, 'id')
  if (!isValidAgentConversationId(id)) {
    throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
  }
  await connectDB()
  const conversation = await AgentConversation.findOneAndUpdate(
    { _id: id, ownerId: event.context.auth.id },
    { $set: { archivedAt: new Date() } },
    { returnDocument: 'after' }
  ).lean()

  if (!conversation) {
    throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
  }

  return { ok: true }
})
