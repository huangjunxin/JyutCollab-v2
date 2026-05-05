# Phase 4: Integration Hardening and UX Verification - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 18
**Analogs found:** 17 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/composables/useEntriesAdvancedFilters.ts` | composable | transform | `app/composables/useEntriesAdvancedFilters.ts` | exact-existing-target |
| `app/composables/useEntriesRuleOverlays.ts` | composable | transform | `app/composables/useEntriesRuleOverlays.ts` | exact-existing-target |
| `app/utils/entriesAdvancedFilter.ts` | utility | transform | `app/utils/entriesAdvancedFilter.ts` | exact-existing-target |
| `app/utils/entriesSharedView.ts` | utility | transform | `app/utils/entriesSharedView.ts` | exact-existing-target |
| `app/components/entries/EntriesAdvancedFilterPanel.vue` | component | event-driven | `app/components/entries/EntriesAdvancedFilterPanel.vue` | exact-existing-target |
| `app/components/entries/EntriesRuleOverlayPanel.vue` | component | event-driven | `app/components/entries/EntriesRuleOverlayPanel.vue` | exact-existing-target |
| `app/components/entries/EntriesShareViewPopover.vue` | component | event-driven | `app/components/entries/EntriesShareViewPopover.vue` | exact-existing-target |
| `app/components/entries/EntriesEditableCell.vue` | component | event-driven | `app/components/entries/EntriesEditableCell.vue` | exact-existing-target |
| `app/pages/entries/index.vue` | route/page | request-response + event-driven | `app/pages/entries/index.vue` | exact-existing-target |
| `app/composables/__tests__/useEntriesAdvancedFilters.safety.test.ts` | test | transform | `app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts` | role-match |
| `app/composables/__tests__/useEntriesAdvancedFilters.performance.test.ts` | test | batch + transform | `app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts` | role-match |
| `app/composables/__tests__/useEntriesRuleOverlays.safety.test.ts` | test | transform | `app/composables/__tests__/useEntriesRuleOverlays.test.ts` | role-match |
| `app/composables/__tests__/useEntriesRuleOverlays.performance.test.ts` | test | batch + transform | `app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts` | role-match |
| `app/utils/__tests__/entriesSharedView.test.ts` | test | transform | `app/utils/__tests__/entriesSharedView.test.ts` | exact-existing-target |
| `app/utils/__tests__/entriesAdvancedFilter.test.ts` | test | transform | `app/utils/__tests__/entriesSharedView.test.ts` | role-match |
| `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` | test | file-I/O + source-level assertions | `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` | exact-existing-target |
| `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts` | test | file-I/O + source-level assertions | `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts` | exact-existing-target |
| `.planning/phases/04-integration-hardening-and-ux-verification/04-UX-VERIFICATION.md` | documentation/manual-verification | batch | `.planning/phases/04-integration-hardening-and-ux-verification/04-UI-SPEC.md` | spec-match, no code analog |

## Pattern Assignments

### `app/composables/useEntriesAdvancedFilters.ts` (composable, transform)

**Analog:** `app/composables/useEntriesAdvancedFilters.ts`

**Imports and alias pattern** (lines 0-10):
```typescript
import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import * as advancedFilterTools from '~/utils/entriesAdvancedFilter'
import type { AdvancedFilterError, AdvancedFilterFieldKey, RowFilterContext } from '~/utils/entriesAdvancedFilter'

const runAdvancedFormula = advancedFilterTools[`ev${'aluateAdvancedFormula'}`]
const ADVANCED_FORMULA_RUNTIME_ERROR_CODE = `ev${'aluation_error'}`
const { buildSearchableRowText, compileAdvancedRegex, parseAdvancedFormula, testAdvancedRegex } = advancedFilterTools
```

**Reactive state and row context pattern** (lines 45-82):
```typescript
export function useEntriesAdvancedFilters(args: {
  entries: Ref<Entry[]> | ComputedRef<Entry[]>
  aggregatedGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  lexemeGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  viewMode: ViewModeRef
  editableColumns: ComputedRef<EditableColumnDef[]>
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
}) {
  const advancedFilterExpanded = ref(false)
  const formulaInput = ref('')
  const appliedFormula = ref('')
  const globalRegexEnabled = ref(false)
  const globalRegexInput = ref('')
  const appliedGlobalRegex = ref('')
  const globalRegexFlags = ref('i')
  const columnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })
  const appliedColumnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })
  const advancedFilterErrors = reactive<AdvancedFilterErrors>({ formula: null, globalRegex: null, columnRegex: null })

  function isAdvancedFilterField(key: string): key is AdvancedFilterFieldKey {
    return ADVANCED_FILTER_FIELDS.includes(key as AdvancedFilterFieldKey)
  }

  function createEmptyRowContext(): RowFilterContext {
    return ADVANCED_FILTER_FIELDS.reduce((context, key) => {
      context[key] = ''
      return context
    }, {} as RowFilterContext)
  }

  function buildRowContext(entry: Entry): RowFilterContext {
    const context = createEmptyRowContext()
    for (const col of args.editableColumns.value) {
      if (!isAdvancedFilterField(col.key)) continue
      context[col.key] = args.getCellDisplay(entry, col).trim()
    }
    return context
  }
```

**Core filtering pattern and likely performance hotspot** (lines 106-154):
```typescript
function matchEntry(entry: Entry): boolean {
  clearInactiveAppliedFilterErrors()
  const context = buildRowContext(entry)

  if (hasAppliedFormula.value) {
    const result = runAdvancedFormula(appliedFormula.value, context)
    if (!result.ok) {
      advancedFilterErrors.formula = result.error
    } else {
      advancedFilterErrors.formula = null
      if (!result.value) return false
    }
  }

  if (hasAppliedGlobalRegex.value) {
    const compiled = compileAdvancedRegex(appliedGlobalRegex.value, globalRegexFlags.value)
    if (!compiled.ok) {
      advancedFilterErrors.globalRegex = compiled.error
    } else {
      advancedFilterErrors.globalRegex = null
      if (!testAdvancedRegex(compiled.regex, buildSearchableRowText(context))) return false
    }
  }

  if (hasAppliedColumnRegex.value && appliedColumnRegex.field) {
    const compiled = compileAdvancedRegex(appliedColumnRegex.pattern, appliedColumnRegex.flags)
    if (!compiled.ok) {
      advancedFilterErrors.columnRegex = compiled.error
    } else {
      advancedFilterErrors.columnRegex = null
      if (!testAdvancedRegex(compiled.regex, context[appliedColumnRegex.field])) return false
    }
  }

  return true
}

const filteredEntries = computed(() => hasActiveAdvancedFilters.value ? args.entries.value.filter(matchEntry) : args.entries.value)
const filteredAggregatedGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.aggregatedGroups.value, matchEntry) : args.aggregatedGroups.value)
const filteredLexemeGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.lexemeGroups.value, matchEntry) : args.lexemeGroups.value)
```

**Validation and deterministic Apply pattern** (lines 174-229):
```typescript
function validateAdvancedFilterInputs(): boolean {
  let valid = true

  if (formulaInput.value.trim().length > 0) {
    const parsed = parseAdvancedFormula(formulaInput.value)
    if (!parsed.ok) {
      advancedFilterErrors.formula = parsed.error
      valid = false
    } else {
      const preview = runAdvancedFormula(formulaInput.value, createEmptyRowContext())
      if (!preview.ok && preview.error.code !== ADVANCED_FORMULA_RUNTIME_ERROR_CODE) {
        advancedFilterErrors.formula = preview.error
        valid = false
      }
    }
  }

  if (globalRegexEnabled.value && globalRegexInput.value.trim().length > 0) {
    const compiled = compileAdvancedRegex(globalRegexInput.value, globalRegexFlags.value)
    if (!compiled.ok) {
      advancedFilterErrors.globalRegex = compiled.error
      valid = false
    }
  }

  if (columnRegex.pattern.trim().length > 0) {
    if (!columnRegex.field) {
      advancedFilterErrors.columnRegex = {
        code: 'empty_pattern',
        message: '請先選擇欄位，再套用欄位正則篩選。'
      }
      valid = false
    } else {
      const compiled = compileAdvancedRegex(columnRegex.pattern, columnRegex.flags)
      if (!compiled.ok) {
        advancedFilterErrors.columnRegex = compiled.error
        valid = false
      }
    }
  }

  return valid
}

function applyAdvancedFilters(): boolean {
  clearAdvancedFilterErrors()
  if (!validateAdvancedFilterInputs()) return false

  appliedFormula.value = formulaInput.value
  appliedGlobalRegex.value = globalRegexInput.value
  appliedColumnRegex.field = columnRegex.field
  appliedColumnRegex.pattern = columnRegex.pattern
  appliedColumnRegex.flags = columnRegex.flags
  clearInactiveAppliedFilterErrors()
  return true
}
```

**Export/restore pattern for shared-view safety** (lines 247-281):
```typescript
function exportAdvancedFilterState(): ExportedAdvancedFilterState {
  return {
    formula: {
      input: formulaInput.value,
      applied: appliedFormula.value
    },
    globalRegex: {
      enabled: globalRegexEnabled.value,
      input: globalRegexInput.value,
      applied: appliedGlobalRegex.value,
      flags: globalRegexFlags.value
    },
    columnRegex: {
      field: appliedColumnRegex.field,
      pattern: appliedColumnRegex.pattern,
      flags: appliedColumnRegex.flags
    }
  }
}

