import mongoose from 'mongoose'

export interface IAgentMessage {
  _id: string
  conversationId: string
  ownerId: string
  requestId?: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCall?: unknown
  confirmation?: unknown
  localAction?: unknown
  metadata?: unknown
  createdAt: Date
  updatedAt: Date
}

const AgentMessageSchema = new mongoose.Schema<IAgentMessage>({
  conversationId: { type: String, required: true },
  ownerId: { type: String, required: true },
  requestId: { type: String },
  role: {
    type: String,
    enum: ['user', 'assistant', 'tool'],
    required: true
  },
  content: { type: String, required: true, default: '' },
  toolCall: { type: mongoose.Schema.Types.Mixed },
  confirmation: { type: mongoose.Schema.Types.Mixed },
  localAction: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'agent_messages'
})

AgentMessageSchema.index({ conversationId: 1, createdAt: 1 })
AgentMessageSchema.index({ ownerId: 1, createdAt: -1 })
AgentMessageSchema.index({ requestId: 1 })

export const AgentMessage = mongoose.models.AgentMessage || mongoose.model<IAgentMessage>('AgentMessage', AgentMessageSchema)
