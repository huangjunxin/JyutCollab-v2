# Phase 02: Conditional Formatting and Validation UI - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 5 proposed new/modified files
**Analogs found:** 5 / 5

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/composables/useEntriesRuleOverlays.ts` | composable | transform | `app/composables/useEntriesAdvancedFilters.ts` | exact |
| `app/components/entries/EntriesRuleOverlayPanel.vue` | component | event-driven | `app/components/entries/EntriesAdvancedFilterPanel.vue` | exact |
| `app/components/entries/EntriesEditableCell.vue` | component | event-driven | `app/components/entries/EntriesEditableCell.vue` | exact |
| `app/pages/entries/index.vue` | page/component | event-driven | `app/pages/entries/index.vue` | exact |
| `app/utils/entriesTableConstants.ts` | utility/config | transform | `app/utils/entriesTableConstants.ts` | exact |

## Pattern Assignments

### `app/composables/useEntriesRuleOverlays.ts` (composable, transform)

**Analog:** `app/composables/useEntriesAdvancedFilters.ts`

**Imports pattern** (lines 1-5):
```typescript
import type { ComputedRef, Ref } from 'vue'
import { computed, reactive, ref } from 'vue'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, parseAdvancedFormula, testAdvancedRegex, type AdvancedFilterError, type AdvancedFilterFieldKey, type RowFilterContext } from '~/utils/entriesAdvancedFilter'
```
**Apply:** Copy the Composition API + project alias import style. Import `AdvancedFilterFieldKey`, `RowFilterContext`, `compileAdvancedRegex`, `testAdvancedRegex`, `parseAdvancedFormula`/`evaluateAdvancedFormula` or parsed-AST helpers from Phase 1 utilities. Import `getEntryIdString` from `~/utils/entryKey` for metadata map keys.

**Argument-shape pattern** (lines 22-29):
```typescript
export function useEntriesAdvancedFilters(args: {
  entries: Ref<Entry[]> | ComputedRef<Entry[]>
  aggregatedGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  lexemeGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>
  viewMode: ViewModeRef
  editableColumns: ComputedRef<EditableColumnDef[]>
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
}) {
```
**Apply:** `useEntriesRuleOverlays` should receive explicit reactive inputs rather than reaching into page globals. Recommended args: visible/current entries or `tableRows`/`currentPageEntries`, `editableColumns`, `getCellDisplay`, and reusable `buildRowContext` from `useEntriesAdvancedFilters` if available. Keep overlays client-side and read-only.

**Row context builder pattern** (lines 41-59):
```typescript
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
**Apply:** Do not infer arbitrary `Entry` paths for rule evaluation. Evaluate rules against the same display-value row context as advanced filtering, then apply metadata only to `targetFields`.

**Safe formula/regex evaluation pattern** (lines 71-102):
```typescript
function matchEntry(entry: Entry): boolean {
  const context = buildRowContext(entry)

  if (hasAppliedFormula.value) {
    const result = evaluateAdvancedFormula(appliedFormula.value, context)
    if (!result.ok) {
      advancedFilterErrors.formula = result.error
    } else if (!result.value) {
      return false
    }
  }

  if (hasAppliedGlobalRegex.value) {
    const compiled = compileAdvancedRegex(appliedGlobalRegex.value, globalRegexFlags.value)
    if (!compiled.ok) {
      advancedFilterErrors.globalRegex = compiled.error
    } else if (!testAdvancedRegex(compiled.regex, buildSearchableRowText(context))) {
      return false
    }
  }

  if (hasAppliedColumnRegex.value && appliedColumnRegex.field) {
    const compiled = compileAdvancedRegex(appliedColumnRegex.pattern, appliedColumnRegex.flags)
    if (!compiled.ok) {
      advancedFilterErrors.columnRegex = compiled.error
    } else if (!testAdvancedRegex(compiled.regex, context[appliedColumnRegex.field])) {
      return false
    }
  }

  return true
}
```
**Apply:** Overlay rule matching must fail closed: invalid formula/regex sets rule/form error and skips the rule; never throw through a computed render. For regex `field: 'any'`, use `buildSearchableRowText(context)`; otherwise use `context[field]`.

**Derived-data pattern** (lines 113-121):
```typescript
const filteredEntries = computed(() => hasActiveAdvancedFilters.value ? args.entries.value.filter(matchEntry) : args.entries.value)
const filteredAggregatedGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.aggregatedGroups.value, matchEntry) : args.aggregatedGroups.value)
const filteredLexemeGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.lexemeGroups.value, matchEntry) : args.lexemeGroups.value)
const visibleEntryCount = computed(() => {
  if (args.viewMode.value === 'flat') return filteredEntries.value.length
  const groups = args.viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
})
```
**Apply:** Compute `cellMetaByEntryKey` as a Vue `computed`, not in each cell component. Return a nested `Map<string, Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>>` keyed by `getEntryIdString(entry)`. Keep source `Entry` objects unmodified.

**Input validation/apply/clear pattern** (lines 123-199):
```typescript
function clearAdvancedFilterErrors() {
  advancedFilterErrors.formula = null
  advancedFilterErrors.globalRegex = null
  advancedFilterErrors.columnRegex = null
}

function validateAdvancedFilterInputs(): boolean {
  let valid = true

  if (formulaInput.value.trim().length > 0) {
    const parsed = parseAdvancedFormula(formulaInput.value)
    if (!parsed.ok) {
      advancedFilterErrors.formula = parsed.error
      valid = false
    } else {
      const preview = evaluateAdvancedFormula(formulaInput.value, createEmptyRowContext())
      if (!preview.ok && preview.error.code !== 'evaluation_error') {
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
```
**Apply:** New rule creation/update should validate draft input before adding/updating rules. Use Hong Kong Traditional Chinese for messages, e.g. `請輸入規則名稱。`, `請至少選擇一個目標欄位。`, `規則只會標示目前已載入的詞條，不會修改資料。`

**Return API pattern** (lines 201-226):
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
**Apply:** Return rule arrays, draft state, errors, counts, `cellMetaByEntryKey`, `getCellOverlayMeta(entry, field)`, `add/update/toggle/remove/moveRule`, and `clearRuleOverlayErrors`. Expose only local overlay mutations; do not expose save/delete/review/bulk actions.

---

### `app/components/entries/EntriesRuleOverlayPanel.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesAdvancedFilterPanel.vue`

**Button + active badge pattern** (lines 1-19):
```vue
<div class="inline-flex items-center gap-2 flex-wrap">
    <UButton
      size="sm"
      color="neutral"
      variant="soft"
      icon="i-heroicons-funnel"
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
**Apply:** Add a separate rules button/badge near the existing advanced-filter control. Use `aria-expanded`, `aria-controls`, `UBadge`, and HK Traditional labels such as `規則標示` and `已啟用 {{ activeRuleCount }} 條規則`.

**Teleport panel pattern** (lines 22-26):
```vue
<Teleport v-if="expanded && teleportTo && canTeleport" :to="teleportTo">
  <div
    id="entries-advanced-filter-panel"
    class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
  >
```
**Apply:** Reuse the same top-controls host pattern. Either share `#entries-advanced-filter-host` or create a renamed host; avoid page layout sprawl. Provide non-teleport fallback like this component does.

**Form control/error pattern** (lines 27-48):
```vue
<div class="flex flex-col gap-1">
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
</div>
```
**Apply:** Rule panel fields should use Nuxt UI inputs/selects and `role="alert"` for validation errors. Recommended fields: `規則名稱`, `規則類型` (`格式標示`/`驗證警告`), `條件類型` (`公式`/`正則`), `目標欄位`, style preset for formatting only.

**Select menu pattern** (lines 91-111):
```vue
<div class="flex flex-col gap-2 sm:flex-row">
  <USelectMenu
    :model-value="columnRegexField"
    :items="fieldOptions"
    value-key="value"
    size="sm"
    class="w-full sm:w-56"
    placeholder="選擇欄位"
    aria-label="欄位正則篩選"
    @update:model-value="emit('update:columnRegexField', String($event ?? ''))"
  />
  <UInput
    :model-value="columnRegexPattern"
    size="sm"
    class="w-full"
    placeholder="輸入此欄位的正則表達式"
    aria-label="欄位正則篩選"
    aria-describedby="advanced-column-regex-error advanced-filter-readonly-helper"
    @update:model-value="emit('update:columnRegexPattern', String($event ?? ''))"
    @keyup.enter="emit('apply')"
  />
</div>
```
**Apply:** Use `USelectMenu` with `fieldOptions` generated from `ADVANCED_FILTER_FIELD_LABELS`. For target fields, use multi-select if available in the project’s Nuxt UI setup; otherwise emit an array through checkbox/buttons while keeping field keys allowlisted.

**Read-only helper + actions pattern** (lines 124-150):
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
**Apply:** Include explicit read-only copy: `規則只會標示目前已載入的詞條，不會修改資料。` Add rule list buttons for `啟用`/`停用`, `上移`, `下移`, `移除`; these must emit local rule actions only.

**Props/emits pattern** (lines 287-315):
```typescript
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
**Apply:** Keep the panel presentational: receive `rules`, `draftRule`, `errors`, `fieldOptions`, counts, and emit typed events. Do not import `$fetch`, `Entry`, or mutation composables into the panel.

**Teleport safety pattern** (lines 317-325):
```typescript
const canTeleport = ref(false)
onMounted(() => {
  if (!props.teleportTo) return
  try {
    canTeleport.value = !!document.querySelector(props.teleportTo)
  } catch {
    canTeleport.value = false
  }
})
```
**Apply:** Copy this exactly if the rule panel teleports to the entries control host.

---

### `app/components/entries/EntriesEditableCell.vue` (component, event-driven)

**Analog:** `app/components/entries/EntriesEditableCell.vue`

**Outer `<td>` class-merge seam** (lines 1-8):
```vue
<td
  class="cell-td px-1 py-1 border-r border-gray-200 dark:border-gray-700 relative transition-[box-shadow]"
  :class="[
    isSelected && !isEditing && 'ring-2 ring-primary/60 ring-inset',
    wrap && 'cell-td-wrap',
    !canEdit && 'cursor-default'
  ]"
  :style="cellStyle"
