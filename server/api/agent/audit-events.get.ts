import { z } from 'zod'
import { AgentAuditEvent } from '../../utils/AgentAuditEvent'
import { connectDB } from '../../utils/db'

const QuerySchema = z.object({
  conversationId: z.string().optional(),
  requestId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100)
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後查看 AI 審計事件' })
  }

  const parsed = QuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '審計查詢格式無效' })
  }

  await connectDB()
  const filter: Record<string, unknown> = { actorId: event.context.auth.id }
  if (parsed.data.conversationId) filter.conversationId = parsed.data.conversationId
  if (parsed.data.requestId) filter.requestId = parsed.data.requestId

  const events = await AgentAuditEvent.find(filter)
    .sort({ createdAt: -1 })
    .limit(parsed.data.limit)
    .lean()

  return {
    events: events.map(item => ({
      id: item._id.toString(),
      conversationId: item.conversationId,
      messageId: item.messageId,
      requestId: item.requestId,
      actorId: item.actorId,
      eventType: item.eventType,
      toolName: item.toolName,
      risk: item.risk,
      inputRedacted: item.inputRedacted,
      outputSummary: item.outputSummary,
      outputRedacted: item.outputRedacted,
      blockedReason: item.blockedReason,
      metadata: item.metadata,
      createdAt: new Date(item.createdAt).toISOString()
    }))
  }
})
