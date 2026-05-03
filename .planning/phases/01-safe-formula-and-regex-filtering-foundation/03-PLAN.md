---
phase: 01
plan: 03
name: entries-advanced-filter-ui-and-verification
type: execute
wave: 3
depends_on:
  - 01
  - 02
files_modified:
  - app/components/entries/EntriesAdvancedFilterPanel.vue
  - app/pages/entries/index.vue
autonomous: true
requirements:
  - FORM-01
  - FORM-02
  - FORM-04
  - REGX-01
  - REGX-02
  - REGX-03
---

<objective>
Add the entries-page advanced filtering UI contract: an opt-in panel near existing search/filter controls, formula input, explicit global regex mode, single-column regex controls, supported field/function helpers, inline Hong Kong Traditional Chinese validation feedback, active result counts, advanced-filter empty state, and required build/browser verification.
</objective>

<truths>
- D-08: UI documents supported field names near the formula input.
- D-10: Regex mode for global search is distinct and does not change default search semantics.
- D-12: Invalid regex patterns are user-facing validation errors in Hong Kong Traditional Chinese.
- D-16: When no advanced formula/regex filter is active, rendered table is functionally identical to current table.
- D-17: Invalid formulas/regex fail closed for the advanced rule only; do not clear existing data or refetch.
- D-18: Error copy, helper text, and empty-state text introduced in this phase use Hong Kong Traditional Chinese.
- D-19: Valid advanced filters with no matches use existing empty-state pattern with advanced-filter no-match wording.
- UI-SPEC: Advanced controls are inside the existing search/filter card, visually secondary, compact, accessible, and built with Nuxt UI components.
</truths>

<threat_model>
| Threat | Severity | Mitigation |
|--------|----------|------------|
| User confuses advanced regex with existing server search | medium | UI uses separate labels `正則搜尋` and helper `進階篩選只影響目前已載入的詞條，不會修改資料。`; existing search input and button remain unchanged. |
| Invalid formulas/regex look like destructive data loss when rows disappear | medium | Inline error messages keep rows visible; no-match empty state appears only when active advanced filters are valid and match zero rows. |
| Accessibility failure hides validation from keyboard/screen-reader users | medium | Each new input has visible labels or aria labels; error containers use `role="alert"` or `aria-live="polite"`; essential helper content is inline, not hover-only. |
| UI accidentally adds mutation or bulk actions | high | Panel only emits `apply` and `clear`; it includes no save/delete/bulk/format/share actions and Phase 1 copy says filters do not modify data. |
</threat_model>

<must_haves>
- New UI copy exactly uses UI-SPEC strings: `進階篩選`, `公式篩選`, `正則搜尋`, `欄位正則篩選`, `套用進階篩選`, `清除進階篩選`.
- Supported fields helper lists exactly `headword、dialect、phonetic、entryType、theme、definition、register、status`.
- Supported functions helper lists exactly `AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH`.
- Empty state heading is `進階篩選沒有匹配結果` and body is `沒有詞條符合目前公式或正則條件。請調整條件，或清除進階篩選返回原本結果。`.
- The advanced panel does not mutate `searchQuery`, server filters, sort state, pagination, or entries.
- `npm run build` passes.
- Browser verification is attempted with dev server; if local env prevents full data loading, the limitation is documented in execution summary.
</must_haves>

