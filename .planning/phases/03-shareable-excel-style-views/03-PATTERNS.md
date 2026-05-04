# Phase 03: Shareable Excel-Style Views - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/utils/entriesSharedView.ts` | utility | transform | `app/utils/entriesAdvancedFilter.ts` + `server/api/entries/check-duplicate.get.ts` | role-match |
| `app/composables/useEntriesAdvancedFilters.ts` | composable | transform | `app/composables/useEntriesAdvancedFilters.ts` | exact |
| `app/composables/useEntriesRuleOverlays.ts` | composable | transform | `app/composables/useEntriesRuleOverlays.ts` | exact |
| `app/components/entries/EntriesShareViewPopover.vue` | component | event-driven | `app/components/entries/EntriesAdvancedFilterPanel.vue` + `app/components/entries/EntriesRuleOverlayPanel.vue` | role-match |
| `app/pages/entries/index.vue` | page | request-response | `app/pages/entries/index.vue` | exact |
| `app/utils/__tests__/entriesSharedView.test.ts` | test | transform | `app/composables/__tests__/useEntriesRuleOverlays.test.ts` | role-match |
| `app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts` | test | transform | `app/composables/__tests__/useEntriesRuleOverlays.test.ts` | role-match |
| `app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts` | test | transform | `app/composables/__tests__/useEntriesRuleOverlays.test.ts` | exact |
| `app/components/entries/__tests__/EntriesShareViewPopover.test.ts` | test | event-driven | `app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts` | role-match |
| `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` | test | request-response | `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts` | exact |

## Pattern Assignments

### `app/utils/entriesSharedView.ts` (utility, transform)

**Analog:** `app/utils/entriesAdvancedFilter.ts` for local frontend utility conventions; `server/api/entries/check-duplicate.get.ts` for Zod `safeParse` error style.

**Imports and exported constants pattern** (`app/utils/entriesAdvancedFilter.ts` lines 0-5):
```typescript
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200
export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000

export type AdvancedFilterFieldKey = (typeof ADVANCED_FILTER_FIELDS)[number]
```

**Apply to shared-view utility:** use `~` aliases for app utilities/types; export constants such as `ENTRIES_SHARED_VIEW_VERSION = 1`, `ENTRIES_SHARED_VIEW_QUERY_PARAM = 'view'`, and `ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH = 6000` near the top.

**Safe validation helper pattern** (`app/utils/entriesAdvancedFilter.ts` lines 52-91):
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

function createAdvancedFilterError(code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode, detail?: string): AdvancedFilterError {
  return {
    code,
    message: getAdvancedFilterErrorMessage(code, detail),
    detail
  }
}

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
```

**Apply to shared-view utility:** return discriminated unions instead of throwing, with HK Traditional error messages from `03-UI-SPEC.md`. Reuse `parseAdvancedFormula` and `compileAdvancedRegex` before restore.

**Formula parse boundary pattern** (`app/utils/entriesAdvancedFilter.ts` lines 290-298):
```typescript
export function parseAdvancedFormula(input: string): FormulaParseResult {
  const trimmed = String(input ?? '').trim()
  const normalized = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
  if (!normalized) return { ok: false, error: createAdvancedFilterError('empty_formula') }

  const tokenized = tokenizeFormula(normalized)
  if (!tokenized.ok) return tokenized
  return new FormulaParser(tokenized.tokens).parse()
}
```

**Apply to shared-view utility:** normalize unknown decoded data before validation; never evaluate payload as code. Validate all candidate formulas through `parseAdvancedFormula()` and all regexes through `compileAdvancedRegex()` before returning `{ ok: true, data }`.

**Zod safeParse pattern** (`server/api/entries/check-duplicate.get.ts` lines 0-7 and 30-37):
```typescript
import { z } from 'zod'
import { connectDB } from '../../utils/db'
import { Entry } from '../../utils/Entry'

