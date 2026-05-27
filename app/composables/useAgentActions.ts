import type { AgentLocalActionSummary } from '../types/agent'

export function useAgentActions() {
  const pending = useState<AgentLocalActionSummary[]>('agent-pending-actions', () => [])

  function enqueue(action: AgentLocalActionSummary) {
    pending.value = [...pending.value, action]
  }

  function dequeue(): AgentLocalActionSummary | undefined {
    const first = pending.value[0]
    if (first) pending.value = pending.value.slice(1)
    return first
  }

  function clear() {
    pending.value = []
  }

  return { pending, enqueue, dequeue, clear }
}
