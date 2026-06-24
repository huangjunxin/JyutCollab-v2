<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Row editor view -->
    <EntriesMobileRowEditor
      v-if="activeEntry"
      :entry="activeEntry"
      :dialect-options="dialectOptions"
      :status-options="statusOptions"
      :can-change-status="canChangeStatus"
      :is-saving="isEntrySaving(activeEntry)"
      @back="closeRowEditor"
      @save="(entry) => $emit('save-entry', entry)"
      @cancel="(entry) => { $emit('cancel-entry', entry); closeRowEditor() }"
      @duplicate="(entry) => $emit('duplicate-entry', entry)"
      @delete="(entry) => $emit('delete-entry', entry)"
      @update:entry="(entry) => $emit('update:entry', entry)"
    />

    <!-- View page -->
    <EntriesMobileViewPage
      v-else-if="showViewPage"
      :current-view-mode="viewMode"
      :selected-view-id="selectedViewId"
      :saved-views="savedViews"
      :density="density"
      :sticky-first-column="stickyFirstColumn"
      :optional-columns="optionalColumns"
      :enabled-column-keys="enabledOptionalKeys"
      :sort-by="sortBy"
      :sort-order="sortOrder"
      :filter-dialect="filterDialect"
      :filter-status="filterStatus"
      :filter-theme="filterTheme"
      :filter-dialect-options="filterDialectOptions"
      :theme-filter-options="themeFilterOptions"
      :status-filter-options="statusFilterOptions"
      @back="closeViewPage"
      @select-view="(v) => { $emit('update:viewMode', v); closeViewPage() }"
      @apply-saved-view="(view) => { $emit('apply-saved-view', view); closeViewPage() }"
      @save-current-view="$emit('save-current-view')"
      @update:density="(v) => density = v"
      @update:sticky-first-column="(v) => stickyFirstColumn = v"
      @toggle-column="toggleOptionalColumn"
      @update:sort-by="(v) => $emit('update:sortBy', v)"
      @update:sort-order="(v) => $emit('update:sortOrder', v)"
      @update:filter-dialect="(v) => $emit('update:filterDialect', v)"
      @update:filter-status="(v) => $emit('update:filterStatus', v)"
      @update:filter-theme="(v) => $emit('update:filterTheme', v)"
    />

    <!-- Grid view -->
    <template v-else>
      <!-- Compact header -->
      <div class="flex-shrink-0 px-3 py-2.5 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <h1 class="jc-serif text-base font-bold text-gray-900 dark:text-white truncate">詞條列表</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {{ viewModeLabel }} · {{ pagination.total }} 條
              <span v-if="hasUnsavedChanges" class="ml-1 text-amber-600">· 有未儲存更改</span>
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <UButton
              v-if="hasUnsavedChanges"
              icon="i-heroicons-cloud-arrow-up"
              color="warning"
              variant="soft"
              size="xs"
              :loading="saving"
              @click="$emit('save-all')"
            >
              儲存
            </UButton>
            <UButton
              icon="i-heroicons-funnel"
              :variant="controlsExpanded || hasActiveMobileControls ? 'soft' : 'ghost'"
              :color="controlsExpanded || hasActiveMobileControls ? 'primary' : 'neutral'"
              size="xs"
              :aria-label="controlsExpanded ? '隱藏搜尋篩選' : '顯示搜尋篩選'"
              @click="controlsExpanded = !controlsExpanded"
            />
            <UButton
              icon="i-heroicons-cog-6-tooth"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openViewPage"
            />
            <UButton
              v-if="isAuthenticated"
              icon="i-heroicons-plus"
              color="primary"
              size="xs"
              class="shadow-[var(--jc-shadow-hard)]"
              @click="handleAddNew"
            >
              新建
            </UButton>
          </div>
        </div>
      </div>

      <div
        v-if="controlsExpanded || hasActiveMobileControls"
        class="flex-shrink-0 px-3 py-2 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-gray-50 dark:bg-slate-900"
      >
        <UInput
          v-model="localSearchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="搜尋詞條..."
          size="sm"
          class="w-full"
          :ui="{ base: 'bg-white dark:bg-slate-800' }"
          @keyup.enter="$emit('search', localSearchQuery)"
        >
          <template #trailing>
            <UButton
              v-if="localSearchQuery"
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="xs"
              class="p-0.5"
              @click="localSearchQuery = ''; $emit('search', '')"
            />
          </template>
        </UInput>
        <div class="grid grid-cols-3 gap-1.5 mt-2 w-full">
          <USelectMenu
            v-model="filterDialectModel"
            :items="filterDialectOptions"
            value-key="value"
            size="xs"
            class="min-w-0 w-full"
            placeholder="方言"
          />
          <USelectMenu
            v-model="filterStatusModel"
            :items="statusFilterOptions"
            value-key="value"
            size="xs"
            class="min-w-0 w-full"
            placeholder="狀態"
          />
          <USelectMenu
            v-model="filterThemeModel"
            :items="themeFilterOptions"
            value-key="value"
            size="xs"
            class="min-w-0 w-full"
            placeholder="分類"
          />
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex-1 min-h-0 flex items-center justify-center">
        <div class="relative">
          <div class="w-10 h-10 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="isEmpty" class="flex-1 flex flex-col items-center justify-center px-4">
        <UIcon name="i-heroicons-table-cells" class="w-12 h-12 text-gray-400 mb-3" />
        <p class="text-sm text-gray-500 dark:text-gray-400 text-center">
          {{ searchQuery ? '沒有找到匹配的詞條' : '暫無詞條' }}
        </p>
      </div>

      <!-- Grid (supports both flat and grouped rows) -->
      <EntriesMobileGrid
        v-else
        class="flex-1 min-h-0"
        :rows="displayRows"
        :columns="mobileColumns"
        :expanded-groups="expandedGroupKeys"
        :density="density"
        :sticky-first-column="stickyFirstColumn"
        :get-cell-display="getCellDisplay"
        :get-cell-class="getCellClass"
        @row-click="handleRowClick"
        @toggle-group="toggleGroup"
      />

      <!-- Pagination -->
      <div v-if="!loading && !isEmpty && pagination.totalPages > 1" class="flex-shrink-0 px-4 py-2 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-gray-50 dark:bg-slate-900 flex items-center justify-between">
        <span class="text-xs text-gray-500 dark:text-gray-400">
          {{ (pagination.page - 1) * pagination.perPage + 1 }}-{{ Math.min(pagination.page * pagination.perPage, pagination.total) }} / {{ pagination.total }}
        </span>
        <div class="flex items-center gap-1">
          <UButton
            icon="i-heroicons-chevron-left"
            variant="ghost"
            color="neutral"
            size="xs"
            :disabled="currentPage <= 1"
            @click="$emit('update:currentPage', currentPage - 1)"
          />
          <span class="text-xs text-gray-600 dark:text-gray-300 px-2">{{ currentPage }} / {{ pagination.totalPages }}</span>
          <UButton
            icon="i-heroicons-chevron-right"
            variant="ghost"
            color="neutral"
            size="xs"
            :disabled="currentPage >= pagination.totalPages"
            @click="$emit('update:currentPage', currentPage + 1)"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import type { SavedViewRecord } from '~/composables/useEntriesSavedViews'
