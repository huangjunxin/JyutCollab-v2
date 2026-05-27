import { z } from 'zod'
import { nanoid } from 'nanoid'
import { DIALECT_IDS } from '../../../shared/dialects'
import { buildConfirmationRequest, createDefaultAgentToolRegistry, runAgent } from '../../utils/agent'
import { canContributeToDialect } from '../../utils/auth'
import { connectDB } from '../../utils/db'
import { EditHistory } from '../../utils/EditHistory'
import { Entry } from '../../utils/Entry'
import { User } from '../../utils/User'

const ChatSchema = z.object({
  message: z.string().trim().max(2000).default(''),
  route: z.string().trim().max(500).optional(),
  confirmation: z.object({
    id: z.string(),
    confirmed: z.boolean(),
    echo: z.string().optional(),
    reason: z.string().optional()
  }).optional()
})

const DraftSchema = z.object({
  headword: z.string().min(1),
  dialect: z.enum(DIALECT_IDS as unknown as [string, ...string[]]).default('hongkong'),
  definition: z.string().min(1).default('待補充'),
  jyutping: z.array(z.string()).default([]),
  register: z.enum(['口語', '書面', '粗俗', '文雅', '中性']).optional()
})

type PendingAction =
  | { action: 'create_draft_entry', actorId: string, draft: z.infer<typeof DraftSchema>, expiresAt: string }
  | { action: 'submit_entry_for_review', actorId: string, entryId: string, headword: string, expiresAt: string }
  | { action: 'approve_review_entry', actorId: string, entryId: string, headword: string, expiresAt: string }
  | { action: 'reject_review_entry', actorId: string, entryId: string, headword: string, expiresAt: string }

const pendingActions = new Map<string, PendingAction>()

function pruneExpiredPendingActions() {
  const now = Date.now()
  for (const [id, action] of pendingActions.entries()) {
    if (new Date(action.expiresAt).getTime() <= now) pendingActions.delete(id)
  }
}

function message(content: string, role: 'assistant' | 'tool' = 'assistant', extra: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    ...extra
  }
}

function parseQuotedValue(text: string, key: string) {
  const match = text.match(new RegExp(`${key}[：:]\\s*[「\"]?([^「」\"，,;；]+)[」\"]?`))
  return match?.[1]?.trim()
}

function extractEntryId(text: string) {
  return parseQuotedValue(text, 'id') || text.match(/[a-zA-Z0-9_-]{8,}/)?.[0]
}

function parseDraft(text: string) {
  const headword = parseQuotedValue(text, '詞頭') || parseQuotedValue(text, 'headword') || text.match(/(?:草稿|新建|建立)\s*([^，,\s]+)/)?.[1]
  const dialect = parseQuotedValue(text, '方言') || parseQuotedValue(text, 'dialect') || 'hongkong'
  const definition = parseQuotedValue(text, '釋義') || parseQuotedValue(text, 'definition') || '待補充'
  const jyutping = parseQuotedValue(text, '粵拼') || parseQuotedValue(text, 'jyutping')
  const register = parseQuotedValue(text, '語域')
  return DraftSchema.safeParse({
    headword,
    dialect,
    definition,
    jyutping: jyutping ? [jyutping] : [],
    register
  })
}

function localNavigation(label: string, to: string) {
  return message(label, 'assistant', {
    localAction: {
      kind: 'navigate',
      label,
      to
    }
  })
}

async function executeTool(name: string, input: unknown, actor?: any) {
  const registry = createDefaultAgentToolRegistry()
  const result = await registry.execute(name, input, { channel: 'web', actor })
  const tool = registry.get(name)
  return message(result.summary, 'tool', {
    toolCall: {
      name,
      risk: tool.risk,
      summary: result.summary,
      data: result.data,
      warnings: result.warnings,
      nextAction: result.nextAction
    }
  })
}

function toolResultPayload(toolCall: Awaited<ReturnType<typeof runAgent>>['toolCalls'][number]) {
  return {
    name: toolCall.name,
    risk: toolCall.risk,
    summary: toolCall.result.summary,
    data: toolCall.result.data,
    warnings: toolCall.result.warnings,
    nextAction: toolCall.result.nextAction
  }
}

