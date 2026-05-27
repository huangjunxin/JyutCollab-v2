import { z } from 'zod'
import { createDefaultAgentToolRegistry, runAgent, type AgentRunnerHistoryMessage } from '../../utils/agent'
import { createAgentRequestId, ensureAgentConversation, recordAgentAuditEvent, saveAgentMessage } from '../../utils/agent/persistence'
import { AgentMessage } from '../../utils/AgentMessage'

const StreamChatSchema = z.object({
  message: z.string().trim().max(2000),
  route: z.string().trim().max(500).optional(),
  conversationId: z.string().optional(),
  pageContext: z.record(z.string(), z.unknown()).optional()
})

function toolResultPayload(toolCall: Awaited<ReturnType<typeof runAgent>>['toolCalls'][number]) {
  return {
    name: toolCall.name,
    risk: toolCall.risk,
    summary: toolCall.result.summary,
    data: toolCall.result.data,
    warnings: toolCall.result.warnings,
    nextAction: toolCall.result.nextAction
  }
}

function stringifyToolContext(toolCall: any) {
  if (!toolCall?.name && !toolCall?.summary) return ''
  return JSON.stringify({
    tool: toolCall.name,
    summary: toolCall.summary,
    warnings: toolCall.warnings,
    nextAction: toolCall.nextAction
  })
}

