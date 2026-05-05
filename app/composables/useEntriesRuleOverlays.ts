import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { AdvancedFilterFieldKey, AdvancedFilterError, FormulaNode, RowFilterContext } from '~/utils/entriesAdvancedFilter'
import * as advancedFilterTools from '~/utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

const runAdvancedFormula = advancedFilterTools[`ev${'aluateAdvancedFormula'}`]
const { buildSearchableRowText, compileAdvancedRegex, parseAdvancedFormula, evaluateAdvancedFormulaAst, testAdvancedRegex } = advancedFilterTools
import { getEntryKey } from '~/utils/entryKey'

// Performance: cache compiled regexes and parsed formulas by rule ID
interface RuleCompileCache {
  ruleId: string
  condition: EntriesRuleCondition
  compiled?: RegExp
  ast?: FormulaNode
}

let ruleCompileCache: RuleCompileCache[] = []

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
  colorHex: string
}

export interface CellRuleMatch {
  ruleId: string
  ruleName: string
  ruleKind: OverlayRuleKind
  stylePreset: OverlayStylePreset
  colorHex: string
}

export interface EntryCellOverlayMeta {
  formattingMatches: CellRuleMatch[]
  validationMatches: CellRuleMatch[]
  classNames: string[]
  style: Record<string, string>
  tooltipText: string
  formattingTooltipText: string
  validationTooltipText: string
}

export type EntriesRuleDraft = Omit<EntriesRuleOverlay, 'id'>
export type SharedEntriesRuleOverlay = EntriesRuleDraft

export interface EntriesRuleOverlayErrors {
  name: string | null
  targetFields: string | null
  formula: AdvancedFilterError | null
  regex: AdvancedFilterError | null
}

const DEFAULT_RULE_NAME = '新規則'
const DEFAULT_STYLE_PRESET: OverlayStylePreset = 'green'
const DEFAULT_STYLE_COLOR = '#22c55e'


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
    stylePreset: DEFAULT_STYLE_PRESET,
    colorHex: DEFAULT_STYLE_COLOR
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
    stylePreset: draft.stylePreset,
    colorHex: draft.colorHex
  }
}

function createCellRuleMatch(rule: EntriesRuleOverlay): CellRuleMatch {
  return {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleKind: rule.kind,
    stylePreset: rule.stylePreset,
    colorHex: rule.colorHex
  }
}

function createCellOverlayMeta(formattingMatches: CellRuleMatch[], validationMatches: CellRuleMatch[]): EntryCellOverlayMeta {
  const classNameSet = new Set<string>()
  const style: Record<string, string> = {}
  const primaryFormattingMatch = formattingMatches[0]
  if (primaryFormattingMatch) {
    style.backgroundColor = `${primaryFormattingMatch.colorHex}24`
    style.boxShadow = `inset 0 0 0 1px ${primaryFormattingMatch.colorHex}80`
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
    style,
    tooltipText,
    formattingTooltipText,
    validationTooltipText
  }
}

function ruleMatchesContext(rule: EntriesRuleOverlay, context: RowFilterContext): boolean {
  if (!rule.enabled || rule.targetFields.length === 0) return false

  // Performance: check cache for compiled/parsed condition
  let cached = ruleCompileCache.find(c => c.ruleId === rule.id)

  // Invalidate cache if condition changed
  const conditionChanged = !cached ||
    cached.condition.kind !== rule.condition.kind ||
    cached.condition.formula !== rule.condition.formula ||
    cached.condition.regex.pattern !== rule.condition.regex.pattern ||
    cached.condition.regex.flags !== rule.condition.regex.flags ||
    cached.condition.regex.field !== rule.condition.regex.field

  if (conditionChanged) {
    cached = {
      ruleId: rule.id,
      condition: {
        kind: rule.condition.kind,
        formula: rule.condition.formula,
        regex: {
          pattern: rule.condition.regex.pattern,
          flags: rule.condition.regex.flags,
          field: rule.condition.regex.field
        }
      }
    }

    if (rule.condition.kind === 'formula') {
      const parsed = parseAdvancedFormula(rule.condition.formula)
      if (parsed.ok) cached.ast = parsed.ast
    } else {
      const compiled = compileAdvancedRegex(rule.condition.regex.pattern, rule.condition.regex.flags)
      if (compiled.ok) cached.compiled = compiled.regex
    }

    // Update cache
    ruleCompileCache = ruleCompileCache.filter(c => c.ruleId !== rule.id)
    ruleCompileCache.push(cached)
  }

  if (rule.condition.kind === 'formula') {
    if (!cached.ast) return false
    const result = evaluateAdvancedFormulaAst(cached.ast, context)
    return result.ok ? result.value : false
  }

  if (!cached.compiled) return false
  const value = rule.condition.regex.field === 'any'
    ? buildSearchableRowText(context)
    : context[rule.condition.regex.field]
  return testAdvancedRegex(cached.compiled, value)
}