const QuerySchema = z.object({
  headword: z.string().min(1),
  dialect: z.string().min(1)
})
```

```typescript
const query = getQuery(event)
const validated = QuerySchema.safeParse(query)
if (!validated.success) {
  throw createError({
    statusCode: 400,
    message: '請提供 headword 與 dialect 參數'
  })
}
```

**Apply to shared-view utility:** import `z` from `zod`, define schemas at module scope, and use `safeParse()` to keep query restore non-throwing. For Phase 3, use strict object schemas (`z.strictObject`) even though server analogs currently use `z.object`, because UI spec requires unknown-field rejection.

---

### `app/composables/useEntriesAdvancedFilters.ts` (composable, transform)

**Analog:** Existing `useEntriesAdvancedFilters.ts`.

**Imports and state-owner pattern** (lines 0-6 and 26-43):
```typescript
import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, parseAdvancedFormula, testAdvancedRegex, type AdvancedFilterError, type AdvancedFilterFieldKey, type RowFilterContext } from '~/utils/entriesAdvancedFilter'
```

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
```

**Apply to import/export:** add typed exported state interfaces next to `AdvancedFilterColumnRegexState`; implement `exportAdvancedFilterState()` and `restoreAdvancedFilterState(state)` inside this composable so the page does not assign refs manually.

**Separated input/applied state pattern** (lines 65-68 and 199-210):
```typescript
const hasAppliedFormula = computed(() => appliedFormula.value.trim().length > 0)
const hasAppliedGlobalRegex = computed(() => globalRegexEnabled.value && appliedGlobalRegex.value.trim().length > 0)
const hasAppliedColumnRegex = computed(() => !!appliedColumnRegex.field && appliedColumnRegex.pattern.trim().length > 0)
const hasActiveAdvancedFilters = computed(() => hasAppliedFormula.value || hasAppliedGlobalRegex.value || hasAppliedColumnRegex.value)
```

```typescript
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

**Apply to restore:** restore both visible inputs and applied values atomically. A valid shared link must update `formulaInput` plus `appliedFormula`, `globalRegexInput` plus `appliedGlobalRegex`, and `columnRegex` plus `appliedColumnRegex`; otherwise `hasActiveAdvancedFilters` may remain false.

**Clear/reset pattern** (lines 212-226):
```typescript
function clearAdvancedFilters() {
  formulaInput.value = ''
  appliedFormula.value = ''
  globalRegexEnabled.value = false
  globalRegexInput.value = ''
  appliedGlobalRegex.value = ''
  globalRegexFlags.value = 'i'
  columnRegex.field = ''
  columnRegex.pattern = ''
  columnRegex.flags = 'i'
  appliedColumnRegex.field = ''
  appliedColumnRegex.pattern = ''
  appliedColumnRegex.flags = 'i'
  clearAdvancedFilterErrors()
}
```

**Apply to restore:** mirror this direct assignment style for restore. Do not write to localStorage, do not fetch, and do not mutate entries.

**Return API pattern** (lines 228-253):
```typescript
return {
  advancedFilterExpanded,
  formulaInput,
  appliedFormula,
  globalRegexEnabled,
  globalRegexInput,
  appliedGlobalRegex,
  globalRegexFlags,
  columnRegex,
  appliedColumnRegex,
  advancedFilterErrors,
  hasAppliedFormula,
  hasAppliedGlobalRegex,
  hasAppliedColumnRegex,
  hasActiveAdvancedFilters,
  loadedEntryCount,
  filteredEntries,
  filteredAggregatedGroups,
  filteredLexemeGroups,
  visibleEntryCount,
  advancedEmptyStateActive,
  buildRowContext,
  applyAdvancedFilters,
  clearAdvancedFilters,
  clearAdvancedFilterErrors
}
```

**Apply to import/export:** append `exportAdvancedFilterState` and `restoreAdvancedFilterState` to this returned object.

---

### `app/composables/useEntriesRuleOverlays.ts` (composable, transform)

**Analog:** Existing `useEntriesRuleOverlays.ts`.

**Typed rule model pattern** (lines 8-32):
```typescript
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
```

**Apply to shared payload:** export a payload rule type that omits `id`, or reuse `EntriesRuleDraft`-style shape. Do not serialize `id`; regenerate local IDs during restore.

**Local ID and default draft pattern** (lines 83-111):
```typescript
function createLocalRuleId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID()
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
```

```typescript
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
```

**Apply to restore:** implement `replaceRuleOverlayState(restoredRules)` as `rules.value = restoredRules.map(rule => ({ ...rule, id: createLocalRuleId(), targetFields: [...rule.targetFields], condition: { ...rule.condition, regex: { ...rule.condition.regex } } }))` after validation in the shared-view utility.

**Validation pattern** (lines 255-294):
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
```

