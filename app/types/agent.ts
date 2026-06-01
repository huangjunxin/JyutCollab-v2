export type AgentMessageRole = 'user' | 'assistant' | 'tool'

export interface AgentLocalActionSummary {
  kind: 'navigate' | 'apply_filters' | 'open_entry' | 'toggle_advanced_filter' | 'switch_view'
  label: string
  to?: string
  entryId?: string
  filters?: {
    query?: string
    dialect?: string
    status?: string
    theme?: string
    createdBy?: string
    view?: string
    formula?: string
    regexRows?: Array<{ field: string, pattern: string, flags?: string }>
    openAdvancedFilter?: boolean
  }
  open?: boolean
  view?: string
}

export interface AgentPageContext {
  route?: string
  filters?: {
    query?: string
    dialect?: string
    status?: string
    theme?: string
    createdBy?: string
  }
  view?: string
  selectedEntries?: string[]
  visibleCount?: number
  totalCount?: number
  currentPage?: number
  hasAdvancedFilters?: boolean
}

export interface AgentProgressStep {
  label: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  detail?: string
}

export interface AgentStreamingToolCall {
  id?: string
  name: string
  argumentsText: string
  status: 'streaming' | 'running' | 'completed' | 'failed'
}

export interface AgentEntrySummary {
  id: string
  headword: string
  dialect: string
  status: string
  entryType?: string
  definitionPreview?: string
  jyutping?: string[]
}

export interface AgentToolCallSummary {
  name: string
  risk: string
  summary: string
  data?: unknown
  warnings?: string[]
  nextAction?: string
}

export interface AgentConfirmationSummary {
  id: string
  action: string
  risk: string
  target: {
    entryId?: string
    headword?: string
    label: string
  }
  requiredEcho?: string
  summary: string
  consequences: string[]
}

export interface AgentChatMessage {
  id: string
  role: AgentMessageRole
  content: string
  createdAt: string
  toolCall?: AgentToolCallSummary
  localAction?: AgentLocalActionSummary
  confirmation?: AgentConfirmationSummary
  progress?: AgentProgressStep[]
  streamingToolCall?: AgentStreamingToolCall
}

export interface AgentConversationSummary {
  id: string
  title: string
  channel: string
  lastMessageAt: string
  messageCount: number
  lastSummary?: string
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

export interface AgentAuditEventItem {
  id: string
  conversationId?: string
  messageId?: string
  requestId?: string
  actorId: string
  eventType: string
  toolName?: string
  risk?: string
  outputSummary?: string
  blockedReason?: string
  createdAt: string
}

export interface AgentChatRequest {
  message: string
  route?: string
  conversationId?: string
  confirmation?: {
    id: string
    confirmed: boolean
    echo?: string
    reason?: string
  }
}

export interface AgentChatResponse {
  conversationId: string
  messages: AgentChatMessage[]
}
