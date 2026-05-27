import mongoose from 'mongoose'

export type AgentAuditEventType =
  | 'conversation_created'
  | 'user_message'
  | 'assistant_message'
  | 'tool_call_started'
  | 'tool_call_result'
  | 'confirmation_requested'
  | 'confirmation_accepted'
  | 'confirmation_rejected'
  | 'confirmation_failed'
  | 'confirmation_expired'
  | 'blocked_action'
  | 'model_error'

export interface IAgentAuditEvent {
  _id: string
  conversationId?: string
  messageId?: string
  requestId?: string
  actorId: string
  eventType: AgentAuditEventType
  toolName?: string
  risk?: string
  inputRedacted?: unknown
  outputSummary?: string
  outputRedacted?: unknown
  blockedReason?: string
  metadata?: unknown
  createdAt: Date
  updatedAt: Date
}

const AgentAuditEventSchema = new mongoose.Schema<IAgentAuditEvent>({
  conversationId: { type: String },
  messageId: { type: String },
  requestId: { type: String },
  actorId: { type: String, required: true },
  eventType: {
    type: String,
    enum: [
      'conversation_created',
      'user_message',
      'assistant_message',
      'tool_call_started',
      'tool_call_result',
      'confirmation_requested',
      'confirmation_accepted',
      'confirmation_rejected',
      'confirmation_failed',
      'confirmation_expired',
      'blocked_action',
      'model_error'
    ],
    required: true
  },
  toolName: { type: String },
  risk: { type: String },
  inputRedacted: { type: mongoose.Schema.Types.Mixed },
  outputSummary: { type: String },
  outputRedacted: { type: mongoose.Schema.Types.Mixed },
  blockedReason: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'agent_audit_events'
})

AgentAuditEventSchema.index({ conversationId: 1, createdAt: 1 })
AgentAuditEventSchema.index({ actorId: 1, createdAt: -1 })
AgentAuditEventSchema.index({ requestId: 1 })
AgentAuditEventSchema.index({ eventType: 1, createdAt: -1 })

export const AgentAuditEvent = mongoose.models.AgentAuditEvent || mongoose.model<IAgentAuditEvent>('AgentAuditEvent', AgentAuditEventSchema)
