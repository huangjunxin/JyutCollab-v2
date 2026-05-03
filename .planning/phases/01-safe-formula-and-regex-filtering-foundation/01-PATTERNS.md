# Phase 1: Safe Formula and Regex Filtering Foundation - Pattern Map

**Mapped:** 2026-05-03
**Files analyzed:** 6 likely new/modified files
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/utils/entriesAdvancedFilter.ts` | utility | transform | `app/utils/entriesTableConstants.ts` + `app/utils/entryKey.ts` | role-match |
| `app/composables/useEntriesAdvancedFilters.ts` | composable | event-driven transform | `app/composables/useEntriesSelection.ts` | exact |
| `app/pages/entries/index.vue` | component/page | request-response + event-driven transform | `app/pages/entries/index.vue` | exact self-integration |
| `app/utils/entriesTableConstants.ts` | config/utility | config | `app/utils/entriesTableConstants.ts` | exact self-modification |
| `app/types/index.ts` | type | config/transform | `app/types/index.ts` | exact self-modification |
| `app/components/entries/EntriesAdvancedFilterPanel.vue` | component | event-driven request-response UI | `app/components/entries/ReferenceHeadwordRow.vue` | role-match |

## Pattern Assignments

### `app/utils/entriesAdvancedFilter.ts` (utility, transform)

**Analog:** `app/utils/entriesTableConstants.ts` for shared constants, `app/utils/entryKey.ts` for focused pure utility exports, and `app/composables/useEntriesTableEdit.ts` for display-value normalization.

**Imports pattern** — use type-only imports and `~/` alias when the utility needs app types (from `app/utils/entryKey.ts` lines 1-1):
```typescript
import type { Entry } from '~/types'
```

**Constants export pattern** — shared entry-table constants are named exports with `as const` where a literal union is useful (from `app/utils/entriesTableConstants.ts` lines 5-11):
```typescript
export const ALL_FILTER_VALUE = '__all__'

export const SORTABLE_COLUMN_KEYS = ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'headword'] as const

export const DEFINITION_SUMMARY_MAX_LEN = 50

export const MAX_TEXTAREA_HEIGHT_PX = 240
```

**HK Traditional label-map pattern** — Chinese comments and labels must use Hong Kong Traditional Chinese (from `app/utils/entriesTableConstants.ts` lines 13-27):
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

**Pure utility function pattern** — keep helper functions small, named, and side-effect free (from `app/utils/entryKey.ts` lines 3-17):
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

**Row display-value source pattern** — row context should mirror table display values and should call column getters, never setters (from `app/composables/useEntriesTableEdit.ts` lines 26-53):
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
  if (col.type === 'select') {
    if (col.key === 'dialect') return dialectCodeToName[String(value)] || (value as string) || '-'
    if (col.key === 'status') return STATUS_LABELS[String(value)] || (value as string) || '-'
    const options = getColumnOptions(col)
    const opt = options?.find((o: { value: string }) => o.value === String(value))
    return opt?.label ?? String(value ?? '-')
  }
  return String(value ?? '-')
}
```

**Formula/regex implementation guidance to apply in this file:**
- Define `ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const` in this utility or in `entriesTableConstants.ts`.
- Export `AdvancedFilterFieldKey`, `RowFilterContext`, typed parse/evaluation/regex result unions, and pure functions only.
- Implement tokenizer/parser/interpreter explicitly; do not use `eval`, `new Function`, dynamic `import()`, or arbitrary JavaScript execution.
- Formula root must return `boolean`; reject numeric/string roots with `non_boolean_result` rather than JavaScript truthiness.
- Regex helper should use `new RegExp(pattern, flags)` inside `try/catch`, allow only `i`, `m`, `u`, reject or avoid `g`/`y`, cap pattern length, and reset `lastIndex` before each `.test()`.
- Error messages returned by this utility for UI display must be Hong Kong Traditional Chinese.

---

### `app/composables/useEntriesAdvancedFilters.ts` (composable, event-driven transform)

**Analog:** `app/composables/useEntriesSelection.ts` for reactive inputs, computed derived state, named state/actions return; `app/composables/useEntriesList.ts` for source collection shape; `app/composables/useEntriesRowHints.ts` for feature-specific maps/error state.