<tasks>
  <task id="03.1" type="implementation">
    <title>Create reusable advanced filter panel component</title>
    <read_first>
      - app/components/entries/ReferenceHeadwordRow.vue
      - app/components/entries/EntriesEditableCell.vue
      - app/utils/entriesTableConstants.ts
      - app/composables/useEntriesAdvancedFilters.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/components/entries/EntriesAdvancedFilterPanel.vue
    </files>
    <action>
      Create `app/components/entries/EntriesAdvancedFilterPanel.vue` with `<script setup lang="ts">`, typed props/emits, and Nuxt UI controls.

      Props:
      ```ts
      const props = defineProps<{
        expanded: boolean
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

      Emits:
      ```ts
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
      ```

      Template requirements:
      - Root wrapper uses `border-t border-gray-200 dark:border-gray-700 pt-3 mt-3`.
      - Disclosure button is a `UButton size="sm" color="neutral" variant="soft"` with text `進階篩選` and an icon `i-heroicons-funnel`.
      - When active, show one compact `UBadge color="primary" variant="soft"` with `進階篩選顯示 {{ visibleCount }} / {{ loadedCount }} 項目前已載入結果。`.
      - Expanded panel uses `flex flex-col gap-3` and contains:
        - Formula label `公式篩選` and `UInput size="sm"` placeholder `例如：=AND(status = "草稿", ISBLANK(definition))`.
        - Global regex row with explicit enable control labelled `正則搜尋` and `UInput size="sm"` placeholder `輸入正則表達式，只搜尋目前已載入的詞條`.
        - Column regex row with label `欄位正則篩選`, `USelectMenu size="sm"` placeholder `選擇欄位`, and `UInput size="sm"` placeholder `輸入此欄位的正則表達式`.
        - Inline helper text with exact strings `可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status` and `支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH`.
        - Read-only helper `進階篩選只影響目前已載入的詞條，不會修改資料。`.
        - Error text blocks near offending inputs when error props are non-empty; error containers include `role="alert"` and red/error styling.
        - Apply `UButton color="primary" variant="solid" size="sm"` text `套用進階篩選`.
        - Clear `UButton color="neutral" variant="soft" size="sm"` text `清除進階篩選`.
      - `@keyup.enter` on formula/global/column regex inputs emits `apply`.
    </action>
    <acceptance_criteria>
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains `<script setup lang="ts">`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains `defineProps<{` and `defineEmits<{`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains exact copy strings `進階篩選`, `公式篩選`, `正則搜尋`, `欄位正則篩選`, `套用進階篩選`, `清除進階篩選`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains `可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains `支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains `role="alert"`.
      - `app/components/entries/EntriesAdvancedFilterPanel.vue` contains no `delete`, `save`, `submit`, or `bulk` event emits.
    </acceptance_criteria>
  </task>

  <task id="03.2" type="implementation">
    <title>Mount panel in entries search/filter card</title>
    <read_first>
      - app/pages/entries/index.vue
      - app/components/entries/EntriesAdvancedFilterPanel.vue
      - app/composables/useEntriesAdvancedFilters.ts
      - app/utils/entriesTableConstants.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md
    </read_first>
    <files>
      - app/pages/entries/index.vue
    </files>
    <action>
      In `app/pages/entries/index.vue`:

      1. Import the component and field labels:
      ```ts
      import EntriesAdvancedFilterPanel from '~/components/entries/EntriesAdvancedFilterPanel.vue'
      import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS, ADVANCED_FILTER_FIELD_LABELS } from '~/utils/entriesTableConstants'
      ```
      If the file already imports constants from `entriesTableConstants`, extend that import rather than adding a duplicate.

      2. Add field options near other filter option computed values:
      ```ts
      const advancedFilterFieldOptions = computed(() =>
        Object.entries(ADVANCED_FILTER_FIELD_LABELS).map(([value, label]) => ({ value, label: `${label} (${value})` }))
      )
      ```

      3. Mount `<EntriesAdvancedFilterPanel />` inside the existing search/filter card, directly after the first `flex flex-col lg:flex-row gap-3` row and before the card closes. Bind to `advancedFilters` state and actions:
      ```vue
      <EntriesAdvancedFilterPanel
        v-model:expanded="advancedFilters.advancedFilterExpanded.value"
        v-model:formula-input="advancedFilters.formulaInput.value"
        v-model:global-regex-enabled="advancedFilters.globalRegexEnabled.value"
        v-model:global-regex-input="advancedFilters.globalRegexInput.value"
        v-model:column-regex-field="advancedFilters.columnRegex.field"
        v-model:column-regex-pattern="advancedFilters.columnRegex.pattern"
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
      Adjust `.value` usage if destructuring refs in `<script setup>` makes template unwrapping cleaner, but keep the same data flow.

      4. Do not change the existing plain search `UInput`, existing `搜索` button, or `handleSearch` wiring.
    </action>
    <acceptance_criteria>
      - `app/pages/entries/index.vue` contains `EntriesAdvancedFilterPanel` import.
      - `app/pages/entries/index.vue` contains `ADVANCED_FILTER_FIELD_LABELS` import or existing import extension.
      - `app/pages/entries/index.vue` contains `const advancedFilterFieldOptions = computed(`.
      - `app/pages/entries/index.vue` contains `<EntriesAdvancedFilterPanel` in the search/filter card area.
      - `app/pages/entries/index.vue` still contains `placeholder="搜索詞條、釋義..."` and `@keyup.enter="handleSearch"` on the original search input.
    </acceptance_criteria>
  </task>

  <task id="03.3" type="implementation">
    <title>Add advanced-filter no-match empty state</title>
    <read_first>
      - app/pages/entries/index.vue
      - app/composables/useEntriesAdvancedFilters.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/pages/entries/index.vue
    </files>
    <action>
      Update the existing empty-state template in `app/pages/entries/index.vue` so advanced-filter no-match state uses the existing centered visual pattern but different copy and CTA.

      Implement template logic equivalent to:
      - Heading expression first checks `advancedFilters.advancedEmptyStateActive.value` and returns `進階篩選沒有匹配結果`.
      - Body expression first checks `advancedFilters.advancedEmptyStateActive.value` and returns `沒有詞條符合目前公式或正則條件。請調整條件，或清除進階篩選返回原本結果。`.
      - If `advancedFilters.advancedEmptyStateActive.value` is true, show a `UButton color="neutral" variant="soft" size="sm" @click="advancedFilters.clearAdvancedFilters"` with text `清除進階篩選`.
      - Suppress `新建詞條`, `創建第一個詞條`, or other create CTAs for advanced-filter no-match state.
      - Keep the existing `i-heroicons-table-cells` icon and `w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4` visual pattern.
    </action>
    <acceptance_criteria>
      - `app/pages/entries/index.vue` contains `進階篩選沒有匹配結果`.
      - `app/pages/entries/index.vue` contains `沒有詞條符合目前公式或正則條件。請調整條件，或清除進階篩選返回原本結果。`.
      - `app/pages/entries/index.vue` contains `@click="advancedFilters.clearAdvancedFilters"` in the empty-state branch or equivalent clear action binding.
      - `app/pages/entries/index.vue` still contains `i-heroicons-table-cells` in the empty-state block.
      - The advanced no-match branch does not show `創建第一個詞條` when `advancedEmptyStateActive` is true.
    </acceptance_criteria>
  </task>

  <task id="03.4" type="implementation">
    <title>Run automated build and static safety scans</title>
    <read_first>
      - package.json
      - app/utils/entriesAdvancedFilter.ts
      - app/composables/useEntriesAdvancedFilters.ts
      - app/pages/entries/index.vue
      - app/components/entries/EntriesAdvancedFilterPanel.vue
    </read_first>
    <files>
      - app/utils/entriesAdvancedFilter.ts
      - app/composables/useEntriesAdvancedFilters.ts
      - app/pages/entries/index.vue
      - app/components/entries/EntriesAdvancedFilterPanel.vue
    </files>
    <action>
      Run these commands after implementation:

      ```bash
      npm run build
      grep -R "eval(\|new Function\|import(" app/utils/entriesAdvancedFilter.ts app/composables/useEntriesAdvancedFilters.ts app/pages/entries/index.vue app/components/entries/EntriesAdvancedFilterPanel.vue
      grep -R "進階篩選\|公式篩選\|正則搜尋\|欄位正則篩選" app/pages/entries/index.vue app/components/entries/EntriesAdvancedFilterPanel.vue
      ```

      Expected results:
      - `npm run build` exits 0.
      - The forbidden-code grep exits non-zero; if it exits zero, remove any forbidden code before continuing.
      - The copy grep prints the expected HK Traditional UI strings.
    </action>
    <acceptance_criteria>
      - `npm run build` exits 0.
      - `grep -R "eval(\|new Function\|import(" app/utils/entriesAdvancedFilter.ts app/composables/useEntriesAdvancedFilters.ts app/pages/entries/index.vue app/components/entries/EntriesAdvancedFilterPanel.vue` exits non-zero.
      - `grep -R "進階篩選\|公式篩選\|正則搜尋\|欄位正則篩選" app/pages/entries/index.vue app/components/entries/EntriesAdvancedFilterPanel.vue` prints at least four matching lines.
    </acceptance_criteria>
  </task>

  <task id="03.5" type="manual_verification">
    <title>Verify advanced filtering in browser</title>
    <read_first>
      - package.json
      - app/pages/entries/index.vue
      - app/components/entries/EntriesAdvancedFilterPanel.vue
      - app/composables/useEntriesAdvancedFilters.ts
    </read_first>
    <files>
      - app/pages/entries/index.vue
      - app/components/entries/EntriesAdvancedFilterPanel.vue
      - app/composables/useEntriesAdvancedFilters.ts
    </files>
    <action>
      Start the dev server with `npm run dev` and verify `/entries` in a browser.

      Required checks:
      1. With advanced filters inactive, existing plain search, dialect/theme/status/user filters, sorting, pagination, and view mode controls are visually present and still usable.
      2. Open `進階篩選`; supported fields and supported functions helper text is visible without hover-only interaction.
      3. Apply formula `=AND(status = "草稿", ISBLANK(definition))`; visible rows update or no-match state appears without server refetch caused by advanced state.
      4. Apply formula `=LEN(headword)`; inline error shows `篩選公式必須回傳 TRUE 或 FALSE。` and existing table data remains visible.
      5. Enable `正則搜尋`, enter invalid regex `(`, apply; inline regex error appears and table data remains visible.
      6. Select a column such as `headword`, enter a valid regex that matches known loaded rows, apply; only that column’s normalized display value drives the result.
      7. In aggregated or lexeme view, groups with no matched children disappear and expanded groups show only matched entries.
      8. Try keyboard navigation in the filtered flat table; focus moves among visible filtered entries and does not target hidden rows.

      If local environment variables, database access, or auth prevent browser data verification, document the blocker in the execution summary and still report build/static verification results.
    </action>
    <acceptance_criteria>
      - Dev server starts with `npm run dev` or the execution summary documents the exact startup blocker.
      - Browser verification confirms inactive advanced filters preserve existing table behavior, or the exact environment blocker is documented.
      - Browser verification confirms at least one valid formula or regex updates visible rows, or the exact data/auth blocker is documented.
      - Browser verification confirms invalid formula/regex errors leave existing rows visible, or the exact data/auth blocker is documented.
    </acceptance_criteria>
  </task>
</tasks>

<verification>
- `npm run build` must pass.
- Static grep must confirm no forbidden formula execution primitives in changed advanced filter files.
- Browser verification must be attempted because this phase changes frontend UI; any inability to complete it must be stated explicitly.
</verification>

<success_criteria>
- Users can discover and use formula and regex advanced filters from the entries table filter area.
- New UI copy is Hong Kong Traditional Chinese and matches UI-SPEC.
- Invalid formula/regex feedback is inline and non-destructive.
- Valid advanced filters can produce no-match empty state with advanced-specific wording.
- Existing plain search/filter controls remain visually and behaviorally unchanged when advanced filters are inactive.
</success_criteria>
