import { z } from 'zod'
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

  // Detect semantic/theme patterns
  const semanticPatterns: Array<{ keywords: string[], pattern: string, label: string }> = [
    { keywords: ['動物', '獸', '禽', '畜'], pattern: '動物|獸|禽|畜|鳥|貓|狗|豬|牛|羊|雞|鴨|魚|蟲', label: '動物' },
    { keywords: ['植物', '花', '草', '樹', '菜'], pattern: '植物|花|草|樹|菜|果|竹|葉|根', label: '植物' },
    { keywords: ['食物', '食', '飲', '吃', '菜式'], pattern: '食物|食|飲|吃|菜|飯|粥|粉|麵|茶|糖|餅', label: '食物' },
    { keywords: ['身體', '人體', '器官'], pattern: '身體|人體|頭|眼|耳|口|手|腳|心|胃|骨', label: '身體' },
    { keywords: ['顏色', '色'], pattern: '顏色|色|紅|藍|綠|黃|白|黑|紫|橙', label: '顏色' },
    { keywords: ['天氣', '氣象', '季節'], pattern: '天氣|氣象|雨|風|雷|雪|晴|陰|冷|熱', label: '天氣' },
    { keywords: ['情緒', '感情', '心情'], pattern: '情緒|感情|心情|開心|傷心|嬲|驚|怕|怒', label: '情緒' }
  ]
  for (const sp of semanticPatterns) {
    if (sp.keywords.some(kw => g.includes(kw))) {
      regexRows.push({ field: 'definition', pattern: sp.pattern, flags: 'i' })
      regexRows.push({ field: 'theme', pattern: sp.pattern, flags: 'i' })
      explanations.push(`釋義或主題涉及「${sp.label}」相關詞`)
    }
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
      nextAction: '使用 jyutcollab.apply_entry_filters 套用這些篩選條件到詞條表格。'
    }
  }
}

const ApplyEntryFiltersInput = z.object({
  query: z.string().trim().max(200).optional(),
  dialect: z.string().trim().max(100).optional(),
  status: z.string().trim().max(50).optional(),
  view: z.enum(['flat', 'aggregated', 'lexeme']).optional(),
  formula: z.string().trim().max(500).optional(),
  regexRows: z.array(FilterRow).max(10).optional(),
  openAdvancedFilter: z.boolean().default(false)
})

export const applyEntryFiltersTool: AgentToolDefinition<z.infer<typeof ApplyEntryFiltersInput>> = {
  name: 'jyutcollab.apply_entry_filters',
  description: '在前端詞條表格套用搜尋、方言、狀態、視圖和進階篩選條件。只修改前端狀態，不修改伺服器資料。',
  risk: 'local_ui',
  inputSchema: ApplyEntryFiltersInput,
  async execute(input) {
    const applied: string[] = []
    if (input.query) applied.push(`搜尋「${input.query}」`)
    if (input.dialect) applied.push(`方言：${input.dialect}`)
    if (input.status) applied.push(`狀態：${input.status}`)
    if (input.view) applied.push(`視圖：${input.view}`)
    if (input.formula) applied.push(`公式：${input.formula}`)
    if (input.regexRows?.length) applied.push(`正則條件 ${input.regexRows.length} 條`)

    return {
      ok: true,
      data: {
        action: {
          kind: 'apply_filters',
          label: applied.length > 0 ? `套用篩選：${applied.join('、')}` : '清除所有篩選',
          filters: {
            query: input.query,
            dialect: input.dialect,
            status: input.status,
            view: input.view,
            formula: input.formula,
            regexRows: input.regexRows,
            openAdvancedFilter: input.openAdvancedFilter
          }
        }
      },
      summary: applied.length > 0 ? `已套用 ${applied.length} 項篩選條件。` : '已清除所有篩選條件。'
    }
  }
}

export function createFilterTools() {
  return [planAdvancedFilterTool, applyEntryFiltersTool]
}
