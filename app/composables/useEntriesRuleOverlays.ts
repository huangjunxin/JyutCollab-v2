import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { AdvancedFilterFieldKey, AdvancedFilterError, RowFilterContext } from '~/utils/entriesAdvancedFilter'
import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, parseAdvancedFormula, testAdvancedRegex } from '~/utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { getEntryIdString } from '~/utils/entryKey'

export type OverlayRuleKind = 'formatting' | 'validation'
export type OverlayConditionKind = 'formula' | 'regex'
export type OverlayStylePreset = 'green' | 'blue' | 'purple' | 'amber'
export type OverlayRegexField = AdvancedFilterFieldKey | 'any'

export interface EntriesRuleCondition {
  kind: OverlayConditionKind
  formula: string
  regex: {
    pattern: string
    flags: string
    field: OverlayRegexField
  }
}

export interface EntriesRuleOverlay {
  id: string
  name: string
  kind: OverlayRuleKind
  enabled: boolean
  targetFields: AdvancedFilterFieldKey[]
  condition: EntriesRuleCondition
  stylePreset: OverlayStylePreset
}

export interface CellRuleMatch {
  ruleId: string
  ruleName: string
  ruleKind: OverlayRuleKind
  stylePreset: OverlayStylePreset
}

export interface EntryCellOverlayMeta {
  formattingMatches: CellRuleMatch[]
  validationMatches: CellRuleMatch[]
  classNames: string[]
  tooltipText: string
  formattingTooltipText: string
  validationTooltipText: string
}

export type EntriesRuleDraft = Omit<EntriesRuleOverlay, 'id'>

export interface EntriesRuleOverlayErrors {
  name: string | null
  targetFields: string | null
  formula: AdvancedFilterError | null
  regex: AdvancedFilterError | null
}

const DEFAULT_RULE_NAME = '新規則'
const DEFAULT_STYLE_PRESET: OverlayStylePreset = 'green'

const FORMATTING_CLASS_PRESETS: Record<OverlayStylePreset, string[]> = {
  green: ['bg-green-50', 'ring-1', 'ring-green-200'],
  blue: ['bg-blue-50', 'ring-1', 'ring-blue-200'],
  purple: ['bg-purple-50', 'ring-1', 'ring-purple-200'],
  amber: ['bg-amber-50', 'ring-1', 'ring-amber-200']
}

const VALIDATION_CLASS_NAMES = ['bg-amber-50', 'ring-1', 'ring-amber-300', 'text-amber-950']

function createRuleApplicationError(ruleKind: OverlayRuleKind, error: AdvancedFilterError): AdvancedFilterError {
  const prefix = ruleKind === 'formatting' ? '條件格式無法套用' : '驗證警告無法套用'
  return {
    ...error,
    message: `${prefix}：${error.message}`
  }
}

function createRegexApplicationError(error: AdvancedFilterError): AdvancedFilterError {
  return {
    ...error,
    message: `正則表達式無法套用：${error.message}`
  }
}

function createLocalRuleId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function isAdvancedFilterField(value: string): value is AdvancedFilterFieldKey {
  return ADVANCED_FILTER_FIELDS.includes(value as AdvancedFilterFieldKey)
}

function createDefaultDraftRule(): EntriesRuleDraft {
  return {
    name: DEFAULT_RULE_NAME,
    kind: 'formatting',
    enabled: true,
    targetFields: ['definition'],
    condition: {
      kind: 'formula',
      formula: '',
      regex: {
        pattern: '',
        flags: 'i',
        field: 'any'
      }
    },
    stylePreset: DEFAULT_STYLE_PRESET
  }
}

function cloneDraftRule(draft: EntriesRuleDraft): EntriesRuleDraft {
  return {
    name: draft.name,
    kind: draft.kind,
    enabled: draft.enabled,
    targetFields: [...draft.targetFields],
    condition: {
      kind: draft.condition.kind,
      formula: draft.condition.formula,
      regex: {
        pattern: draft.condition.regex.pattern,
        flags: draft.condition.regex.flags,
        field: draft.condition.regex.field
      }
    },
    stylePreset: draft.stylePreset
  }
}

