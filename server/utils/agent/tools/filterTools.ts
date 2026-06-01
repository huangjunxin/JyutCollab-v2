import { z } from 'zod'
import { THEME_ID_MAP } from '../../themeMapping'
import { normalizeDialectName } from './readOnlyJyutCollab'
import type { AgentToolDefinition } from '../core/contracts'

const PlanAdvancedFilterInput = z.object({
  userGoal: z.string().trim().min(1).max(500)
})

const FilterRow = z.object({
  field: z.string(),
  pattern: z.string(),
  flags: z.string().optional()
})

const FILTERABLE_FIELDS: Record<string, string> = {
  headword: '詞頭（headword.display）',
  definition: '釋義（senses.definition）',
  phonetic: '粵拼（phonetic.jyutping）',
  dialect: '方言點（dialect.name）',
  status: '狀態（draft/pending_review/approved/rejected）',
  category: '分類主題（meta.category）',
  register: '語域（meta.register）',
  entryType: '詞條類型（word/character/phrase/idiom/proverb）',
  examples: '例句（senses.examples.text）',
  theme: '主題標籤'
}

const THEME_QUERY_GROUPS: Array<{ keywords: string[], categoryPrefixes: string[] }> = [
  { keywords: ['身體部位', '人體部位', '身體', '人體', '器官'], categoryPrefixes: ['二B'] },
  { keywords: ['身體狀況', '健康', '疾病', '病痛', '症狀'], categoryPrefixes: ['二C9', '二C10', '二C11', '二C12', '二C13', '二C14', '二C15'] },
  { keywords: ['動物'], categoryPrefixes: ['二D'] },
  { keywords: ['植物'], categoryPrefixes: ['二E'] },
  { keywords: ['食物', '飲食', '菜式'], categoryPrefixes: ['三B', '七B2', '七B3'] },
  { keywords: ['顏色'], categoryPrefixes: ['九A11', '九A12'] },
  { keywords: ['天氣', '氣象', '氣候'], categoryPrefixes: ['二A3'] },
  { keywords: ['情緒', '感情', '心情'], categoryPrefixes: ['五A'] }
]

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[\s，、,。；;：「」『』（）()【】\[\]《》〈〉的和與跟及有關相关相關類詞語詞条詞條找查搜尋顯示列出所有]/g, '')
}

function getThemeDisplayName(category: string) {
  return category.replace(/^[一二三四五六七八九十]+[A-Z]\d+/, '')
}

function findThemeCategories(goal: string) {
  const normalizedGoal = normalizeSearchText(goal)
  if (!normalizedGoal) return []

  const groupedCategories = THEME_QUERY_GROUPS
    .filter(group => group.keywords.some(keyword => normalizedGoal.includes(normalizeSearchText(keyword))))
    .flatMap(group => Object.keys(THEME_ID_MAP).filter(category => group.categoryPrefixes.some(prefix => category.startsWith(prefix))))

  if (groupedCategories.length > 0) {
    return groupedCategories
      .map(category => ({ category, displayName: getThemeDisplayName(category), score: 100 }))
  }

  const scored = Object.keys(THEME_ID_MAP)
    .map(category => {
      const displayName = getThemeDisplayName(category)
      const normalizedCategory = normalizeSearchText(displayName)
      const score = normalizedCategory.includes(normalizedGoal)
        ? normalizedGoal.length * 4
        : normalizedGoal.includes(normalizedCategory)
          ? normalizedCategory.length * 3
          : [...normalizedGoal].filter(char => normalizedCategory.includes(char)).length
      return { category, displayName, score }
    })
    .filter(item => item.score >= Math.min(2, normalizedGoal.length))
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category, 'zh-Hant'))

  return scored.slice(0, 8)
}