function agentProgress(toolCalls: Awaited<ReturnType<typeof runAgent>>['toolCalls']) {
  return [
    { label: '理解你的請求', status: 'completed' as const },
    { label: toolCalls.length ? `已調用 ${toolCalls.map(call => call.name).join('、')}` : '未需調用工具', status: 'completed' as const },
    { label: '整理回覆', status: 'completed' as const }
  ]
}

async function findEntryByAgentId(entryId: string) {
  const conditions: Record<string, unknown>[] = [{ id: entryId }]
  if (/^[a-f\d]{24}$/i.test(entryId)) conditions.push({ _id: entryId })
  return Entry.findOne({ $or: conditions })
}

async function createDraft(draft: z.infer<typeof DraftSchema>, actor: any) {
  await connectDB()
  const freshUser = await User.findById(actor.id).select('dialectPermissions').lean()
  const auth = {
    ...actor,
    dialectPermissions: (freshUser?.dialectPermissions || actor.dialectPermissions || []) as Array<{ dialectName: string, role: string }>
  }
  if (!canContributeToDialect(auth, draft.dialect)) {
    throw createError({ statusCode: 403, message: '你沒有權限為此方言建立草稿' })
  }

  const duplicate = await createDefaultAgentToolRegistry().execute('jyutcollab.check_duplicate', {
    headword: draft.headword,
    dialect: draft.dialect
  }, { channel: 'web', actor })
  const duplicateRisk = Boolean((duplicate.data as any)?.duplicateRisk)
  if (duplicateRisk) {
    return message('草稿未建立：同方言已有重複詞條。', 'assistant', {
      toolCall: {
        name: 'jyutcollab.check_duplicate',
        risk: 'safe',
        summary: duplicate.summary,
        data: duplicate.data,
        warnings: duplicate.warnings,
        nextAction: duplicate.nextAction
      }
    })
  }

  const lexemeId = nanoid(10)
  const entry = await Entry.create({
    id: nanoid(12),
    lexemeId,
    headword: {
      display: draft.headword,
      normalized: draft.headword,
      isPlaceholder: draft.headword.includes('□'),
      variants: []
    },
    dialect: { name: draft.dialect },
    phonetic: { jyutping: draft.jyutping },
    entryType: 'word',
    senses: [{ definition: draft.definition, examples: [] }],
    theme: {},
    meta: draft.register ? { register: draft.register } : {},
    status: 'draft',
    createdBy: actor.id,
    viewCount: 0,
    likeCount: 0
  })

  await EditHistory.create({
    entryId: entry._id.toString(),
    userId: actor.id,
    beforeSnapshot: {},
    afterSnapshot: entry.toObject(),
    changedFields: ['id', 'lexemeId', 'headword', 'dialect', 'phonetic', 'entryType', 'senses', 'theme', 'meta', 'status'],
    action: 'create',
    comment: 'Created via JyutCollab AI Agent'
  })

  return message(`已建立草稿「${draft.headword}」，ID：${entry.id || entry._id.toString()}。`)
}

async function submitEntry(entryId: string, actor: any) {
  await connectDB()
  const entry = await findEntryByAgentId(entryId)
  if (!entry) throw createError({ statusCode: 404, message: '詞條不存在' })
  const isOwner = entry.createdBy === actor.id
  const canSubmit = isOwner || actor.role === 'admin' || actor.role === 'reviewer'
  if (!canSubmit) throw createError({ statusCode: 403, message: '無權提交此詞條' })
  if (entry.status !== 'draft' && entry.status !== 'rejected') {
    throw createError({ statusCode: 400, message: '只有草稿或已退回詞條可以送審' })
  }
  const beforeSnapshot = entry.toObject()
  entry.status = 'pending_review'
  entry.updatedBy = actor.id
  await entry.save()
  await EditHistory.create({
    entryId: entry._id.toString(),
    userId: actor.id,
    beforeSnapshot,
    afterSnapshot: entry.toObject(),
    changedFields: ['status', 'updatedBy'],
    action: 'status_change',
    comment: 'Submitted via JyutCollab AI Agent'
  })
  return message(`已將「${entry.headword?.display || entryId}」送交審核。`)
}