**Apply to import/export:** keep rule validation fail-closed. For shared restore, semantic validation should happen in `entriesSharedView.ts` before calling `replaceRuleOverlayState`; composable method should still defensively clone and regenerate IDs.

**Local-only mutation API pattern** (lines 297-331):
```typescript
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

function updateRuleColor(ruleId: string, colorHex: string) {
  rules.value = rules.value.map(rule => rule.id === ruleId ? { ...rule, colorHex } : rule)
}

function clearRules() {
  rules.value = []
  clearRuleOverlayErrors()
}
```

**Apply to import/export:** new export/replace methods must stay local-only: no `$fetch`, no localStorage, no entry `_isDirty` writes.

---

### `app/components/entries/EntriesShareViewPopover.vue` (component, event-driven)

**Analog:** `EntriesAdvancedFilterPanel.vue` for trigger/teleport seam; `EntriesRuleOverlayPanel.vue` for `UPopover`, badges, presentational typed props/emits.

**Icon-only toolbar trigger density** (`EntriesAdvancedFilterPanel.vue` lines 0-12):
```vue
<template>
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
```

**Apply to share component:** use same `UButton size="sm" color="neutral" variant="soft" class="h-8 w-8 justify-center p-0"`, icon `i-heroicons-share` or `i-heroicons-link`, and accessible name `分享目前視圖`. Wrap with `UTooltip` per UI spec.

**Status badge pattern** (`EntriesAdvancedFilterPanel.vue` lines 13-20; `EntriesRuleOverlayPanel.vue` lines 13-20):
```vue
<UBadge
  v-if="hasActiveAdvancedFilters"
  color="primary"
  variant="soft"
  class="self-center"
>
  進階篩選顯示 {{ visibleCount }} / {{ loadedCount }} 項目前已載入結果。
</UBadge>
```

```vue
<UBadge
  v-if="activeRuleCount > 0"
  color="primary"
  variant="soft"
  class="self-center"
>
  {{ activeRuleCount }} 項規則
</UBadge>
```

**Apply to share component/page:** display `已套用分享視圖` as `UBadge color="primary" variant="soft"` when a valid `view` query was applied.

**Popover pattern** (`EntriesRuleOverlayPanel.vue` lines 211-234 and 561-582):
```vue
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
```

```vue
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
```

**Apply to share component:** use `<UPopover :content="{ side: 'bottom', sideOffset: 8 }">` with a trigger button and `<template #content><div class="w-80 p-3 ...">...</div></template>`. Use `UButton color="primary" variant="solid" size="sm"` for `複製視圖連結`.

**Presentational script pattern** (`EntriesRuleOverlayPanel.vue` lines 597-636 and 713-728):
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