import { ALL_FILTER_VALUE } from '~/utils/entriesTableConstants'
import EntriesMobileRowEditor from './EntriesMobileRowEditor.vue'
import EntriesMobileGrid from './EntriesMobileGrid.vue'
import EntriesMobileViewPage from './EntriesMobileViewPage.vue'

type MobileGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }
type MobileRow =
  | { type: 'group'; group: MobileGroup; groupIndex: number }
  | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }
type EditableColumnDef = { key: string; label: string; width: string; type: string; get: (e: Entry) => unknown; set: (e: Entry, v: any) => void }

const props = defineProps<{
  // Data
  filteredEntries: Entry[]
  tableRows: MobileRow[]
  viewMode: 'flat' | 'aggregated' | 'lexeme'
  pagination: { page: number; perPage: number; total: number; totalPages: number }
  currentPage: number
  loading: boolean
  isEmpty: boolean
  searchQuery: string
  hasUnsavedChanges: boolean
  saving: boolean
  isAuthenticated: boolean

  // Display
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
  getCellClass: (entry: Entry, field: string) => string[]

  // Editing
  dialectOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  canChangeStatus: boolean
  isEntrySaving: (entry: Entry) => boolean

  // Filters
  filterDialect: string
  filterStatus: string
  filterTheme: string
  filterDialectOptions: Array<{ value: string; label: string }>
  themeFilterOptions: Array<{ value: string; label: string }>
  statusFilterOptions: Array<{ value: string; label: string }>

  // Sort
  sortBy: string
  sortOrder: 'asc' | 'desc'

  // Saved views
  savedViews: SavedViewRecord[]
  selectedViewId: string | null

  // Expanded groups (from parent for persistence)
  expandedGroupKeys: Set<string>
}>()