```
**Apply:** Append overlay classes here, do not replace selection ring, wrap, or cursor classes. Validation border/ring should have visual precedence but must coexist with `isSelected` and dirty-row background.

**Display/edit separation pattern** (lines 11-12 and 118-120):
```vue
<!-- 編輯態 -->
<template v-if="isEditing">
```
```vue
<!-- 顯示態 -->
<template v-else>
  <div class="flex flex-col gap-0.5">
```
**Apply:** Render formatting/validation indicators in display mode only. Editing controls must keep their existing focus border and keyboard behavior.

**Theme display classes seam** (lines 128-141):
```vue
<UTooltip
  v-if="themePath"
  :text="themePath"
  :ui="{ content: 'max-w-xs' }"
>
  <div
    class="flex-1 px-2 py-1 text-sm min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors overflow-hidden"
    :class="[
      cellClass,
      wrap ? 'cell-display-wrap whitespace-pre-wrap break-words line-clamp-4' : 'truncate'
    ]"
  >
    {{ displayText }}
  </div>
</UTooltip>
```
**Apply:** Merge `cellMeta.classNames` with existing `cellClass` and wrap classes for theme cells. If both theme path and overlay tooltip exist, combine text or add a separate icon; do not drop the theme path tooltip.

**Plain display classes seam** (lines 150-160):
```vue
<div
  v-else
  class="flex-1 px-2 py-1 text-sm min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
  :class="[
    cellClass,
    wrap ? 'cell-display-wrap whitespace-pre-wrap break-words line-clamp-4' : 'truncate'
  ]"
