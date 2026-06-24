<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-heroicons-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label="返回詞條列表"
          @click="$emit('back')"
        />
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">視圖與設定</h2>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="flex-1 px-3 py-2.5 text-xs font-medium text-center transition-colors border-b-2"
          :class="activeTab === tab.key
            ? 'border-primary text-primary'
            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'"
          :aria-pressed="activeTab === tab.key"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab content -->
    <div class="flex-1 overflow-auto">
      <!-- ===== 篩選 tab ===== -->
      <div v-if="activeTab === 'filter'" class="px-4 py-3 space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">方言</label>
          <USelectMenu
            v-model="filterDialectModel"
            :items="filterDialectOptions"
            value-key="value"
            size="sm"
            class="w-full"
            placeholder="全部方言"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">狀態</label>
          <USelectMenu
            v-model="filterStatusModel"
            :items="statusFilterOptions"
            value-key="value"
            size="sm"
            class="w-full"
            placeholder="全部狀態"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">主題分類</label>
          <USelectMenu
            v-model="filterThemeModel"
            :items="themeFilterOptions"
            value-key="value"
            size="sm"
            class="w-full"
            placeholder="全部分類"
          />
        </div>
        <div class="pt-2 flex gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="soft"
            block
            @click="clearAllFilters"
          >
            清除篩選
          </UButton>
        </div>
      </div>

      <!-- ===== 排序 tab ===== -->
      <div v-if="activeTab === 'sort'" class="px-4 py-3 space-y-3">
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">排序欄位</label>
          <USelectMenu
            v-model="localSortBy"
            :items="sortFieldOptions"
            value-key="value"
            size="sm"
            class="w-full"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">排序方向</label>
          <div class="flex gap-2">
            <button
              class="flex-1 px-3 py-2 text-sm text-center border transition-colors"
              :class="localSortOrder === 'asc'
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]'"
              @click="applySortOrder('asc')"
            >
              升序
            </button>
            <button
              class="flex-1 px-3 py-2 text-sm text-center border transition-colors"
              :class="localSortOrder === 'desc'
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]'"
              @click="applySortOrder('desc')"
            >
              降序
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 佈局 tab ===== -->
      <div v-if="activeTab === 'layout'" class="px-4 py-3 space-y-4">
        <section aria-labelledby="mobile-builtin-views-heading">
          <h3 id="mobile-builtin-views-heading" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">內建視圖</h3>
          <div class="space-y-1">
            <button
              v-for="view in builtinViews"
              :key="view.value"
              type="button"
              class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
              :aria-pressed="currentViewMode === view.value"
              :aria-label="`切換到${view.label}視圖`"
              @click="$emit('select-view', view.value)"
            >
              <div class="flex items-center gap-3">
                <UIcon :name="view.icon" class="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span class="text-sm text-gray-900 dark:text-white">{{ view.label }}</span>
              </div>
              <UIcon
                v-if="currentViewMode === view.value"
                name="i-heroicons-check"
                class="w-5 h-5 text-primary"
              />
            </button>
          </div>
        </section>

        <!-- Density -->
        <section aria-labelledby="mobile-density-heading">
          <h3 id="mobile-density-heading" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">列表密度</h3>
          <div class="flex gap-2" role="group" aria-labelledby="mobile-density-heading">
            <button
              v-for="d in densityOptions"
              :key="d.value"
              type="button"
              class="flex-1 px-3 py-2 text-sm text-center border transition-colors"
              :class="density === d.value
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]'"
              :aria-pressed="density === d.value"
              :aria-label="`切換到${d.label}密度`"
              @click="$emit('update:density', d.value)"
            >
              {{ d.label }}
            </button>
          </div>
        </section>

        <!-- Sticky first column -->
        <div>
          <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">首欄固定</label>
          <button
            type="button"
            class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]"
            :aria-pressed="stickyFirstColumn"
            @click="$emit('update:stickyFirstColumn', !stickyFirstColumn)"
          >
            <span class="text-sm text-gray-900 dark:text-white">固定詞頭欄</span>
            <span
              class="inline-block w-8 h-4 rounded-full transition-colors relative"
              :class="stickyFirstColumn ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'"
            >
              <span
                class="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                :class="{ 'translate-x-4': stickyFirstColumn }"
              />
            </span>
          </button>
        </div>

        <!-- Column display -->
        <section aria-labelledby="mobile-columns-heading" aria-describedby="mobile-columns-description">
          <h3 id="mobile-columns-heading" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">顯示欄位</h3>
          <p id="mobile-columns-description" class="text-xs text-gray-500 dark:text-gray-400 mb-2">詞頭、方言、粵拼、狀態為固定欄位。</p>
          <div class="space-y-1">
            <label
              v-for="col in optionalColumns"
              :key="col.key"
              :for="`mobile-column-${col.key}`"
              class="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] cursor-pointer"
            >
              <span class="text-sm text-gray-900 dark:text-white">{{ col.label }}</span>
              <input
                :id="`mobile-column-${col.key}`"
                type="checkbox"
                class="rounded border-gray-300"
                :checked="enabledColumnKeys.includes(col.key)"
                :aria-label="`顯示${col.label}欄位`"
                @change="$emit('toggle-column', col.key)"
              />
            </label>
          </div>
        </section>
      </div>

      <!-- ===== 規則 tab ===== -->
      <div v-if="activeTab === 'rules'" class="px-4 py-3">
        <div class="text-center py-8">
          <UIcon name="i-heroicons-paint-brush" class="w-10 h-10 text-gray-400 mb-3 mx-auto" />
          <p class="text-sm text-gray-500 dark:text-gray-400">條件着色規則將在後續階段支援。</p>
        </div>
      </div>
    </div>

    <!-- Bottom: saved views + save current -->
    <div class="flex-shrink-0 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <section class="px-4 py-3" aria-labelledby="mobile-saved-views-heading">
        <div class="flex items-center justify-between mb-2">
          <h3 id="mobile-saved-views-heading" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">已儲存視圖</h3>
          <UButton
            size="xs"
            variant="ghost"
            color="primary"
            icon="i-heroicons-plus"
            @click="$emit('save-current-view')"
          >
            儲存目前
          </UButton>
        </div>
        <div v-if="savedViews.length > 0" class="space-y-1 max-h-32 overflow-auto">
          <button
            v-for="view in savedViews"
            :key="view.id"
            type="button"
            class="w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50 dark:bg-slate-900 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-100 dark:hover:bg-slate-700/50"
            :aria-pressed="selectedViewId === view.id"
            :aria-label="`套用${view.name}視圖`"
            @click="$emit('apply-saved-view', view)"
          >
            <div class="min-w-0 flex-1">
              <span class="text-sm text-gray-900 dark:text-white block truncate">{{ view.name }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ view.creatorName || '未知用戶' }}</span>
            </div>
            <UIcon
              v-if="selectedViewId === view.id"
              name="i-heroicons-check"
              class="w-4 h-4 text-primary shrink-0 ml-2"
            />
          </button>
        </div>
        <p v-else class="text-xs text-gray-500 dark:text-gray-400">暫無已儲存視圖</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SavedViewRecord } from '~/composables/useEntriesSavedViews'