const emit = defineEmits<{
  'search': [query: string]
  'add-new': []
  'save-all': []
  'row-click': [entry: Entry]
  'update:currentPage': [page: number]
  'save-entry': [entry: Entry]
  'cancel-entry': [entry: Entry]
  'duplicate-entry': [entry: Entry]
  'delete-entry': [entry: Entry]
  'update:entry': [entry: Entry]
  'update:viewMode': [mode: string]
  'update:filterDialect': [value: string]
  'update:filterStatus': [value: string]
  'update:filterTheme': [value: string]
  'apply-saved-view': [view: SavedViewRecord]
  'toggle-group-expanded': [key: string]
  'update:sortBy': [value: string]
  'update:sortOrder': [value: 'asc' | 'desc']
  'save-current-view': []
}>()

const localSearchQuery = ref(props.searchQuery)
const controlsExpanded = ref(false)

watch(() => props.searchQuery, (val) => {
  localSearchQuery.value = val
})

const activeEntry = ref<Entry | null>(null)
const showViewPage = ref(false)

// In-page back closes local state first, then consumes the pushed history entry.
const skipNextPopState = ref(false)

// --- Navigation: Row Editor ---
function openRowEditor(entry: Entry) {
  activeEntry.value = entry
  history.pushState({ mobileEditor: true }, '')
}

function closeRowEditor() {
  if (history.state?.mobileEditor) {
    activeEntry.value = null
    skipNextPopState.value = true
    history.back()
  } else {
    activeEntry.value = null
  }
}

// --- Navigation: View Page ---
function openViewPage() {
  showViewPage.value = true
  history.pushState({ mobileViewPage: true }, '')
}

function closeViewPage() {
  if (history.state?.mobileViewPage) {
    showViewPage.value = false
    skipNextPopState.value = true
    history.back()
  } else {
    showViewPage.value = false
  }
}

// --- Browser back button ---
function handlePopState() {
  if (skipNextPopState.value) {
    skipNextPopState.value = false
    return
  }
  // Close whichever sub-page is active (row editor takes priority)
  if (activeEntry.value) {
    activeEntry.value = null
  } else if (showViewPage.value) {
    showViewPage.value = false
  }
}

onMounted(() => {
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})

const viewModeLabel = computed(() => ({
  flat: '平鋪',
  aggregated: '按詞形',
  lexeme: '按詞語'
}[props.viewMode] ?? '平鋪'))

const hasActiveMobileControls = computed(() => {
  return localSearchQuery.value.trim().length > 0 ||
    isActiveFilter(props.filterDialect) ||
    isActiveFilter(props.filterStatus) ||
    isActiveFilter(props.filterTheme)
})

// --- Grid density (persisted) ---
type GridDensity = 'standard' | 'compact'
const density = ref<GridDensity>(
  import.meta.client
    ? (localStorage.getItem('jyutcollab-mobile-density') as GridDensity) || 'standard'
    : 'standard'
)
watch(density, (v) => {
  if (import.meta.client) localStorage.setItem('jyutcollab-mobile-density', v)
})

// --- Sticky first column (persisted) ---
const stickyFirstColumn = ref(
  import.meta.client
    ? localStorage.getItem('jyutcollab-mobile-sticky-first') !== 'false' // default true
    : true
)
watch(stickyFirstColumn, (v) => {
  if (import.meta.client) localStorage.setItem('jyutcollab-mobile-sticky-first', String(v))
})