>
  {{ displayText }}
</div>
```
**Apply:** This is the main place to add formatting highlight backgrounds. Keep hover and wrap behavior unchanged. Do not evaluate rules in this component; it should only render the passed `cellMeta` prop.

**Icon/tooltip pattern** (lines 162-172):
```vue
<div class="flex items-center gap-1 flex-shrink-0" @click.stop>
  <UTooltip
    v-if="reviewNotes"
    :text="reviewNotes"
    :ui="{ content: 'max-w-xs whitespace-pre-wrap' }"
  >
    <UIcon
      name="i-heroicons-information-circle"
      class="w-4 h-4 text-amber-500 cursor-help flex-shrink-0"
    />
  </UTooltip>
```
**Apply:** Add validation warning indicator next to existing review-note and AI buttons, not over them. Recommended visual: `i-heroicons-exclamation-triangle`, `aria-label="驗證警告"`, tooltip text listing rule names. Conditional formatting rule names can use a tooltip/title or subtle badge; validation must use non-color cue.

**Props/defaults extension seam** (lines 265-317):
```typescript
const props = withDefaults(
  defineProps<{
    col: { key: string; type: string; width?: string }
    /** 是否可編輯此詞條（貢獻者僅自己創建的可編輯） */
    canEdit?: boolean
    isEditing: boolean
    editValue: any
    displayText: string
    cellClass: string
    wrap: boolean
    isSelected: boolean
    columnOptions?: { value: string; label: string }[]
    reviewNotes?: string
    showAiDefinition?: boolean
    showAiTheme?: boolean
    aiLoadingDefinition?: boolean
    /** 行內釋義建議正在加載（輸入粵拼時後台拉取） */
    aiLoadingInlineDefinition?: boolean
    aiLoadingTheme?: boolean
    showExpand?: boolean
    isExpanded?: boolean
    expandHint?: string
    /** 詞頭展開狀態 */
    isHeadwordExpanded?: boolean
    /** 詞頭展開提示文字 */
    headwordExpandHint?: string
    /** 粵拼多讀音提示文字（例如「3 其他讀音」） */
    phoneticHint?: string
    /** 主題 ID，用於顯示 tooltip 路徑 */
    themeId?: number
    /** 主題展開狀態 */
    isThemeExpanded?: boolean
    /** 主題 AI 建議提示文字 */
    themeExpandHint?: string
  }>(),
```
**Apply:** Add optional typed `cellMeta` prop with a default empty object/factory. Keep existing emitted events unchanged. Suggested minimal prop type can be local/imported: `{ formattingMatches: Array<{ ruleName: string; stylePreset?: string }>; validationMatches: Array<{ ruleName: string }>; classNames: string[]; tooltipText?: string }`.

---

### `app/pages/entries/index.vue` (page/component, event-driven)

**Analog:** `app/pages/entries/index.vue`

**Advanced filter panel integration seam** (lines 126-143):
```vue
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
```
**Apply:** Mount `EntriesRuleOverlayPanel` beside this existing control with the same host/field options. Wire to `ruleOverlays` returned refs and methods. Do not route rule actions into entry mutation handlers.

**Host seam** (line 181):
```vue
<div id="entries-advanced-filter-host" class="w-full" />
```
**Apply:** Reuse this host or add a sibling host for rule overlays. Avoid adding a large inline panel directly inside the already dense toolbar.

**Cell prop integration seam** (lines 422-456):
```vue
<EntriesEditableCell
  v-for="(col, colIndex) in editableColumns"
  :key="`${getEntryKey(row.entry)}-${col.key}`"
  :col="col"
  :can-edit="canEditEntry(row.entry)"
  :is-editing="isEditing(getEntryKey(row.entry), col.key)"
  v-model:edit-value="editValue"
  :display-text="getCellDisplay(row.entry, col)"
  :cell-class="getCellClass(row.entry, col.key).join(' ')"
  :wrap="useWrapForField(col.key)"
  :is-selected="isSelected(rowIndex, colIndex)"
  :column-options="getColumnOptions(col)"
  :review-notes="col.key === 'status' && row.entry.status === 'rejected' ? row.entry.reviewNotes : undefined"
  :show-ai-definition="col.key === 'definition' && !!row.entry.headword?.display && !row.entry.senses?.[0]?.definition"
  :show-ai-theme="col.key === 'theme' && !!row.entry.headword?.display && !row.entry.theme?.level3Id"
  :ai-loading-definition="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'definition') || (!!aiLoadingInlineFor && aiLoadingInlineFor.field === 'definition' && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
  :ai-loading-theme="(aiLoadingFor?.entryKey === getEntryKey(row.entry) && aiLoadingFor?.action === 'theme') || (!!aiLoadingInlineFor && getEntryIdString(row.entry) === aiLoadingInlineFor.entryId)"
  :show-expand="col.key === 'definition'"
  :is-expanded="expandedEntryId === getEntryIdString(row.entry)"
  :expand-hint="col.key === 'definition' ? getDefinitionExpandHint(row.entry) : undefined"
  :headword-expand-hint="col.key === 'headword' ? getHeadwordExpandHint(row.entry) : undefined"
  :phonetic-hint="col.key === 'phonetic' ? getPhoneticHint(row.entry) : undefined"
  :theme-id="col.key === 'theme' ? row.entry.theme?.level3Id : undefined"
  :is-theme-expanded="expandedThemeEntryId === getEntryIdString(row.entry)"
```
**Apply:** Add only `:cell-meta="ruleOverlays.getCellOverlayMeta(row.entry, col.key)"` (or equivalent) to this existing component call. Do not replace `:cell-class`, selection, AI, expand, or review props.

**Imports seam** (lines 864-897):
```typescript
import { useAuth, useProfileUpdatedUser } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS, ADVANCED_FILTER_FIELD_LABELS } from '~/utils/entriesTableConstants'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import { useEntriesTableColumns } from '~/composables/useEntriesTableColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { deepCopy, getEntryIdKey, makeBaselineSnapshot, useEntryBaseline } from '~/composables/useEntryBaseline'
import { ensureSensesStructure, addSense, removeSense, addExample, removeExample, addSubSense, addSubSenseExample, removeSubSenseExample } from '~/composables/useEntrySenses'
import { useEntriesList } from '~/composables/useEntriesList'
import { useEntriesAdvancedFilters } from '~/composables/useEntriesAdvancedFilters'
```
**Apply:** Add `useEntriesRuleOverlays` with composable imports and `EntriesRuleOverlayPanel` with component imports near the Phase 1 filter imports. Continue using `ADVANCED_FILTER_FIELD_LABELS` for field options.

**Field options pattern** (lines 1093-1095):
```typescript
const advancedFilterFieldOptions = computed(() =>
  Object.entries(ADVANCED_FILTER_FIELD_LABELS).map(([value, label]) => ({ value, label: `${label} (${value})` }))
)
```
**Apply:** Reuse this for rule target-field choices. Do not create another field label source.

**Advanced filter instantiation seam** (lines 1301-1321):
```typescript
const tableEdit = useEntriesTableEdit(editableColumns, dialectCodeToName)
const getCellDisplay = tableEdit.getCellDisplay as (entry: Entry, col: { key: string; type: string; get: (e: Entry) => unknown }) => string
const getCellClass = tableEdit.getCellClass
const getColumnOptions = tableEdit.getColumnOptions as (col: { getOptions?: () => unknown[]; options?: unknown[] }) => Array<{ value: string; label: string }>
const resizeTextarea = tableEdit.resizeTextarea

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
**Apply:** Instantiate `ruleOverlays` after `advancedFilters` so it can reuse `advancedFilters.buildRowContext`, and after `currentPageEntries`/`visibleEntryRows` if it needs visible rows. Avoid filtering `filteredEntries`; overlays must not change row lists.