const props = defineProps<{
  expanded: boolean
  draftRule: EntriesRuleDraft
  rules: EntriesRuleOverlay[]
  errors: EntriesRuleOverlayErrors
  activeRuleCount: number
  fieldOptions: FieldOption[]
  teleportTo?: string
}>()
```

```typescript
function updateDraft(patch: Partial<EntriesRuleDraft>) {
  const condition = patch.condition
    ? { ...patch.condition, regex: { ...patch.condition.regex } }
    : {
        kind: props.draftRule.condition.kind,
        formula: props.draftRule.condition.formula,
        regex: { ...props.draftRule.condition.regex }
      }

  emit('update:draftRule', {
    ...props.draftRule,
    ...patch,
    targetFields: [...(patch.targetFields ?? props.draftRule.targetFields)],
    condition
  })
}
```

**Apply to share component:** keep it presentational. Props should include generated URL, summary counts, copied/error states, `canShare`, `version`, and restored status. Emits should include `copy`, `clear-share-query`, and possibly `update:open`. Do not import table mutation composables or call `$fetch`.

---

### `app/pages/entries/index.vue` (page, request-response)

**Analog:** Existing entries page route/query and toolbar wiring.

**Imports pattern** (lines 881-919):
```typescript
<script setup lang="ts">
import { useAuth, useProfileUpdatedUser } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS, ADVANCED_FILTER_FIELD_LABELS, ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import { useEntriesTableColumns } from '~/composables/useEntriesTableColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { deepCopy, getEntryIdKey, makeBaselineSnapshot, useEntryBaseline } from '~/composables/useEntryBaseline'
import { ensureSensesStructure, addSense, removeSense, addExample, removeExample, addSubSense, removeSubSense, addSubSenseExample, removeSubSenseExample } from '~/composables/useEntrySenses'
import { useEntriesList } from '~/composables/useEntriesList'
import { useEntriesAdvancedFilters } from '~/composables/useEntriesAdvancedFilters'
import { useEntriesRuleOverlays } from '~/composables/useEntriesRuleOverlays'
import type { EntriesRuleDraft } from '~/composables/useEntriesRuleOverlays'
```

```typescript
import EntriesAdvancedFilterPanel from '~/components/entries/EntriesAdvancedFilterPanel.vue'
import EntriesRuleOverlayPanel from '~/components/entries/EntriesRuleOverlayPanel.vue'
```

**Apply to Phase 3:** add `EntriesShareViewPopover` component import and named imports from `~/utils/entriesSharedView` near related entries imports.

**Toolbar placement pattern** (lines 119-160 and 197-198):
```vue
<UButton
  color="primary"
  size="sm"
  @click="handleSearch"
>
  搜索
</UButton>
<EntriesAdvancedFilterPanel
  v-model:expanded="advancedFilters.advancedFilterExpanded.value"
  v-model:formula-input="advancedFilters.formulaInput.value"
  v-model:global-regex-enabled="advancedFilters.globalRegexEnabled.value"
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
```

```vue
<div id="entries-advanced-filter-host" class="w-full" />
<div id="entries-rule-overlay-host" class="w-full" />
```

**Apply to Phase 3:** place `<EntriesShareViewPopover ... />` beside advanced/rule triggers and before column-width utilities where practical. Add a host only if using a teleported expanded area; popover can render inline with its own content template.

**Composable wiring pattern** (lines 1338-1411):
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
const hasActiveAdvancedFilters = advancedFilters.hasActiveAdvancedFilters
const advancedEmptyStateActive = advancedFilters.advancedEmptyStateActive
const visibleEntryCount = advancedFilters.visibleEntryCount
const loadedEntryCount = advancedFilters.loadedEntryCount
```

```typescript
const ruleOverlays = useEntriesRuleOverlays({
  visibleEntries: visibleRuleOverlayEntries,
  buildRowContext: advancedFilters.buildRowContext
})
```

**Apply to Phase 3:** generate share payload from `advancedFilters.exportAdvancedFilterState()` and `ruleOverlays.exportRuleOverlayState()`. Restore valid payload through `advancedFilters.restoreAdvancedFilterState(result.data.filters)` and `ruleOverlays.replaceRuleOverlayState(result.data.rules)`.

**Route/query pattern** (lines 1145-1147 and 2493-2513):
```typescript
// Handle URL parameters - will be processed in onMounted before fetchEntries
const route = useRoute()
```

