---
phase: 01
plan: 02
name: advanced-filter-composable-and-derived-table-flow
type: execute
wave: 2
depends_on:
  - 01
files_modified:
  - app/composables/useEntriesAdvancedFilters.ts
  - app/pages/entries/index.vue
autonomous: true
requirements:
  - FORM-01
  - FORM-02
  - FORM-04
  - REGX-01
  - REGX-02
  - REGX-03
  - REGX-04
---

<objective>
Add the Vue composable and entries-table derived state wiring that applies valid formula/global-regex/column-regex filters to the currently loaded rows while preserving existing server-backed search, filters, grouping, pagination, editing, AI suggestions, selection, dirty-state, and draft persistence when advanced filters are inactive.
</objective>

<truths>
- D-05: Public field keys are headword, dialect, phonetic, entryType, theme, definition, register, and status.
- D-06: Row matching uses normalized display values derived from `EditableColumnDef.get(entry)` and existing table display behavior.
- D-07: Row context adapter must not mutate Entry objects or call column setters.
- D-09: Regex support is client-side over currently loaded entries/group data and does not change backend query API.
- D-10: Global regex search is distinct from normal search semantics.
- D-11: Single-column regex evaluates against that column's normalized display value.
- D-13: Advanced filtering is a derived layer over `entries`, `aggregatedGroups`, and `lexemeGroups` returned by `useEntriesList`.
- D-14: Existing plain search, filters, sorting, pagination, and group mode requests continue through `useEntriesList`.
- D-15: Derived results remain compatible with selection, AI suggestion, editing, dirty-state, and row rendering.
- D-16: With no advanced filter active, rendered table is functionally identical to the current table.
- D-17: Invalid formulas/regex fail closed for the advanced rule only and do not clear existing data, crash, or refetch.
</truths>

<threat_model>
| Threat | Severity | Mitigation |
|--------|----------|------------|
| Advanced filters alter server-backed search/query semantics | high | Do not modify `useEntriesList.ts`; do not add formula/regex state to `/api/entries` query objects or cache keys. Wire filtering only after `useEntriesList` returns data. |
| Derived filtering hides dirty rows from localStorage persistence | high | Keep the existing localStorage watch on source `entries`, `aggregatedGroups`, and `lexemeGroups`; do not replace that watch with filtered collections. |
| Filtered entries are cloned and break editing/saving identity | high | Filter arrays must preserve original `Entry` object references. Only group wrapper objects may be shallow-cloned to replace `entries` arrays. |
| Invalid formulas/regex crash Vue computed render paths | medium | `useEntriesAdvancedFilters` exposes typed error state and catches evaluator failures; invalid rules are skipped and source data remains visible. |
| Keyboard navigation targets hidden rows after filtering | medium | Update table keyboard navigation to use filtered visible entry rows rather than raw `entries.value`. |
</threat_model>

<must_haves>
- `useEntriesAdvancedFilters` owns advanced filter state and returns filtered flat entries, filtered aggregated groups, filtered lexeme groups, active/error flags, visible/loaded counts, and apply/clear actions.
- `app/pages/entries/index.vue` keeps `useEntriesList` unchanged as API/data owner.
- When advanced filters are inactive, filtered arrays return source arrays by reference.
- `displayGroups`, `tableRows`, and `currentPageEntries` derive from advanced-filtered data.
- Existing draft localStorage watch remains source-based on `entries`, `aggregatedGroups`, and `lexemeGroups`.
- Invalid formula/regex errors do not call `fetchEntries`, do not clear source data, and do not mutate server filters/search state.
</must_haves>

