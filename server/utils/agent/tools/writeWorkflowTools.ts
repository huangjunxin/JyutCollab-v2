import { z } from 'zod'
import { nanoid } from 'nanoid'
import { DIALECT_IDS } from '../../../../shared/dialects'
import { connectDB } from '../../db'
import { Entry } from '../../Entry'
import { User } from '../../User'
import type { AgentToolDefinition } from '../core/contracts'
import { canContributeToDialect } from '../../auth'
import { compactEntrySummary } from './serializers'
import { normalizeDialectName } from './readOnlyJyutCollab'

const PrepareDraftInput = z.object({
  headword: z.string().trim().min(1, '詞頭不能為空').max(200),
  dialect: z.string().trim().min(1, '方言不能為空').max(100).default('hongkong'),
  definition: z.string().trim().min(1, '釋義不能為空').max(1000).default('待補充'),
  jyutping: z.array(z.string().trim().max(100)).max(10).default([]),
  register: z.enum(['口語', '書面', '粗俗', '文雅', '中性']).optional()
})

const SubmitOrReviewInput = z.object({
  entryId: z.string().trim().min(1).max(200),
  action: z.enum(['submit', 'approve', 'reject']),
  reason: z.string().trim().max(500).optional()
})

export const prepareEntryDraftTool: AgentToolDefinition<z.infer<typeof PrepareDraftInput>> = {
  name: 'jyutcollab.prepare_entry_draft',
  description: '準備詞條草稿：驗證權限、檢查重複、生成草稿預覽。不會直接建立詞條，用戶確認後才會執行。',
  risk: 'safe',
  inputSchema: PrepareDraftInput,
  async execute(input, ctx) {
    const actorId = ctx.actor?.id
    if (!actorId) {
      return { ok: false, summary: '需要登入才能準備草稿。' }
    }

    await connectDB()

    const dialect = normalizeDialectName(input.dialect) || input.dialect

    // Check dialect permission
    const user = await User.findById(actorId).select('_id role dialectPermissions').lean()
    if (!user) {
      return { ok: false, summary: '無法確認用戶身份。' }
    }
    const authUser = {
      ...user,
      id: actorId,
      dialectPermissions: (user.dialectPermissions || []) as Array<{ dialectName: string, role: string }>
    }
    if (!canContributeToDialect(authUser as any, dialect)) {
      return {
        ok: false,
        summary: `你沒有權限為「${dialect}」方言建立草稿。`,
        nextAction: '請聯繫管理員獲取方言權限。'
      }
    }

    // Check duplicates
    const sameDialect = await Entry.find({
      'headword.display': input.headword,
      'dialect.name': dialect
    }).select('id headword dialect status senses').sort({ createdAt: -1 }).limit(5).lean()

    const otherDialects = await Entry.find({
      'headword.display': input.headword,
      'dialect.name': { $ne: dialect }
    }).select('id headword dialect status senses').sort({ createdAt: -1 }).limit(5).lean()

    if (sameDialect.length > 0) {
      return {
        ok: false,
        summary: `「${input.headword}」在「${dialect}」已有 ${sameDialect.length} 個同方言詞條，不能建立重複草稿。`,
        data: {
          duplicateRisk: true,
          sameDialect: sameDialect.map(compactEntrySummary),
          otherDialects: otherDialects.map(compactEntrySummary)
        },
        warnings: ['同方言重複詞條會阻礙草稿建立。'],
        nextAction: '查看已有的同方言詞條，或選擇不同的方言點。'
      }
    }

    const previewId = nanoid(12)
    const previewLexemeId = nanoid(10)

    const warnings: string[] = []
    if (otherDialects.length > 0) {
      warnings.push(`其他方言已有 ${otherDialects.length} 個同形詞條可供參考。`)
    }
    if (input.definition === '待補充') {
      warnings.push('釋義為預設值「待補充」，建議在確認前補充具體釋義。')
    }

    return {
      ok: true,
      data: {
        preview: {
          id: previewId,
          lexemeId: previewLexemeId,
          headword: input.headword,
          dialect,
          definition: input.definition,
          jyutping: input.jyutping,
          register: input.register,
          status: 'draft'
        },
        otherDialects: otherDialects.map(compactEntrySummary),
        confirmationInstruction: `如需建立此草稿，請發送「建立草稿 詞頭: ${input.headword} 方言: ${dialect} 釋義: ${input.definition}」`
      },
      summary: `草稿預覽：「${input.headword}」/ ${dialect} — ${input.definition}。未發現同方言重複。`,
      warnings,
      nextAction: '確認草稿內容後，發送「建立草稿」指令執行建立。'
    }
  }
}