export function createEmptyCellOverlayMeta(): EntryCellOverlayMeta {
  return {
    formattingMatches: [],
    validationMatches: [],
    classNames: [],
    style: {},
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
      metaByEntryKey.set(String(getEntryKey(entry)), fieldMetaMap)
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
    const ruleId = createLocalRuleId()
    rules.value = [...rules.value, { ...nextRule, id: ruleId }]

    // Invalidate cache for new rule
    ruleCompileCache = ruleCompileCache.filter(c => c.ruleId !== ruleId)

    resetDraftRule()
    return true
  }

  function toggleRule(ruleId: string, enabled?: boolean) {
    rules.value = rules.value.map(rule => rule.id === ruleId ? { ...rule, enabled: enabled ?? !rule.enabled } : rule)
  }

  function removeRule(ruleId: string) {
    rules.value = rules.value.filter(rule => rule.id !== ruleId)

    // Invalidate cache for removed rule
    ruleCompileCache = ruleCompileCache.filter(c => c.ruleId !== ruleId)
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

  function updateRuleColor(ruleId: string, colorHex: string) {
    rules.value = rules.value.map(rule => rule.id === ruleId ? { ...rule, colorHex } : rule)
  }

  function clearRules() {
    rules.value = []
    clearRuleOverlayErrors()

    // Clear all caches
    ruleCompileCache = []
  }

  function exportRuleOverlayState(): SharedEntriesRuleOverlay[] {
    return rules.value.map(rule => ({
      name: rule.name,
      kind: rule.kind,
      enabled: rule.enabled,
      targetFields: [...rule.targetFields],
      condition: {
        kind: rule.condition.kind,
        formula: rule.condition.formula,
        regex: {
          pattern: rule.condition.regex.pattern,
          flags: rule.condition.regex.flags,
          field: rule.condition.regex.field
        }
      },
      stylePreset: rule.stylePreset,
      colorHex: rule.colorHex
    }))
  }

  function replaceRuleOverlayState(restoredRules: SharedEntriesRuleOverlay[]) {
    const newRuleIds: string[] = []
    rules.value = restoredRules.map(rule => {
      const id = createLocalRuleId()
      newRuleIds.push(id)
      return {
        name: rule.name,
        kind: rule.kind,
        enabled: rule.enabled,
        targetFields: [...rule.targetFields],
        condition: {
          kind: rule.condition.kind,
          formula: rule.condition.formula,
          regex: {
            pattern: rule.condition.regex.pattern,
            flags: rule.condition.regex.flags,
            field: rule.condition.regex.field
          }
        },
        stylePreset: rule.stylePreset,
        colorHex: rule.colorHex,
        id
      }
    })
    clearRuleOverlayErrors()

    // Clear old caches and prepare for new rules
    ruleCompileCache = []
  }

  function getCellOverlayMeta(entry: Entry, field: AdvancedFilterFieldKey): EntryCellOverlayMeta {
    if (!isAdvancedFilterField(field)) return createEmptyCellOverlayMeta()
    return cellOverlayMetaByEntryKey.value.get(String(getEntryKey(entry)))?.get(field) ?? createEmptyCellOverlayMeta()
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
    updateRuleColor,
    clearRuleOverlayErrors,
    clearRules,
    exportRuleOverlayState,
    replaceRuleOverlayState,
    getCellOverlayMeta
  }
}
