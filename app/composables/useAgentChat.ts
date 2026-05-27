import type { AgentChatMessage, AgentChatResponse } from '../types/agent'

export function useAgentChat() {
  const route = useRoute()
  const open = useState('agent-sidebar-open', () => false)
  const messages = useState<AgentChatMessage[]>('agent-chat-messages', () => [
    {
      id: 'agent-welcome',
      role: 'assistant',
      content: '你好，我可以幫你查詞、查粵拼、檢查重複、整理草稿，並在你明確確認後處理送審或審核操作。',
      createdAt: new Date().toISOString()
    }
  ])
  const pending = useState('agent-chat-pending', () => false)
  const error = useState<string | null>('agent-chat-error', () => null)

  function resetStalePendingMessages() {
    pending.value = false
    messages.value = messages.value.map(message => {
      const hasRunningProgress = message.progress?.some(step => step.status === 'running')
      if (!hasRunningProgress) return message
      return {
        ...message,
        content: message.content || '上一個 AI 助手請求已中斷，請重新發送。',
        progress: message.progress?.map(step => ({ ...step, status: 'failed' as const })),
        streamingToolCall: message.streamingToolCall ? { ...message.streamingToolCall, status: 'failed' as const } : undefined
      }
    })
  }

  if (import.meta.client && pending.value) {
    resetStalePendingMessages()
  }

  function refreshMessages() {
    messages.value = [...messages.value]
  }

  function updateMessage(id: string, updater: (message: AgentChatMessage) => AgentChatMessage) {
    messages.value = messages.value.map(message => message.id === id ? updater(message) : message)
  }

  function getMessage(id: string) {
    return messages.value.find(message => message.id === id)
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    if (pending.value) resetStalePendingMessages()

    messages.value.push({
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString()
    })

    const progressMessageId = crypto.randomUUID()
    const assistantMessage: AgentChatMessage = {
      id: progressMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      progress: [{ label: '已送出請求，正在連接 AI 助手', status: 'running' }]
    }
    messages.value.push(assistantMessage)

    pending.value = true
    error.value = null
    try {
      await streamMessage(trimmed, progressMessageId)
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || 'AI 助手暫時無法回應。'
      updateMessage(progressMessageId, message => ({
        ...message,
        content: error.value || 'AI 助手暫時無法回應。',
        progress: [{ label: '處理請求', status: 'failed' }]
      }))
    } finally {
      pending.value = false
    }
  }

  async function streamMessage(content: string, assistantMessageId: string) {
    const controller = new AbortController()
    let lastEventAt = Date.now()
    const timeout = window.setInterval(() => {
      if (Date.now() - lastEventAt > 15_000) controller.abort()
    }, 1000)
    try {
      const response = await fetch('/api/agent/chat.stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, route: route.fullPath }),
        signal: controller.signal
      })
      if (!response.ok || !response.body) throw new Error('AI 助手暫時無法回應。')
      updateMessage(assistantMessageId, message => ({
        ...message,
        progress: [{ label: '已連接 AI 助手，正在讀取回應', status: 'running' }]
      }))

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        lastEventAt = Date.now()
        updateMessage(assistantMessageId, message => ({
          ...message,
          progress: [{ label: `已收到 ${value?.byteLength || 0} bytes 回應`, status: 'running' }]
        }))
        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''
        for (const chunk of chunks) {
          applyStreamEvent(chunk, assistantMessageId)
        }
      }
      if (buffer.trim()) applyStreamEvent(buffer, assistantMessageId)
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('AI 助手連線逾時，未收到服務端事件。請重新發送。')
      }
      throw error
    } finally {
      window.clearInterval(timeout)
    }
  }

  function applyStreamEvent(chunk: string, assistantMessageId: string) {
    const event = chunk.split('\n').find(line => line.startsWith('event: '))?.slice(7).trim()
    const dataText = chunk.split('\n').filter(line => line.startsWith('data: ')).map(line => line.slice(6)).join('\n')
    let data: any = {}
    try {
      data = dataText ? JSON.parse(dataText) : {}
    } catch {
      data = {}
    }

    if (event === 'STATUS_UPDATE') {
      const label = String(data.label || '')
      if (!label) return
      updateMessage(assistantMessageId, message => ({
        ...message,
        progress: [{ label, status: 'running' }]
      }))
      return
    }
    if (event === 'TEXT_MESSAGE_START') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        progress: (message.progress || []).map(step => ({ ...step, status: 'completed' as const }))
      }))
      return
    }
    if (event === 'TEXT_MESSAGE_CONTENT') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        content: message.content + String(data.content || '')
      }))
      return
    }
    if (event === 'TOOL_CALL_DELTA') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        streamingToolCall: {
          id: data.id || message.streamingToolCall?.id,
          name: String(data.name || message.streamingToolCall?.name || '工具調用'),
          argumentsText: String(data.accumulatedArguments || message.streamingToolCall?.argumentsText || ''),
          status: 'streaming'
        }
      }))
      return
    }
    if (event === 'TOOL_CALL_START') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        streamingToolCall: {
          id: data.id,
          name: String(data.name || message.streamingToolCall?.name || '工具調用'),
          argumentsText: JSON.stringify(data.input || {}, null, 2),
          status: 'running'
        }
      }))
      return
    }
    if (event === 'TOOL_CALL_RESULT') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        toolCall: data.toolCall,
        localAction: data.localAction || message.localAction,
        streamingToolCall: message.streamingToolCall ? { ...message.streamingToolCall, status: 'completed' } : undefined
      }))
      return
    }
    if (event === 'ERROR') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        content: String(data.message || 'AI 助手暫時無法回應。'),
        progress: [{ label: '處理請求', status: 'failed' }],
        streamingToolCall: message.streamingToolCall ? { ...message.streamingToolCall, status: 'failed' } : undefined
      }))
      return
    }
    if (event === 'DONE') {
      updateMessage(assistantMessageId, message => ({
        ...message,
        content: !message.content.trim() && !message.toolCall ? 'AI 助手已結束回應，但沒有返回可顯示內容。請稍後再試一次。' : message.content,
        progress: (message.progress || []).map(step => ({ ...step, status: step.status === 'failed' ? 'failed' : 'completed' })),
        streamingToolCall: message.streamingToolCall?.status === 'running' || message.streamingToolCall?.status === 'streaming'
          ? { ...message.streamingToolCall, status: 'completed' }
          : message.streamingToolCall
      }))
    }
  }

  async function resolveConfirmation(id: string, confirmed: boolean, echo?: string, reason?: string) {
    pending.value = true
    error.value = null
    try {
      const response = await $fetch<AgentChatResponse>('/api/agent/chat', {
        method: 'POST',
        body: {
          message: confirmed ? '確認執行' : '取消操作',
          route: route.fullPath,
          confirmation: { id, confirmed, echo, reason }
        }
      })
      messages.value.push(...response.messages)
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || '確認操作失敗。'
      messages.value.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error.value,
        createdAt: new Date().toISOString()
      })
    } finally {
      pending.value = false
    }
  }

  return {
    open,
    messages,
    pending,
    error,
    sendMessage,
    resolveConfirmation
  }
}