async function reviewEntry(entryId: string, actor: any, approved: boolean, reason?: string) {
  if (actor.role !== 'reviewer' && actor.role !== 'admin') {
    throw createError({ statusCode: 403, message: '無權執行審核操作' })
  }
  await connectDB()
  const entry = await findEntryByAgentId(entryId)
  if (!entry) throw createError({ statusCode: 404, message: '詞條不存在' })
  if (entry.status !== 'pending_review') {
    throw createError({ statusCode: 400, message: '只有待審核詞條可以執行此操作' })
  }
  const beforeSnapshot = entry.toObject()
  const updatedEntry = await Entry.findOneAndUpdate(
    { _id: entry._id, status: 'pending_review' },
    {
      $set: {
        status: approved ? 'approved' : 'rejected',
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        ...(!approved ? { reviewNotes: reason || '未提供拒絕原因' } : {})
      }
    },
    { returnDocument: 'after' }
  )
  if (!updatedEntry) throw createError({ statusCode: 409, message: '該詞條已被其他審核員處理' })
  await EditHistory.create({
    entryId: updatedEntry._id.toString(),
    userId: actor.id,
    beforeSnapshot,
    afterSnapshot: updatedEntry.toObject(),
    changedFields: approved ? ['status', 'reviewedBy', 'reviewedAt'] : ['status', 'reviewedBy', 'reviewedAt', 'reviewNotes'],
    action: 'status_change',
    comment: approved ? 'Approved via JyutCollab AI Agent' : `Rejected via JyutCollab AI Agent: ${reason || '未提供拒絕原因'}`
  })
  return message(approved ? `已通過「${updatedEntry.headword?.display || entryId}」。` : `已拒絕「${updatedEntry.headword?.display || entryId}」。`)
}

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄後使用 AI Agent' })
  }

  const parsed = ChatSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: 'Agent 請求格式無效' })
  }

  const actor = event.context.auth
  pruneExpiredPendingActions()
  const { message: userMessage, confirmation } = parsed.data

  if (confirmation) {
    const pending = pendingActions.get(confirmation.id)
    if (!pending) return { messages: [message('確認已過期或不存在，請重新發起操作。')] }
    if (!confirmation.confirmed) {
      pendingActions.delete(confirmation.id)
      return { messages: [message('已取消操作。')] }
    }
    if (new Date(pending.expiresAt).getTime() <= Date.now()) {
      pendingActions.delete(confirmation.id)
      return { messages: [message('確認已過期，請重新發起操作。')] }
    }
    const requiredEcho = 'headword' in pending ? pending.headword : pending.draft.headword
    if (pending.actorId !== actor.id || confirmation.echo !== requiredEcho) {
      return { messages: [message('確認失敗：操作者或 echo 不匹配。')] }
    }
    pendingActions.delete(confirmation.id)
    if (pending.action === 'create_draft_entry') return { messages: [await createDraft(pending.draft, actor)] }
    if (pending.action === 'submit_entry_for_review') return { messages: [await submitEntry(pending.entryId, actor)] }
    if (pending.action === 'approve_review_entry') return { messages: [await reviewEntry(pending.entryId, actor, true)] }
    if (!confirmation.reason?.trim()) return { messages: [message('拒絕操作需要提供拒絕原因。')] }
    return { messages: [await reviewEntry(pending.entryId, actor, false, confirmation.reason)] }
  }

  const text = userMessage.trim()
  const lower = text.toLowerCase()

  if (lower.includes('草稿') || lower.includes('draft') || lower.includes('新建') || lower.includes('建立')) {
    const draft = parseDraft(text)
    if (!draft.success) return { messages: [message('請提供草稿資料，例如：建立草稿 詞頭: 食飯 方言: hongkong 釋義: to eat a meal。')] }
    const request = buildConfirmationRequest({
      action: 'create_draft_entry',
      risk: 'draft_write',
      actorId: actor.id,
      channel: 'web',
      target: { headword: draft.data.headword, label: `${draft.data.headword} / ${draft.data.dialect}` },
      requiredEcho: draft.data.headword,
      summary: `建立草稿「${draft.data.headword}」？`,
      consequences: ['會在 JyutCollab 建立一個 draft 詞條。', '不會自動送審。']
    })
    pendingActions.set(request.id, { action: 'create_draft_entry', actorId: actor.id, draft: draft.data, expiresAt: request.expiresAt })
    return { messages: [message('建立草稿需要確認。', 'assistant', { confirmation: request })] }
  }
  if (lower.includes('送審') || lower.includes('submit')) {
    const entryId = extractEntryId(text)
    if (!entryId) return { messages: [message('請提供要送審的詞條 ID。')] }
    const request = buildConfirmationRequest({
      action: 'submit_entry_for_review',
      risk: 'editorial',
      actorId: actor.id,
      channel: 'web',
      target: { entryId, label: entryId },
      requiredEcho: entryId,
      summary: `送審詞條 ${entryId}？`,
      consequences: ['詞條狀態會改為 pending_review。']
    })
    pendingActions.set(request.id, { action: 'submit_entry_for_review', actorId: actor.id, entryId, headword: entryId, expiresAt: request.expiresAt })
    return { messages: [message('送審需要確認。', 'assistant', { confirmation: request })] }
  }
  if (lower.includes('審核隊列') || lower.includes('review queue')) {
    if (actor.role !== 'reviewer' && actor.role !== 'admin') {
      return { messages: [message('你目前沒有審核隊列權限。')] }
    }
    await connectDB()
    const entries = await Entry.find({ status: 'pending_review' }).sort({ createdAt: 1 }).limit(10).lean()
    return {
      messages: [message(`目前有 ${entries.length} 個待審詞條（最多顯示 10 個）。`, 'tool', {
        toolCall: {
          name: 'jyutcollab.review_queue',
          risk: 'safe',
          summary: `目前有 ${entries.length} 個待審詞條。`,
          data: {
            entries: entries.map(entry => ({
              id: entry.id || entry._id.toString(),
              headword: entry.headword?.display,
              dialect: entry.dialect?.name,
              definition: entry.senses?.[0]?.definition
            }))
          },
          nextAction: '可輸入「通過 id: 詞條ID」或「拒絕 id: 詞條ID」。'
        }
      })]
    }
  }
  if (lower.includes('通過') || lower.includes('approve') || lower.includes('拒絕') || lower.includes('reject')) {
    const entryId = extractEntryId(text)
    if (!entryId) return { messages: [message('請提供要審核的詞條 ID。')] }
    const rejecting = lower.includes('拒絕') || lower.includes('reject')
    const request = buildConfirmationRequest({
      action: rejecting ? 'reject_review_entry' : 'approve_review_entry',
      risk: 'editorial',
      actorId: actor.id,
      channel: 'web',
      target: { entryId, label: entryId },
      requiredEcho: entryId,
      summary: `${rejecting ? '拒絕' : '通過'}詞條 ${entryId}？`,
      consequences: ['這會改變詞條審核狀態。']
    })
    pendingActions.set(request.id, { action: rejecting ? 'reject_review_entry' : 'approve_review_entry', actorId: actor.id, entryId, headword: entryId, expiresAt: request.expiresAt })
    return { messages: [message('審核操作需要確認。', 'assistant', { confirmation: request })] }
  }

  const agentResult = await runAgent({
    message: text,
    route: parsed.data.route,
    actor,
    channel: 'web',
    registry: createDefaultAgentToolRegistry()
  })

  return {
    messages: [message(agentResult.content, 'assistant', {
      progress: agentProgress(agentResult.toolCalls),
      localAction: (agentResult.toolCalls.at(-1)?.result.data as any)?.action,
      toolCall: agentResult.toolCalls.length ? toolResultPayload(agentResult.toolCalls.at(-1)!) : undefined
    })]
  }
})
