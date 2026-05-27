import type { AgentChatMessage, AgentChatResponse, AgentConversationSummary, AgentPageContext, AgentLocalActionSummary } from '../types/agent'

const WELCOME_MESSAGE: AgentChatMessage = {
  id: 'agent-welcome',
  role: 'assistant',
  content: '我可以幫你查詞條、查歷史、解答使用指南問題，還能幫你套用篩選條件。試試問我：「查 食飯」、「找粵拼 ang1」、「怎麼回退歷史」、「幫我找動物相關的詞」。',
  createdAt: new Date().toISOString()
}

const CURRENT_CONVERSATION_STORAGE_KEY = 'jyutcollab-agent-current-conversation-id'

export function useAgentChat() {
  const route = useRoute()
  const router = useRouter()
  const { enqueue: enqueueAgentAction } = useAgentActions()
  const injectedPageContext = inject<AgentPageContext | null>('agentPageContext', null)
  const open = useState('agent-sidebar-open', () => false)
  const conversations = useState<AgentConversationSummary[]>('agent-chat-conversations', () => [])
  const currentConversationId = useState<string | null>('agent-chat-current-conversation-id', () => {
    if (!import.meta.client) return null
    return localStorage.getItem(CURRENT_CONVERSATION_STORAGE_KEY)
  })
  const messages = useState<AgentChatMessage[]>('agent-chat-messages', () => [{ ...WELCOME_MESSAGE, createdAt: new Date().toISOString() }])
  const pending = useState('agent-chat-pending', () => false)
  const loadingHistory = useState('agent-chat-loading-history', () => false)
  const error = useState<string | null>('agent-chat-error', () => null)

  function welcomeMessages() {
    return [{ ...WELCOME_MESSAGE, createdAt: new Date().toISOString() }]
  }

  function buildPageContext(): AgentPageContext {
    if (injectedPageContext) return injectedPageContext
    const ctx: AgentPageContext = { route: route.fullPath }
    if (route.path === '/entries') {
      ctx.filters = {}
      const q = route.query
      if (q.query) ctx.filters.query = String(q.query)
      if (q.dialect) ctx.filters.dialect = String(q.dialect)
      if (q.status) ctx.filters.status = String(q.status)
      if (q.view) ctx.view = String(q.view)
    }
    return ctx
  }

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

  watch(currentConversationId, (id) => {
    if (!import.meta.client) return
    if (id) localStorage.setItem(CURRENT_CONVERSATION_STORAGE_KEY, id)
    else localStorage.removeItem(CURRENT_CONVERSATION_STORAGE_KEY)
  })

  function refreshMessages() {
    messages.value = [...messages.value]
  }

  function updateMessage(id: string, updater: (message: AgentChatMessage) => AgentChatMessage) {
    messages.value = messages.value.map(message => message.id === id ? updater(message) : message)
  }

  async function refreshConversations() {
    if (!import.meta.client) return
    const response = await $fetch<{ conversations: AgentConversationSummary[] }>('/api/agent/conversations')
    conversations.value = response.conversations
  }

  async function createConversation() {
    pending.value = false
    loadingHistory.value = true
    error.value = null
    try {
      const response = await $fetch<{ conversation: AgentConversationSummary }>('/api/agent/conversations', {
        method: 'POST',
        body: { route: route.fullPath }
      })
      currentConversationId.value = response.conversation.id
      messages.value = welcomeMessages()
      conversations.value = [response.conversation, ...conversations.value.filter(conversation => conversation.id !== response.conversation.id)]
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || '無法建立新對話。'
    } finally {
      loadingHistory.value = false
    }
  }

  async function loadConversation(id: string) {
    if (pending.value) resetStalePendingMessages()
    loadingHistory.value = true
    error.value = null
    try {
      const response = await $fetch<{ messages: AgentChatMessage[] }>(`/api/agent/conversations/${id}/messages`)
      currentConversationId.value = id
      messages.value = response.messages.length ? response.messages : welcomeMessages()
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || '無法讀取對話記錄。'
    } finally {
      loadingHistory.value = false
    }
  }

  async function archiveConversation(id: string) {
    if (pending.value) resetStalePendingMessages()
    loadingHistory.value = true
    error.value = null
    try {
      await $fetch(`/api/agent/conversations/${id}/archive`, { method: 'POST' })
      conversations.value = conversations.value.filter(conversation => conversation.id !== id)
      if (currentConversationId.value === id) {
        currentConversationId.value = null
        messages.value = welcomeMessages()
      }
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || '無法封存對話。'
    } finally {
      loadingHistory.value = false
    }
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed) return
    if (pending.value) resetStalePendingMessages()

    messages.value = messages.value.filter(message => message.id !== 'agent-welcome')
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
      await refreshConversations()
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
        body: JSON.stringify({
          message: content,
          route: route.fullPath,
          pageContext: buildPageContext(),
          ...(currentConversationId.value ? { conversationId: currentConversationId.value } : {})
        }),
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
    if (data.conversationId) currentConversationId.value = String(data.conversationId)

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
      const localAction = data.localAction as AgentLocalActionSummary | undefined
      updateMessage(assistantMessageId, message => ({
        ...message,
        toolCall: data.toolCall,
        localAction: localAction || message.localAction,
        streamingToolCall: message.streamingToolCall ? { ...message.streamingToolCall, status: 'completed' } : undefined
      }))
      if (localAction) {
        if (localAction.kind === 'navigate' && localAction.to) {
          router.push(localAction.to)
        } else {
          enqueueAgentAction(localAction)
        }
      }
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
          ...(currentConversationId.value ? { conversationId: currentConversationId.value } : {}),
          confirmation: { id, confirmed, echo, reason }
        }
      })
      currentConversationId.value = response.conversationId
      messages.value.push(...response.messages)
      await refreshConversations()
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
    conversations,
    currentConversationId,
    messages,
    pending,
    loadingHistory,
    error,
    refreshConversations,
    createConversation,
    loadConversation,
    archiveConversation,
    sendMessage,
    resolveConfirmation
  }
}