**Visible rows/current page seam** (lines 1340-1362):
```typescript
/** 表格行：平鋪時為 entry 行，聚合時為 group 行 + 展開的 entry 行（entry 帶 entryIndexInGroup 用於組內序號） */
type TableRow = { type: 'group'; group: { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }; groupIndex: number } | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
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
const visibleEntryRows = computed(() => tableRows.value.filter((row): row is Extract<TableRow, { type: 'entry' }> => row.type === 'entry'))
const visibleKeyboardEntries = computed(() => visibleEntryRows.value.map(row => row.entry))

/** 當前頁用於多選/未保存檢測的條目列表（平鋪=entries，聚合=displayGroups 內所有 entries + 新建） */
const currentPageEntries = computed(() => {
  if (viewMode.value === 'flat') return filteredEntries.value
  return displayGroups.value.flatMap(g => g.entries)
})
```
**Apply:** For cell-level overlays that should reflect rendered table cells, prefer `visibleEntryRows.value.map(row => row.entry)`; for overall rule counts across loaded/current page, use `currentPageEntries`. Keep row grouping and expansion semantics intact.

**Mutation safety seam** (lines 1801-1813):
```typescript
function saveCellEdit(options?: { focusWrapper?: boolean }) {
  if (!editingCell.value) return

  const { entryId, field } = editingCell.value
  const entry = currentPageEntries.value.find(e => String(e.id ?? (e as any)._tempId) === String(entryId))
  const col = editableColumns.value.find(c => c.key === field)

  if (entry && col) {
    const oldValue = col.get(entry)
    if (oldValue !== editValue.value) {
      ;(col.set as (e: Entry, v: string | number | undefined) => void)(entry, editValue.value)
      entry._isDirty = true
    }
  }
```
**Apply:** Overlay code must never call `col.set` or assign `_isDirty`; it should read `getCellDisplay`/row contexts only.