export const submitOrReviewEntryTool: AgentToolDefinition<z.infer<typeof SubmitOrReviewInput>> = {
  name: 'jyutcollab.submit_or_review_entry',
  description: '預覽送審或審核操作的結果。不直接執行，用戶確認後才會透過確認流程執行。',
  risk: 'safe',
  inputSchema: SubmitOrReviewInput,
  async execute(input, ctx) {
    const actorId = ctx.actor?.id
    if (!actorId) {
      return { ok: false, summary: '需要登入才能執行此操作。' }
    }

    await connectDB()

    const conditions: Record<string, unknown>[] = [{ id: input.entryId }]
    if (/^[a-f\d]{24}$/i.test(input.entryId)) conditions.push({ _id: input.entryId })
    const entry = await Entry.findOne({ $or: conditions }).lean()
    if (!entry) {
      return {
        ok: false,
        summary: `找不到詞條 ${input.entryId}。`,
        nextAction: '確認詞條 ID 後重試。'
      }
    }

    const headword = entry.headword?.display || input.entryId
    const currentStatus = entry.status

    if (input.action === 'submit') {
      if (currentStatus !== 'draft' && currentStatus !== 'rejected') {
        return {
          ok: false,
          summary: `「${headword}」目前狀態為「${currentStatus}」，只有草稿或已退回詞條可以送審。`
        }
      }
      return {
        ok: true,
        data: {
          entry: compactEntrySummary(entry),
          action: 'submit',
          currentStatus,
          targetStatus: 'pending_review',
          confirmationInstruction: `如需送審，請發送「送審 id: ${entry.id || input.entryId}」`
        },
        summary: `「${headword}」目前為「${currentStatus}」，送審後狀態將改為「待審核」。`,
        nextAction: '確認後發送送審指令。'
      }
    }

    if (input.action === 'approve' || input.action === 'reject') {
      const user = await User.findById(actorId).select('_id role').lean()
      if (!user || (user.role !== 'reviewer' && user.role !== 'admin')) {
        return {
          ok: false,
          summary: '你沒有審核權限。',
          nextAction: '請聯繫管理員獲取審核員角色。'
        }
      }
      if (currentStatus !== 'pending_review') {
        return {
          ok: false,
          summary: `「${headword}」目前狀態為「${currentStatus}」，只有待審核詞條可以執行審核操作。`
        }
      }
      if (input.action === 'reject' && !input.reason) {
        return {
          ok: false,
          summary: '拒絕操作需要提供拒絕原因。',
          nextAction: '請提供 reason 參數說明拒絕原因。'
        }
      }
      return {
        ok: true,
        data: {
          entry: compactEntrySummary(entry),
          action: input.action,
          currentStatus,
          targetStatus: input.action === 'approve' ? 'approved' : 'rejected',
          reason: input.reason,
          confirmationInstruction: input.action === 'approve'
            ? `如需通過，請發送「通過 id: ${entry.id || input.entryId}」`
            : `如需拒絕，請發送「拒絕 id: ${entry.id || input.entryId}」`
        },
        summary: `「${headword}」待審核，${input.action === 'approve' ? '通過' : '拒絕'}後狀態將改為「${input.action === 'approve' ? '已通過' : '已退回'}」。`,
        nextAction: '確認後發送審核指令。'
      }
    }

    return { ok: false, summary: '不支援的操作類型。' }
  }
}

export function createWriteWorkflowTools() {
  return [prepareEntryDraftTool, submitOrReviewEntryTool]
}