<tasks>
  <task id="02.1" type="implementation">
    <title>Create advanced filter composable state and row context builder</title>
    <read_first>
      - app/composables/useEntriesSelection.ts
      - app/composables/useEntriesList.ts
      - app/composables/useEntriesTableColumns.ts
      - app/composables/useEntriesTableEdit.ts
      - app/utils/entriesAdvancedFilter.ts
      - app/utils/entriesTableConstants.ts
      - app/types/index.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/composables/useEntriesAdvancedFilters.ts
    </files>
    <action>
      Create `app/composables/useEntriesAdvancedFilters.ts` using `<script>`-free composable style with imports:

      ```ts
      import type { ComputedRef, Ref } from 'vue'
      import { computed, reactive, ref } from 'vue'
      import type { Entry } from '~/types'
      import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'
      import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
      import { buildSearchableRowText, compileAdvancedRegex, evaluateAdvancedFormula, testAdvancedRegex, type AdvancedFilterError, type AdvancedFilterFieldKey, type RowFilterContext } from '~/utils/entriesAdvancedFilter'
      ```

      Define:
      - `type EntryGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }`
      - `type ViewModeRef = Ref<string> | ComputedRef<string>`
      - `interface AdvancedFilterColumnRegexState { field: AdvancedFilterFieldKey | ''; pattern: string; flags: string }`
      - `interface AdvancedFilterErrors { formula: AdvancedFilterError | null; globalRegex: AdvancedFilterError | null; columnRegex: AdvancedFilterError | null }`
      - `export function useEntriesAdvancedFilters(args: { entries: Ref<Entry[]> | ComputedRef<Entry[]>; aggregatedGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>; lexemeGroups: Ref<EntryGroup[]> | ComputedRef<EntryGroup[]>; viewMode: ViewModeRef; editableColumns: ComputedRef<EditableColumnDef[]>; getCellDisplay: (entry: Entry, col: EditableColumnDef) => string })`

      Inside the composable, add refs/reactive state:
      - `advancedFilterExpanded = ref(false)`
      - `formulaInput = ref('')`
      - `appliedFormula = ref('')`
      - `globalRegexEnabled = ref(false)`
      - `globalRegexInput = ref('')`
      - `appliedGlobalRegex = ref('')`
      - `globalRegexFlags = ref('i')`
      - `columnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })`
      - `appliedColumnRegex = reactive<AdvancedFilterColumnRegexState>({ field: '', pattern: '', flags: 'i' })`
      - `advancedFilterErrors = reactive<AdvancedFilterErrors>({ formula: null, globalRegex: null, columnRegex: null })`

      Implement `buildRowContext(entry: Entry): RowFilterContext` by initializing every `ADVANCED_FILTER_FIELDS` key to `''`, iterating `args.editableColumns.value`, skipping columns not in `ADVANCED_FILTER_FIELDS`, and setting each context key from `args.getCellDisplay(entry, col).trim()`. Never call `col.set`.
    </action>
    <acceptance_criteria>
      - `app/composables/useEntriesAdvancedFilters.ts` contains `export function useEntriesAdvancedFilters`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `formulaInput`, `globalRegexEnabled`, `columnRegex`, `appliedFormula`, `appliedGlobalRegex`, and `advancedFilterErrors`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `function buildRowContext(entry: Entry): RowFilterContext`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `ADVANCED_FILTER_FIELDS` and `args.getCellDisplay(entry, col).trim()`.
      - `grep -R "\.set(.*entry\|col\.set\|set(entry" app/composables/useEntriesAdvancedFilters.ts` exits non-zero.
    </acceptance_criteria>
  </task>

  <task id="02.2" type="implementation">
    <title>Implement derived matching and filtered collections</title>
    <read_first>
      - app/composables/useEntriesAdvancedFilters.ts
      - app/utils/entriesAdvancedFilter.ts
      - app/pages/entries/index.vue
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md
    </read_first>
    <files>
      - app/composables/useEntriesAdvancedFilters.ts
    </files>
    <action>
      Extend `useEntriesAdvancedFilters` with computed filter activity, validation, matching, and derived arrays.

      Add computed values:
      - `hasAppliedFormula = computed(() => appliedFormula.value.trim().length > 0)`
      - `hasAppliedGlobalRegex = computed(() => globalRegexEnabled.value && appliedGlobalRegex.value.trim().length > 0)`
      - `hasAppliedColumnRegex = computed(() => !!appliedColumnRegex.field && appliedColumnRegex.pattern.trim().length > 0)`
      - `hasActiveAdvancedFilters = computed(() => hasAppliedFormula.value || hasAppliedGlobalRegex.value || hasAppliedColumnRegex.value)`
      - `loadedEntryCount = computed(() => args.viewMode.value === 'flat' ? args.entries.value.length : (args.viewMode.value === 'lexeme' ? args.lexemeGroups.value : args.aggregatedGroups.value).reduce((sum, group) => sum + group.entries.length, 0))`

      Implement `matchEntry(entry: Entry): boolean`:
      - Build context once.
      - If `hasAppliedFormula`, call `evaluateAdvancedFormula(appliedFormula.value, context)`. If it returns error, assign `advancedFilterErrors.formula = error` and skip the formula rule by not returning false for that rule. If it returns `{ ok: true, value: false }`, return false.
      - If `hasAppliedGlobalRegex`, call `compileAdvancedRegex(appliedGlobalRegex.value, globalRegexFlags.value)`. On error, assign `advancedFilterErrors.globalRegex = error` and skip only global regex. On success, test against `buildSearchableRowText(context)`; return false if no match.
      - If `hasAppliedColumnRegex`, compile `appliedColumnRegex.pattern` with `appliedColumnRegex.flags`. On error, assign `advancedFilterErrors.columnRegex = error` and skip only column regex. On success, test against `context[appliedColumnRegex.field]`; return false if no match.
      - Return true after all active valid rules match.

      Add derived arrays:
      - `filteredEntries = computed(() => hasActiveAdvancedFilters.value ? args.entries.value.filter(matchEntry) : args.entries.value)`
      - `filteredAggregatedGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.aggregatedGroups.value, matchEntry) : args.aggregatedGroups.value)`
      - `filteredLexemeGroups = computed(() => hasActiveAdvancedFilters.value ? filterGroups(args.lexemeGroups.value, matchEntry) : args.lexemeGroups.value)`
      - `visibleEntryCount = computed(() => args.viewMode.value === 'flat' ? filteredEntries.value.length : (args.viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value).reduce((sum, group) => sum + group.entries.length, 0))`
      - `advancedEmptyStateActive = computed(() => hasActiveAdvancedFilters.value && loadedEntryCount.value > 0 && visibleEntryCount.value === 0)`

      Implement `filterGroups(groups, matcher)` by returning new group wrapper objects with `entries: group.entries.filter(matcher)` and removing empty groups. Preserve original `Entry` objects.
    </action>
    <acceptance_criteria>
      - `app/composables/useEntriesAdvancedFilters.ts` contains `const hasActiveAdvancedFilters = computed(`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `const filteredEntries = computed(`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `const filteredAggregatedGroups = computed(` and `const filteredLexemeGroups = computed(`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `function filterGroups` and `group.entries.filter(matcher)`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `buildSearchableRowText(context)`.
      - `app/composables/useEntriesAdvancedFilters.ts` does not contain `{ ...entry }`.
    </acceptance_criteria>
  </task>

  <task id="02.3" type="implementation">
    <title>Add apply and clear actions with fail-closed validation</title>
    <read_first>
      - app/composables/useEntriesAdvancedFilters.ts
      - app/utils/entriesAdvancedFilter.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md
    </read_first>
    <files>
      - app/composables/useEntriesAdvancedFilters.ts
    </files>
    <action>
      Add actions to `useEntriesAdvancedFilters`:

      - `function clearAdvancedFilterErrors()` sets all error slots to `null`.
      - `function validateAdvancedFilterInputs(): boolean` validates current pending input before apply:
        - If `formulaInput.value.trim()` is non-empty, call `evaluateAdvancedFormula(formulaInput.value, emptyPreviewContext)` where `emptyPreviewContext` has every `ADVANCED_FILTER_FIELDS` key set to `''`; accept `evaluation_error` from field values only during preview but reject parse/unknown/function/non_boolean errors. Simpler acceptable implementation: expose `parseAdvancedFormula` from Plan 01 and call that here.
        - If global regex is enabled and `globalRegexInput.value.trim()` is non-empty, call `compileAdvancedRegex(globalRegexInput.value, globalRegexFlags.value)` and set `advancedFilterErrors.globalRegex` on failure.
        - If column regex pattern is non-empty, require `columnRegex.field` to be set; compile `columnRegex.pattern` with `columnRegex.flags`; set `advancedFilterErrors.columnRegex` on failure.
      - `function applyAdvancedFilters(): boolean` clears errors, validates inputs, and if valid copies `formulaInput` to `appliedFormula`, `globalRegexInput` to `appliedGlobalRegex`, and `columnRegex` fields to `appliedColumnRegex`. It returns false without changing applied state when validation fails.
      - `function clearAdvancedFilters()` resets formula/global/column pending and applied state, disables global regex, clears errors, and leaves `searchQuery`, `filters`, `sortBy`, `sortOrder`, `currentPage`, and `pagination` untouched.

      Return all state, derived arrays/counts, `buildRowContext`, `applyAdvancedFilters`, `clearAdvancedFilters`, and `clearAdvancedFilterErrors` from the composable.
    </action>
    <acceptance_criteria>
      - `app/composables/useEntriesAdvancedFilters.ts` contains `function applyAdvancedFilters(): boolean`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `function clearAdvancedFilters()`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `function clearAdvancedFilterErrors()`.
      - `app/composables/useEntriesAdvancedFilters.ts` contains `return {` with `filteredEntries`, `filteredAggregatedGroups`, `filteredLexemeGroups`, `hasActiveAdvancedFilters`, `advancedEmptyStateActive`, `applyAdvancedFilters`, and `clearAdvancedFilters`.
      - `grep -R "fetchEntries\|searchQuery\|sortBy\|sortOrder\|currentPage\|pagination" app/composables/useEntriesAdvancedFilters.ts` exits non-zero.
    </acceptance_criteria>
  </task>

  <task id="02.4" type="implementation">
    <title>Wire filtered data into entries page derived rows</title>
    <read_first>
      - app/pages/entries/index.vue
      - app/composables/useEntriesAdvancedFilters.ts
      - app/composables/useEntriesList.ts
      - app/composables/useEntriesTableColumns.ts
      - app/composables/useEntriesTableEdit.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/pages/entries/index.vue
    </files>
    <action>
      In `app/pages/entries/index.vue`:

      1. Add import:
      ```ts
      import { useEntriesAdvancedFilters } from '~/composables/useEntriesAdvancedFilters'
      ```

      2. After `editableColumns` and `getCellDisplay` are defined, initialize:
      ```ts
      const advancedFilters = useEntriesAdvancedFilters({
        entries,
        aggregatedGroups,
        lexemeGroups,
        viewMode,
        editableColumns,
        getCellDisplay: getCellDisplay as any
      })
      ```
      If the `as any` can be avoided with the existing `getCellDisplay` type, avoid it; otherwise keep it local to the call.

      3. Destructure or reference these values from `advancedFilters`: `filteredEntries`, `filteredAggregatedGroups`, `filteredLexemeGroups`, `hasActiveAdvancedFilters`, `advancedEmptyStateActive`, `visibleEntryCount`, `loadedEntryCount`.

      4. Update `displayGroups` computed:
      - Use `const base = viewMode.value === 'lexeme' ? filteredLexemeGroups.value : filteredAggregatedGroups.value`.
      - Use `filteredEntries.value.filter(e => (e as any)._isNew)` for `newOnes`.
      - Preserve existing group shape and `expandedGroupKeys` behavior.

      5. Update `tableRows` computed:
      - In flat mode, return `filteredEntries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))`.
      - Grouped mode remains based on `displayGroups.value`.

      6. Update `currentPageEntries` computed:
      - In flat mode, return `filteredEntries.value`.
      - Grouped mode remains `displayGroups.value.flatMap(g => g.entries)`.

      7. Update `isEmpty` computed:
      - If `advancedEmptyStateActive.value`, return true.
      - In flat mode use `filteredEntries.value.length === 0`.
      - In grouped modes use filtered base groups plus filtered new entries.

      8. Do not modify the existing `useEntriesList(...)` call, `/api/entries` query behavior, or localStorage watch sources.
    </action>
    <acceptance_criteria>
      - `app/pages/entries/index.vue` contains `useEntriesAdvancedFilters` import.
      - `app/pages/entries/index.vue` contains `const advancedFilters = useEntriesAdvancedFilters({`.
      - `app/pages/entries/index.vue` contains `filteredEntries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))` or equivalent flat-mode tableRows derived from `filteredEntries`.
      - `app/pages/entries/index.vue` contains `filteredLexemeGroups.value` and `filteredAggregatedGroups.value` inside `displayGroups`.
      - `app/pages/entries/index.vue` still contains `useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder`.
      - The localStorage watch still starts with `[() => entries.value, () => aggregatedGroups.value, () => lexemeGroups.value]`.
    </acceptance_criteria>
  </task>

  <task id="02.5" type="implementation">
    <title>Update keyboard navigation to visible filtered entry rows</title>
    <read_first>
      - app/pages/entries/index.vue
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/pages/entries/index.vue
    </files>
    <action>
      In `app/pages/entries/index.vue`, add a computed near `tableRows`:
      ```ts
      const visibleEntryRows = computed(() => tableRows.value.filter((row): row is Extract<TableRow, { type: 'entry' }> => row.type === 'entry'))
      const visibleKeyboardEntries = computed(() => visibleEntryRows.value.map(row => row.entry))
      ```

      In `handleTableKeydown`, replace raw `entries.value` indexing with `visibleKeyboardEntries.value`:
      - `const rows = entries.value.length` becomes `const rows = visibleKeyboardEntries.value.length`.
      - `const currentEntry = entries.value[rowIndex]` becomes `const currentEntry = visibleKeyboardEntries.value[rowIndex]`.
      - `const tabEntry = entries.value[nextRow]` becomes `const tabEntry = visibleKeyboardEntries.value[nextRow]`.
      - `const entry = entries.value[rowIndex]` becomes `const entry = visibleKeyboardEntries.value[rowIndex]`.
      - `const typableEntry = entries.value[focusedCell.value.rowIndex]` becomes `const typableEntry = visibleKeyboardEntries.value[focusedCell.value.rowIndex]`.

      Keep the existing early return for inputs/textareas/selects/contenteditable so advanced filter form controls are not intercepted by table keyboard navigation.
    </action>
    <acceptance_criteria>
      - `app/pages/entries/index.vue` contains `const visibleEntryRows = computed(`.
      - `app/pages/entries/index.vue` contains `const visibleKeyboardEntries = computed(`.
      - `app/pages/entries/index.vue` contains `const rows = visibleKeyboardEntries.value.length`.
      - `app/pages/entries/index.vue` contains `visibleKeyboardEntries.value[nextRow]`.
      - `app/pages/entries/index.vue` no longer contains `const rows = entries.value.length` in `handleTableKeydown`.
    </acceptance_criteria>
  </task>
</tasks>

<verification>
- Run `npm run build` after all Phase 1 implementation plans complete.
- Read `app/composables/useEntriesAdvancedFilters.ts` and confirm no imports from server APIs, save/delete composables, or mutation helpers.
- Read `app/pages/entries/index.vue` and confirm `useEntriesList` call signature is unchanged.
- Manually verify in the browser after UI plan completes: inactive advanced filters leave plain search/filter/grouping behavior unchanged; active valid advanced filters reduce visible rows; invalid rules leave current rows visible.
</verification>

<success_criteria>
- Advanced filtering is derived client-side over loaded data.
- Existing server-backed filtering and pagination remain owned by `useEntriesList`.
- Filtered rows preserve original entry object references.
- Grouped views show only groups with at least one matched entry.
- Keyboard navigation uses visible filtered entries rather than hidden source rows.
</success_criteria>
