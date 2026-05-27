import type { z } from 'zod'

export type AgentChannel = 'web' | 'telegram' | 'feishu' | 'qq' | 'mcp'

export type ToolRisk = 'safe' | 'local_ui' | 'draft_write' | 'editorial' | 'destructive' | 'admin'

export interface AgentActor {
  id: string
  email?: string
  username?: string
  displayName?: string
  role?: 'contributor' | 'reviewer' | 'admin'
  dialectPermissions?: Array<{ dialectName: string; role: string }>
}

export interface AgentToolContext {
  channel: AgentChannel
  actor?: AgentActor
  requestId?: string
  locale?: string
  pageContext?: Record<string, unknown>
}

export interface AgentToolResult<Output = unknown> {
  ok: boolean
  data?: Output
  summary: string
  warnings?: string[]
  nextAction?: string
}

export interface AgentToolDefinition<Input = unknown, Output = unknown> {
  name: string
  description: string
  risk: ToolRisk
  inputSchema: z.ZodType<Input>
  outputSchema?: z.ZodType<Output>
  execute(input: Input, ctx: AgentToolContext): Promise<AgentToolResult<Output>>
}

export interface ConfirmationTarget {
  entryId?: string
  userId?: string
  headword?: string
  label: string
}

export interface ConfirmationRequest {
  id: string
  action: string
  risk: ToolRisk
  actorId: string
  channel: AgentChannel
  target: ConfirmationTarget
  requiredEcho?: string
  expiresAt: string
  summary: string
  consequences: string[]
}

export interface ConfirmationDecision {
  confirmationId: string
  actorId: string
  confirmed: boolean
  echo?: string
}