```typescript
function applyUrlParams(): boolean {
  const query = route.query
  let changed = false

  // Handle search parameter
  const newSearch = typeof query.search === 'string' ? query.search : ''
  if (newSearch !== searchQuery.value) {
    searchQuery.value = newSearch
    changed = true
  }

  // Handle filter=mine parameter
  const shouldFilterMine = query.filter === 'mine' && user.value?.id
  const newCreatedBy = shouldFilterMine ? user.value.id : undefined
  if (newCreatedBy !== filters.createdBy) {
    filters.createdBy = newCreatedBy
    changed = true
  }

  return changed
}
```

**Apply to Phase 3:** keep `view` query restore separate from server-backed search/filter changes. Applying shared view should not set `changed = true` and should not call `fetchEntries()`.

**Watcher and initial route timing pattern** (lines 2528-2540 and 2579-2591):
```typescript
// Watch for route.query changes (handles navigation from homepage with search/filter params)
watch(
  () => route.query,
  () => {
    if (isInitializing.value) return
    const changed = applyUrlParams()
    if (changed) {
      currentPage.value = 1
      fetchEntries()
    }
  },
  { deep: true }
)
```

```typescript
// Initial fetch - process URL params first, then fetch
onMounted(async () => {
  // Check if mobile device
  isMobile.value = window.innerWidth < 768

  // Apply URL parameters (search, filter=mine)
  applyUrlParams()

  await fetchEntries()

  // Mark initialization complete so watches can trigger normally
  isInitializing.value = false
})
```

**Apply to Phase 3:** call `applySharedViewQuery()` during `onMounted()` after composables are created and before or alongside first render. Also call it in route watcher when `route.query.view` changes. Track `lastAppliedSharedView` to prevent loops. Use `navigateTo({ path: route.path, query }, { replace: true })` to clear only `view`.

---

### `app/utils/__tests__/entriesSharedView.test.ts` (test, transform)

**Analog:** `app/composables/__tests__/useEntriesRuleOverlays.test.ts`.

**Vitest import and helper pattern** (lines 0-12):
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

**Apply to utility tests:** import tested utility functions with relative paths; create helper payload factories. Test encode/decode round-trip, Unicode HK Traditional content, max length, unsupported version, invalid schema, unknown fields, invalid formula, invalid regex, and no IDs/secrets/entry data in serialized output.

**Fail-closed validation assertion pattern** (lines 93-122):
```typescript
describe('useEntriesRuleOverlays validation', () => {
  it('rejects invalid drafts with fail-closed HK Traditional errors', () => {
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => []),
      buildRowContext: () => createContext()
    })

    overlay.draftRule.name = '   '
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.name).toBe('請輸入規則名稱。')
    expect(overlay.rules.value).toHaveLength(0)

    overlay.draftRule.name = '無目標欄位'
    overlay.draftRule.targetFields = []
    expect(overlay.addRuleFromDraft()).toBe(false)
    expect(overlay.ruleOverlayErrors.targetFields).toBe('請至少選擇一個目標欄位。')
```

**Apply to shared-view tests:** for each invalid decode/validate case assert `result.ok === false`, HK Traditional `reason`, and that the returned value does not include partial data.

---

### `app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts` (test, transform)

**Analog:** `app/composables/__tests__/useEntriesRuleOverlays.test.ts` plus current `useEntriesAdvancedFilters.ts` state separation.

**Composable instantiation pattern** (`useEntriesRuleOverlays.test.ts` lines 33-40):
```typescript
describe('useEntriesRuleOverlays metadata', () => {
  it('derives read-only per-cell formatting and validation metadata', () => {
    const entry = createEntry('entry-1')
    const overlay = useEntriesRuleOverlays({
      visibleEntries: computed(() => [entry]),
      buildRowContext: () => createContext({ definition: '缺少例句，需要檢查', headword: '測試詞' })
    })
```