**Imports pattern** — import Vue types first, runtime Vue APIs next, then app utilities/types (from `app/composables/useEntriesSelection.ts` lines 1-3):
```typescript
import type { Ref, ComputedRef } from 'vue'
import { ref, computed, watch } from 'vue'
import { getEntryKey } from '~/utils/entryKey'
import type { Entry } from '~/types'
```

**Composable signature pattern** — accept reactive source data and callbacks rather than owning API fetching (from `app/composables/useEntriesSelection.ts` lines 5-8):
```typescript
export function useEntriesSelection(
  currentPageEntries: ComputedRef<Entry[]>,
  fetchEntries: () => Promise<void>
) {
```

**Derived state pattern** — compute from the passed visible/source entries, and return simple booleans/counts (from `app/composables/useEntriesSelection.ts` lines 9-21):
```typescript
const selectedEntryIds = ref<Set<string>>(new Set())
const selectAllChecked = computed(() => {
  if (currentPageEntries.value.length === 0) return false
  return currentPageEntries.value.every((e) => selectedEntryIds.value.has(String(getEntryKey(e))))
})
const selectAllIndeterminate = computed(() => {
  const n = currentPageEntries.value.filter((e) => selectedEntryIds.value.has(String(getEntryKey(e)))).length
  return n > 0 && n < currentPageEntries.value.length
})
const selectedCount = computed(() => selectedEntryIds.value.size)
const selectedSavedEntries = computed(() =>
  currentPageEntries.value.filter((e) => e.id && selectedEntryIds.value.has(String(e.id)))
)
```

**Set/Map mutation pattern** — replace Set/Map refs after mutation so Vue notices changes (from `app/composables/useEntriesSelection.ts` lines 27-32 and `app/composables/useEntriesRowHints.ts` lines 247-249):
```typescript
function toggleSelectEntry(entry: Entry, event?: Event) {
  event?.stopPropagation()
  const key = String(getEntryKey(entry))
  const next = new Set(selectedEntryIds.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedEntryIds.value = next
}
```
```typescript
referenceSearchLoading.value.set(entryId, true)
referenceSearchLoading.value = new Map(referenceSearchLoading.value)
```

**Error handling pattern** — catch client-side fetch/evaluation failures and store safe HK Traditional messages rather than crashing the table (from `app/composables/useEntriesRowHints.ts` lines 167-185):
```typescript
try {
  const res = await $fetch<any>('/api/jyutjyu/search', { query: { q } })
  jyutjyuRefResult.value.set(entryId, {
    loading: false,
    q,
    total: typeof res?.total === 'number' ? res.total : (Array.isArray(res?.results) ? res.results.length : 0),
    results: Array.isArray(res?.results) ? res.results : [],
    errorMessage: ''
  })
} catch (e) {
  jyutjyuRefResult.value.set(entryId, {
    loading: false,
    q,
    total: null,
    results: [],
    errorMessage: '查詢 Jyutjyu 時出現問題，請稍後再試。'
  })
}
jyutjyuRefResult.value = new Map(jyutjyuRefResult.value)
```

**Named return pattern** — return state and actions explicitly (from `app/composables/useEntriesSelection.ts` lines 74-87):
```typescript
return {
  selectedEntryIds,
  selectAllChecked,
  selectAllIndeterminate,
  selectedCount,
  selectedSavedEntries,
  isEntrySelected,
  toggleSelectEntry,
  toggleSelectAll,
  clearSelection,
  batchDeleting,
  batchDeleteSelected,
  headerCheckboxRef
}
```

**Source collection pattern to consume, not replace** — `useEntriesList` owns server-backed source arrays and pagination (from `app/composables/useEntriesList.ts` lines 27-37):
```typescript
const entries = ref<Entry[]>([])
const aggregatedGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
const lexemeGroups = ref<Array<{ headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>>([])
const loading = ref(false)
const currentPage = ref(1)
const pagination = reactive({
  total: 0,
  page: 1,
  perPage: 20,
  totalPages: 0
})
```