**LocalStorage dirty watcher seam** (lines 2407-2441):
```typescript
// 監聽 entries / 聚合 groups 變化，即時保存到本地儲存
watch(
  [() => entries.value, () => aggregatedGroups.value, () => lexemeGroups.value],
  () => {
    // 收集所有需要保存嘅詞條（新建或已修改）
    const allEntries: Entry[] = []
    
    // 從 entries 中收集
    entries.value.forEach(e => {
      if ((e as any)._isNew || e._isDirty) {
        allEntries.push(e)
      }
    })
```
**Apply:** Do not add overlay state to this watcher or to entries/groups. Overlays must not be persisted as entry drafts in Phase 2.

---

### `app/utils/entriesTableConstants.ts` (utility/config, transform)

**Analog:** `app/utils/entriesTableConstants.ts`

**Shared field allowlist pattern** (lines 8-20):
```typescript
/** 進階篩選可引用的欄位鍵 */
export const ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const

export const ADVANCED_FILTER_FIELD_LABELS: Record<(typeof ADVANCED_FILTER_FIELDS)[number], string> = {
  headword: '詞頭',
  dialect: '方言',
  phonetic: '粵拼',
  entryType: '類型',
  theme: '分類',
  definition: '釋義',
  register: '語域',
  status: '狀態'
}
```
**Apply:** Reuse this allowlist for rule condition fields and target fields. If adding overlay constants (style presets/class maps), export them here or in the new composable only if they are table-specific. Keep labels in Hong Kong Traditional Chinese.

