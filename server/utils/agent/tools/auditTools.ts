import { z } from 'zod'
import { connectDB } from '../../db'
import { AgentAuditEvent } from '../../AgentAuditEvent'
import type { AgentToolDefinition } from '../core/contracts'

const SearchAgentAuditInput = z.object({
  conversationId: z.string().trim().max(100).optional(),
  eventType: z.enum([
    'tool_call_started',
    'tool_call_result',
    'confirmation_requested',
    'confirmation_accepted',
    'confirmation_rejected',
    'confirmation_failed',
    'confirmation_expired',
    'blocked_action',
    'model_error'
  ]).optional(),
  toolName: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(50).default(10)
})

const EVENT_TYPE_LABELS: Record<string, string> = {
  conversation_created: '建立對話',
  user_message: '用戶訊息',
  assistant_message: '助手回覆',
  tool_call_started: '工具調用開始',
  tool_call_result: '工具調用結果',
  confirmation_requested: '請求確認',
  confirmation_accepted: '確認接受',
  confirmation_rejected: '確認拒絕',
  confirmation_failed: '確認失敗',
  confirmation_expired: '確認過期',
  blocked_action: '操作被阻止',
  model_error: '模型錯誤'
}

function compactAuditEvent(event: any) {
  return {
    id: String(event._id),
    eventType: event.eventType,
    eventTypeLabel: EVENT_TYPE_LABELS[event.eventType] || event.eventType,
    toolName: event.toolName || undefined,
    risk: event.risk || undefined,
    outputSummary: event.outputSummary || undefined,
    blockedReason: event.blockedReason || undefined,
    conversationId: event.conversationId || undefined,
    createdAt: new Date(event.createdAt).toISOString()
  }
}

export const searchAgentAuditTool: AgentToolDefinition<z.infer<typeof SearchAgentAuditInput>> = {
  name: 'jyutcollab.search_agent_audit',
  description: '查詢用戶自己的 AI 助手操作審計記錄，包括工具調用、確認操作和被阻止的操作。',
  risk: 'safe',
  inputSchema: SearchAgentAuditInput,
  async execute(input, ctx) {
    const actorId = ctx.actor?.id
    if (!actorId) {
      return { ok: false, summary: '需要登入才能查詢 AI 審計記錄。' }
    }

    await connectDB()

    const filter: Record<string, any> = { actorId }
    if (input.conversationId) filter.conversationId = input.conversationId
    if (input.eventType) filter.eventType = input.eventType
    if (input.toolName) filter.toolName = input.toolName

    const events = await AgentAuditEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()

    if (!events.length) {
      return {
        ok: true,
        data: { events: [], total: 0 },
        summary: '目前沒有符合條件的 AI 審計記錄。',
        nextAction: '嘗試放寬篩選條件，或先使用 AI 助手進行一些操作。'
      }
    }

    const summaries = events.map(compactAuditEvent)
    const toolCalls = summaries.filter(e => e.eventType === 'tool_call_result')
    const blocked = summaries.filter(e => e.eventType === 'blocked_action')

    const parts: string[] = []
    parts.push(`共 ${summaries.length} 條記錄`)
    if (toolCalls.length) parts.push(`${toolCalls.length} 次工具調用`)
    if (blocked.length) parts.push(`${blocked.length} 次被阻止`)

    return {
      ok: true,
      data: { events: summaries, total: summaries.length },
      summary: parts.join('，') + '。',
      nextAction: '可指定 conversationId 查看特定對話的審計記錄，或指定 toolName 查看特定工具的調用歷史。'
    }
  }
}

export function createAuditTools() {
  return [searchAgentAuditTool]
}
