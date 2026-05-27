import { z } from 'zod'
import { DIALECT_IDS, DIALECT_LABELS, DIALECT_OPTIONS, getDialectColor } from '../../../../shared/dialects'
import { connectDB } from '../../db'
import { Entry } from '../../Entry'
import type { AgentToolDefinition } from '../core/contracts'
import { compactEntrySummary, redactAgentPayload } from './serializers'

const EntrySearchInput = z.object({
  query: z.string().trim().max(200).optional(),
  headword: z.string().trim().max(200).optional(),
  jyutping: z.string().trim().max(100).optional(),
  dialectName: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  category: z.string().trim().max(100).optional(),
  register: z.string().trim().max(50).optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(20).default(10)
})

const EntryDetailInput = z.object({
  id: z.string().trim().min(1).max(200)
})

const DuplicateCheckInput = z.object({
  headword: z.string().trim().min(1).max(200),
  dialect: z.string().trim().min(1).max(100),
  excludeId: z.string().trim().max(200).optional()
})

const DialectListInput = z.object({})

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function normalizeDialectName(value?: string) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  if ((DIALECT_IDS as readonly string[]).includes(trimmed)) return trimmed

  const labels = DIALECT_LABELS as Record<string, string>
  const exact = Object.entries(labels).find(([, label]) => label === trimmed)
  if (exact) return exact[0]

  const compact = trimmed.replace(/\s+/g, '')
  const compactMatch = Object.entries(labels).find(([, label]) => label.replace(/\s+/g, '') === compact)
  if (compactMatch) return compactMatch[0]

  return trimmed
}

export const listDialectsTool: AgentToolDefinition<z.infer<typeof DialectListInput>> = {
  name: 'jyutcollab.list_dialects',
  description: '列出 JyutCollab 支援的方言代碼、顯示名稱與顏色。',
  risk: 'safe',
  inputSchema: DialectListInput,
  async execute() {
    const dialects = DIALECT_OPTIONS.map(option => ({
      id: option.value,
      label: option.label,
      color: getDialectColor(option.value)
    }))

    return {
      ok: true,
      data: { dialects },
      summary: `已列出 ${dialects.length} 個方言點。`,
      nextAction: '使用方言代碼作為後續工具的 dialectName 或 region 參數。'
    }
  }
}

export const searchEntriesTool: AgentToolDefinition<z.infer<typeof EntrySearchInput>> = {
  name: 'jyutcollab.search_entries',
  description: '安全搜尋詞條，不修改資料。',
  risk: 'safe',
  inputSchema: EntrySearchInput,
  async execute(input) {
    await connectDB()
    const filter: Record<string, any> = {}
    const trimmedQuery = input.query?.trim()

    if (trimmedQuery) {
      const regex = new RegExp(escapeRegex(trimmedQuery), 'i')
      filter.$or = [
        { id: regex },
        { lexemeId: regex },
        { 'headword.display': regex },
        { 'headword.normalized': regex },
        { 'headword.variants': regex },
        { 'phonetic.jyutping': regex },
        { 'senses.definition': regex },
        { 'senses.examples.text': regex },
        { 'meta.category': regex },
        { 'meta.register': regex }
      ]
    }

    if (input.headword) {
      const regex = new RegExp(escapeRegex(input.headword), 'i')
      filter.$and = [...(filter.$and || []), { $or: [{ 'headword.display': regex }, { 'headword.normalized': regex }, { 'headword.variants': regex }] }]
    }
    if (input.jyutping) filter['phonetic.jyutping'] = new RegExp(escapeRegex(input.jyutping), 'i')
    const dialectName = normalizeDialectName(input.dialectName)
    if (dialectName) filter['dialect.name'] = dialectName
    if (input.status) filter.status = input.status
    if (input.category) filter['meta.category'] = new RegExp(escapeRegex(input.category), 'i')
    if (input.register) filter['meta.register'] = input.register

    const [entries, total] = await Promise.all([
      Entry.find(filter).sort({ updatedAt: -1 }).skip((input.page - 1) * input.perPage).limit(input.perPage).lean(),
      Entry.countDocuments(filter)
    ])
    const summaries = entries.map(compactEntrySummary)

    return {
      ok: true,
      data: { entries: summaries, page: input.page, perPage: input.perPage, total },
      summary: `找到 ${total} 個詞條，返回 ${summaries.length} 個。`,
      nextAction: '需要查看完整內容時，使用 jyutcollab.get_entry_detail。'
    }
  }
}