**Existing label constants pattern** (lines 26-39):
```typescript
/** 狀態值 → 中文標籤（用於表格顯示） */
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_review: '待審核',
  approved: '已發佈',
  rejected: '已拒絕'
}

/** 詞條類型 → 中文標籤 */
export const ENTRY_TYPE_LABELS: Record<string, string> = {
  character: '字',
  word: '詞',
  phrase: '短語'
}
```
**Apply:** Use simple `as const` arrays / `Record` maps for any new preset labels. Do not introduce runtime dependencies for static table labels.

## Shared Patterns

### Safe Formula and Regex Evaluation
**Source:** `app/utils/entriesAdvancedFilter.ts`
**Apply to:** `app/composables/useEntriesRuleOverlays.ts`, `app/components/entries/EntriesRuleOverlayPanel.vue`
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
**Lines:** `app/utils/entriesAdvancedFilter.ts` lines 79-96.

```typescript
export function evaluateAdvancedFormula(input: string, context: RowFilterContext): FormulaEvaluationResult {
  const parsed = parseAdvancedFormula(input)
  if (!parsed.ok) return parsed
  return evaluateAdvancedFormulaAst(parsed.ast, context)
}

export function buildSearchableRowText(context: RowFilterContext): string {
  return ADVANCED_FILTER_FIELDS.map(key => context[key] || '').join(' ')
}
```
**Lines:** `app/utils/entriesAdvancedFilter.ts` lines 399-407.