function buildFilterFromGoal(goal: string): {
  formula: string | null
  regexRows: Array<{ field: string, pattern: string, flags: string }>
  humanExplanation: string
  warnings: string[]
} {
  const regexRows: Array<{ field: string, pattern: string, flags: string }> = []
  const conditions: string[] = []
  const warnings: string[] = []
  const explanations: string[] = []

  const g = goal.toLowerCase()

  // Detect phonetic/jyutping patterns
  const jyutpingMatch = goal.match(/粵拼.*?([a-z]{1,6}[1-6]?)/i)
    || goal.match(/jyutping.*?([a-z]{1,6}[1-6]?)/i)
    || goal.match(/讀音.*?([a-z]{1,6}[1-6]?)/i)
  if (jyutpingMatch?.[1]) {
    const jp = jyutpingMatch[1]
    if (goal.includes('開頭') || goal.includes('begin') || goal.includes('start')) {
      regexRows.push({ field: 'phonetic', pattern: `^${jp}`, flags: 'i' })
      explanations.push(`粵拼以「${jp}」開頭`)
    } else if (goal.includes('結尾') || goal.includes('end')) {
      regexRows.push({ field: 'phonetic', pattern: `${jp}[1-6]?$`, flags: 'i' })
      explanations.push(`粵拼以「${jp}」結尾`)
    } else {
      regexRows.push({ field: 'phonetic', pattern: jp, flags: 'i' })
      explanations.push(`粵拼包含「${jp}」`)
    }
  }

  const matchedThemes = findThemeCategories(goal)
  if (matchedThemes.length > 0) {
    const pattern = matchedThemes.map(theme => escapeRegex(theme.displayName)).join('|')
    regexRows.push({ field: 'theme', pattern, flags: 'i' })
    explanations.push(`分類匹配「${matchedThemes.map(theme => theme.displayName).join('」「')}」`)
  }

  // Detect status (take first match to avoid contradictions like approved && rejected)
  const statusMap: Record<string, string> = {
    '草稿': 'draft', '待審': 'pending_review', '待審核': 'pending_review',
    '已通過': 'approved', '已發佈': 'approved', '已批准': 'approved',
    '已退回': 'rejected', '被拒絕': 'rejected'
  }
  let statusMatched = false
  for (const [label, value] of Object.entries(statusMap)) {
    if (!statusMatched && (g.includes(label) || g.includes(value))) {
      conditions.push(`status == '${value}'`)
      explanations.push(`狀態為「${label}」`)
      statusMatched = true
    }
  }

  // Detect entry type
  const typeMap: Record<string, string> = {
    '詞': 'word', '字': 'character', '短語': 'phrase', '熟語': 'idiom', '諺語': 'proverb'
  }
  for (const [label, value] of Object.entries(typeMap)) {
    if (g.includes(label) && (g.includes('類型') || g.includes('只找') || g.includes('只要'))) {
      conditions.push(`entryType == '${value}'`)
      explanations.push(`詞條類型為「${label}」`)
    }
  }

  // Detect definition length constraints
  const shortDefMatch = goal.match(/釋義.{0,5}少於?\s*(\d+)\s*個?字/)
    || goal.match(/definition.{0,10}less.{0,5}(\d+)/i)
  if (shortDefMatch?.[1]) {
    const len = parseInt(shortDefMatch[1], 10)
    conditions.push(`len(definition) < ${len}`)
    explanations.push(`釋義少於 ${len} 個字`)
  }

  // Detect register/formality
  if (g.includes('口語') || g.includes('spoken')) {
    regexRows.push({ field: 'register', pattern: '口語', flags: 'i' })
    explanations.push('語域為口語')
  }
  if (g.includes('書面') || g.includes('written')) {
    regexRows.push({ field: 'register', pattern: '書面', flags: 'i' })
    explanations.push('語域為書面')
  }

  // If nothing matched, build a generic definition search
  if (!regexRows.length && !conditions.length) {
    const words = goal.replace(/[找查搜尋顯示列出所有跟和與有关相关的含有包含包括]/g, '').trim().split(/\s+/).filter(w => w.length > 0)
    if (words.length > 0) {
      regexRows.push({ field: 'definition', pattern: words.join('|'), flags: 'i' })
      explanations.push(`釋義包含「${words.join('」「')}」`)
      warnings.push('自動推斷的搜尋條件可能不夠精確，請確認是否符合預期。')
    }
  }

  const formula = conditions.length > 0 ? conditions.join(' && ') : null
  const humanExplanation = explanations.length > 0
    ? `將套用以下篩選：${explanations.join('；')}。`
    : '未能從描述中提取明確的篩選條件。'

  if (!regexRows.length && !formula) {
    warnings.push('無法生成篩選條件，請嘗試更具體的描述。')
  }

  return { formula, regexRows, humanExplanation, warnings }
}

