import type { AgentAuditEventItem } from '../types/agent'

export function useAgentAudit() {
  const events = useState<AgentAuditEventItem[]>('agent-audit-events', () => [])
  const loading = useState('agent-audit-loading', () => false)
  const error = useState<string | null>('agent-audit-error', () => null)
  const filterConversationId = useState<string | null>('agent-audit-filter-conversation', () => null)

  async function fetchEvents(conversationId?: string) {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, string> = { limit: '50' }
      const cid = conversationId ?? filterConversationId.value
      if (cid) params.conversationId = cid
      const query = new URLSearchParams(params).toString()
      const response = await $fetch<{ events: AgentAuditEventItem[] }>(`/api/agent/audit-events?${query}`)
      events.value = response.events
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || '無法載入審計記錄。'
    } finally {
      loading.value = false
    }
  }

  function setConversationFilter(id: string | null) {
    filterConversationId.value = id
  }

  return { events, loading, error, filterConversationId, fetchEvents, setConversationFilter }
}