**Do-not-copy API query behavior** — advanced filters must not be added to this query/cache layer (from `app/composables/useEntriesList.ts` lines 39-73):
```typescript
const cacheKey = computed(() => {
  const parts = [
    'entries-list',
    `v:${viewMode.value}`,
    `q:${searchQuery.value || 'none'}`,
    `r:${filters.region || 'all'}`,
    `s:${filters.status || 'all'}`,
    `t:${filters.theme || 'all'}`,
    `c:${filters.createdBy || 'all'}`,
    `sb:${sortBy.value}`,
    `so:${sortOrder.value}`,
    `p:${currentPage.value}`,
    `pp:${pagination.perPage}`
  ]
  return parts.join('|')
})

async function fetchFromAPI(): Promise<EntriesResponse> {
  const query: Record<string, any> = {
    page: currentPage.value,
    perPage: pagination.perPage,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value
  }

  if (searchQuery.value) query.query = searchQuery.value
  if (filters.region && filters.region !== ALL_FILTER_VALUE) query.dialectName = filters.region
  if (filters.status && filters.status !== ALL_FILTER_VALUE) query.status = filters.status
  if (filters.theme && filters.theme !== ALL_FILTER_VALUE) query.themeIdL3 = Number(filters.theme)
  if (filters.createdBy) query.createdBy = filters.createdBy

  if (viewMode.value === 'aggregated') query.groupBy = 'headword'
  if (viewMode.value === 'lexeme') query.groupBy = 'lexeme'

  return await $fetch<EntriesResponse>('/api/entries', { query })
}
```

**Advanced filter composable implementation guidance:**
- Inputs should include `entries`, `aggregatedGroups`, `lexemeGroups`, `viewMode`, `editableColumns`, and a row-context/display callback from `getCellDisplay`.
- Outputs should include advanced state, typed validation errors, `hasActiveAdvancedFilters`, `filteredEntries`, `filteredAggregatedGroups`, `filteredLexemeGroups`, and `advancedEmptyStateActive`.
- When inactive, return original arrays by reference.
- When active, filter arrays but preserve the original `Entry` object references.
- For grouped views, clone only the group wrapper shape and replace `entries` with matching original entry objects.
- Invalid formula/regex should fail closed for that rule only: keep current data visible and expose validation error state.

---

### `app/pages/entries/index.vue` (component/page, request-response + event-driven transform)

**Analog:** Self integration points in `app/pages/entries/index.vue`; copy existing placement and computed-flow patterns.

**Imports pattern** — composables and utilities are imported directly, then types, then components (from `app/pages/entries/index.vue` lines 833-865):
```typescript
import { useAuth, useProfileUpdatedUser } from '~/composables/useAuth'
import { getThemeById, getThemeNameById, getFlatThemeList } from '~/composables/useThemeData'
import { dialectOptionsWithAll, DIALECT_OPTIONS_FOR_SELECT, getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'
import { getEntryKey, getEntryIdString } from '~/utils/entryKey'
import { ALL_FILTER_VALUE, SORTABLE_COLUMN_KEYS, STATUS_LABELS, ENTRY_TYPE_LABELS } from '~/utils/entriesTableConstants'
import { getGroupPhonetic, getGroupEntryType, getGroupTheme, getGroupRegister, getGroupStatus } from '~/composables/useEntryGroupDisplay'
import { useEntriesTableColumns } from '~/composables/useEntriesTableColumns'
import { useColumnResize } from '~/composables/useColumnResize'
import { deepCopy, getEntryIdKey, makeBaselineSnapshot, useEntryBaseline } from '~/composables/useEntryBaseline'
import { ensureSensesStructure, addSense, removeSense, addExample, removeExample, addSubSense, removeSubSense, addSubSenseExample, removeSubSenseExample } from '~/composables/useEntrySenses'
import { useEntriesList } from '~/composables/useEntriesList'
import { useEntriesSelection } from '~/composables/useEntriesSelection'
import { useNewEntryDialect } from '~/composables/useNewEntryDialect'
import { useEntryMorphemeRefs } from '~/composables/useEntryMorphemeRefs'
import { useEntriesTableEdit } from '~/composables/useEntriesTableEdit'
import { useEntriesAISuggestions } from '~/composables/useEntriesAISuggestions'
import { useEntriesRowHints } from '~/composables/useEntriesRowHints'
import type { DialectId } from '~shared/dialects'
import { saveEntriesToLocalStorage, restoreEntriesFromLocalStorage, clearEntriesLocalStorage, removeEntryFromLocalStorage } from '~/composables/useEntriesLocalStorage'
import type { Entry, Register } from '~/types'
import AISuggestionRow from '~/components/entries/AISuggestionRow.vue'
```

