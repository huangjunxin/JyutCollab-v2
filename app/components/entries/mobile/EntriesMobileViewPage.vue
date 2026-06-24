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
          @click="$emit('back')"
        />
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">視圖與設定</h2>
      </div>
    </div>

    <div class="flex-1 overflow-auto">
      <!-- Built-in views -->
      <div class="px-4 py-3">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">內建視圖</h3>
        <div class="space-y-1">
          <button
            v-for="view in builtinViews"
            :key="view.value"
            class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
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
      </div>

      <!-- Saved views -->
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">已儲存視圖</h3>
        <div v-if="savedViews.length > 0" class="space-y-1">
          <button
            v-for="view in savedViews"
            :key="view.id"
            class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
            @click="$emit('apply-saved-view', view)"
          >
            <div class="min-w-0">
              <span class="text-sm text-gray-900 dark:text-white block truncate">{{ view.name }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ view.creatorName || '未知用戶' }}</span>
            </div>
            <UIcon
              v-if="selectedViewId === view.id"
              name="i-heroicons-check"
              class="w-5 h-5 text-primary shrink-0"
            />
          </button>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">暫無已儲存視圖</p>
      </div>

      <!-- Grid density -->
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">列表密度</h3>
        <div class="flex gap-2">
          <button
            v-for="d in densityOptions"
            :key="d.value"
            class="flex-1 px-3 py-2 text-sm text-center border transition-colors"
            :class="density === d.value
              ? 'bg-primary text-white border-primary'
              : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]'"
            @click="$emit('update:density', d.value)"
          >
            {{ d.label }}
          </button>
        </div>
      </div>

      <!-- Column settings -->
      <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">顯示欄位</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">詞頭、方言、粵拼、狀態為固定欄位。</p>
        <div class="space-y-1">
          <label
            v-for="col in optionalColumns"
            :key="col.key"
            class="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] cursor-pointer"
          >
            <span class="text-sm text-gray-900 dark:text-white">{{ col.label }}</span>
            <input
              type="checkbox"
              class="rounded border-gray-300"
              :checked="enabledColumnKeys.includes(col.key)"
              @change="$emit('toggle-column', col.key)"
            />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SavedViewRecord } from '~/composables/useEntriesSavedViews'

type ColumnDef = { key: string; label: string; width: string; type: string }

defineProps<{
  currentViewMode: string
  selectedViewId: string | null
  savedViews: SavedViewRecord[]
  density: 'standard' | 'compact'
  optionalColumns: ColumnDef[]
  enabledColumnKeys: string[]
}>()

defineEmits<{
  'back': []
  'select-view': [mode: string]
  'apply-saved-view': [view: SavedViewRecord]
  'update:density': [value: 'standard' | 'compact']
  'toggle-column': [key: string]
}>()

const builtinViews = [
  { value: 'flat', label: '平鋪', icon: 'i-heroicons-list-bullet' },
  { value: 'aggregated', label: '按詞形', icon: 'i-heroicons-squares-2x2' },
  { value: 'lexeme', label: '按詞語', icon: 'i-heroicons-language' }
]

const densityOptions = [
  { value: 'standard' as const, label: '標準' },
  { value: 'compact' as const, label: '緊湊' }
]
</script>
