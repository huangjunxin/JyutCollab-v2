import { z } from 'zod'
import { connectDB } from '../../db'
import { EditHistory } from '../../EditHistory'
import { Entry } from '../../Entry'
import { User } from '../../User'
import type { AgentToolDefinition } from '../core/contracts'

const SearchHistoriesInput = z.object({
  entryQuery: z.string().trim().max(200).optional(),
  action: z.enum(['create', 'update', 'delete', 'status_change']).optional(),
  userScope: z.enum(['me', 'all', 'specific']).default('me'),
  specificUserId: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(20).default(10)
})

const GetEntryHistoryInput = z.object({
  entryId: z.string().trim().max(200).optional(),
  headword: z.string().trim().max(200).optional(),
  dialect: z.string().trim().max(100).optional(),
  limit: z.number().int().min(1).max(20).default(5)
})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compactHistorySummary(history: any) {
  const before = history.beforeSnapshot
  const after = history.afterSnapshot
  const headword = after?.headword?.display || before?.headword?.display || after?.text || before?.text || ''
  const dialect = after?.dialect?.name || before?.dialect?.name || ''
  return {
    id: String(history._id),
    entryId: history.entryId,
    action: history.action,
    headword,
    dialect,
    changedFields: history.changedFields || [],
    comment: history.comment,
    isReverted: history.isReverted || false,
    createdAt: history.createdAt?.toISOString?.() || String(history.createdAt),
    userId: history.userId
  }
}

export const searchHistoriesTool: AgentToolDefinition<z.infer<typeof SearchHistoriesInput>> = {
  name: 'jyutcollab.search_histories',
  description: '按詞頭、動作類型和用戶範圍查詢編輯歷史記錄。',
  risk: 'safe',
  inputSchema: SearchHistoriesInput,
  async execute(input, ctx) {
    await connectDB()

    const actorId = ctx.actor?.id
    if (!actorId) {
      return { ok: false, summary: '需要登入才能查詢編輯歷史。' }
    }

    const actorUser = await User.findById(actorId).select('_id role').lean()
    if (!actorUser) {
      return { ok: false, summary: '無法確認用戶身份。' }
    }

    const actorRole = actorUser.role
    const filter: Record<string, any> = {}

    if (input.entryQuery) {
      const escaped = escapeRegex(input.entryQuery)
      const searchRegex = new RegExp(escaped, 'i')
      filter.$or = [
        { entryId: searchRegex },
        { 'beforeSnapshot.headword.display': searchRegex },
        { 'afterSnapshot.headword.display': searchRegex },
        { 'beforeSnapshot.text': searchRegex },
        { 'afterSnapshot.text': searchRegex }
      ]
    }

    if (input.action) {
      filter.action = input.action
    }

    if (actorRole === 'contributor') {
      filter.userId = actorId
    } else if (input.userScope === 'me') {
      filter.userId = actorId
    } else if (input.userScope === 'specific' && input.specificUserId) {
      filter.userId = input.specificUserId
    }

    const skip = (input.page - 1) * input.perPage
    const [histories, total] = await Promise.all([
      EditHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(input.perPage).lean(),
      EditHistory.countDocuments(filter)
    ])

    const userIds = [...new Set(histories.map((h: any) => h.userId))]
    const users = await User.find({ _id: { $in: userIds } }).select('_id username displayName').lean()
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))

    const summaries = histories.map((h: any) => {
      const compact = compactHistorySummary(h)
      const user = userMap.get(h.userId)
      return {
        ...compact,
        user: user ? { username: user.username, displayName: user.displayName } : undefined
      }
    })

    return {
      ok: true,
      data: { histories: summaries, page: input.page, perPage: input.perPage, total },
      summary: `找到 ${total} 條編輯歷史，返回 ${summaries.length} 條。`,
      nextAction: '可前往 /histories 查看完整歷史，或使用 jyutcollab.get_entry_history 查看單個詞條的變更。'
    }
  }
}

export const getEntryHistoryTool: AgentToolDefinition<z.infer<typeof GetEntryHistoryInput>> = {
  name: 'jyutcollab.get_entry_history',
  description: '查詢單個詞條的編輯歷史，回答「誰改過、改了什麼」。',
  risk: 'safe',
  inputSchema: GetEntryHistoryInput,
  async execute(input, ctx) {
    await connectDB()

    const actorId = ctx.actor?.id
    if (!actorId) {
      return { ok: false, summary: '需要登入才能查詢編輯歷史。' }
    }

    const actorUser = await User.findById(actorId).select('_id role').lean()
    if (!actorUser) {
      return { ok: false, summary: '無法確認用戶身份。' }
    }

    let entryId = input.entryId
    if (!entryId && input.headword) {
      const entryFilter: Record<string, any> = { 'headword.display': input.headword }
      const dialect = input.dialect
      if (dialect) entryFilter['dialect.name'] = dialect
      const entry = await Entry.findOne(entryFilter).select('id').lean()
      if (!entry) {
        return {
          ok: false,
          summary: `找不到詞頭為「${input.headword}」${dialect ? `、方言為「${dialect}」` : ''}的詞條。`,
          nextAction: '確認詞頭和方言後重試，或使用 jyutcollab.search_entries 先搜尋。'
        }
      }
      entryId = entry.id
    }

    if (!entryId) {
      return {
        ok: false,
        summary: '需要提供 entryId 或 headword 才能查詢歷史。',
        nextAction: '提供詞條 ID 或詞頭。'
      }
    }

    const filter: Record<string, any> = { entryId }
    if (actorUser.role === 'contributor') {
      filter.userId = actorId
    }

    const histories = await EditHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(input.limit)
      .lean()

    if (!histories.length) {
      return {
        ok: true,
        data: { entryId, histories: [], total: 0 },
        summary: `詞條 ${entryId} 沒有編輯歷史記錄。`,
        nextAction: '可能是新詞條或您無權查看其他用戶的歷史。'
      }
    }

    const userIds = [...new Set(histories.map((h: any) => h.userId))]
    const users = await User.find({ _id: { $in: userIds } }).select('_id username displayName').lean()
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))

    const summaries = histories.map((h: any) => {
      const compact = compactHistorySummary(h)
      const user = userMap.get(h.userId)
      return {
        ...compact,
        user: user ? { username: user.username, displayName: user.displayName } : undefined
      }
    })

    const headword = summaries[0]?.headword || entryId

    return {
      ok: true,
      data: { entryId, headword, histories: summaries, total: summaries.length },
      summary: `「${headword}」共 ${summaries.length} 條歷史記錄。最近一次：${summaries[0]?.user?.displayName || '未知用戶'} 在 ${summaries[0]?.createdAt} 進行了「${summaries[0]?.action}」操作。`,
      nextAction: '可前往 /histories 查看完整歷史頁面，或使用 /api/histories/revert 進行還原。'
    }
  }
}

export function createHistoryTools() {
  return [searchHistoriesTool, getEntryHistoryTool]
}