**Apply to advanced-filter tests:** instantiate `useEntriesAdvancedFilters` with `computed(() => [entry])`, empty group computeds, `viewMode`, `editableColumns`, and a simple `getCellDisplay`. Assert imported state sets both input and applied refs, `hasActiveAdvancedFilters.value` becomes true, and no entry `_isDirty` mutation occurs.

**Read-only no-mutation assertion pattern** (`useEntriesRuleOverlays.test.ts` lines 58-72):
```typescript
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
```

**Apply to advanced-filter tests:** assert restore affects filter refs/computed filtering only and does not add metadata or dirty flags to entries.

---

### `app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts` (test, transform)

**Analog:** `app/composables/__tests__/useEntriesRuleOverlays.test.ts`.

**Local rule lifecycle pattern** (lines 172-194):
```typescript
it('supports local toggle, move, remove, clear, and empty metadata helpers', () => {
  const overlay = useEntriesRuleOverlays({
    visibleEntries: computed(() => []),
    buildRowContext: () => createContext()
  })

  overlay.draftRule.name = '第一條規則'
  overlay.draftRule.condition.formula = '=TRUE'
  expect(overlay.addRuleFromDraft()).toBe(true)
  overlay.draftRule.name = '第二條規則'
  overlay.draftRule.condition.formula = '=TRUE'
  expect(overlay.addRuleFromDraft()).toBe(true)

  const firstId = overlay.rules.value[0].id
  const secondId = overlay.rules.value[1].id
  overlay.toggleRule(firstId, false)
  expect(overlay.rules.value[0].enabled).toBe(false)
  overlay.moveRule(secondId, -1)
  expect(overlay.rules.value[0].id).toBe(secondId)
  overlay.removeRule(firstId)
  expect(overlay.rules.value.map(rule => rule.id)).toEqual([secondId])
  overlay.clearRules()
  expect(overlay.rules.value).toHaveLength(0)
```

**Apply to shared restore tests:** after `replaceRuleOverlayState`, assert order is preserved by array order, IDs are regenerated and usable with toggle/move/remove, and `clearRules()` still works.

**No mutation/API assertion pattern** (lines 157-170):
```typescript
overlay.draftRule.condition.formula = '=CONTAINS(definition, "檢查")'
expect(overlay.addRuleFromDraft()).toBe(true)
expect(overlay.rules.value).toHaveLength(1)
expect(overlay.rules.value[0]).toMatchObject({
  name: '新規則',
  kind: 'formatting',
  enabled: true,
  targetFields: ['definition']
})
expect(overlay.activeRuleCount.value).toBe(1)
overlay.updateRuleColor(overlay.rules.value[0].id, '#ef4444')
expect(overlay.rules.value[0].colorHex).toBe('#ef4444')
expect(Object.keys(overlay).some(key => /save|delete|bulk|fetch/i.test(key))).toBe(false)
```

**Apply to shared restore tests:** assert new export/replace methods do not expose save/delete/bulk/fetch operations.

---

### `app/components/entries/__tests__/EntriesShareViewPopover.test.ts` (test, event-driven)

**Analog:** `app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts`.

**Source-level component test pattern** (lines 0-7):
```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const componentPath = resolve(process.cwd(), 'app/components/entries/EntriesRuleOverlayPanel.vue')
const source = readFileSync(componentPath, 'utf8')

describe('EntriesRuleOverlayPanel', () => {
```

**Apply to share popover tests:** read `EntriesShareViewPopover.vue` source and assert exact UI-spec strings, `UPopover`, `UTooltip`, `UButton`, `UBadge`, `UAlert`, accessible labels, `aria-live`, and fallback URL preview are present.