**Search/filter UI placement pattern** — put advanced controls inside or immediately below the existing search/filter panel (from `app/pages/entries/index.vue` lines 70-162):
```vue
<!-- Search and filters -->
<div class="mb-4 flex-shrink-0 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
  <div class="flex flex-col lg:flex-row gap-3">
    <div class="flex-1">
      <UInput
        v-model="searchQuery"
        placeholder="搜索詞條、釋義..."
        icon="i-heroicons-magnifying-glass"
        size="sm"
        class="w-full"
        @keyup.enter="handleSearch"
      />
    </div>
    <div class="flex flex-wrap gap-2">
      <USelectMenu
        v-model="filterUser"
        :items="userFilterOptions"
        value-key="value"
        placeholder="篩選"
        size="sm"
        class="w-28"
      />
      <USelectMenu
        v-model="filterRegion"
        :items="dialectOptions"
        value-key="value"
        placeholder="方言"
        size="sm"
        class="w-28"
      />
      <USelectMenu
        v-model="filterTheme"
        :items="themeFilterOptions"
        value-key="value"
        placeholder="主題分類"
        size="sm"
        class="min-w-28 max-w-[14rem]"
        searchable
        searchable-placeholder="搜索分類..."
      />
      <USelectMenu
        v-model="filterStatus"
        :items="statusOptions"
        value-key="value"
        placeholder="狀態"
        size="sm"
        class="w-28"
      />
      <UButton
        color="primary"
        size="sm"
        @click="handleSearch"
      >
        搜索
      </UButton>
    </div>
  </div>
</div>
```

**Entries list owner pattern** — keep `useEntriesList` unchanged and consume its outputs (from `app/pages/entries/index.vue` lines 1078-1082):
```typescript
const searchQuery = ref('')
const sortBy = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const { entries, aggregatedGroups, lexemeGroups, loading, currentPage, pagination, fetchEntries, handleSearch, handleSort } = useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder, entryBaselineById, makeBaselineSnapshot, applyDraftOntoEntry)
```

**Column/display setup seam** — initialize advanced filtering after `editableColumns` and `getCellDisplay` exist (from `app/pages/entries/index.vue` lines 1328-1348):
```typescript
const { editableColumns, themeColIndex, phoneticColIndex, headwordColIndex } = useEntriesTableColumns(userDialectOptions, themeOptions, statusOptionsForTable)

const tableEdit = useEntriesTableEdit(editableColumns, dialectCodeToName)
const getCellDisplay = tableEdit.getCellDisplay as (entry: Entry, col: { key: string; type: string; get: (e: Entry) => unknown }) => string
const getCellClass = tableEdit.getCellClass
const getColumnOptions = tableEdit.getColumnOptions as (col: { getOptions?: () => unknown[]; options?: unknown[] }) => Array<{ value: string; label: string }>
const resizeTextarea = tableEdit.resizeTextarea
```

**Derived groups pattern to wrap with filtered data** — replace the `base` and `entries` sources with filtered equivalents, preserving the new-unsaved-entry group behavior (from `app/pages/entries/index.vue` lines 1122-1137):
```typescript
const displayGroups = computed(() => {
  if (viewMode.value !== 'aggregated' && viewMode.value !== 'lexeme') return []
  const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  const newOnes = entries.value
    .filter(e => (e as any)._isNew)
    .map(e => ({
      headwordDisplay: e.headword?.display || e.text || '',
      headwordNormalized:
        viewMode.value === 'lexeme'
          ? ((e as any).lexemeId || `__unassigned__:${String(getEntryKey(e))}`)
          : (e.headword?.normalized || e.headword?.display || e.text || ''),
      entries: [e]
    }))
  return [...newOnes, ...base]
})
```