### Stable Entry Keys for Metadata Maps
**Source:** `app/utils/entryKey.ts`
**Apply to:** `app/composables/useEntriesRuleOverlays.ts`, `app/pages/entries/index.vue`
```typescript
/**
 * 取得詞條的唯一標識：已保存用 id，新建用 _tempId。
 */
export function getEntryKey(entry: Entry | Record<string, unknown>): string | number {
  const e = entry as { id?: string; _tempId?: string }
  return e?.id ?? e?._tempId ?? ''
}

/**
 * 取得詞條標識的字串形式，供 template 與 Map/Set 鍵使用。
 */
export function getEntryIdString(entry: Entry | Record<string, unknown>): string {
  return String(getEntryKey(entry))
}
```
**Lines:** `app/utils/entryKey.ts` lines 2-15.

### Cell Display Values and Status Classes
**Source:** `app/composables/useEntriesTableEdit.ts`
**Apply to:** `app/composables/useEntriesRuleOverlays.ts`, `app/pages/entries/index.vue`, `app/components/entries/EntriesEditableCell.vue`
```typescript
function getCellDisplay(entry: Entry, col: EditableColumnDef): string {
  const value = col.get(entry) as string | number | undefined
  if (col.key === 'headword') {
    const main = entry.headword?.display || entry.text || value
    return String(main ?? '-')
  }
  if (col.key === 'phonetic') {
    const arr = entry.phonetic?.jyutping
    if (Array.isArray(arr) && arr.length > 0) {
      const hasSpaceInside = arr.some(s => (s || '').includes(' '))
      if (!hasSpaceInside) return arr.join(' ')
      return arr[0] || '-'
    }
    return entry.phoneticNotation || (value as string) || '-'
  }
  if (col.type === 'theme') {
    if (!value) return '選擇分類'
    return getThemeNameById(value as number) || '選擇分類'
  }
```
**Lines:** `app/composables/useEntriesTableEdit.ts` lines 25-43.

```typescript
function getCellClass(entry: Entry, field: string) {
  const classes: string[] = []
  if (field === 'status') {
    const statusColors: Record<string, string> = {
      draft: 'text-gray-500',
      pending_review: 'text-yellow-600',
      approved: 'text-green-600',
      rejected: 'text-red-600'
    }
    classes.push(statusColors[entry.status || ''] || '')
  }
  return classes
}
```
**Lines:** `app/composables/useEntriesTableEdit.ts` lines 54-66.

### Editable Column Field Contract and Mutation Boundary
**Source:** `app/composables/useEntriesTableColumns.ts`
**Apply to:** `app/composables/useEntriesRuleOverlays.ts`, `app/pages/entries/index.vue`
```typescript
export interface EditableColumnDef {
  key: string
  label: string
  width: string
  type: string
  get: (entry: Entry) => unknown
  set: (entry: Entry, value: any) => void
  options?: Array<{ value: string | number; label: string }>
  getOptions?: () => Array<{ value: string | number; label: string }>
}
```
**Lines:** `app/composables/useEntriesTableColumns.ts` lines 5-14.

**Rule:** Overlay code may use `key`, `label`, `type`, `get`, and `getOptions` for display/options, but must not call `set`.

### Nuxt UI Tooltip/Icon for Non-Color Warning Cues
**Source:** `app/components/entries/EntriesEditableCell.vue`
**Apply to:** `app/components/entries/EntriesEditableCell.vue`
```vue
<UTooltip
  v-if="reviewNotes"
  :text="reviewNotes"
  :ui="{ content: 'max-w-xs whitespace-pre-wrap' }"
>
  <UIcon
    name="i-heroicons-information-circle"
    class="w-4 h-4 text-amber-500 cursor-help flex-shrink-0"
  />
</UTooltip>
```
**Lines:** `app/components/entries/EntriesEditableCell.vue` lines 163-172.