import { ALL_FILTER_VALUE } from '~/utils/entriesTableConstants'

type ColumnDef = { key: string; label: string; width: string; type: string }

const props = defineProps<{
  // View
  currentViewMode: string
  selectedViewId: string | null
  savedViews: SavedViewRecord[]

  // Layout
  density: 'standard' | 'compact'
  stickyFirstColumn: boolean
  optionalColumns: ColumnDef[]
  enabledColumnKeys: string[]

  // Sort
  sortBy: string
  sortOrder: 'asc' | 'desc'

  // Filters
  filterDialect: string
  filterStatus: string
  filterTheme: string
  filterDialectOptions: Array<{ value: string; label: string }>
  themeFilterOptions: Array<{ value: string; label: string }>
  statusFilterOptions: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'back': []
  'select-view': [mode: string]
  'apply-saved-view': [view: SavedViewRecord]
  'save-current-view': []

  // Layout
  'update:density': [value: 'standard' | 'compact']
  'update:stickyFirstColumn': [value: boolean]
  'toggle-column': [key: string]

  // Sort
  'update:sortBy': [value: string]
  'update:sortOrder': [value: 'asc' | 'desc']

  // Filters
  'update:filterDialect': [value: string]
  'update:filterStatus': [value: string]
  'update:filterTheme': [value: string]
}>()

// --- Tabs ---
const tabs = [
  { key: 'filter', label: '篩選' },
  { key: 'sort', label: '排序' },
  { key: 'layout', label: '佈局' },
  { key: 'rules', label: '規則' }
]
const activeTab = ref('filter')

const builtinViews = [
  { value: 'flat', label: '平鋪', icon: 'i-heroicons-list-bullet' },
  { value: 'aggregated', label: '按詞形', icon: 'i-heroicons-squares-2x2' },
  { value: 'lexeme', label: '按詞語', icon: 'i-heroicons-language' }
]

// --- Density ---
const densityOptions = [
  { value: 'standard' as const, label: '標準' },
  { value: 'compact' as const, label: '緊湊' }
]

// --- Sort ---
const sortFieldOptions = [
  { value: 'createdAt', label: '創建時間' },
  { value: 'updatedAt', label: '更新時間' },
  { value: 'headword', label: '詞頭' },
  { value: 'viewCount', label: '瀏覽次數' },
  { value: 'likeCount', label: '收藏次數' }
]

const localSortBy = computed({
  get: () => props.sortBy,
  set: (v: string) => emit('update:sortBy', v)
})

const localSortOrder = ref(props.sortOrder)
watch(() => props.sortOrder, (v) => { localSortOrder.value = v })

function applySortOrder(order: 'asc' | 'desc') {
  localSortOrder.value = order
  emit('update:sortOrder', order)
}

// --- Filters ---
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

function clearAllFilters() {
  emit('update:filterDialect', ALL_FILTER_VALUE)
  emit('update:filterStatus', ALL_FILTER_VALUE)
  emit('update:filterTheme', ALL_FILTER_VALUE)
}
</script>