function restoreAdvancedFilterState(state: ExportedAdvancedFilterState) {
  formulaInput.value = state.formula.input
  appliedFormula.value = state.formula.applied
  globalRegexEnabled.value = state.globalRegex.enabled
  globalRegexInput.value = state.globalRegex.input
  appliedGlobalRegex.value = state.globalRegex.applied
  globalRegexFlags.value = state.globalRegex.flags
  columnRegex.field = state.columnRegex.field
  columnRegex.pattern = state.columnRegex.pattern
  columnRegex.flags = state.columnRegex.flags
  appliedColumnRegex.field = state.columnRegex.field
  appliedColumnRegex.pattern = state.columnRegex.pattern
  appliedColumnRegex.flags = state.columnRegex.flags
  clearAdvancedFilterErrors()
}
```

**Planner notes:** Copy this composable style if adding memoization: keep caches local to the composable or computed pass, preserve `applyAdvancedFilters()` and `restoreAdvancedFilterState()` as immediate, and do not add `$fetch`, localStorage, dirty-state, or selection coupling.

---

### `app/composables/useEntriesRuleOverlays.ts` (composable, transform)

**Analog:** `app/composables/useEntriesRuleOverlays.ts`

**Imports and type contract pattern** (lines 0-9):
```typescript
import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { AdvancedFilterFieldKey, AdvancedFilterError, RowFilterContext } from '~/utils/entriesAdvancedFilter'
import * as advancedFilterTools from '~/utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

const runAdvancedFormula = advancedFilterTools[`ev${'aluateAdvancedFormula'}`]
const { buildSearchableRowText, compileAdvancedRegex, parseAdvancedFormula, testAdvancedRegex } = advancedFilterTools
import { getEntryKey } from '~/utils/entryKey'
```

**Rule and metadata types** (lines 16-63):
```typescript
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

export interface EntryCellOverlayMeta {
  formattingMatches: CellRuleMatch[]
  validationMatches: CellRuleMatch[]
  classNames: string[]
  style: Record<string, string>
  tooltipText: string
  formattingTooltipText: string
  validationTooltipText: string
}

export interface EntriesRuleOverlayErrors {
  name: string | null
  targetFields: string | null
  formula: AdvancedFilterError | null
  regex: AdvancedFilterError | null
}
```

**Read-only metadata construction pattern** (lines 147-172):
```typescript
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
```

**Core rule evaluation hotspot** (lines 174-188):
```typescript
function ruleMatchesContext(rule: EntriesRuleOverlay, context: RowFilterContext): boolean {
  if (!rule.enabled || rule.targetFields.length === 0) return false

  if (rule.condition.kind === 'formula') {
    const result = runAdvancedFormula(rule.condition.formula, context)
    return result.ok ? result.value : false
  }

  const compiled = compileAdvancedRegex(rule.condition.regex.pattern, rule.condition.regex.flags)
  if (!compiled.ok) return false
  const value = rule.condition.regex.field === 'any'
    ? buildSearchableRowText(context)
    : context[rule.condition.regex.field]
  return testAdvancedRegex(compiled.regex, value)
}
```

**Overlay map pattern that avoids entry mutation** (lines 218-246):
```typescript
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
```

**Validation and local lifecycle pattern** (lines 259-330):
```typescript
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
```

**Shared-view export/replace pattern** (lines 337-382):
```typescript
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
  rules.value = restoredRules.map(rule => ({
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
    id: createLocalRuleId()
  }))
  clearRuleOverlayErrors()
}

function getCellOverlayMeta(entry: Entry, field: AdvancedFilterFieldKey): EntryCellOverlayMeta {
  if (!isAdvancedFilterField(field)) return createEmptyCellOverlayMeta()
  return cellOverlayMetaByEntryKey.value.get(String(getEntryKey(entry)))?.get(field) ?? createEmptyCellOverlayMeta()
}
```

**Planner notes:** Preserve the separate `Map<entryKey, Map<field, meta>>` metadata structure. If adding performance caches, prefer parsed formula/compiled regex caches over storing metadata on `Entry` objects.

---

### `app/utils/entriesAdvancedFilter.ts` (utility, transform)

**Analog:** `app/utils/entriesAdvancedFilter.ts`

**Safety limits and type pattern** (lines 0-25):
```typescript
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200
export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000

export type AdvancedFilterFieldKey = (typeof ADVANCED_FILTER_FIELDS)[number]
export type RowFilterContext = Record<AdvancedFilterFieldKey, string>
export type AdvancedFormulaErrorCode = 'empty_formula' | 'unsupported_token' | 'unknown_field' | 'unknown_function' | 'wrong_argument_count' | 'non_boolean_result' | 'evaluation_error' | 'unexpected_end'
export type AdvancedRegexErrorCode = 'empty_pattern' | 'pattern_too_long' | 'invalid_flags' | 'invalid_pattern' | 'unsafe_pattern'
export type FormulaFunctionName = 'AND' | 'OR' | 'NOT' | 'LEN' | 'ISBLANK' | 'REGEXMATCH' | 'CONTAINS' | 'STARTSWITH' | 'ENDSWITH'
```

**HK Traditional error message pattern** (lines 52-69):
```typescript
export function getAdvancedFilterErrorMessage(code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode, detail?: string): string {
  const messages: Record<AdvancedRegexErrorCode | AdvancedFormulaErrorCode, string> = {
    empty_pattern: '請輸入正則表達式。',
    pattern_too_long: '正則表達式太長，請縮短後再試。',
    invalid_flags: '正則表達式旗標只支援 i、m、u。',
    invalid_pattern: '正則表達式格式無效，請檢查括號、斜線或轉義符號。',
    unsafe_pattern: '此正則表達式可能令瀏覽器變慢，請簡化重複條件。',
    empty_formula: '請輸入公式。',
    unsupported_token: '公式包含未支援的符號。',
    unknown_field: detail ? `未知欄位：${detail}。請使用下方列出的欄位名稱。` : '未知欄位。請使用下方列出的欄位名稱。',
    unknown_function: detail ? `未支援的函數：${detail}。` : '未支援的函數。',
    wrong_argument_count: detail ? `${detail} 的參數數量不正確。` : '函數的參數數量不正確。',
    non_boolean_result: '篩選公式必須回傳 TRUE 或 FALSE。',
    evaluation_error: '公式計算失敗，請檢查欄位和參數。',
    unexpected_end: '公式尚未完成，請檢查括號或參數。'
  }
  return messages[code]
}
```

**Regex compile and test boundary** (lines 79-96):
```typescript
export function compileAdvancedRegex(pattern: string, flags = 'i'): RegexCompileResult {
  const trimmed = String(pattern ?? '').trim()
  if (!trimmed) return { ok: false, error: createAdvancedFilterError('empty_pattern') }
  if (trimmed.length > ADVANCED_REGEX_MAX_PATTERN_LENGTH) return { ok: false, error: createAdvancedFilterError('pattern_too_long') }
  if (!/^[imu]*$/.test(flags)) return { ok: false, error: createAdvancedFilterError('invalid_flags') }
  if (/\([^)]*[+*][^)]*\)[+*{]/.test(trimmed)) return { ok: false, error: createAdvancedFilterError('unsafe_pattern') }

  try {
    return { ok: true, regex: new RegExp(trimmed, flags) }
  } catch {
    return { ok: false, error: createAdvancedFilterError('invalid_pattern') }
  }
}

export function testAdvancedRegex(regex: RegExp, value: string): boolean {
  regex.lastIndex = 0
  return regex.test(String(value ?? '').slice(0, ADVANCED_REGEX_MAX_INPUT_LENGTH))
}
```

**Parse once / evaluate AST pattern** (lines 290-303 and 388-403):
```typescript
export function parseAdvancedFormula(input: string): FormulaParseResult {
  const trimmed = String(input ?? '').trim()
  const normalized = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
  if (!normalized) return { ok: false, error: createAdvancedFilterError('empty_formula') }

  const tokenized = tokenizeFormula(normalized)
  if (!tokenized.ok) return tokenized
  return new FormulaParser(tokenized.tokens).parse()
}

export function evaluateAdvancedFormulaAst(ast: FormulaNode, context: RowFilterContext): FormulaEvaluationResult {
  try {
    const result = evaluateNode(ast, context)
    if (!result.ok) return result
    if (typeof result.value !== 'boolean') return { ok: false, error: createAdvancedFilterError('non_boolean_result') }
    return { ok: true, value: result.value }
  } catch {
    return { ok: false, error: createAdvancedFilterError('evaluation_error') }
  }
}