// --- Column settings (persisted) ---
const CORE_COLUMN_KEYS = ['headword', 'dialect', 'phonetic', 'status'] as const

const ALL_COLUMN_DEFS: EditableColumnDef[] = [
  { key: 'headword', label: '詞頭', width: '94', type: 'text', get: (e) => e.headword?.display || e.text || '', set: () => {} },
  { key: 'dialect', label: '方言', width: '52', type: 'select', get: (e) => e.dialect?.name || '', set: () => {} },
  { key: 'phonetic', label: '粵拼', width: '92', type: 'phonetic', get: (e) => e.phonetic?.jyutping?.[0] || '', set: () => {} },
  { key: 'entryType', label: '類型', width: '56', type: 'select', get: (e) => e.entryType || 'word', set: () => {} },
  { key: 'theme', label: '分類', width: '96', type: 'theme', get: (e) => e.theme?.level3Id ? (e.theme.level3 || '') : '', set: () => {} },
  { key: 'definition', label: '釋義', width: '140', type: 'text', get: (e) => e.senses?.[0]?.definition || '', set: () => {} },
  { key: 'register', label: '語域', width: '56', type: 'select', get: (e) => e.meta?.register || '', set: () => {} },
  { key: 'status', label: '狀態', width: '66', type: 'select', get: (e) => e.status || 'draft', set: () => {} },
]

const enabledOptionalKeys = ref<string[]>(
  import.meta.client
    ? JSON.parse(localStorage.getItem('jyutcollab-mobile-columns') || '[]')
    : []
)
watch(enabledOptionalKeys, (v) => {
  if (import.meta.client) localStorage.setItem('jyutcollab-mobile-columns', JSON.stringify(v))
}, { deep: true })

const mobileColumns = computed<EditableColumnDef[]>(() => {
  const enabledSet = new Set(enabledOptionalKeys.value)
  return ALL_COLUMN_DEFS.filter(col =>
    (CORE_COLUMN_KEYS as readonly string[]).includes(col.key) || enabledSet.has(col.key)
  )
})

function toggleOptionalColumn(key: string) {
  const idx = enabledOptionalKeys.value.indexOf(key)
  if (idx >= 0) {
    enabledOptionalKeys.value.splice(idx, 1)
  } else {
    enabledOptionalKeys.value.push(key)
  }
}

const optionalColumns = computed(() =>
  ALL_COLUMN_DEFS.filter(c => !(CORE_COLUMN_KEYS as readonly string[]).includes(c.key))
)

// Filter models (two-way computed for USelectMenu)
const filterDialectModel = computed({
  get: () => props.filterDialect || ALL_FILTER_VALUE,
  set: (v: string) => emit('update:filterDialect', v)
})
const filterStatusModel = computed({
  get: () => props.filterStatus || ALL_FILTER_VALUE,
  set: (v: string) => emit('update:filterStatus', v)
})
const filterThemeModel = computed({
  get: () => props.filterTheme || ALL_FILTER_VALUE,
  set: (v: string) => emit('update:filterTheme', v)
})

function isActiveFilter(value: string) {
  return Boolean(value && value !== ALL_FILTER_VALUE)
}

// Display rows: in aggregated/lexeme mode, show groups + expanded entries;
// in flat mode, show only entry rows.
const displayRows = computed((): MobileRow[] => {
  if (props.viewMode === 'flat') {
    return props.tableRows.filter((r): r is MobileRow => r.type === 'entry')
  }
  // For aggregated/lexeme: tableRows already contains group + entry rows from index.vue's tableRows computed.
  // The parent passes the full tableRows which includes group rows and their expanded entries.
  return props.tableRows
})

function toggleGroup(headwordNormalized: string) {
  emit('toggle-group-expanded', headwordNormalized)
}

function handleRowClick(entry: Entry) {
  openRowEditor(entry)
  emit('row-click', entry)
}

function handleAddNew() {
  emit('add-new')
  nextTick(() => {
    const firstRow = props.tableRows.find(r => r.type === 'entry')
    if (firstRow && (firstRow.entry as any)._isNew) {
      openRowEditor(firstRow.entry)
    }
  })
}
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
