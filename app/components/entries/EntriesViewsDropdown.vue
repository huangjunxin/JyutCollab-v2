<template>
  <div class="flex items-center gap-2 border-l border-gray-200 pl-2 dark:border-gray-600">
    <span class="text-sm text-gray-500 dark:text-gray-400">視圖</span>
    <USelectMenu
      :model-value="selectedModelValue"
      :items="dropdownItems"
      value-key="value"
      size="sm"
      class="w-44"
      :loading="loading"
      @update:model-value="handleSelection"
    >
      <template #item-label="{ item }">
        <div v-if="item.kind === 'section'" class="text-xs font-medium text-gray-500 dark:text-gray-400">
          {{ item.label }}
        </div>
        <div v-else-if="item.kind === 'separator'" class="my-1 h-px w-full bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
        <div v-else class="flex min-w-0 flex-1 items-center justify-between gap-2">
          <div class="min-w-0">
            <div class="truncate">{{ item.label }}</div>
            <div v-if="item.kind === 'saved-view' && item.creatorName && item.creatorId !== currentUserId" class="truncate text-xs text-gray-500 dark:text-gray-400">
              {{ item.creatorName }}
            </div>
          </div>
          <UBadge v-if="item.kind === 'saved-view'" :color="item.visibility === 'public' ? 'success' : 'neutral'" variant="soft" size="xs">
            {{ item.visibility === 'public' ? '公開' : '私人' }}
          </UBadge>
        </div>
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
import type { SavedViewRecord } from '~/composables/useEntriesSavedViews'

type ViewMode = 'flat' | 'aggregated' | 'lexeme'
type DropdownItem =
  | { kind: 'mode'; label: string; value: ViewMode }
  | { kind: 'section'; label: string; value: string; disabled: true }
  | { kind: 'separator'; label: string; value: string; disabled: true }
  | { kind: 'saved-view'; label: string; value: string; id: string; visibility: 'public' | 'private'; creatorId: string; creatorName?: string }
  | { kind: 'action'; label: string; value: 'save-current' | 'manage' | 'share-current' }

const props = withDefaults(defineProps<{
  viewMode: ViewMode
  savedViews: SavedViewRecord[]
  selectedViewId?: string | null
  currentUserId?: string
  loading?: boolean
  error?: string | null
}>(), {
  selectedViewId: null,
  currentUserId: '',
  loading: false,
  error: null
})

const emit = defineEmits<{
  'update:viewMode': [mode: ViewMode]
  'select-saved-view': [view: SavedViewRecord]
  'save-current': []
  manage: []
  'share-current': [view: SavedViewRecord]
}>()

const modeItems: DropdownItem[] = [
  { kind: 'mode', label: '平鋪', value: 'flat' },
  { kind: 'mode', label: '按詞形聚合（參考）', value: 'aggregated' },
  { kind: 'mode', label: '按詞語聚合', value: 'lexeme' }
]

const selectedModelValue = computed(() => props.selectedViewId || props.viewMode)
const selectedSavedView = computed(() => props.savedViews.find(view => view.id === props.selectedViewId) ?? null)
const myViews = computed(() => props.savedViews.filter(view => view.creatorId === props.currentUserId))
const publicViews = computed(() => props.savedViews.filter(view => view.visibility === 'public' && view.creatorId !== props.currentUserId))

function section(label: string): DropdownItem {
  return { kind: 'section', label, value: `section-${label}`, disabled: true }
}

function separator(index: number): DropdownItem {
  return { kind: 'separator', label: '', value: `separator-${index}`, disabled: true }
}

function savedViewItem(view: SavedViewRecord): DropdownItem {
  return {
    kind: 'saved-view',
    label: view.name,
    value: view.id,
    id: view.id,
    visibility: view.visibility,
    creatorId: view.creatorId,
    creatorName: view.creatorName
  }
}

const dropdownItems = computed<DropdownItem[]>(() => {
  const items: DropdownItem[] = [...modeItems, separator(1), section('我的視圖')]
  if (myViews.value.length > 0) items.push(...myViews.value.map(savedViewItem))
  else items.push({ kind: 'section', label: '我的視圖（無）', value: 'empty-my-views', disabled: true })

  items.push(section('公開視圖'))
  if (publicViews.value.length > 0) items.push(...publicViews.value.map(savedViewItem))
  else items.push({ kind: 'section', label: '公開視圖（無）', value: 'empty-public-views', disabled: true })

  if (props.error) items.push({ kind: 'section', label: '載入視圖列表失敗', value: 'views-error', disabled: true })

  items.push(separator(2))
  items.push({ kind: 'action', label: '儲存目前視圖...', value: 'save-current' })
  items.push({ kind: 'action', label: '管理視圖...', value: 'manage' })
  if (selectedSavedView.value) items.push({ kind: 'action', label: '分享', value: 'share-current' })
  return items
})

function isViewMode(value: unknown): value is ViewMode {
  return value === 'flat' || value === 'aggregated' || value === 'lexeme'
}

function findItem(input: unknown): DropdownItem | undefined {
  if (typeof input === 'object' && input && 'value' in input) return input as DropdownItem
  return dropdownItems.value.find(item => item.value === input)
}

function handleSelection(input: unknown) {
  const item = findItem(input)
  if (!item || item.kind === 'section' || item.kind === 'separator') return
  if (item.kind === 'mode' || isViewMode(item.value)) {
    emit('update:viewMode', item.value as ViewMode)
    return
  }
  if (item.kind === 'saved-view' || String(item.value).startsWith('view_')) {
    const view = props.savedViews.find(candidate => candidate.id === item.value)
    if (view) emit('select-saved-view', view)
    return
  }
  if (item.value === 'save-current') emit('save-current')
  if (item.value === 'manage') emit('manage')
  if (item.value === 'share-current' && selectedSavedView.value) emit('share-current', selectedSavedView.value)
}
</script>