function createCellRuleMatch(rule: EntriesRuleOverlay): CellRuleMatch {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleKind: rule.kind,
    stylePreset: rule.stylePreset
  }
}

function createCellOverlayMeta(formattingMatches: CellRuleMatch[], validationMatches: CellRuleMatch[]): EntryCellOverlayMeta {
  const classNameSet = new Set<string>()
  for (const match of formattingMatches) {
    for (const className of FORMATTING_CLASS_PRESETS[match.stylePreset]) classNameSet.add(className)
  }
  if (validationMatches.length > 0) {
    for (const className of VALIDATION_CLASS_NAMES) classNameSet.add(className)
  }

  const formattingTooltipText = formattingMatches.map(match => `格式：${match.ruleName}`).join('\n')
  const validationTooltipText = validationMatches.map(match => `警告：${match.ruleName}`).join('\n')
  const tooltipText = [formattingTooltipText, validationTooltipText].filter(Boolean).join('\n')

  return {
    formattingMatches,
    validationMatches,
    classNames: [...classNameSet],
    tooltipText,
    formattingTooltipText,
    validationTooltipText
  }
}

function ruleMatchesContext(rule: EntriesRuleOverlay, context: RowFilterContext): boolean {
  if (!rule.enabled || rule.targetFields.length === 0) return false

  if (rule.condition.kind === 'formula') {
    const result = evaluateAdvancedFormula(rule.condition.formula, context)
    return result.ok ? result.value : false
  }

  const compiled = compileAdvancedRegex(rule.condition.regex.pattern, rule.condition.regex.flags)
  if (!compiled.ok) return false
  const value = rule.condition.regex.field === 'any'
    ? buildSearchableRowText(context)
    : context[rule.condition.regex.field]
  return testAdvancedRegex(compiled.regex, value)
}

export function createEmptyCellOverlayMeta(): EntryCellOverlayMeta {
  return {
    formattingMatches: [],
    validationMatches: [],
    classNames: [],
    tooltipText: '',
    formattingTooltipText: '',
    validationTooltipText: ''
  }
}