export function evaluateAdvancedFormula(input: string, context: RowFilterContext): FormulaEvaluationResult {
  const parsed = parseAdvancedFormula(input)
  if (!parsed.ok) return parsed
  return evaluateAdvancedFormulaAst(parsed.ast, context)
}
```

**Planner notes:** Do not add `eval`, `new Function`, or a second parser. If performance work touches formulas, copy the `parseAdvancedFormula()` plus `evaluateAdvancedFormulaAst()` pattern and test that semantics are unchanged.

---

### `app/utils/entriesSharedView.ts` (utility, transform)

**Analog:** `app/utils/entriesSharedView.ts`

**Imports/constants and decode result pattern** (lines 0-21, 48-51):
```typescript
import { z } from 'zod'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { compileAdvancedRegex, parseAdvancedFormula, type AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import type { EntriesRuleDraft } from '~/composables/useEntriesRuleOverlays'

export const ENTRIES_SHARED_VIEW_VERSION = 1
export const ENTRIES_SHARED_VIEW_QUERY_PARAM = 'view'
export const ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH = 6000

export type EntriesSharedViewDecodeResult =
  | { ok: true; data: EntriesSharedViewState }
  | { ok: false; reason: string; code: EntriesSharedViewDecodeCode }
```

**Strict schema and color validation pattern** (lines 64-111):
```typescript
const fieldSchema = z.enum(FIELD_VALUES)
const emptyOrFieldSchema = z.union([z.literal(''), fieldSchema])
const regexFieldSchema = z.enum(REGEX_FIELD_VALUES)
const ruleKindSchema = z.enum(RULE_KIND_VALUES)
const conditionKindSchema = z.enum(CONDITION_KIND_VALUES)
const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const filterStateSchema = z.strictObject({
  formula: z.strictObject({
    input: z.string(),
    applied: z.string()
  }),
  globalRegex: z.strictObject({
    enabled: z.boolean(),
    input: z.string(),
    applied: z.string(),
    flags: z.string()
  }),
  columnRegex: z.strictObject({
    field: emptyOrFieldSchema,
    pattern: z.string(),
    flags: z.string()
  })
})

const ruleSchema = z.strictObject({
  name: z.string(),
  kind: ruleKindSchema,
  enabled: z.boolean(),
  targetFields: z.array(fieldSchema),
  condition: z.strictObject({
    kind: conditionKindSchema,
    formula: z.string(),
    regex: z.strictObject({
      pattern: z.string(),
      flags: z.string(),
      field: regexFieldSchema
    })
  }),
  stylePreset: z.enum(STYLE_PRESET_VALUES),
  colorHex: colorHexSchema
})
```

**Decode error copy pattern** (lines 117-133):
```typescript
function createDecodeError(code: EntriesSharedViewDecodeCode, detail?: string): EntriesSharedViewDecodeResult {
  const reasons: Record<EntriesSharedViewDecodeCode, string> = {
    missing_payload: '分享視圖資料不存在。',
    decode_failed: '分享視圖資料無法解碼。',
    schema_mismatch: '分享視圖資料格式無效，無法安全還原。',
    unsupported_field: detail ? `分享視圖包含未支援欄位：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_rule_kind: detail ? `分享視圖包含未支援規則類型：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_condition_kind: detail ? `分享視圖包含未支援條件模式：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_version: '此分享視圖版本未受支援。',
    too_old_version: '此分享視圖版本太舊，無法安全還原。',
    too_large: '分享視圖資料太長，無法安全還原。',
    invalid_formula: detail ? `分享視圖中的公式無法套用：${detail}` : '分享視圖資料格式無效，無法安全還原。',
    invalid_regex: detail ? `分享視圖中的正則表達式無法套用：${detail}` : '分享視圖資料格式無效，無法安全還原。'
  }

  return { ok: false, code, reason: reasons[code] }
}
```

**Trust-boundary decode sequence** (lines 275-301):
```typescript
export function decodeEntriesSharedView(payload: string | null | undefined): EntriesSharedViewDecodeResult {
  if (!payload) return createDecodeError('missing_payload')
  if (payload.length > ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH) return createDecodeError('too_large')

  let decoded: unknown
  try {
    decoded = decodeUtf8Base64Url(payload)
  } catch {
    return createDecodeError('decode_failed')
  }

  const base = baseSharedViewSchema.safeParse(decoded)
  if (!base.success) return createDecodeError('schema_mismatch')
  if (base.data.version < ENTRIES_SHARED_VIEW_VERSION) return createDecodeError('too_old_version')
  if (base.data.version > ENTRIES_SHARED_VIEW_VERSION) return createDecodeError('unsupported_version')

  const unsupported = findUnsupportedSemanticValue(decoded)
  if (unsupported) return unsupported

  const parsed = sharedViewSchema.safeParse(decoded)
  if (!parsed.success) return createDecodeError('schema_mismatch')

  const semanticError = validateSharedViewSemantics(parsed.data)
  if (semanticError) return semanticError

  return { ok: true, data: normalizeState(parsed.data) }
}
```

**URL and summary pattern** (lines 303-322):
```typescript
export function buildEntriesSharedViewUrl(baseUrl: string, state: EntriesSharedViewState): string {
  const url = new URL(baseUrl)
  url.searchParams.set(ENTRIES_SHARED_VIEW_QUERY_PARAM, encodeEntriesSharedView(state))
  return url.toString()
}

export function summarizeEntriesSharedView(state: EntriesSharedViewState): EntriesSharedViewSummary {
  const filterCount = [
    state.filters.formula.applied.trim(),
    state.filters.globalRegex.enabled && state.filters.globalRegex.applied.trim(),
    state.filters.columnRegex.field && state.filters.columnRegex.pattern.trim()
  ].filter(Boolean).length
  const ruleCount = state.rules.length

  return {
    filterCount,
    ruleCount,
    message: `已還原 ${filterCount} 項篩選和 ${ruleCount} 項規則。`
  }
}
```

**Planner notes:** Keep all untrusted URL parsing here. Do not move schema, semantic formula/regex validation, or color validation into `app/pages/entries/index.vue`.

---

### `app/components/entries/EntriesAdvancedFilterPanel.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesAdvancedFilterPanel.vue`

**Toolbar trigger density and active badge pattern** (lines 0-20):
```vue
<div class="inline-flex items-center gap-2 flex-wrap">
    <UButton
      size="sm"
      color="neutral"
      variant="soft"
      icon="i-heroicons-funnel"
      class="h-8 w-8 justify-center p-0"
      aria-label="進階篩選"
      :aria-expanded="expanded"
      aria-controls="entries-advanced-filter-panel"
      @click="emit('update:expanded', !expanded)"
    />
    <UBadge
      v-if="hasActiveAdvancedFilters"
      color="primary"
      variant="soft"
      class="self-center"
    >
      進階篩選顯示 {{ visibleCount }} / {{ loadedCount }} 項目前已載入結果。
    </UBadge>
</div>
```

**Visible invalid formula/regex feedback pattern** (lines 28-49 and 78-85):
```vue
<label for="advanced-formula-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
  公式篩選
</label>
<UInput
  id="advanced-formula-input"
  :model-value="formulaInput"
  size="sm"
  class="w-full"
  placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
  aria-describedby="advanced-filter-helpers advanced-formula-error"
  @update:model-value="emit('update:formulaInput', String($event ?? ''))"
  @keyup.enter="emit('apply')"
/>
<p
  v-if="formulaError"
  id="advanced-formula-error"
  role="alert"
  class="text-sm text-red-600 dark:text-red-400"
>
  公式無法套用：{{ formulaError }} 請檢查公式語法、欄位名稱或函數參數。
</p>

<p
  v-if="globalRegexError"
  id="advanced-global-regex-error"
  role="alert"
  class="text-sm text-red-600 dark:text-red-400"
>
  正則表達式無法套用：{{ globalRegexError }} 請檢查括號、轉義符號或旗標。
</p>
```

**Read-only helper and deterministic action pattern** (lines 125-151):
```vue
<div
  id="advanced-filter-helpers"
  class="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1"
>
  <p>可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status</p>
  <p>支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH</p>
  <p id="advanced-filter-readonly-helper">進階篩選只影響目前已載入的詞條，不會修改資料。</p>
</div>

<div class="flex flex-wrap items-center gap-2">
  <UButton
    color="primary"
    variant="solid"
    size="sm"
    @click="emit('apply')"
  >
    套用進階篩選
  </UButton>
  <UButton
    color="neutral"
    variant="soft"
    size="sm"
    @click="emit('clear')"
  >
    清除進階篩選
  </UButton>
</div>
```

**Script props/emits pattern** (lines 287-316):
```typescript
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:formulaInput': [value: string]
  'update:globalRegexEnabled': [value: boolean]
  'update:globalRegexInput': [value: string]
  'update:columnRegexField': [value: string]
  'update:columnRegexPattern': [value: string]
  apply: []
  clear: []
}>()

const props = defineProps<{
  expanded: boolean
  teleportTo?: string
  formulaInput: string
  globalRegexEnabled: boolean
  globalRegexInput: string
  columnRegexField: string
  columnRegexPattern: string
  fieldOptions: Array<{ value: string; label: string }>
  formulaError?: string
  globalRegexError?: string
  columnRegexError?: string
  hasActiveAdvancedFilters: boolean
  visibleCount: number
  loadedCount: number
}>()
```

**Planner notes:** Preserve the duplicated teleported/non-teleported panel blocks if only doing targeted fixes; broad component refactor is out of phase scope.

---

### `app/components/entries/EntriesRuleOverlayPanel.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesRuleOverlayPanel.vue`

**Trigger and active badge pattern** (lines 0-20):
```vue
<div class="inline-flex items-center gap-2 flex-wrap">
  <UButton
    size="sm"
    color="neutral"
    variant="soft"
    icon="i-heroicons-swatch"
    class="h-8 w-8 justify-center p-0"
    aria-label="規則"
    :aria-expanded="expanded"
    :aria-controls="panelId"
    @click="emit('update:expanded', !expanded)"
  />
  <UBadge
    v-if="activeRuleCount > 0"
    color="primary"
    variant="soft"
    class="self-center"
  >
    {{ activeRuleCount }} 項規則
  </UBadge>
</div>
```

**Read-only panel header and form pattern** (lines 28-35):
```vue
<div class="flex items-center justify-between gap-3 flex-wrap">
  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
  <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
    此規則只會標示目前已載入的詞條，不會修改資料。
  </p>
</div>

<form class="flex flex-col gap-3" @submit.prevent="emit('apply')">
```

**Visible validation error pattern** (lines 135-185):
```vue
<label
  v-if="draftConditionKind === 'formula'"
  class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200"
>
  公式
  <UInput
    v-model="draftFormula"
    size="sm"
    class="w-full"
    placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
    :aria-describedby="errors.formula ? 'entries-rule-formula-error entries-rule-readonly-helper' : 'entries-rule-readonly-helper'"
  />
  <span
    v-if="errors.formula"
    id="entries-rule-formula-error"
    role="alert"
    class="text-sm font-normal text-red-600 dark:text-red-400"
  >
    {{ errors.formula.message }}
  </span>
</label>

<span
  v-if="errors.regex"
  id="entries-rule-regex-error"
  role="alert"
  class="text-sm font-normal text-red-600 dark:text-red-400"
>
  {{ errors.regex.message }}
</span>
```

**Rule color and list-management pattern** (lines 211-241 and 274-301):
```vue
<label class="flex flex-col gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
  自訂顏色
  <UPopover :content="{ side: 'bottom', sideOffset: 8 }">
    <UButton
      type="button"
      color="neutral"
      variant="outline"
      size="sm"
      class="justify-start"
      :disabled="draftKind !== 'formatting'"
    >
      <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: draftColorHex }" />
      {{ draftColorHex }}
    </UButton>
    <template #content>
      <div class="p-3">
        <UColorPicker
          v-model="draftColorHex"
          format="hex"
          size="sm"
        />
      </div>
    </template>
  </UPopover>
</label>

<UPopover v-if="rule.kind === 'formatting'" :content="{ side: 'bottom', sideOffset: 8 }">
  <UButton
    type="button"
    color="neutral"
    variant="outline"
    size="sm"
    class="mt-1 justify-start"
  >
    <span class="h-4 w-4 rounded border border-gray-300" :style="{ backgroundColor: rule.colorHex }" />
    修改顏色
  </UButton>
  <template #content>
    <div class="p-3">
      <UColorPicker
        :model-value="rule.colorHex"
        format="hex"
        size="sm"
        @update:model-value="updateRuleColor(rule.id, $event)"
      />
    </div>
  </template>
</UPopover>
<div class="flex flex-wrap gap-2 sm:justify-end">
  <UButton type="button" color="neutral" variant="soft" size="sm" @click="emit('toggle-rule', rule.id)">{{ rule.enabled ? '停用' : '啟用' }}</UButton>
  <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === 0" @click="emit('move-rule', rule.id, -1)">上移</UButton>
  <UButton type="button" color="neutral" variant="soft" size="sm" :disabled="index === rules.length - 1" @click="emit('move-rule', rule.id, 1)">下移</UButton>
  <UButton type="button" color="error" variant="soft" size="sm" @click="emit('remove-rule', rule.id)">移除</UButton>
</div>
```

**Typed presentational emits pattern** (lines 597-626):
```typescript
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type {
  EntriesRuleDraft,
  EntriesRuleOverlay,
  EntriesRuleOverlayErrors,
  OverlayConditionKind,
  OverlayRuleKind,
  OverlayStylePreset
} from '~/composables/useEntriesRuleOverlays'
import type { AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELD_LABELS } from '~/utils/entriesTableConstants'

const panelId = 'entries-rule-overlay-panel'

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:draftRule': [value: EntriesRuleDraft]
  apply: []
  clear: []
  'toggle-rule': [ruleId: string]
  'remove-rule': [ruleId: string]
  'move-rule': [ruleId: string, direction: RuleMoveDirection]
  'update-rule-color': [ruleId: string, colorHex: string]
}>()
```

**Planner notes:** If adding invalid-color feedback, follow existing `role="alert"` patterns and keep the component presentational. Validate untrusted restored colors in `entriesSharedView.ts`; validate local color before rendering style if needed.

---

### `app/components/entries/EntriesShareViewPopover.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesShareViewPopover.vue`

**Popover trigger and description pattern** (lines 0-24):
```vue
<div class="inline-flex items-center gap-2 flex-wrap">
  <UPopover :content="{ side: 'bottom', sideOffset: 8 }">
    <UTooltip text="分享目前視圖">
      <UButton
        type="button"
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-heroicons-share"
        class="h-8 w-8 justify-center p-0"
        aria-label="分享目前視圖"
      />
    </UTooltip>

    <template #content>
      <section class="w-80 max-w-[calc(100vw-2rem)] space-y-3 p-3" aria-labelledby="entries-share-view-heading">
        <div class="space-y-1">
          <h3 id="entries-share-view-heading" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
            分享目前視圖
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            連結會還原公式篩選、正則設定、條件格式和驗證規則，不會修改詞條資料。
          </p>
        </div>
```

**Visible shared-view error pattern inside popover** (lines 47-65):
```vue
<UAlert
  v-if="sharedViewError"
  color="error"
  variant="subtle"
  role="alert"
  title="分享視圖無法套用"
  :description="sharedViewError"
>
  <template #actions>
    <div class="flex flex-col items-start gap-2">
      <UButton color="neutral" variant="soft" size="sm" @click="emit('clear-share-query')">
        清除分享參數
      </UButton>
      <p class="text-xs text-gray-600 dark:text-gray-300">
        只會移除網址中的分享參數，不會清除目前表格資料。
      </p>
    </div>
  </template>
</UAlert>
```

**Copy/fallback pattern** (lines 67-104):
```vue
<UButton
  type="button"
  color="primary"
  variant="solid"
  size="sm"
  block
  :disabled="!canShare"
  @click="emit('copy')"
>
  複製視圖連結
</UButton>

<p
  v-if="copyStatus === 'success'"
  class="text-sm font-medium text-green-700 dark:text-green-300"
  aria-live="polite"
>
  視圖連結已複製。
</p>
<p
  v-else-if="copyStatus === 'error'"
  class="text-sm font-medium text-red-600 dark:text-red-400"
  aria-live="polite"
>
  無法複製連結。請手動複製下方網址。
</p>

<UInput
  v-if="shouldShowFallbackUrl"
  :model-value="generatedUrl"
  readonly
  size="sm"
  class="font-mono text-sm"
  aria-label="分享目前視圖網址"
  @focus="$event.target instanceof HTMLInputElement && $event.target.select()"
/>
```

**Typed props/emits pattern** (lines 120-149):
```typescript
<script setup lang="ts">
import { computed } from 'vue'

type CopyStatus = 'idle' | 'success' | 'error'

const emit = defineEmits<{
  copy: []
  'clear-share-query': []
}>()

const props = withDefaults(defineProps<{
  generatedUrl: string
  canShare: boolean
  version: number
  filterCount: number
  ruleCount: number
  restored: boolean
  restoredSummary?: string
  sharedViewError?: string
  copyStatus?: CopyStatus
  showFallbackUrl?: boolean
}>(), {
  restoredSummary: '',
  sharedViewError: '',
  copyStatus: 'idle',
  showFallbackUrl: false
})

const shouldShowFallbackUrl = computed(() => props.showFallbackUrl || props.copyStatus === 'error')
</script>
```

**Planner notes:** Keep route and clipboard side effects in the page; this component should remain presentational and emit-only.

---

### `app/components/entries/EntriesEditableCell.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesEditableCell.vue`

**Cell overlay rendering pattern** (lines 1-10):
```vue
<td
  class="cell-td px-1 py-1 border-r border-gray-200 dark:border-gray-700 relative transition-[box-shadow]"
  :class="[
    isSelected && !isEditing && 'ring-2 ring-primary/60 ring-inset',
    wrap && 'cell-td-wrap',
    !canEdit && 'cursor-default',
    hasValidationMatches && !isEditing && 'cell-has-validation-warning'
  ]"
  :style="cellContainerStyle"
  @click="$emit('click', $event)"
>
```

**Editing mode keydown forwarding pattern** (lines 92-103):
```vue
<textarea
  v-else-if="col.type === 'text' || col.type === 'phonetic'"
  :ref="(el: any) => $emit('setRef', el)"
  :value="editValue"
  class="cell-inline-input cell-inline-textarea w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-900 border border-primary/80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 resize-none min-h-[2rem] max-h-[240px] overflow-y-hidden"
  rows="1"
  :class="{ 'font-mono': col.type === 'phonetic' }"
  @input="onTextareaInput($event)"
  @keydown="$emit('keydown', $event)"
  @blur="$emit('blur')"
/>
```

**Display overlay class/title pattern** (lines 154-164):
```vue
<div
  v-else
  class="flex-1 px-2 py-1 text-sm min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
  :class="[
    cellClass,
    overlayClassNames,
    wrap ? 'cell-display-wrap whitespace-pre-wrap break-words line-clamp-4' : 'truncate'
  ]"
  :title="overlayTitle"
>
  {{ displayText }}
</div>
```

**Non-color validation cue pattern** (lines 168-179):
```vue
<UTooltip
  v-if="hasValidationMatches"
  :text="validationOverlayTitle"
  :ui="{ content: 'max-w-xs whitespace-pre-wrap' }"
>
  <UIcon
    name="i-heroicons-exclamation-triangle"
    class="w-4 h-4 text-amber-600 dark:text-amber-300 cursor-help flex-shrink-0"
    aria-label="驗證警告"
    :title="validationOverlayTitle"
  />
</UTooltip>
```

**Typed prop and computed overlay pattern** (lines 275-363):
```typescript
<script setup lang="ts">
import type { EntryCellOverlayMeta } from '~/composables/useEntriesRuleOverlays'
import { getThemePathById } from '~/composables/useThemeData'

const props = withDefaults(
  defineProps<{
    col: { key: string; type: string; width?: string }
    canEdit?: boolean
    isEditing: boolean
    editValue: any
    displayText: string
    cellClass: string
    wrap: boolean
    isSelected: boolean
    columnOptions?: { value: string; label: string }[]
    reviewNotes?: string
    cellMeta?: EntryCellOverlayMeta
  }>(),
  {
    canEdit: true,
    columnOptions: () => [],
    reviewNotes: ''
  }
)

const cellContainerStyle = computed(() => ({
  ...cellStyle.value,
  ...(props.cellMeta?.style ?? {})
}))

const overlayClassNames = computed(() => props.cellMeta?.classNames ?? [])
const overlayTitle = computed(() => props.cellMeta?.tooltipText || undefined)
const validationOverlayTitle = computed(() => props.cellMeta?.validationTooltipText || props.cellMeta?.tooltipText || '驗證警告')
const hasValidationMatches = computed(() => (props.cellMeta?.validationMatches.length ?? 0) > 0)
```

**Planner notes:** Do not add entry mutation, `col.set`, dirty flags, localStorage, or API calls here. Cell overlays are props-only rendering metadata.

---

### `app/pages/entries/index.vue` (route/page, request-response + event-driven)

**Analog:** `app/pages/entries/index.vue`

**Toolbar component wiring pattern** (lines 130-172):
```vue
<EntriesAdvancedFilterPanel
  v-model:global-regex-input="advancedFilters.globalRegexInput.value"
  v-model:column-regex-field="advancedFilters.columnRegex.field"
  v-model:column-regex-pattern="advancedFilters.columnRegex.pattern"
  teleport-to="#entries-advanced-filter-host"
  :field-options="advancedFilterFieldOptions"
  :formula-error="advancedFilters.advancedFilterErrors.formula?.message || ''"
  :global-regex-error="advancedFilters.advancedFilterErrors.globalRegex?.message || ''"
  :column-regex-error="advancedFilters.advancedFilterErrors.columnRegex?.message || ''"
  :has-active-advanced-filters="advancedFilters.hasActiveAdvancedFilters.value"
  :visible-count="advancedFilters.visibleEntryCount.value"
  :loaded-count="advancedFilters.loadedEntryCount.value"
  @apply="advancedFilters.applyAdvancedFilters"
  @clear="advancedFilters.clearAdvancedFilters"
/>
<EntriesRuleOverlayPanel
  v-model:expanded="ruleOverlays.ruleOverlayExpanded.value"
  :draft-rule="ruleOverlays.draftRule"
  teleport-to="#entries-rule-overlay-host"
  @update:draft-rule="updateRuleOverlayDraft"
  :rules="ruleOverlays.rules.value"
  :errors="ruleOverlays.ruleOverlayErrors"
  :active-rule-count="ruleOverlays.activeRuleCount.value"
  :field-options="advancedFilterFieldOptions"
  @apply="ruleOverlays.addRuleFromDraft"
  @clear="ruleOverlays.clearRules"
  @toggle-rule="ruleOverlays.toggleRule"
  @remove-rule="ruleOverlays.removeRule"
  @move-rule="ruleOverlays.moveRule"
  @update-rule-color="ruleOverlays.updateRuleColor"
/>
<EntriesShareViewPopover
  :version="ENTRIES_SHARED_VIEW_VERSION"
  :generated-url="generatedSharedViewUrl"
  :can-share="canShareEntriesView"
  :filter-count="sharedViewSummary.filterCount"
  :rule-count="sharedViewSummary.ruleCount"
  :restored="sharedViewRestored"
  :restored-summary="sharedViewRestoredSummary"
  :shared-view-error="sharedViewError"
  :copy-status="sharedViewCopyStatus"
  :show-fallback-url="showSharedViewFallbackUrl"
  @copy="copySharedViewLink"
  @clear-share-query="clearSharedViewQuery"
/>
```

**Page-level visible shared-view alert pattern** (lines 211-227):
```vue
<div id="entries-advanced-filter-host" class="w-full" />
<div id="entries-rule-overlay-host" class="w-full" />
<UAlert
  v-if="sharedViewError"
  color="error"
  variant="subtle"
  role="alert"
  title="分享視圖無法套用"
  :description="sharedViewError"
  class="mt-3"
>
  <template #actions>
    <UButton color="neutral" variant="soft" size="sm" @click="clearSharedViewQuery">
      清除分享參數
    </UButton>
  </template>
</UAlert>
```

**Composable instantiation and overlay visible entries pattern** (lines 1376-1449):
```typescript
const advancedFilters = useEntriesAdvancedFilters({
  entries,
  aggregatedGroups,
  lexemeGroups,
  viewMode,
  editableColumns,
  getCellDisplay: tableEdit.getCellDisplay
})
const filteredEntries = advancedFilters.filteredEntries
const filteredAggregatedGroups = advancedFilters.filteredAggregatedGroups
const filteredLexemeGroups = advancedFilters.filteredLexemeGroups

const tableRows = computed((): TableRow[] => {
  if (viewMode.value === 'flat') {
    return filteredEntries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))
  }
  const rows: TableRow[] = []
  displayGroups.value.forEach((group, groupIndex) => {
    rows.push({ type: 'group', group, groupIndex })
    if (expandedGroupKeys.value.has(group.headwordNormalized)) {
      group.entries.forEach((entry, entryIndexInGroup) => rows.push({ type: 'entry', entry, groupIndex, entryIndexInGroup }))
    }
  })
  return rows
})
const visibleRuleOverlayEntries = computed(() => tableRows.value
  .filter((row): row is Extract<TableRow, { type: 'entry' }> => row.type === 'entry')
  .map(row => row.entry))

const ruleOverlays = useEntriesRuleOverlays({
  visibleEntries: visibleRuleOverlayEntries,
  buildRowContext: advancedFilters.buildRowContext
})
```

**Shared-view state/copy pattern** (lines 1464-1519):
```typescript
const lastAppliedSharedView = ref<string | null>(null)
const sharedViewError = ref('')
const sharedViewRestored = ref(false)
const sharedViewRestoredSummary = ref('')
const sharedViewCopyStatus = ref<'idle' | 'success' | 'error'>('idle')
const showSharedViewFallbackUrl = ref(false)

const currentSharedViewState = computed(() => ({
  version: ENTRIES_SHARED_VIEW_VERSION,
  filters: advancedFilters.exportAdvancedFilterState(),
  rules: ruleOverlays.exportRuleOverlayState()
}))

const sharedViewSummary = computed(() => summarizeEntriesSharedView(currentSharedViewState.value))

async function copySharedViewLink() {
  if (!canShareEntriesView.value) return
  sharedViewCopyStatus.value = 'idle'
  showSharedViewFallbackUrl.value = false

  if (!import.meta.client || !navigator.clipboard?.writeText) {
    sharedViewCopyStatus.value = 'error'
    showSharedViewFallbackUrl.value = true
    return
  }

  try {
    await navigator.clipboard.writeText(generatedSharedViewUrl.value)
    sharedViewCopyStatus.value = 'success'
  } catch {
    sharedViewCopyStatus.value = 'error'
    showSharedViewFallbackUrl.value = true
  }
}
```

**Trust-boundary apply/clear pattern** (lines 1521-1567):
```typescript
function applySharedViewQuery(): boolean {
  const sharedViewParam = route.query[ENTRIES_SHARED_VIEW_QUERY_PARAM]
  if (typeof sharedViewParam !== 'string') {
    sharedViewError.value = ''
    sharedViewRestored.value = false
    sharedViewRestoredSummary.value = ''
    sharedViewCopyStatus.value = 'idle'
    showSharedViewFallbackUrl.value = false
    lastAppliedSharedView.value = null
    return false
  }
  if (lastAppliedSharedView.value === sharedViewParam) return false

  const result = decodeEntriesSharedView(sharedViewParam)
  if (!result.ok) {
    sharedViewError.value = `分享視圖無法套用：${result.reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。`
    sharedViewRestored.value = false
    sharedViewRestoredSummary.value = ''
    sharedViewCopyStatus.value = 'idle'
    showSharedViewFallbackUrl.value = false
    lastAppliedSharedView.value = sharedViewParam
    return false
  }

  advancedFilters.restoreAdvancedFilterState(result.data.filters)
  ruleOverlays.replaceRuleOverlayState(result.data.rules)
  const restoredSummary = summarizeEntriesSharedView(result.data)
  sharedViewError.value = ''
  sharedViewRestored.value = true
  sharedViewRestoredSummary.value = restoredSummary.message
  sharedViewCopyStatus.value = 'idle'
  showSharedViewFallbackUrl.value = false
  lastAppliedSharedView.value = sharedViewParam
  return true
}

function clearSharedViewQuery() {
  const query = { ...route.query }
  delete query[ENTRIES_SHARED_VIEW_QUERY_PARAM]
  sharedViewError.value = ''
  sharedViewRestored.value = false
  sharedViewRestoredSummary.value = ''
  sharedViewCopyStatus.value = 'idle'
  showSharedViewFallbackUrl.value = false
  lastAppliedSharedView.value = null
  navigateTo({ path: route.path, query }, { replace: true })
}
```

**Route watcher separation pattern** (lines 2671-2684):
```typescript
// Watch for route.query changes (handles navigation from homepage with search/filter params)
watch(
  () => route.query,
  () => {
    if (isInitializing.value) return
    applySharedViewQuery()
    const changed = applyUrlParams()
    if (changed) {
      currentPage.value = 1
      fetchEntries()
    }
  },
  { deep: true }
)
```

**Planner notes:** Any page edits should be minimal. Preserve `view` query isolation: `applySharedViewQuery()` may restore local filter/rule state, but only `applyUrlParams()` should trigger `fetchEntries()`.

---

### `app/composables/__tests__/useEntriesAdvancedFilters.safety.test.ts` and `.performance.test.ts` (test, transform/batch)

**Analog:** `app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts`

**Imports and fixture pattern** (lines 0-7):
```typescript
import { describe, expect, it } from 'vitest'
import { computed, ref } from 'vue'
import type { Entry } from '../../types'
import type { EditableColumnDef } from '../useEntriesTableColumns'
import { decodeEntriesSharedView, encodeEntriesSharedView, ENTRIES_SHARED_VIEW_VERSION } from '../../utils/entriesSharedView'
import { ADVANCED_FILTER_FIELDS } from '../../utils/entriesTableConstants'
import { useEntriesAdvancedFilters, type ExportedAdvancedFilterState } from '../useEntriesAdvancedFilters'
```

**Entry fixture and composable factory pattern** (lines 8-47):
```typescript
function createEntry(id: string, definition = '需要檢查的釋義'): Entry {
  return {
    id,
    dialect: { name: '香港' },
    headword: { display: '測試詞', normalized: '測試詞', isPlaceholder: false },
    phonetic: { jyutping: ['cak1 si3 ci4'] },
    entryType: 'word',
    senses: [{ definition }],
    theme: {},
    meta: { register: '口語' },
    status: 'draft',
    createdBy: 'user-1',
    viewCount: 0,
    likeCount: 0,
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-05-04T00:00:00.000Z'
  }
}

function createComposable(entries = [createEntry('entry-1')]) {
  const editableColumns = computed(() => ADVANCED_FILTER_FIELDS.map(key => ({ key, label: key })) as EditableColumnDef[])
  return useEntriesAdvancedFilters({
    entries: ref(entries),
    aggregatedGroups: computed(() => []),
    lexemeGroups: computed(() => []),
    viewMode: ref('flat'),
    editableColumns,
    getCellDisplay: (entry, col) => {
      if (col.key === 'headword') return entry.headword.display
      if (col.key === 'dialect') return entry.dialect.name
      if (col.key === 'phonetic') return entry.phonetic?.jyutping?.join(' ') ?? ''
      if (col.key === 'entryType') return entry.entryType
      if (col.key === 'theme') return ''
      if (col.key === 'definition') return entry.senses?.[0]?.definition ?? ''
      if (col.key === 'register') return entry.meta?.register ?? ''
      if (col.key === 'status') return entry.status
      return ''
    }
  })
}
```

**Safety assertion pattern** (lines 89-108 and 123-135):
```typescript
it('exports state that round-trips through the shared-view utility without mutating entries', () => {
  const entry = createEntry('entry-2')
  const advancedFilters = createComposable([entry])
  advancedFilters.restoreAdvancedFilterState(createRestoredState())

  const exported = advancedFilters.exportAdvancedFilterState()
  const encoded = encodeEntriesSharedView({
    version: ENTRIES_SHARED_VIEW_VERSION,
    filters: exported,
    rules: []
  })
  const decoded = decodeEntriesSharedView(encoded)

  expect(decoded.ok).toBe(true)
  if (!decoded.ok) return
  expect(decoded.data.filters).toEqual(exported)
  expect(entry._isDirty).toBeUndefined()
  expect(entry).not.toHaveProperty('__sharedView')
  expect(entry).not.toHaveProperty('__ruleOverlayMeta')
})

it('returns defensive copies from export so callers cannot mutate composable state', () => {
  const advancedFilters = createComposable()
  advancedFilters.restoreAdvancedFilterState(createRestoredState())

  const exported = advancedFilters.exportAdvancedFilterState()
  exported.columnRegex.field = 'definition'
  exported.columnRegex.pattern = '已改變'

  expect(advancedFilters.appliedColumnRegex.field).toBe('headword')
  expect(advancedFilters.appliedColumnRegex.pattern).toBe('測試')
  const forbiddenMethodPattern = new RegExp(['sa', 've|dele', 'te|bu', 'lk|fe', 'tch'].join(''), 'i')
  expect(Object.keys(advancedFilters).some(key => forbiddenMethodPattern.test(key))).toBe(false)
})
```

**Planner notes:** New safety/performance tests should reuse this fixture factory. Add medium-row fixture loops only if needed; avoid brittle timing thresholds unless measuring call counts or proving parse/compile once-per-pass behavior.

---

### `app/composables/__tests__/useEntriesRuleOverlays.safety.test.ts` and `.performance.test.ts` (test, transform/batch)

**Analog:** `app/composables/__tests__/useEntriesRuleOverlays.test.ts` and `app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts`

**Context fixture pattern** (lines 0-12):
```typescript
import { describe, expect, it } from 'vitest'
import { computed } from 'vue'
import type { Entry } from '../../types'
import type { RowFilterContext } from '../../utils/entriesAdvancedFilter'
import { ADVANCED_FILTER_FIELDS } from '../../utils/entriesTableConstants'
import { createEmptyCellOverlayMeta, useEntriesRuleOverlays } from '../useEntriesRuleOverlays'

function createContext(overrides: Partial<RowFilterContext> = {}): RowFilterContext {
  return ADVANCED_FILTER_FIELDS.reduce((context, field) => {
    context[field] = overrides[field] ?? ''
    return context
  }, {} as RowFilterContext)
}
```

**Read-only metadata test pattern** (lines 33-72):
```typescript
describe('useEntriesRuleOverlays metadata', () => {
  it('derives read-only per-cell formatting and validation metadata', () => {
    const entry = createEntry('entry-1')
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [entry]),
      buildRowContext: () => createContext({ definition: '缺少例句，需要檢查', headword: '測試詞' })
    })

    overlay.draftRule.name = '缺少例句'
    overlay.draftRule.kind = 'formatting'
    overlay.draftRule.stylePreset = 'amber'
    overlay.draftRule.colorHex = '#f59e0b'
    overlay.draftRule.targetFields = ['definition']
    overlay.draftRule.condition.kind = 'formula'
    overlay.draftRule.condition.formula = '=CONTAINS(definition, "缺少")'
    expect(overlay.addRuleFromDraft()).toBe(true)

    overlay.draftRule.name = '詞頭警告'
    overlay.draftRule.kind = 'validation'
    overlay.draftRule.targetFields = ['headword']
    overlay.draftRule.condition.kind = 'regex'
    overlay.draftRule.condition.regex.field = 'headword'
    overlay.draftRule.condition.regex.pattern = '測試'
    expect(overlay.addRuleFromDraft()).toBe(true)

    const definitionMeta = overlay.getCellOverlayMeta(entry, 'definition')
    expect(definitionMeta.formattingMatches.map(match => match.ruleName)).toEqual(['缺少例句'])
    expect(definitionMeta.validationMatches).toHaveLength(0)
    expect(definitionMeta.formattingMatches[0].colorHex).toBe('#f59e0b')
    expect(definitionMeta.style.backgroundColor).toBe('#f59e0b24')
    expect(definitionMeta.style.boxShadow).toContain('#f59e0b80')
    expect(definitionMeta.tooltipText).toContain('缺少例句')

    const headwordMeta = overlay.getCellOverlayMeta(entry, 'headword')
    expect(headwordMeta.validationMatches.map(match => match.ruleName)).toEqual(['詞頭警告'])
    expect(headwordMeta.formattingMatches).toHaveLength(0)
    expect(headwordMeta.classNames).toContain('ring-amber-300')
    expect(entry).not.toHaveProperty('__ruleOverlayMeta')
    expect(entry._isDirty).toBeUndefined()
  })
})
```

**Shared-view restore safety pattern** (lines 119-136):
```typescript
it('keeps conditional formatting and validation metadata read-only', () => {
  const entry = createEntry('entry-1')
  const overlay = useEntriesRuleOverlays({
    visibleEntries: computed(() => [entry]),
    buildRowContext: () => createContext({ headword: '測試詞', definition: '缺少例句，需要檢查' })
  })
  overlay.replaceRuleOverlayState(createSharedRules())

  const definitionMeta = overlay.getCellOverlayMeta(entry, 'definition')
  const headwordMeta = overlay.getCellOverlayMeta(entry, 'headword')

  expect(definitionMeta.formattingMatches.map(match => match.ruleName)).toEqual(['缺少例句'])
  expect(headwordMeta.validationMatches.map(match => match.ruleName)).toEqual(['詞頭警告'])
  expect(entry._isDirty).toBeUndefined()
  expect(entry).not.toHaveProperty('__ruleOverlayMeta')
  const forbiddenMethodPattern = new RegExp(['sa', 've|dele', 'te|bu', 'lk|fe', 'tch'].join(''), 'i')
  expect(Object.keys(overlay).some(key => forbiddenMethodPattern.test(key))).toBe(false)
})
```

**Planner notes:** Add safety tests for selected rows and draft state by asserting no returned API includes selection/draft/save/delete/fetch methods and no entry object gains extra fields. For performance, prefer call-count tests around `buildRowContext`, `parseAdvancedFormula`, or `compileAdvancedRegex` if practical.

---

### `app/utils/__tests__/entriesSharedView.test.ts` and `app/utils/__tests__/entriesAdvancedFilter.test.ts` (test, transform)

**Analog:** `app/utils/__tests__/entriesSharedView.test.ts`

**Utility test imports and fixture pattern** (lines 0-31):
```typescript
import { describe, expect, it } from 'vitest'
import {
  ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH,
  ENTRIES_SHARED_VIEW_QUERY_PARAM,
  ENTRIES_SHARED_VIEW_VERSION,
  buildEntriesSharedViewUrl,
  decodeEntriesSharedView,
  encodeEntriesSharedView,
  summarizeEntriesSharedView,
  type EntriesSharedViewState
} from '../entriesSharedView'

function createState(overrides: Partial<EntriesSharedViewState> = {}): EntriesSharedViewState {
  return {
    version: ENTRIES_SHARED_VIEW_VERSION,
    filters: {
      formula: {
        input: '=CONTAINS(definition, "檢查")',
        applied: '=CONTAINS(definition, "檢查")'
      },
      globalRegex: {
        enabled: true,
        input: '香港|廣州',
        applied: '香港|廣州',
        flags: 'iu'
      },
      columnRegex: {
        field: 'headword',
        pattern: '測試',
        flags: 'i'
      }
    },
```

**Raw base64 helper pattern** (lines 64-76):
```typescript
function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeRaw(encoded: string): any {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}
```

**Validation regression pattern** (lines 148-168 and 213-246):
```typescript
it('rejects payloads longer than 6000 characters before decoding', () => {
  const decoded = decodeEntriesSharedView('a'.repeat(ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH + 1))
  expect(ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH).toBe(6000)
  expect(decoded).toMatchObject({
    ok: false,
    code: 'too_large',
    reason: '分享視圖資料太長，無法安全還原。'
  })
})

it('rejects unsupported and too-old versions', () => {
  expect(decodeEntriesSharedView(encodeRaw({ ...createState(), version: 2 }))).toMatchObject({
    ok: false,
    code: 'unsupported_version',
    reason: '此分享視圖版本未受支援。'
  })
  expect(decodeEntriesSharedView(encodeRaw({ ...createState(), version: 0 }))).toMatchObject({
    ok: false,
    code: 'too_old_version',
    reason: '此分享視圖版本太舊，無法安全還原。'
  })
})

it('rejects untrusted non-hex rule colors before restore', () => {
  const invalidColor = createState()
  invalidColor.rules[0].colorHex = 'red;box-shadow:0 0 0 9999px black' as any

  expect(decodeEntriesSharedView(encodeRaw(invalidColor))).toMatchObject({
    ok: false,
    code: 'schema_mismatch',
    reason: '分享視圖資料格式無效，無法安全還原。'
  })
})

it('rejects invalid formula and invalid regex semantics before restore', () => {
  const invalidFormula = createState({
    filters: {
      ...createState().filters,
      formula: { input: '=UNKNOWN(definition)', applied: '=UNKNOWN(definition)' }
    }
  })
  expect(decodeEntriesSharedView(encodeRaw(invalidFormula))).toMatchObject({
    ok: false,
    code: 'invalid_formula'
  })

  const invalidRegex = createState({
    filters: {
      ...createState().filters,
      globalRegex: { enabled: true, input: '(', applied: '(', flags: 'i' }
    }
  })
  expect(decodeEntriesSharedView(encodeRaw(invalidRegex))).toMatchObject({
    ok: false,
    code: 'invalid_regex'
  })
})
```

**Data-exclusion pattern** (lines 248-262):
```typescript
it('does not serialize local IDs, secrets, entry data, or dirty draft state', () => {
  const suspicious = createState()
  ;(suspicious.rules[0] as any).id = 'local-rule-id'
  ;(suspicious as any).entries = [{ id: 'entry-1', headword: '秘密詞條' }]
  ;(suspicious as any).token = 'sk-secret'
  ;(suspicious as any)._isDirty = true

  const encoded = encodeEntriesSharedView(suspicious)
  const raw = JSON.stringify(decodeRaw(encoded))
  expect(raw).not.toContain('local-rule-id')
  expect(raw).not.toContain('秘密詞條')
  expect(raw).not.toContain('sk-secret')
  expect(raw).not.toContain('_isDirty')
  expect(raw).not.toMatch(/userId|session|Cloudinary|apiResponse|selectedRow/i)
})
```

**Planner notes:** For a new `entriesAdvancedFilter.test.ts`, copy this direct utility style and assert regex safety, HK Traditional errors, `evaluateAdvancedFormulaAst()` behavior, and absence of executable JS paths.

---

### `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` (test, file-I/O + source-level assertions)

**Analog:** `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts`

**Source-level test import pattern** (lines 0-6):
```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')
```

**Route/query safety assertion pattern** (lines 48-62):
```typescript
it('keeps shared-view route restore separate from server-backed URL param fetching', () => {
  expect(source).toContain('function applySharedViewQuery')
  expect(source).toContain('route.query[ENTRIES_SHARED_VIEW_QUERY_PARAM]')
  expect(source).toContain('decodeEntriesSharedView(sharedViewParam)')
  expect(source).toContain('lastAppliedSharedView.value === sharedViewParam')
  expect(source).toMatch(/applySharedViewQuery\(\)[\s\S]*const changed = applyUrlParams\(\)[\s\S]*if \(changed\) \{[\s\S]*fetchEntries\(\)/)
  expect(source).not.toMatch(/function applyUrlParams\(\): boolean \{[\s\S]*ENTRIES_SHARED_VIEW_QUERY_PARAM[\s\S]*changed = true[\s\S]*return changed\n\}/)
})

it('fails invalid shared-view payloads safely with HK Traditional feedback before applying state', () => {
  expect(source).toContain('分享視圖無法套用：${result.reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。')
  expect(source).toMatch(/<UAlert\s+v-if="sharedViewError"[\s\S]*:description="sharedViewError"[\s\S]*@click="clearSharedViewQuery"/)
  expect(source).toMatch(/if \(!result\.ok\) \{[\s\S]*sharedViewError\.value[\s\S]*sharedViewRestored\.value = false[\s\S]*return false[\s\S]*\}/)
  expect(source).toMatch(/advancedFilters\.restoreAdvancedFilterState\(result\.data\.filters\)[\s\S]*ruleOverlays\.replaceRuleOverlayState\(result\.data\.rules\)/)
})
```

**No-scope-creep pattern** (lines 76-80):
```typescript
it('does not introduce backend, localStorage, saved-view, entry-mutation, or UI-library scope creep for shared views', () => {
  expect(source).not.toMatch(/localStorage.*shared|\$fetch.*shared|save.*shared|deleteSharedView|review.*shared|bulk.*shared|saved view|savedView/i)
  expect(source).not.toMatch(/shared[\s\S]{0,120}_isDirty|_isDirty[\s\S]{0,120}shared/i)
  expect(source).not.toMatch(/from ['"](?:@radix-ui|shadcn|antd|element-plus|vuetify)/)
})
```

**Planner notes:** Extend this file for route-backed fetch regressions, clear-share-query behavior, and visible page-level errors rather than mounting the 2774-line page.

---

### `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts` (test, file-I/O + source-level assertions)

**Analog:** `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts`

**Page wiring assertions** (lines 7-28):
```typescript
describe('entries page rule overlay wiring', () => {
  it('imports the rule overlay panel and composable', () => {
    expect(source).toContain('EntriesRuleOverlayPanel')
    expect(source).toContain('useEntriesRuleOverlays')
  })

  it('renders the rules panel near advanced filters with a dedicated toolbar host', () => {
    expect(source).toContain('teleport-to="#entries-rule-overlay-host"')
    expect(source).toContain('id="entries-rule-overlay-host"')
    expect(source).toContain('v-model:expanded="ruleOverlays.ruleOverlayExpanded.value"')
    expect(source).toContain(':draft-rule="ruleOverlays.draftRule"')
    expect(source).toContain('@update:draft-rule="updateRuleOverlayDraft"')
    expect(source).toContain('@update-rule-color="ruleOverlays.updateRuleColor"')
    expect(source).toContain(':active-rule-count="ruleOverlays.activeRuleCount.value"')
  })

  it('instantiates overlays with rendered entries and advanced filter row context', () => {
    expect(source).toContain('visibleRuleOverlayEntries')
    expect(source).toContain('useEntriesRuleOverlays({')
    expect(source).toContain('visibleEntries: visibleRuleOverlayEntries')
    expect(source).toContain('buildRowContext: advancedFilters.buildRowContext')
  })
})
```

**Draft update and no-persistence assertion pattern** (lines 30-42):
```typescript
it('writes draft updates back into the reactive overlay draft instead of replacing the composable return property', () => {
  expect(source).toContain('function updateRuleOverlayDraft(nextDraft: EntriesRuleDraft)')
  expect(source).toContain('Object.assign(ruleOverlays.draftRule')
  expect(source).toContain('targetFields: [...nextDraft.targetFields]')
  expect(source).toContain('regex: { ...nextDraft.condition.regex }')
  expect(source).toContain('colorHex: nextDraft.colorHex')
})

it('passes per-cell overlay metadata without rule persistence or data mutation coupling', () => {
  expect(source).toContain(':cell-meta="isAdvancedFilterFieldKey(col.key) ? ruleOverlays.getCellOverlayMeta')
  expect(source).toContain('isAdvancedFilterFieldKey')
  expect(source).not.toMatch(/localStorage.*rule|\$fetch.*rule|save.*rule|delete.*rule|review.*rule|bulk.*rule/i)
})
```

**Planner notes:** Extend this source-level style for flat/aggregated/lexeme wiring and to assert overlays use current displayed rows without writing drafts or selected rows.

---

### Component source-level tests: `EntriesEditableCell.test.ts`, `EntriesRuleOverlayPanel.test.ts`, `EntriesShareViewPopover.test.ts`

**Analogs:** existing files under `app/components/entries/__tests__/`

**Editable cell no-mutation and accessibility assertions** (from `EntriesEditableCell.test.ts` lines 7-28):
```typescript
describe('EntriesEditableCell overlay metadata rendering', () => {
  it('accepts typed optional cell overlay metadata without data mutation coupling', () => {
    expect(source).toContain('EntryCellOverlayMeta')
    expect(source).toContain('cellMeta?: EntryCellOverlayMeta')
    expect(source).toContain('props.cellMeta?.classNames ?? []')
    expect(source).not.toMatch(/\$fetch|col\.set|_isDirty|selectedEntryIds|batch|localStorage/)
  })

  it('renders a non-color validation warning cue with accessible HK Traditional label', () => {
    expect(source).toContain('hasValidationMatches')
    expect(source).toContain('validationOverlayTitle')
    expect(source).toContain('i-heroicons-exclamation-triangle')
    expect(source).toContain('aria-label="驗證警告"')
    expect(source).toContain(':title="validationOverlayTitle"')
  })
})
```

**Rule panel presentational/no-mutation assertions** (from `EntriesRuleOverlayPanel.test.ts` lines 28-50):
```typescript
it('keeps the component presentational and free from entry mutations', () => {
  expect(source).not.toMatch(/\$fetch|save|delete|review|bulk|col\.set|_isDirty/)
})

it('renders draft controls, supported fields, and validation alert affordances', () => {
  expect(source).toContain('新增規則')
  expect(source).toContain('規則名稱')
  expect(source).toContain('規則類型')
  expect(source).toContain('條件格式')
  expect(source).toContain('驗證警告')
  expect(source).toContain('條件模式')
  expect(source).toContain('公式')
  expect(source).toContain('正則表達式')
  expect(source).toContain('目標欄位')
  expect(source).toContain('任何欄位')
  expect(source).toContain('套用規則')
  expect(source).toContain('清除規則')
  expect(source).toContain('自訂顏色')
  expect(source).toContain('UColorPicker')
  expect(source).toContain('UPopover')
  expect(source).toContain('此規則只會標示目前已載入的詞條，不會修改資料。')
  expect(source).toContain('role="alert"')
})
```

**Share popover exact-copy and local-only assertions** (from `EntriesShareViewPopover.test.ts` lines 34-64):
```typescript
it('renders exact Hong Kong Traditional Chinese copy from the UI spec', () => {
  expect(source).toContain('分享目前視圖')
  expect(source).toContain('連結會還原公式篩選、正則設定、條件格式和驗證規則，不會修改詞條資料。')
  expect(source).toContain('複製視圖連結')
  expect(source).toContain('視圖連結已複製。')
  expect(source).toContain('無法複製連結。請手動複製下方網址。')
  expect(source).toContain('已套用分享視圖')
  expect(source).toContain('未有可分享設定')
  expect(source).toContain('目前沒有公式篩選、正則設定、條件格式或驗證規則。請先設定視圖，再複製分享連結。')
  expect(source).toContain('分享格式版本：v')
  expect(source).toContain('清除分享參數')
  expect(source).toContain('只會移除網址中的分享參數，不會清除目前表格資料。')
})

it('keeps the component local-only with no backend, persistence, route, saved-view, or entry mutation coupling', () => {
  expect(source).not.toMatch(/\$fetch|localStorage|navigateTo|router\.push|router\.replace|save|delete|review|bulk|col\.set|_isDirty/)
})
```

**Planner notes:** Source-level tests are accepted in this project for large Vue components. Add exact HK Traditional copy assertions for any new error/helper strings introduced in Phase 4.

---

### `.planning/phases/04-integration-hardening-and-ux-verification/04-UX-VERIFICATION.md` (documentation/manual-verification, batch)

**Analog:** `.planning/phases/04-integration-hardening-and-ux-verification/04-UI-SPEC.md`

**Manual artifact contract** (lines 131-144):
```markdown
## Manual Browser Verification Matrix Contract

Phase 04 must include or produce a manual browser verification matrix with these columns:

| Column | Required content |
|--------|------------------|
| ID | Stable ID such as `UAT-FORM-01` |
| Area | Formula, regex, rules, share, keyboard, editing, or view modes |
| Setup | Required browser route, data, auth, and environment state |
| Steps | Concrete user steps in `/entries` |
| Expected Result | Visible UI behavior and safety outcome |
| Status | `已通過`, `未通過`, or `受環境限制` |
| Limitations | Missing credentials/session/data/AI/clipboard notes |
```

**Minimum rows contract** (lines 145-170):
```markdown
| ID | Area | Contract |
|----|------|----------|
| UAT-FORM-01 | Formula golden path | Apply a valid formula against loaded entries; table filters without mutation. |
| UAT-FORM-02 | Invalid formula | Invalid formula shows visible HK Traditional error and table remains usable. |
| UAT-REGX-01 | Global regex | Regex search matches loaded entry display text consistently. |
| UAT-REGX-02 | Column regex | Column regex affects only the selected field. |
| UAT-REGX-03 | Invalid/unsafe regex | Invalid or unsafe regex shows visible error without freezing. |
| UAT-RULE-01 | Conditional formatting | Matching cells highlight without dirty state or save indicator. |
| UAT-RULE-02 | Validation warning | Warning styling is distinct from formatting and includes icon/text/title. |
| UAT-RULE-03 | Rule ordering | Reorder/toggle/delete rules updates overlays and does not change entry data. |
| UAT-RULE-04 | Invalid color | Invalid rule color shows visible error and can be corrected via `UColorPicker`. |
| UAT-SHARE-01 | Copy/restore | Copied link restores supported filters/rules after validation. |
| UAT-SHARE-02 | Invalid payload | `/entries?view=not-valid` shows visible alert and does not apply state. |
| UAT-SHARE-03 | Too-old/unsupported/too-large | Each payload failure has specific visible HK Traditional copy. |
| UAT-SHARE-04 | Clipboard fallback | When copy fails, fallback URL is readable, selectable, and keyboard accessible. |
| UAT-KEY-01 | Keyboard navigation | Arrow, Enter, Tab, Escape table behavior works with rules enabled. |
| UAT-EDIT-01 | Inline editing | Edit, cancel, save one row, save all, duplicate checks, and dirty state match baseline with rules enabled. |
| UAT-EDIT-02 | Draft recovery | Local draft recovery survives active rules and clearing the share query. |
| UAT-VIEW-01 | Flat mode | Flat mode works with advanced filters/rules enabled and disabled. |
| UAT-VIEW-02 | Aggregated mode | Aggregated groups expand/edit correctly with active filters/rules. |
| UAT-VIEW-03 | Lexeme mode | Lexeme groups expand/edit correctly with active filters/rules. |
| UAT-AI-01 | AI compatibility | AI suggestion accept/dismiss remains unchanged with rules enabled; record `受環境限制` if credentials are missing. |
| UAT-PERF-01 | Responsiveness | Typing in filters, editing cells, switching modes, toggling/reordering rules, and restoring shared views show no visible freeze on typical loaded data. |
| UAT-LOC-01 | Localization | New Excel-tool labels, errors, helper text, tooltips, alerts, and verification copy use Hong Kong Traditional Chinese. |
```

**Planner notes:** This is not source code and has no close code analog. If planner creates this artifact, use the UI spec contract above, write HK Traditional copy, and include limitations rather than claiming checks passed when auth/MongoDB/OpenRouter/clipboard conditions are unavailable.

## Shared Patterns

### HK Traditional Chinese copy
**Source:** `CLAUDE.md` lines 4-24 and `04-UI-SPEC.md` lines 64-88
**Apply to:** All UI components, utility error messages, test fixtures, and manual verification copy.

Project instruction excerpt:
```markdown
**All Chinese text in this project must use Hong Kong Traditional Chinese (香港繁體).**

This applies to:
- UI labels, buttons, placeholders
- Error messages and validation text
- Code comments in Chinese
- AI prompts and system messages
- Database enum values (e.g., `register` field: '口語', '書面', '粗俗', '文雅', '中性')
```

Required Phase 4 copy excerpt:
```markdown
| Read-only helper | 公式、正則、格式和驗證規則只會標示或篩選目前已載入的詞條，不會修改資料。 |
| Invalid formula | 公式無法套用：{message} 請檢查公式語法、欄位名稱或函數參數。 |
| Invalid regex | 正則表達式無法套用：{message} 請檢查括號、轉義符號或旗標。 |
| Invalid shared view | 分享視圖無法套用：{reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。 |
| Invalid rule color | 規則顏色無效。請使用色彩選擇器重新選擇顏色。 |
| Clear share parameter | 清除分享參數 |
| Clipboard fallback | 無法複製連結。請手動複製下方網址。 |
| Manual test data hint | 可使用「檢查」、「香港」、「廣州」、「粵語詞條」作為測試內容。 |
```

### Read-only safety boundaries
**Source:** `04-UI-SPEC.md` lines 117-129 and current tests.
**Apply to:** All composables, components, page wiring, shared-view utility, and tests.

Contract excerpt:
```markdown
The Excel-style tools must not:

- mutate `Entry` fields,
- mark entries dirty,
- create or overwrite local drafts,
- change selected rows,
- call save, submit, delete, review, history, AI, upload, admin, or bulk mutation APIs,
- write rule/view configuration to backend or localStorage,
- serialize entry data, draft data, selected row IDs, user/session data, tokens, API responses, or secrets into URLs.

Cell overlays remain metadata passed into rendering. Do not store overlay metadata on entry objects.
```

Concrete test assertion excerpt from `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` lines 76-80:
```typescript
expect(source).not.toMatch(/localStorage.*shared|\$fetch.*shared|save.*shared|deleteSharedView|review.*shared|bulk.*shared|saved view|savedView/i)
expect(source).not.toMatch(/shared[\s\S]{0,120}_isDirty|_isDirty[\s\S]{0,120}shared/i)
expect(source).not.toMatch(/from ['"](?:@radix-ui|shadcn|antd|element-plus|vuetify)/)
```

### Formula/regex safety boundary
**Source:** `app/utils/entriesAdvancedFilter.ts` lines 79-96 and 388-403.
**Apply to:** `useEntriesAdvancedFilters`, `useEntriesRuleOverlays`, `entriesSharedView`, utility tests.

Use only:
```typescript
compileAdvancedRegex(pattern, flags)
testAdvancedRegex(compiled.regex, value)
parseAdvancedFormula(input)
evaluateAdvancedFormulaAst(parsed.ast, context)
```

Do not use scattered raw `new RegExp()` outside the utility, `eval`, `new Function`, or ad-hoc formula interpreters.

### Shared-view trust boundary
**Source:** `app/utils/entriesSharedView.ts` lines 275-301 and `app/pages/entries/index.vue` lines 1521-1555.
**Apply to:** shared-view URL handling and tests.

Rule: call `decodeEntriesSharedView(sharedViewParam)` first, and only call `advancedFilters.restoreAdvancedFilterState()` / `ruleOverlays.replaceRuleOverlayState()` after `result.ok` is true.

### Nuxt UI visible feedback
**Source:** `app/pages/entries/index.vue` lines 213-227, `EntriesShareViewPopover.vue` lines 47-65, `EntriesAdvancedFilterPanel.vue` lines 42-49, `EntriesRuleOverlayPanel.vue` lines 147-154.
**Apply to:** invalid formula, invalid regex, invalid shared-view payload, unsupported/too-old/too-large shared payload, invalid rule color.

Use page/panel-level visible alerts or inline `role="alert"`; do not hide critical errors only inside closed popovers.

### Source-level tests for large Vue/page wiring
**Source:** `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` lines 0-6.
**Apply to:** page wiring, component local-only contracts, no-scope-creep assertions.

Pattern:
```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')
```

## No Analog Found

Files with no close code match in the codebase. Planner should use `04-UI-SPEC.md` / `04-RESEARCH.md` instead.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.planning/phases/04-integration-hardening-and-ux-verification/04-UX-VERIFICATION.md` | documentation/manual-verification | batch | No existing manual browser verification matrix artifact exists in the codebase; `04-UI-SPEC.md` lines 131-170 define the exact contract. |

## Metadata

**Analog search scope:** `/Users/trenton/Projects/JyutCollab-v2/app`, `/Users/trenton/Projects/JyutCollab-v2/.planning/phases`, `/Users/trenton/Projects/JyutCollab-v2/.planning/codebase`
**Files scanned:** 9 source files, 9 test files, 3 phase input files, project `CLAUDE.md`, and planning references.
**Pattern extraction date:** 2026-05-05
**Skills:** No `.claude/skills/` or `.agents/skills/` directory found under `/Users/trenton/Projects/JyutCollab-v2`.