**Presentational/no-mutation assertion pattern** (lines 8-30):
```typescript
it('defines local-only typed props, emits, and accessible trigger shell', () => {
  expect(source).toContain('defineProps')
  expect(source).toContain('defineEmits')
  expect(source).toContain('EntriesRuleDraft')
  expect(source).toContain('EntriesRuleOverlay')
  expect(source).toContain('EntriesRuleOverlayErrors')
  expect(source).toContain('update:expanded')
  expect(source).toContain('update:draftRule')
  expect(source).toContain('apply')
  expect(source).toContain('clear')
  expect(source).toContain('toggle-rule')
  expect(source).toContain('remove-rule')
  expect(source).toContain('move-rule')
  expect(source).toContain('update-rule-color')
  expect(source).toContain('aria-label="規則"')
  expect(source).toContain('aria-expanded')
  expect(source).toContain('aria-controls')
  expect(source).toContain('<Teleport')
})

it('keeps the component presentational and free from entry mutations', () => {
  expect(source).not.toMatch(/\$fetch|save|delete|review|bulk|col\.set|_isDirty/)
})
```

**Apply to share popover tests:** assert no `$fetch`, localStorage, `save`, `delete`, `review`, `bulk`, `col.set`, `_isDirty`, or direct route mutation in component source.

**UI affordance string assertion pattern** (lines 32-51):
```typescript
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
  expect(source).toMatch(/headword|dialect|phonetic|entryType|theme|definition|register|status/)
})
```

**Apply to share popover tests:** assert exact strings from `03-UI-SPEC.md`: `分享目前視圖`, `複製視圖連結`, `視圖連結已複製。`, `無法複製連結。請手動複製下方網址。`, `未有可分享設定`, `已套用分享視圖`, `清除分享參數`, and `分享格式版本：v`.

---

### `app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts` (test, request-response)

**Analog:** `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts`.

**Page source wiring test pattern** (lines 0-7):
```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')

describe('entries page rule overlay wiring', () => {
```

**Apply to shared page test:** read `app/pages/entries/index.vue` and assert imports, toolbar placement, route watcher wiring, clear-query behavior, and no mutation coupling.

**Toolbar and composable wiring assertion pattern** (lines 13-28):
```typescript
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
```

**Apply to shared page test:** assert `EntriesShareViewPopover`, `entriesSharedView`, `exportAdvancedFilterState`, `restoreAdvancedFilterState`, `exportRuleOverlayState`, `replaceRuleOverlayState`, `lastAppliedSharedView`, and `clearSharedViewQuery` are wired.

**No persistence/mutation coupling assertion pattern** (lines 38-42):
```typescript
it('passes per-cell overlay metadata without rule persistence or data mutation coupling', () => {
  expect(source).toContain(':cell-meta="isAdvancedFilterFieldKey(col.key) ? ruleOverlays.getCellOverlayMeta')
  expect(source).toContain('isAdvancedFilterFieldKey')
  expect(source).not.toMatch(/localStorage.*rule|\$fetch.*rule|save.*rule|delete.*rule|review.*rule|bulk.*rule/i)
})
```

**Apply to shared page test:** assert share restore does not call mutation APIs and does not include localStorage. Use targeted regexes such as `not.toMatch(/localStorage.*shared|\$fetch.*shared|save.*shared|delete.*shared|review.*shared|bulk.*shared/i)`.

## Shared Patterns

### Hong Kong Traditional Chinese UI and error copy

**Source:** `CLAUDE.md` lines 4-18 and `03-UI-SPEC.md` lines 92-116.

**Apply to:** `entriesSharedView.ts`, `EntriesShareViewPopover.vue`, entries page feedback, all tests.

```markdown
**All Chinese text in this project must use Hong Kong Traditional Chinese (香港繁體).**
```

```markdown
| Primary CTA | 複製視圖連結 |
| Share trigger aria-label / tooltip | 分享目前視圖 |
| Copy success | 視圖連結已複製。 |
| Copy failure | 無法複製連結。請手動複製下方網址。 |
| Restored status badge | 已套用分享視圖 |
| Error state | 分享視圖無法套用：{reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。 |
| Clear shared-view action | 清除分享參數 |
| Version label | 分享格式版本：v{version} |
```