**Table row/current entries pattern** — visible rows and selection should derive from filtered entries/groups (from `app/pages/entries/index.vue` lines 1139-1159):
```typescript
/** 表格行：平鋪時為 entry 行，聚合時為 group 行 + 展開的 entry 行（entry 帶 entryIndexInGroup 用於組內序號） */
type TableRow = { type: 'group'; group: { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }; groupIndex: number } | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
const tableRows = computed((): TableRow[] => {
  if (viewMode.value === 'flat') {
    return entries.value.map(entry => ({ type: 'entry' as const, entry, groupIndex: -1 }))
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

/** 當前頁用於多選/未保存檢測的條目列表（平鋪=entries，聚合=displayGroups 內所有 entries + 新建） */
const currentPageEntries = computed(() => {
  if (viewMode.value === 'flat') return entries.value
  return displayGroups.value.flatMap(g => g.entries)
})
```

**Empty-state pattern** — extend existing `isEmpty` and template copy for advanced no-match state (from `app/pages/entries/index.vue` lines 173-201 and 1232-1236):
```typescript
const isEmpty = computed(() => {
  if (viewMode.value === 'flat') return entries.value.length === 0
  const base = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  return base.length === 0 && !entries.value.some(e => (e as any)._isNew)
})
```
```vue
<div v-else-if="isEmpty" class="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
  <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
    <UIcon name="i-heroicons-table-cells" class="w-10 h-10 text-gray-400" />
  </div>
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
    {{ viewMode === 'aggregated' ? '暫無詞形' : (viewMode === 'lexeme' ? '暫無詞語' : '暫無詞條') }}
  </h3>
  <p class="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
    {{
      searchQuery
        ? (viewMode === 'aggregated'
          ? '沒有找到匹配的詞形'
          : (viewMode === 'lexeme' ? '沒有找到匹配的詞語' : '沒有找到匹配的詞條，請嘗試其他關鍵詞'))
        : (viewMode === 'aggregated'
          ? '可切換為平鋪視圖或點擊上方按鈕新建詞條'
          : (viewMode === 'lexeme' ? '可切換為平鋪/按詞形聚合視圖或點擊上方按鈕新建詞條' : '點擊上方按鈕開始創建第一個詞條'))
    }}
  </p>
</div>
```

**Keyboard navigation risk pattern** — update this block to use filtered visible entry rows instead of raw `entries.value`, otherwise focus can target hidden rows (from `app/pages/entries/index.vue` lines 1845-1949):
```typescript
function handleTableKeydown(event: KeyboardEvent) {
  // 若焦點在可編輯元素內（如展開區的 input/textarea），不攔截按鍵，讓用戶正常輸入
  const target = event.target as Node
  if (
    target &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable))
  ) {
    return
  }
  if (editingCell.value) return
  const rows = entries.value.length
  const cols = editableColumns.value.length
  if (rows === 0 || cols === 0) return

  // ... current implementation indexes entries.value[rowIndex]
  const { rowIndex, colIndex } = focusedCell.value
  const currentEntry = entries.value[rowIndex]
  // ...
  const tabEntry = entries.value[nextRow]
  // ...
  const entry = entries.value[rowIndex]
  // ...
  const typableEntry = entries.value[focusedCell.value.rowIndex]
}
```

**LocalStorage watch pattern that must stay source-based** — do not switch this watch to filtered collections (from `app/pages/entries/index.vue` lines 2352-2387):
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
    
    // 從 aggregatedGroups 中收集
    aggregatedGroups.value.forEach(g => {
      g.entries.forEach(e => {
        if ((e as any)._isNew || e._isDirty) {
          allEntries.push(e)
        }
      })
    })

    // 從 lexemeGroups 中收集
    lexemeGroups.value.forEach(g => {
      g.entries.forEach(e => {
        if ((e as any)._isNew || e._isDirty) {
          allEntries.push(e)
        }
      })
    })
    
    saveEntriesToLocalStorage(allEntries)
  },
  { deep: true }
)
```

---

### `app/utils/entriesTableConstants.ts` (config/utility, config)

**Analog:** Self; add only shared field constants/messages here if planner chooses not to keep them in `entriesAdvancedFilter.ts`.

**Existing constants style** (from `app/utils/entriesTableConstants.ts` lines 1-11):
```typescript
/**
 * 詞條表格與篩選共用常數
 */

