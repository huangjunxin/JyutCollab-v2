export type AgentMessageRole = 'user' | 'assistant' | 'tool'

export interface AgentLocalActionSummary {
  kind: 'navigate'
  label: string
  to: string
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

export interface AgentChatRequest {
  message: string
  route?: string
  confirmation?: {
    id: string
    confirmed: boolean
    echo?: string
    reason?: string
  }
}

export interface AgentChatResponse {
  messages: AgentChatMessage[]
}