### Local-only read-only Excel-tool state

**Source:** `EntriesAdvancedFilterPanel.vue` lines 125-132 and `EntriesRuleOverlayPanel.vue` lines 28-32.

**Apply to:** share popover copy, restore behavior, tests.

```vue
<div
  id="advanced-filter-helpers"
  class="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1"
>
  <p>可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status</p>
  <p>支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH</p>
  <p id="advanced-filter-readonly-helper">進階篩選只影響目前已載入的詞條，不會修改資料。</p>
</div>
```

```vue
<div class="flex items-center justify-between gap-3 flex-wrap">
  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">新增規則</h3>
  <p id="entries-rule-readonly-helper" class="text-xs text-gray-500 dark:text-gray-400">
    此規則只會標示目前已載入的詞條，不會修改資料。
  </p>
</div>
```

### Inline alert/accessibility pattern

**Source:** `EntriesAdvancedFilterPanel.vue` lines 42-49 and `EntriesRuleOverlayPanel.vue` lines 147-154.

**Apply to:** invalid shared payload alert and copy feedback.

```vue
<p
  v-if="formulaError"
  id="advanced-formula-error"
  role="alert"
  class="text-sm text-red-600 dark:text-red-400"
>
  公式無法套用：{{ formulaError }} 請檢查公式語法、欄位名稱或函數參數。
</p>
```

```vue
<span
  v-if="errors.formula"
  id="entries-rule-formula-error"
  role="alert"
  class="text-sm font-normal text-red-600 dark:text-red-400"
>
  {{ errors.formula.message }}
</span>
```

### Route/query changes must not refetch unless server-backed filters changed

**Source:** `app/pages/entries/index.vue` lines 2493-2540.

**Apply to:** shared `view` query restore and clear action.

```typescript
function applyUrlParams(): boolean {
  const query = route.query
  let changed = false

  const newSearch = typeof query.search === 'string' ? query.search : ''
  if (newSearch !== searchQuery.value) {
    searchQuery.value = newSearch
    changed = true
  }

  const shouldFilterMine = query.filter === 'mine' && user.value?.id
  const newCreatedBy = shouldFilterMine ? user.value.id : undefined
  if (newCreatedBy !== filters.createdBy) {
    filters.createdBy = newCreatedBy
    changed = true
  }

  return changed
}
```

```typescript
watch(
  () => route.query,
  () => {
    if (isInitializing.value) return
    const changed = applyUrlParams()
    if (changed) {
      currentPage.value = 1
      fetchEntries()
    }
  },
  { deep: true }
)
```

### Source-level wiring tests

**Source:** `EntriesPageRuleOverlayWiring.test.ts` lines 0-6 and 38-42.

**Apply to:** new entries page shared-view wiring test and share popover component test.

```typescript
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')
```

```typescript
expect(source).toContain(':cell-meta="isAdvancedFilterFieldKey(col.key) ? ruleOverlays.getCellOverlayMeta')
expect(source).toContain('isAdvancedFilterFieldKey')
expect(source).not.toMatch(/localStorage.*rule|\$fetch.*rule|save.*rule|delete.*rule|review.*rule|bulk.*rule/i)
```

## No Analog Found

No file is completely without an analog. The only partial gap is `app/utils/entriesSharedView.ts`: the codebase has strong local utility and validation patterns, but no existing frontend versioned URL-share serializer. Planner should combine `entriesAdvancedFilter.ts` local utility conventions with the Zod `safeParse` pattern and UI spec requirements.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All planned files have at least a role-match analog. |

## Metadata

**Analog search scope:** `app/utils`, `app/composables`, `app/components/entries`, `app/pages/entries`, `app/**/__tests__`, `server/api` for Zod validation style.
**Files scanned:** 51 relevant frontend files plus targeted server validation search.
**Pattern extraction date:** 2026-05-04
