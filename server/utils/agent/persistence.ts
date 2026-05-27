import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import type { AgentChatMessage } from '../../../app/types/agent'
import { AgentAuditEvent, type AgentAuditEventType } from '../AgentAuditEvent'
import { AgentConversation } from '../AgentConversation'
import { AgentMessage } from '../AgentMessage'
import { connectDB } from '../db'
import { redactAgentPayload } from './tools/serializers'

export interface EnsureAgentConversationInput {
  actorId: string
  channel?: 'web' | 'telegram' | 'feishu' | 'qq' | 'mcp'
  conversationId?: string
  route?: string
  title?: string
}

export interface AgentAuditInput {
  conversationId?: string
  messageId?: string
  requestId?: string
  actorId: string
  eventType: AgentAuditEventType
  toolName?: string
  risk?: string
  input?: unknown
  outputSummary?: string
  output?: unknown
  blockedReason?: string
  metadata?: unknown
}

function makeTitle(message?: string) {
  const trimmed = (message || '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return '新對話'
  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed
}

export function serializeAgentMessage(message: any): AgentChatMessage {
  return {
    id: String(message._id || message.id),
    role: message.role,
    content: message.content || '',
    createdAt: new Date(message.createdAt || Date.now()).toISOString(),
    toolCall: message.toolCall,
    localAction: message.localAction,
    confirmation: message.confirmation
  }
}

export function isValidAgentConversationId(id?: string) {
  return Boolean(id && mongoose.Types.ObjectId.isValid(id))
}

export async function ensureAgentConversation(input: EnsureAgentConversationInput) {
  await connectDB()
  if (input.conversationId) {
    if (!isValidAgentConversationId(input.conversationId)) {
      throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
    }
    const existing = await AgentConversation.findOne({ _id: input.conversationId, ownerId: input.actorId, archivedAt: { $exists: false } })
    if (!existing) throw createError({ statusCode: 404, message: '對話不存在或無權訪問' })
    return existing
  }

  const conversation = await AgentConversation.create({
    ownerId: input.actorId,
    channel: input.channel || 'web',
    title: input.title || '新對話',
    lastMessageAt: new Date(),
    messageCount: 0,
    metadata: input.route ? { route: input.route } : undefined
  })
  await recordAgentAuditEvent({
    conversationId: conversation._id.toString(),
    actorId: input.actorId,
    eventType: 'conversation_created',
    metadata: { channel: input.channel || 'web', route: input.route }
  })
  return conversation
}

export async function saveAgentMessage(input: {
  conversationId: string
  ownerId: string
  requestId?: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCall?: unknown
  confirmation?: unknown
  localAction?: unknown
  metadata?: unknown
}) {
  await connectDB()
  const message = await AgentMessage.create({
    conversationId: input.conversationId,
    ownerId: input.ownerId,
    requestId: input.requestId,
    role: input.role,
    content: input.content,
    toolCall: redactAgentPayload(input.toolCall),
    confirmation: redactAgentPayload(input.confirmation),
    localAction: redactAgentPayload(input.localAction),
    metadata: redactAgentPayload(input.metadata)
  })

  const update: Record<string, unknown> = {
    $inc: { messageCount: 1 },
    $set: {
      lastMessageAt: message.createdAt,
      lastSummary: input.content.slice(0, 160)
    }
  }
  if (input.role === 'user') update.$set = { ...(update.$set as Record<string, unknown>), title: makeTitle(input.content) }
  await AgentConversation.updateOne({ _id: input.conversationId, ownerId: input.ownerId }, update)
  return message
}

export async function saveAgentMessages(input: {
  conversationId: string
  ownerId: string
  requestId?: string
  messages: AgentChatMessage[]
}) {
  const saved = []
  for (const message of input.messages) {
    const savedMessage = await saveAgentMessage({
      conversationId: input.conversationId,
      ownerId: input.ownerId,
      requestId: input.requestId,
      role: message.role,
      content: message.content,
      toolCall: message.toolCall,
      confirmation: message.confirmation,
      localAction: message.localAction
    })
    saved.push(savedMessage)
    if (message.role === 'assistant') {
      await recordAgentAuditEvent({
        conversationId: input.conversationId,
        messageId: savedMessage._id.toString(),
        requestId: input.requestId,
        actorId: input.ownerId,
        eventType: 'assistant_message',
        outputSummary: message.content,
        output: {
          toolCall: message.toolCall,
          confirmation: message.confirmation,
          localAction: message.localAction
        }
      })
    }
    if (message.role === 'tool') {
      await recordAgentAuditEvent({
        conversationId: input.conversationId,
        messageId: savedMessage._id.toString(),
        requestId: input.requestId,
        actorId: input.ownerId,
        eventType: 'tool_call_result',
        toolName: message.toolCall?.name,
        risk: message.toolCall?.risk,
        outputSummary: message.toolCall?.summary || message.content,
        output: message.toolCall
      })
    }
  }
  return saved
}

export async function recordAgentAuditEvent(input: AgentAuditInput) {
  await connectDB()
  return AgentAuditEvent.create({
    conversationId: input.conversationId,
    messageId: input.messageId,
    requestId: input.requestId,
    actorId: input.actorId,
    eventType: input.eventType,
    toolName: input.toolName,
    risk: input.risk,
    inputRedacted: redactAgentPayload(input.input),
    outputSummary: input.outputSummary,
    outputRedacted: redactAgentPayload(input.output),
    blockedReason: input.blockedReason,
    metadata: redactAgentPayload(input.metadata)
  })
}

export function createAgentRequestId() {
  return nanoid(16)
}
