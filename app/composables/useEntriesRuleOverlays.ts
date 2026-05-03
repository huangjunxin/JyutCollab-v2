import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { AdvancedFilterFieldKey, AdvancedFilterError, RowFilterContext } from '~/utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

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

  function resetDraftRule() {
    Object.assign(draftRule, createDefaultDraftRule())
  }

  function clearRuleOverlayErrors() {
    ruleOverlayErrors.name = null
    ruleOverlayErrors.targetFields = null
    ruleOverlayErrors.formula = null
    ruleOverlayErrors.regex = null
  }

  function addRuleFromDraft(): boolean {
    clearRuleOverlayErrors()
    if (!draftRule.name.trim()) {
      ruleOverlayErrors.name = '請輸入規則名稱。'
      return false
    }

    const targetFields = draftRule.targetFields.filter(isAdvancedFilterField)
    if (targetFields.length === 0) {
      ruleOverlayErrors.targetFields = '請至少選擇一個目標欄位。'
      return false
    }

    const nextRule = cloneDraftRule(draftRule)
    nextRule.name = nextRule.name.trim()
    nextRule.targetFields = [...new Set(targetFields)]
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

  return {
    ruleOverlayExpanded,
    rules,
    draftRule,
    ruleOverlayErrors,
    activeRuleCount,
    resetDraftRule,
    addRuleFromDraft,
    toggleRule,
    removeRule,
    moveRule,
    clearRuleOverlayErrors,
    clearRules
  }
}
