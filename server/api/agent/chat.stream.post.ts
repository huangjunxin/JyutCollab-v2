import { z } from 'zod'
import { createDefaultAgentToolRegistry, runAgent } from '../../utils/agent'

const StreamChatSchema = z.object({
  message: z.string().trim().max(2000),
  route: z.string().trim().max(500).optional()
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

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後使用 AI 助手' })
  }

  const parsed = StreamChatSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '助手請求格式無效' })
  }

  const encoder = new TextEncoder()
  let statusTimer: NodeJS.Timeout | undefined
  let timeoutTimer: NodeJS.Timeout | undefined
  let closed = false

  const stream = new ReadableStream({
    start(controller) {
      function send(type: string, payload: Record<string, unknown> = {}) {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`))
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
            controller.close()
          }, 45_000)

          let toolCallCount = 0
          const result = await runAgent({
            message: parsed.data.message,
            route: parsed.data.route,
            actor: event.context.auth,
            channel: 'web',
            registry: createDefaultAgentToolRegistry(),
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
              send('TEXT_MESSAGE_CONTENT', { content: delta })
            },
            async onToolCallDelta(delta) {
              send('TOOL_CALL_DELTA', delta as unknown as Record<string, unknown>)
            },
            async onToolCallStart(toolCall) {
              toolCallCount += 1
              send('TOOL_CALL_START', toolCall as unknown as Record<string, unknown>)
            },
            async onToolResult(toolCall) {
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
            send('TEXT_MESSAGE_CONTENT', { content: result.toolCalls.at(-1)?.result.summary || '' })
          } else if (result.content && !textStarted) {
            textStarted = true
            send('TEXT_MESSAGE_START', {})
            send('TEXT_MESSAGE_CONTENT', { content: result.content })
          }
          send('DONE', { toolCallCount })
        } catch (error: any) {
          send('ERROR', { message: error?.message || 'AI 助手暫時無法回應。' })
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