async function loadAgentHistory(conversationId: string, ownerId: string): Promise<AgentRunnerHistoryMessage[]> {
  const records = await AgentMessage.find({ conversationId, ownerId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
  const history: AgentRunnerHistoryMessage[] = []
  let totalChars = 0
  for (const message of records.reverse()) {
    if (message.role !== 'user' && message.role !== 'assistant') continue
    const toolContext = message.role === 'assistant' ? stringifyToolContext(message.toolCall) : ''
    const content = [message.content, toolContext ? `工具摘要：${toolContext}` : ''].filter(Boolean).join('\n').trim()
    if (!content) continue
    const clipped = content.length > 1200 ? `${content.slice(0, 1200)}…` : content
    totalChars += clipped.length
    if (totalChars > 8000) break
    history.push({ role: message.role, content: clipped })
  }
  return history
}

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後使用 AI 助手' })
  }

  const parsed = StreamChatSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '助手請求格式無效' })
  }

  const encoder = new TextEncoder()
  const actor = event.context.auth
  const conversation = await ensureAgentConversation({
    actorId: actor.id,
    channel: 'web',
    conversationId: parsed.data.conversationId,
    route: parsed.data.route,
    title: parsed.data.message
  })
  const conversationId = conversation._id.toString()
  const history = await loadAgentHistory(conversationId, actor.id)
  const requestId = createAgentRequestId()
  const userMessage = await saveAgentMessage({
    conversationId,
    ownerId: actor.id,
    requestId,
    role: 'user',
    content: parsed.data.message,
    metadata: { route: parsed.data.route }
  })
  await recordAgentAuditEvent({
    conversationId,
    messageId: userMessage._id.toString(),
    requestId,
    actorId: actor.id,
    eventType: 'user_message',
    metadata: { route: parsed.data.route }
  })
  let statusTimer: NodeJS.Timeout | undefined
  let timeoutTimer: NodeJS.Timeout | undefined
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      function send(type: string, payload: Record<string, unknown> = {}) {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify({ conversationId, requestId, ...payload })}\n\n`))
      }

      async function run() {
        let textStarted = false
        try {
          send('STATUS_UPDATE', { label: '已連接 AI 助手，等待模型回應' })
          statusTimer = setInterval(() => {
            send('STATUS_UPDATE', { label: '模型仍在處理，尚未返回第一個輸出片段' })
          }, 3000)
          timeoutTimer = setTimeout(() => {
            send('ERROR', { message: 'AI 助手等待模型回應逾時，請稍後再試。' })
            closed = true
            try {
              controller.close()
            } catch {
            }
          }, 90_000)

          let toolCallCount = 0
          let assistantContent = ''
          let lastToolCall: Awaited<ReturnType<typeof runAgent>>['toolCalls'][number] | undefined
          const result = await runAgent({
            message: parsed.data.message,
            route: parsed.data.route,
            actor,
            channel: 'web',
            registry: createDefaultAgentToolRegistry(),
            history,
            pageContext: parsed.data.pageContext as Record<string, unknown> | undefined,
            async onTextStart() {
              if (!textStarted) {
                textStarted = true
                send('TEXT_MESSAGE_START', {})
              }
            },
            async onTextDelta(delta) {
              if (!textStarted) {
                textStarted = true
                send('TEXT_MESSAGE_START', {})
              }
              assistantContent += delta
              send('TEXT_MESSAGE_CONTENT', { content: delta })
            },
            async onToolCallDelta(delta) {
              send('TOOL_CALL_DELTA', delta as unknown as Record<string, unknown>)
            },
            async onToolCallStart(toolCall) {
              toolCallCount += 1
              await recordAgentAuditEvent({
                conversationId,
                requestId,
                actorId: actor.id,
                eventType: 'tool_call_started',
                toolName: toolCall.name,
                input: toolCall.input
              })
              send('TOOL_CALL_START', toolCall as unknown as Record<string, unknown>)
            },
            async onToolResult(toolCall) {
              lastToolCall = toolCall
              await recordAgentAuditEvent({
                conversationId,
                requestId,
                actorId: actor.id,
                eventType: toolCall.result.ok ? 'tool_call_result' : 'blocked_action',
                toolName: toolCall.name,
                risk: toolCall.risk,
                input: toolCall.input,
                outputSummary: toolCall.result.summary,
                output: toolCall.result.data,
                blockedReason: toolCall.result.ok ? undefined : toolCall.result.warnings?.join('；')
              })
              send('TOOL_CALL_RESULT', { toolCall: toolResultPayload(toolCall), localAction: (toolCall.result.data as any)?.action })
            }
          })

          if (statusTimer) {
            clearInterval(statusTimer)
            statusTimer = undefined
          }
          if (timeoutTimer) {
            clearTimeout(timeoutTimer)
            timeoutTimer = undefined
          }

          if (!result.content && result.toolCalls.length) {
            if (!textStarted) {
              textStarted = true
              send('TEXT_MESSAGE_START', {})
            }
            const fallbackContent = result.toolCalls.at(-1)?.result.summary || ''
            assistantContent += fallbackContent
            send('TEXT_MESSAGE_CONTENT', { content: fallbackContent })
          } else if (result.content && !textStarted) {
            textStarted = true
            assistantContent += result.content
            send('TEXT_MESSAGE_START', {})
            send('TEXT_MESSAGE_CONTENT', { content: result.content })
          }
          const assistantMessage = await saveAgentMessage({
            conversationId,
            ownerId: actor.id,
            requestId,
            role: 'assistant',
            content: assistantContent || result.content || '',
            toolCall: lastToolCall ? toolResultPayload(lastToolCall) : undefined,
            localAction: (lastToolCall?.result.data as any)?.action
          })
          await recordAgentAuditEvent({
            conversationId,
            messageId: assistantMessage._id.toString(),
            requestId,
            actorId: actor.id,
            eventType: 'assistant_message',
            outputSummary: assistantContent || result.content || ''
          })
          send('DONE', { toolCallCount })
        } catch (error: any) {
          await recordAgentAuditEvent({
            conversationId,
            requestId,
            actorId: actor.id,
            eventType: 'model_error',
            blockedReason: error?.message || 'AI 助手暫時無法回應。'
          })
          if (!closed) send('ERROR', { message: error?.message || 'AI 助手暫時無法回應。' })
        } finally {
          if (statusTimer) clearInterval(statusTimer)
          if (timeoutTimer) clearTimeout(timeoutTimer)
          if (!closed) {
            closed = true
            controller.close()
          }
        }
      }

      void run()
    },
    cancel() {
      closed = true
      if (statusTimer) clearInterval(statusTimer)
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
})