export const getEntryDetailTool: AgentToolDefinition<z.infer<typeof EntryDetailInput>> = {
  name: 'jyutcollab.get_entry_detail',
  description: '讀取單個詞條詳情，不修改資料。',
  risk: 'safe',
  inputSchema: EntryDetailInput,
  async execute(input) {
    await connectDB()
    const conditions: Record<string, unknown>[] = [{ id: input.id }]
    if (/^[a-f\d]{24}$/i.test(input.id)) conditions.push({ _id: input.id })
    const entry = await Entry.findOne({ $or: conditions }).lean()
    if (!entry) {
      return {
        ok: false,
        summary: '找不到指定詞條。',
        warnings: [`entry id ${input.id} 不存在。`],
        nextAction: '確認詞條 ID 後重試。'
      }
    }

    return {
      ok: true,
      data: { entry: redactAgentPayload(entry) },
      summary: `已讀取詞條「${entry.headword?.display ?? input.id}」。`,
      nextAction: '如需修改，後續必須經過草稿或審核確認流程。'
    }
  }
}

export const checkDuplicateTool: AgentToolDefinition<z.infer<typeof DuplicateCheckInput>> = {
  name: 'jyutcollab.check_duplicate',
  description: '檢查同方言阻塞性重複與其他方言參考詞條。',
  risk: 'safe',
  inputSchema: DuplicateCheckInput,
  async execute(input) {
    await connectDB()
    const excludeConditions: Record<string, any>[] = []
    if (input.excludeId) {
      excludeConditions.push({ id: { $ne: input.excludeId } })
      if (/^[a-f\d]{24}$/i.test(input.excludeId)) excludeConditions.push({ _id: { $ne: input.excludeId } })
    }
    const excludeFilter = excludeConditions.length > 0 ? { $and: excludeConditions } : {}
    const dialect = normalizeDialectName(input.dialect) || input.dialect
    const [sameDialectRaw, otherDialectsRaw] = await Promise.all([
      Entry.find({
        'headword.display': input.headword,
        'dialect.name': dialect,
        ...excludeFilter
      }).select('id headword dialect status senses meta theme createdAt').sort({ createdAt: -1 }).limit(20).lean(),
      Entry.find({
        'headword.display': input.headword,
        'dialect.name': { $ne: dialect },
        ...excludeFilter
      }).select('id headword dialect status senses meta theme createdAt').sort({ createdAt: -1 }).limit(20).lean()
    ])
    const sameDialect = sameDialectRaw.map(compactEntrySummary)
    const otherDialects = otherDialectsRaw.map(compactEntrySummary)
    const duplicateRisk = sameDialect.length > 0

    return {
      ok: true,
      data: {
        duplicateRisk,
        sameDialect,
        otherDialects
      },
      summary: duplicateRisk
        ? `「${input.headword}」在 ${dialect} 已有 ${sameDialect.length} 個同方言詞條。`
        : `「${input.headword}」在 ${dialect} 未發現同方言重複。`,
      warnings: duplicateRisk ? ['同方言重複應阻止直接建立新草稿。'] : [],
      nextAction: otherDialects.length > 0 ? '可參考其他方言詞條內容，但不視為阻塞性重複。' : '可繼續草稿準備流程。'
    }
  }
}

export function createReadOnlyJyutCollabTools() {
  return [
    listDialectsTool,
    searchEntriesTool,
    getEntryDetailTool,
    checkDuplicateTool
  ]
}

export function isKnownDialectId(value: string): boolean {
  return (DIALECT_IDS as readonly string[]).includes(value)
}