export function useEntriesRuleOverlays(args: {
  visibleEntries: Ref<Entry[]> | ComputedRef<Entry[]>
  buildRowContext: (entry: Entry) => RowFilterContext
}) {
  const ruleOverlayExpanded = ref(false)
  const rules = ref<EntriesRuleOverlay[]>([])
  const draftRule = reactive<EntriesRuleDraft>(createDefaultDraftRule())
  const ruleOverlayErrors = reactive<EntriesRuleOverlayErrors>({
    name: null,
    targetFields: null,
    formula: null,
    regex: null
  })

  const activeRuleCount = computed(() => rules.value.filter(rule => rule.enabled).length)

  const cellOverlayMetaByEntryKey = computed(() => {
    const metaByEntryKey = new Map<string, Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>>()

    for (const entry of args.visibleEntries.value) {
      const context = args.buildRowContext(entry)
      const matchesByField = new Map<AdvancedFilterFieldKey, { formatting: CellRuleMatch[]; validation: CellRuleMatch[] }>()

      for (const rule of rules.value) {
        if (!ruleMatchesContext(rule, context)) continue
        const match = createCellRuleMatch(rule)
        for (const field of rule.targetFields) {
          if (!isAdvancedFilterField(field)) continue
          const fieldMatches = matchesByField.get(field) ?? { formatting: [], validation: [] }
          if (rule.kind === 'formatting') fieldMatches.formatting.push(match)
          else fieldMatches.validation.push(match)
          matchesByField.set(field, fieldMatches)
        }
      }

      if (matchesByField.size === 0) continue
      const fieldMetaMap = new Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>()
      for (const [field, matches] of matchesByField) {
        fieldMetaMap.set(field, createCellOverlayMeta(matches.formatting, matches.validation))
      }
      metaByEntryKey.set(getEntryIdString(entry), fieldMetaMap)
    }

    return metaByEntryKey
  })

  function resetDraftRule() {
    Object.assign(draftRule, createDefaultDraftRule())
  }

  function clearRuleOverlayErrors() {
    ruleOverlayErrors.name = null
    ruleOverlayErrors.targetFields = null
    ruleOverlayErrors.formula = null
    ruleOverlayErrors.regex = null
  }

  function validateDraftRule(): EntriesRuleDraft | null {
    if (!draftRule.name.trim()) {
      ruleOverlayErrors.name = '請輸入規則名稱。'
      return null
    }

    const targetFields = [...new Set(draftRule.targetFields.filter(isAdvancedFilterField))]
    if (targetFields.length === 0) {
      ruleOverlayErrors.targetFields = '請至少選擇一個目標欄位。'
      return null
    }

    const nextRule = cloneDraftRule(draftRule)
    nextRule.name = nextRule.name.trim()
    nextRule.targetFields = targetFields

    if (nextRule.condition.kind === 'formula') {
      const parsed = parseAdvancedFormula(nextRule.condition.formula)
      if (!parsed.ok) {
        ruleOverlayErrors.formula = createRuleApplicationError(nextRule.kind, parsed.error)
        return null
      }
    } else {
      const regexField = nextRule.condition.regex.field
      if (regexField !== 'any' && !isAdvancedFilterField(regexField)) {
        ruleOverlayErrors.regex = createRegexApplicationError({
          code: 'invalid_pattern',
          message: '正則表達式欄位無效。'
        })
        return null
      }

      const compiled = compileAdvancedRegex(nextRule.condition.regex.pattern, nextRule.condition.regex.flags)
      if (!compiled.ok) {
        ruleOverlayErrors.regex = createRegexApplicationError(compiled.error)
        return null
      }
    }

    return nextRule
  }

  function addRuleFromDraft(): boolean {
    clearRuleOverlayErrors()
    const nextRule = validateDraftRule()
    if (!nextRule) return false
    rules.value = [...rules.value, { ...nextRule, id: createLocalRuleId() }]
    resetDraftRule()
    return true
  }

  function toggleRule(ruleId: string, enabled?: boolean) {
    rules.value = rules.value.map(rule => rule.id === ruleId ? { ...rule, enabled: enabled ?? !rule.enabled } : rule)
  }

  function removeRule(ruleId: string) {
    rules.value = rules.value.filter(rule => rule.id !== ruleId)
  }

  function moveRule(ruleId: string, direction: -1 | 1) {
    const index = rules.value.findIndex(rule => rule.id === ruleId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= rules.value.length) return
    const nextRules = [...rules.value]
    const [rule] = nextRules.splice(index, 1)
    nextRules.splice(nextIndex, 0, rule)
    rules.value = nextRules
  }

  function clearRules() {
    rules.value = []
    clearRuleOverlayErrors()
  }

  function getCellOverlayMeta(entry: Entry, field: AdvancedFilterFieldKey): EntryCellOverlayMeta {
    if (!isAdvancedFilterField(field)) return createEmptyCellOverlayMeta()
    return cellOverlayMetaByEntryKey.value.get(getEntryIdString(entry))?.get(field) ?? createEmptyCellOverlayMeta()
  }

  return {
    ruleOverlayExpanded,
    rules,
    draftRule,
    ruleOverlayErrors,
    activeRuleCount,
    cellOverlayMetaByEntryKey,
    resetDraftRule,
    addRuleFromDraft,
    toggleRule,
    removeRule,
    moveRule,
    clearRuleOverlayErrors,
    clearRules,
    getCellOverlayMeta
  }
}