**Rule:** Validation warnings should follow this tooltip/icon pattern with `i-heroicons-exclamation-triangle` and explicit text (`驗證警告：{ruleName}`), not color alone.

### Read-Only Overlay Boundary Against Bulk and Save Actions
**Source:** `app/composables/useEntriesSelection.ts`
**Apply to:** `app/composables/useEntriesRuleOverlays.ts`, `app/components/entries/EntriesRuleOverlayPanel.vue`, `app/pages/entries/index.vue`
```typescript
async function batchDeleteSelected() {
  const toDelete = selectedSavedEntries.value
  if (toDelete.length === 0) return
  if (!confirm(`確定要刪除所選的 ${toDelete.length} 條詞條嗎？此操作不可撤銷。`)) return
  batchDeleting.value = true
  try {
    for (const entry of toDelete) {
      await $fetch<unknown>(`/api/entries/${entry.id}`, { method: 'DELETE' })
      selectedEntryIds.value = new Set([...selectedEntryIds.value].filter((id) => id !== String(entry.id)))
    }
    await fetchEntries()
    clearSelection()
  } catch (error: any) {
    console.error('Batch delete failed:', error)
    alert(error?.data?.message || '批量刪除失敗')
  } finally {
    batchDeleting.value = false
  }
}
```
**Lines:** `app/composables/useEntriesSelection.ts` lines 54-72.

**Rule:** New overlay files must not import or call this. Do not add “select matches,” “delete matches,” or “fix matches” actions in Phase 2.

## Integration Seams

| Seam | Source Lines | Required Change | Safety Note |
|------|--------------|-----------------|-------------|
| Top toolbar panel | `app/pages/entries/index.vue` lines 126-143 | Add `EntriesRuleOverlayPanel` beside `EntriesAdvancedFilterPanel` | Emit only local overlay actions |
| Teleport host | `app/pages/entries/index.vue` line 181 | Reuse or add host for rule panel | Keep layout stable |
| Field options | `app/pages/entries/index.vue` lines 1093-1095 | Reuse `advancedFilterFieldOptions` for rule targets | No duplicate field allowlist |
| Overlay composable setup | `app/pages/entries/index.vue` lines 1307-1321 and 1342-1362 | Instantiate `useEntriesRuleOverlays` using `advancedFilters.buildRowContext` and visible/current entries | Do not change `filteredEntries`/groups |
| Cell render loop | `app/pages/entries/index.vue` lines 422-456 | Add `:cell-meta` prop | Do not replace existing props/events |
| Cell display classes | `app/components/entries/EntriesEditableCell.vue` lines 133-158 | Merge overlay classes into display element classes | Preserve selection/editing/AI/review behavior |
| Cell indicator area | `app/components/entries/EntriesEditableCell.vue` lines 162-205 | Add validation/formatting indicator tooltip | Do not obscure review icon or AI buttons |
| Dirty draft persistence | `app/pages/entries/index.vue` lines 2407-2441 | Leave watcher unchanged | Overlay state must not mark entries dirty |

## No Analog Found

No proposed Phase 02 file lacks a close analog. The exact Phase 1 advanced-filter files were present in the root project source at `/Users/trenton/Projects/JyutCollab-v2/app/...`; the current worktree source at `/Users/trenton/Projects/JyutCollab-v2/.claude/worktrees/agent-aa6d16b41b08e42ea/app/...` did not yet contain those Phase 1 files. Planner should use the root project Phase 1 analogs referenced above.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| — | — | — | All proposed files map to exact or same-file analogs. |

## Metadata

**Analog search scope:** `/Users/trenton/Projects/JyutCollab-v2/.claude/worktrees/agent-aa6d16b41b08e42ea/app`, `/Users/trenton/Projects/JyutCollab-v2/app`
**Files scanned:** 17 source/planning files inspected or located
**Primary analogs read:** 9 source files
**Pattern extraction date:** 2026-05-04
