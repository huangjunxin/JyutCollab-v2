import mongoose from 'mongoose'

export interface IAgentConversation {
  _id: string
  ownerId: string
  channel: 'web' | 'telegram' | 'feishu' | 'qq' | 'mcp'
  title: string
  lastMessageAt: Date
  messageCount: number
  lastSummary?: string
  archivedAt?: Date
  metadata?: unknown
  createdAt: Date
  updatedAt: Date
}

const AgentConversationSchema = new mongoose.Schema<IAgentConversation>({
  ownerId: { type: String, required: true },
  channel: {
    type: String,
    enum: ['web', 'telegram', 'feishu', 'qq', 'mcp'],
    default: 'web',
    required: true
  },
  title: { type: String, required: true, default: '新對話' },
  lastMessageAt: { type: Date, required: true, default: Date.now },
  messageCount: { type: Number, required: true, default: 0 },
  lastSummary: { type: String },
  archivedAt: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'agent_conversations'
})

AgentConversationSchema.index({ ownerId: 1, lastMessageAt: -1 })
AgentConversationSchema.index({ ownerId: 1, archivedAt: 1 })

export const AgentConversation = mongoose.models.AgentConversation || mongoose.model<IAgentConversation>('AgentConversation', AgentConversationSchema)