export const planAdvancedFilterTool: AgentToolDefinition<z.infer<typeof PlanAdvancedFilterInput>> = {
  name: 'jyutcollab.plan_advanced_filter',
  description: '把用戶的自然語言搜尋意圖轉換為前端進階篩選公式和正則條件。可處理語義搜尋（動物、食物）、粵拼模式、狀態篩選、釋義長度等。',
  risk: 'safe',
  inputSchema: PlanAdvancedFilterInput,
  async execute(input) {
    const result = buildFilterFromGoal(input.userGoal)

    return {
      ok: true,
      data: {
        formula: result.formula,
        regexRows: result.regexRows,
        humanExplanation: result.humanExplanation,
        warnings: result.warnings,
        availableFields: FILTERABLE_FIELDS
      },
      summary: result.humanExplanation,
      warnings: result.warnings,
      nextAction: '使用 jyutcollab.apply_entry_filters 套用這些篩選條件到當前頁面（僅 /entries 詞條表格支援進階篩選，/review 和 /histories 只支援基本搜尋和分類篩選）。'
    }
  }
}

const ApplyEntryFiltersInput = z.object({
  query: z.string().trim().max(200).optional(),
  dialect: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  theme: z.string().trim().max(100).optional(),
  createdBy: z.string().trim().max(100).optional(),
  view: z.enum(['flat', 'aggregated', 'lexeme']).optional(),
  formula: z.string().trim().max(500).optional(),
  regexRows: z.array(FilterRow).max(10).optional(),
  openAdvancedFilter: z.boolean().default(false)
})

export const applyEntryFiltersTool: AgentToolDefinition<z.infer<typeof ApplyEntryFiltersInput>> = {
  name: 'jyutcollab.apply_entry_filters',
  description: '在前端頁面（詞條列表、審核隊列、編輯歷史）套用搜尋、方言、狀態、主題分類、用戶等篩選條件。只修改前端狀態，不修改伺服器資料。系統會根據當前頁面自動決定可用篩選：/entries 支援全部（含進階篩選）；/review 支援 query/dialect/status/theme/createdBy；/histories 支援 query/dialect/theme/createdBy（無狀態篩選）。',
  risk: 'local_ui',
  inputSchema: ApplyEntryFiltersInput,
  async execute(input, ctx) {
    const route = (ctx?.pageContext as any)?.route as string || '/entries'
    const isReview = route === '/review' || route.startsWith('/review')
    const isHistory = route === '/histories' || route.startsWith('/histories')
    const isEntries = !isReview && !isHistory

    const applied: string[] = []
    const dialect = normalizeDialectName(input.dialect)
    if (input.query) applied.push(`搜尋「${input.query}」`)
    if (dialect) applied.push(`方言：${dialect}`)
    if (input.status && !isHistory) applied.push(`狀態：${input.status}`)
    if (input.theme) applied.push(`主題分類 ID：${input.theme}`)
    if (input.createdBy) applied.push(`用戶：${input.createdBy}`)
    if (input.view && isEntries) applied.push(`視圖：${input.view}`)
    if (input.formula && isEntries) applied.push(`公式：${input.formula}`)
    if (input.regexRows?.length && isEntries) applied.push(`正則條件 ${input.regexRows.length} 條`)

    const filters: Record<string, unknown> = {
      query: input.query,
      dialect
    }

    if (!isHistory && input.status) filters.status = input.status
    if (input.theme) filters.theme = input.theme
    if (input.createdBy) filters.createdBy = input.createdBy

    if (isEntries) {
      if (input.view) filters.view = input.view
      if (input.formula) filters.formula = input.formula
      if (input.regexRows) filters.regexRows = input.regexRows
      if (input.openAdvancedFilter) filters.openAdvancedFilter = input.openAdvancedFilter
    }

    const pageLabel = isReview ? '審核隊列' : isHistory ? '編輯歷史' : '詞條列表'

    return {
      ok: true,
      data: {
        action: {
          kind: 'apply_filters',
          label: applied.length > 0 ? `套用篩選（${pageLabel}）：${applied.join('、')}` : `清除${pageLabel}所有篩選`,
          filters
        }
      },
      summary: applied.length > 0 ? `已在${pageLabel}套用 ${applied.length} 項篩選條件。` : `已清除${pageLabel}所有篩選條件。`
    }
  }
}

export function createFilterTools() {
  return [planAdvancedFilterTool, applyEntryFiltersTool]
}