export const ALL_FILTER_VALUE = '__all__'

export const SORTABLE_COLUMN_KEYS = ['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'headword'] as const

export const DEFINITION_SUMMARY_MAX_LEN = 50

export const MAX_TEXTAREA_HEIGHT_PX = 240
```

**Existing label style** (from `app/utils/entriesTableConstants.ts` lines 13-27):
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

**Apply this pattern for Phase 1:**
```typescript
export const ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const
```

Keep HK Traditional comments such as `/** 進階篩選可引用的欄位鍵 */` if adding comments.

---

### `app/types/index.ts` (type, config/transform)

**Analog:** Self; only add Phase 1 exported types here if they must be shared beyond the utility/composable. Prefer keeping parser-specific AST types in `app/utils/entriesAdvancedFilter.ts` unless the UI needs them.

**Type barrel pattern** (from `app/types/index.ts` lines 0-7):
```typescript
// Re-export from auth types
export * from './auth'

// Entry types - 根據 PRD 要求設計；方言與 shared/dialects 統一
export type { DialectId as Region } from '~shared/dialects'
export type EntryStatus = 'draft' | 'pending_review' | 'approved' | 'rejected'
export type EntryType = 'character' | 'word' | 'phrase'
export type Register = '口語' | '書面' | '粗俗' | '文雅' | '中性'
```

**Domain interface/comment pattern** (from `app/types/index.ts` lines 84-130):
```typescript
export interface Entry {
  id: string
  _tempId?: string // For new entries before save
  _isNew?: boolean // Flag for new entries
  _isDirty?: boolean // Flag for unsaved changes
  /** 詞級關聯：用於跨方言「同一個詞」嘅聚合（舊數據可能暫時沒有） */
  lexemeId?: string
  /** 詞素／單音節來源：只屬於本方言點詞條。targetEntryId 可選，無則為未連結詞素（僅記錄字/粵拼/備註） */
  morphemeRefs?: {
    targetEntryId?: string
    position?: number
    char?: string
    jyutping?: string
    note?: string
  }[]
  dialect: Dialect
  headword: Headword
  phonetic: Phonetic
  entryType: EntryType
  senses: Sense[]
  refs?: EntryRef[]
  theme: ThemeClassification
  meta: EntryMeta
  status: EntryStatus
  createdBy: string
  updatedBy?: string
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  viewCount: number
  likeCount: number
  createdAt: string
  updatedAt: string
  // 兼容舊格式字段
  text?: string
  textNormalized?: string
  region?: string
  themeIdL1?: number
  themeIdL2?: number
  themeIdL3?: number
  definition?: string
  usageNotes?: string
  formalityLevel?: string
  examples?: Example[]
  phoneticNotation?: string
  contributorId?: string
}
```

**Apply this pattern for Phase 1:**
- If shared UI/composable typing requires it, add narrow exported unions such as `AdvancedFilterMode`, `AdvancedFilterFieldKey`, or `AdvancedFilterErrorCode` near the existing finite domain union types.
- Do not add parser implementation details here unless multiple modules genuinely consume them.
- Use literal unions and interfaces; avoid broad `any`.

---

### `app/components/entries/EntriesAdvancedFilterPanel.vue` (component, event-driven request-response UI)

**Analog:** `app/components/entries/ReferenceHeadwordRow.vue` for a compact entry-table UI control with Nuxt UI inputs/buttons and typed emits. Use this file only if the advanced filter controls are extracted from `index.vue`; inline UI in `index.vue` is also acceptable for Phase 1.

**Template input/button pattern** (from `app/components/entries/ReferenceHeadwordRow.vue` lines 19-35):
```vue
<div class="flex flex-wrap items-center gap-2">
  <UInput
    v-model="innerQuery"
    size="xs"
    class="w-40 sm:w-56"
    placeholder="輸入參考詞頭，例如：星星"
    @keyup.enter="handleSearch"
  />
  <UButton
    size="xs"
    color="primary"
    :loading="isLoading"
    @click="handleSearch"
  >
    查詢
  </UButton>
</div>
```

**Props/emits/computed v-model pattern** (from `app/components/entries/ReferenceHeadwordRow.vue` lines 52-73):
```typescript
const props = defineProps<{
  colspan: number
  query: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  search: [value: string]
  dismiss: []
}>()

const innerQuery = computed({
  get: () => props.query,
  set: (val: string) => emit('update:query', val)
})
function handleSearch() {
  const q = innerQuery.value.trim()
  if (!q) return
  emit('search', q)
}
```

**Editable cell typed props/emits pattern for richer entry components** (from `app/components/entries/EntriesEditableCell.vue` lines 266-364):
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
  {
    canEdit: true,
    columnOptions: () => [],
    reviewNotes: '',
    showAiDefinition: false,
    showAiTheme: false,
    aiLoadingDefinition: false,
    aiLoadingInlineDefinition: false,
    aiLoadingTheme: false,
    showExpand: false,
    isExpanded: false,
    expandHint: '',
    isHeadwordExpanded: false,
    headwordExpandHint: '',
    themeId: undefined,
    isThemeExpanded: false,
    themeExpandHint: ''
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
  'update:editValue': [value: any]
  keydown: [event: KeyboardEvent]
  blur: []
  setRef: [el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null]
  'ai-definition': []
  'ai-theme': []
  'expand-click': []
  'headword-expand-click': []
  'theme-expand-click': []
  'accept-theme-ai': []
  'dismiss-theme-ai': []
}>()
```

**Apply this pattern for Phase 1 UI:**
- Use `<script setup lang="ts">`.
- Use typed `defineProps`/`defineEmits`, not untyped emits arrays.
- Use Nuxt UI controls already present in the table: `UInput`, `USelectMenu`, `UButton`, `UTooltip`, and `UAlert`.
- New labels/helper text should be HK Traditional, for example: `進階篩選`, `公式篩選`, `正則搜尋`, `欄位正則篩選`, `可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status`.
- Avoid browser `alert()` for validation feedback; surface typed utility/composable errors inline.

## Shared Patterns

### Hong Kong Traditional Chinese

**Source:** `CLAUDE.md`; examples in `app/utils/entriesTableConstants.ts` and `app/pages/entries/index.vue`.

**Apply to:** all new UI labels, helper text, validation messages, and Chinese comments.

Use existing copy style from `app/utils/entriesTableConstants.ts` lines 13-27:
```typescript
/** 狀態值 → 中文標籤（用於表格顯示） */
export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_review: '待審核',
  approved: '已發佈',
  rejected: '已拒絕'
}
```

### Entry identity and object-reference preservation

**Source:** `app/utils/entryKey.ts`

**Apply to:** filtered entries, grouped filtering, keyboard navigation, selection.

```typescript
export function getEntryKey(entry: Entry | Record<string, unknown>): string | number {
  const e = entry as { id?: string; _tempId?: string }
  return e?.id ?? e?._tempId ?? ''
}

export function getEntryIdString(entry: Entry | Record<string, unknown>): string {
  return String(getEntryKey(entry))
}
```

Planner note: filtered arrays must contain the original `Entry` object references, not cloned entries, because editing, dirty-state, AI suggestions, save, and selection mutate/read those objects by identity/key.

### Field source of truth

**Source:** `app/composables/useEntriesTableColumns.ts`

**Apply to:** formula field whitelist, column regex filters, row context builder.

Use these existing keys and getters (from lines 26-194):
```typescript
const editableColumns = computed<EditableColumnDef[]>(() => [
  { key: 'headword', label: '詞頭', width: '120px', type: 'text', get: (entry: Entry) => { /* ... */ }, set: /* ... */ },
  { key: 'dialect', label: '方言', width: '80px', type: 'select', get: (entry: Entry) => entry.dialect?.name || '', set: /* ... */ },
  { key: 'phonetic', label: '粵拼', width: '100px', type: 'phonetic', get: (entry: Entry) => { /* ... */ }, set: /* ... */ },
  { key: 'entryType', label: '類型', width: '80px', type: 'select', get: (entry: Entry) => entry.entryType || 'word', set: /* ... */ },
  { key: 'theme', label: '分類', width: '140px', type: 'theme', get: (entry: Entry) => entry.theme?.level3Id || undefined, set: /* ... */ },
  { key: 'definition', label: '釋義', width: '200px', type: 'text', get: (entry: Entry) => entry.senses?.[0]?.definition || entry.definition || '', set: /* ... */ },
  { key: 'register', label: '語域', width: '80px', type: 'select', get: (entry: Entry) => entry.meta?.register || '__none__', set: /* ... */ },
  { key: 'status', label: '狀態', width: '80px', type: 'select', get: (entry: Entry) => entry.status || 'draft', set: /* ... */ }
])
```

Planner note: row context may call `get(entry)` and `getCellDisplay(entry, col)`, but advanced filtering must never call `set(entry, value)`.

### Derived filtering over existing data owner

**Source:** `app/composables/useEntriesList.ts` and `app/pages/entries/index.vue`.

**Apply to:** `useEntriesAdvancedFilters.ts` and `index.vue` integration.

The server-backed composable returns `entries`, `aggregatedGroups`, `lexemeGroups`, `loading`, `currentPage`, and `pagination`; advanced filters should consume these and leave `/api/entries` query/cache behavior unchanged:
```typescript
const { entries, aggregatedGroups, lexemeGroups, loading, currentPage, pagination, fetchEntries, handleSearch, handleSort } = useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder, entryBaselineById, makeBaselineSnapshot, applyDraftOntoEntry)
```

### Group filtering shape

**Source:** `app/pages/entries/index.vue` grouped display rows.

**Apply to:** filtering `aggregatedGroups` and `lexemeGroups`.

Preserve group shape exactly:
```typescript
type TableRow = { type: 'group'; group: { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }; groupIndex: number } | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
```

Planner note: filter each `group.entries`, remove empty groups, keep `headwordDisplay` and `headwordNormalized`, and preserve matched entry object references.

### Validation and error handling

**Source:** frontend composable pattern in `app/composables/useEntriesRowHints.ts`.

**Apply to:** formula parser errors, regex compile errors, evaluation errors.

Store typed error state and expose safe HK Traditional messages; do not throw through Vue render/computed paths. Existing pattern:
```typescript
try {
  const res = await $fetch<any>('/api/jyutjyu/search', { query: { q } })
  jyutjyuRefResult.value.set(entryId, {
    loading: false,
    q,
    total: typeof res?.total === 'number' ? res.total : (Array.isArray(res?.results) ? res.results.length : 0),
    results: Array.isArray(res?.results) ? res.results : [],
    errorMessage: ''
  })
} catch (e) {
  jyutjyuRefResult.value.set(entryId, {
    loading: false,
    q,
    total: null,
    results: [],
    errorMessage: '查詢 Jyutjyu 時出現問題，請稍後再試。'
  })
}
```

### LocalStorage persistence boundary

**Source:** `app/pages/entries/index.vue` raw source watch.

**Apply to:** `index.vue` integration only.

Do not change the local draft watch to filtered collections. It must continue scanning `entries`, `aggregatedGroups`, and `lexemeGroups` so dirty rows hidden by advanced filters remain persisted.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/utils/entriesAdvancedFilter.ts` formula parser internals | utility | transform | No existing hand-written formula tokenizer/parser/interpreter exists. Use project utility style from `entryKey.ts`/`entriesTableConstants.ts` and research parser design. |

## Metadata

**Analog search scope:** `app/utils`, `app/composables`, `app/pages/entries`, `app/components/entries`, `app/types`, planning docs.
**Files scanned/read:** 13 source/planning files (`CLAUDE.md`, CONTEXT, RESEARCH, STRUCTURE, CONVENTIONS, `useEntriesList.ts`, `useEntriesTableColumns.ts`, `useEntriesTableEdit.ts`, `useEntriesSelection.ts`, `useColumnResize.ts`, `useEntriesRowHints.ts`, `EntriesEditableCell.vue`, `ReferenceHeadwordRow.vue`, `app/types/index.ts`, `app/pages/entries/index.vue`, constants/utilities already in context).
**Pattern extraction date:** 2026-05-03
