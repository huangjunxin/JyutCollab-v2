<template>
  <div>
    <!-- Page header -->
    <div class="mb-4">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <UIcon name="i-heroicons-clock" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            編輯歷史
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            共 <span class="font-semibold text-gray-700 dark:text-gray-300">{{ pagination.total }}</span> 條記錄
          </p>
        </div>
      </div>
    </div>

    <!-- Search filter -->
    <div class="mb-4 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <UInput
            v-model="searchEntryId"
            placeholder="搜索詞條 ID 或詞條文本..."
            icon="i-heroicons-magnifying-glass"
            size="sm"
            class="w-full"
          />
        </div>
        <div class="flex gap-2">
          <USelectMenu
            v-model="filterAction"
            :items="actionOptions"
            value-key="value"
            placeholder="操作類型"
            size="sm"
            class="w-32"
          />
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-primary" />
    </div>

    <!-- Empty state -->
    <div v-else-if="histories.length === 0" class="text-center py-12">
      <UIcon name="i-heroicons-clock" class="w-16 h-16 mx-auto text-gray-400" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">暫無歷史記錄</h3>
    </div>

    <!-- History timeline -->
    <div v-else class="space-y-3">
      <UCard
        v-for="history in histories"
        :key="history.id"
        class="hover:shadow-md transition-shadow cursor-pointer"
        @click="showDiff(history)"
      >
        <div class="flex items-center justify-between gap-4">
          <!-- Left: Action Badge + Entry Info -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <UBadge
              :color="getActionColor(history.action)"
              variant="subtle"
              size="lg"
            >
              {{ getActionLabel(history.action) }}
            </UBadge>

            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {{ getEntryDisplay(history) }}
                </span>
                <UBadge
                  v-if="history.isReverted"
                  color="gray"
                  variant="subtle"
                  size="xs"
                >
                  已撤銷
                </UBadge>
              </div>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span v-if="history.user">{{ history.user.displayName || history.user.username }}</span>
                <span v-if="history.user">·</span>
                <span>{{ formatDate(history.createdAt) }}</span>
              </div>
            </div>
          </div>

          <!-- Right: Changed Fields + Arrow -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <div v-if="getActualChangedFields(history).length > 0" class="hidden sm:flex items-center gap-1">
              <UBadge
                v-for="field in getActualChangedFields(history).slice(0, 3)"
                :key="field"
                color="gray"
                variant="subtle"
                size="xs"
              >
                {{ field }}
              </UBadge>
              <span v-if="getActualChangedFields(history).length > 3" class="text-xs text-gray-400">
                +{{ getActualChangedFields(history).length - 3 }}
              </span>
            </div>
            <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <!-- Mobile: Changed Fields on second line -->
        <div v-if="getActualChangedFields(history).length > 0" class="sm:hidden mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <span class="text-xs text-gray-500 dark:text-gray-400">修改字段: </span>
          <UBadge
            v-for="field in getActualChangedFields(history).slice(0, 3)"
            :key="field"
            color="gray"
            variant="subtle"
            size="xs"
            class="mr-1"
          >
            {{ field }}
          </UBadge>
          <span v-if="getActualChangedFields(history).length > 3" class="text-xs text-gray-400">
            +{{ getActualChangedFields(history).length - 3 }}
          </span>
        </div>
      </UCard>

      <!-- Pagination -->
      <div class="flex justify-center mt-6">
        <UPagination
          v-model:page="currentPage"
          :total="pagination.total"
          :items-per-page="pagination.perPage"
        />
      </div>
    </div>

    <!-- Diff Modal -->
    <UModal v-model:open="diffModalOpen">
      <template #content>
        <UCard class="max-w-3xl max-h-[90vh] overflow-y-auto">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">修改詳情</h3>
              <div class="flex items-center gap-2">
                <UBadge
                  v-if="selectedHistory"
                  :color="getActionColor(selectedHistory.action)"
                  variant="subtle"
                >
                  {{ getActionLabel(selectedHistory.action) }}
                </UBadge>
                <UButton
                  color="gray"
                  variant="ghost"
                  icon="i-heroicons-x-mark"
                  size="sm"
                  @click="diffModalOpen = false"
                />
              </div>
            </div>
          </template>

          <div v-if="selectedHistory" class="space-y-4">
            <!-- Meta info -->
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400 pb-3 border-b border-gray-200 dark:border-gray-700">
              <span>
                <span class="font-medium">詞條:</span>
                {{ getEntryDisplay(selectedHistory) }}
              </span>
              <span v-if="selectedHistory.user">
                <span class="font-medium">操作者:</span>
                {{ selectedHistory.user.displayName || selectedHistory.user.username }}
              </span>
              <span>
                <span class="font-medium">時間:</span>
                {{ formatDate(selectedHistory.createdAt) }}
              </span>
            </div>

            <!-- Changed fields summary -->
            <div v-if="actualChangedFields.length > 0">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">變更字段</h4>
              <div class="flex flex-wrap gap-1">
                <UBadge
                  v-for="field in actualChangedFields"
                  :key="field"
                  color="primary"
                  variant="subtle"
                  size="xs"
                >
                  {{ field }}
                </UBadge>
              </div>
            </div>

            <!-- Diff view toggle -->
            <div class="flex items-center gap-2 mb-3">
              <UButtonGroup>
                <UButton
                  :color="diffViewMode === 'unified' ? 'primary' : 'gray'"
                  :variant="diffViewMode === 'unified' ? 'solid' : 'ghost'"
                  size="xs"
                  @click="diffViewMode = 'unified'"
                >
                  差異視圖
                </UButton>
                <UButton
                  :color="diffViewMode === 'split' ? 'primary' : 'gray'"
                  :variant="diffViewMode === 'split' ? 'solid' : 'ghost'"
                  size="xs"
                  @click="diffViewMode = 'split'"
                >
                  對比視圖
                </UButton>
              </UButtonGroup>
            </div>

            <!-- Unified diff view (only show changes) -->
            <div v-if="diffViewMode === 'unified'" class="diff-container">
              <div v-if="diffChanges.length === 0" class="p-4 text-center text-gray-500 text-sm">
                無變化
              </div>
              <div v-else class="max-h-96 overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                    <tr>
                      <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-1/3">字段</th>
                      <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-1/3">原值</th>
                      <th class="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-1/3">新值</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr
                      v-for="(change, index) in diffChanges"
                      :key="index"
                      :class="{
                        'bg-green-50 dark:bg-green-900/20': change.type === 'added',
                        'bg-red-50 dark:bg-red-900/20': change.type === 'removed',
                        'bg-yellow-50 dark:bg-yellow-900/20': change.type === 'modified'
                      }"
                    >
                      <td class="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                        <span class="inline-flex items-center gap-1">
                          <UIcon
                            v-if="change.type === 'added'"
                            name="i-heroicons-plus"
                            class="w-3 h-3 text-green-500"
                          />
                          <UIcon
                            v-else-if="change.type === 'removed'"
                            name="i-heroicons-minus"
                            class="w-3 h-3 text-red-500"
                          />
                          <UIcon
                            v-else
                            name="i-heroicons-arrow-path"
                            class="w-3 h-3 text-yellow-500"
                          />
                          {{ change.path }}
                        </span>
                      </td>
                      <td class="px-3 py-2 font-mono text-red-600 dark:text-red-400">
                        <span v-if="change.type === 'added'" class="text-gray-400">-</span>
                        <pre v-else class="whitespace-pre-wrap break-words">{{ formatValue(change.oldValue) }}</pre>
                      </td>
                      <td class="px-3 py-2 font-mono text-green-600 dark:text-green-400">
                        <span v-if="change.type === 'removed'" class="text-gray-400">-</span>
                        <pre v-else class="whitespace-pre-wrap break-words">{{ formatValue(change.newValue) }}</pre>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Split comparison view -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 class="text-sm font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                  <UIcon name="i-heroicons-minus-circle" class="w-4 h-4" />
                  修改前
                </h4>
                <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800 overflow-hidden">
                  <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-x-auto max-h-64">{{ formatSnapshot(selectedHistory.beforeSnapshot) }}</pre>
                </div>
              </div>

              <div>
                <h4 class="text-sm font-medium text-green-600 dark:text-green-400 mb-2 flex items-center gap-1">
                  <UIcon name="i-heroicons-plus-circle" class="w-4 h-4" />
                  修改後
                </h4>
                <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800 overflow-hidden">
                  <pre class="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-x-auto max-h-64">{{ formatSnapshot(selectedHistory.afterSnapshot) }}</pre>
                </div>
              </div>
            </div>

            <!-- Reverted notice -->
            <div v-if="selectedHistory.isReverted" class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                <span class="text-sm">此更改已於 {{ selectedHistory.revertedAt ? formatDate(selectedHistory.revertedAt) : '未知時間' }} 被撤銷</span>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-between items-center">
              <div>
                <UButton
                  v-if="selectedHistory && !selectedHistory.isReverted"
                  color="warning"
                  variant="soft"
                  icon="i-heroicons-arrow-uturn-left"
                  :loading="reverting"
                  :disabled="reverting"
                  @click="showRevertConfirm"
                >
                  撤銷此更改
                </UButton>
              </div>
              <UButton color="gray" @click="diffModalOpen = false">
                關閉
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Revert Confirmation Modal -->
    <UModal v-model:open="revertConfirmOpen">
      <template #content>
        <UCard class="max-w-md">
          <template #header>
            <div class="flex items-center gap-2 text-warning">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5" />
              <h3 class="text-lg font-semibold">確認撤銷</h3>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            確定要撤銷此更改嗎？詞條將恢復到修改前的狀態。此操作無法復原。
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton color="gray" variant="ghost" @click="revertConfirmOpen = false">
                取消
              </UButton>
              <UButton
                color="warning"
                :loading="reverting"
                @click="confirmRevert"
              >
                確認撤銷
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Notification -->
    <UNotifications />
  </div>
</template>

<script setup lang="ts">
import type { EditHistory, PaginatedResponse } from '~/types'

definePageMeta({
  layout: 'default'
})

const toast = useToast()

const histories = ref<EditHistory[]>([])
const loading = ref(false)
const currentPage = ref(1)
const searchEntryId = ref('')
const filterAction = ref<string | undefined>(undefined)
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const pagination = reactive({
  total: 0,
  perPage: 20,
  totalPages: 0
})

const diffModalOpen = ref(false)
const selectedHistory = ref<EditHistory | null>(null)
const reverting = ref(false)
const revertConfirmOpen = ref(false)
const diffViewMode = ref<'unified' | 'split'>('unified')

// Diff change type
interface DiffChange {
  path: string
  type: 'added' | 'removed' | 'modified'
  oldValue?: any
  newValue?: any
}

// Compute changes between two objects
function computeDiff(before: any, after: any, path = ''): DiffChange[] {
  const changes: DiffChange[] = []

  // Handle null/undefined cases
  if (before === null || before === undefined) {
    if (after !== null && after !== undefined) {
      changes.push({ path: path || 'root', type: 'added', newValue: after })
    }
    return changes
  }
  if (after === null || after === undefined) {
    changes.push({ path: path || 'root', type: 'removed', oldValue: before })
    return changes
  }

  // Handle primitive types
  if (typeof before !== 'object' || typeof after !== 'object') {
    if (before !== after) {
      changes.push({ path: path || 'root', type: 'modified', oldValue: before, newValue: after })
    }
    return changes
  }

  // Handle arrays
  if (Array.isArray(before) && Array.isArray(after)) {
    const maxLen = Math.max(before.length, after.length)
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`
      if (i >= before.length) {
        changes.push({ path: itemPath, type: 'added', newValue: after[i] })
      } else if (i >= after.length) {
        changes.push({ path: itemPath, type: 'removed', oldValue: before[i] })
      } else {
        changes.push(...computeDiff(before[i], after[i], itemPath))
      }
    }
    return changes
  }

  // Handle objects
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key
    if (!(key in before)) {
      changes.push({ path: keyPath, type: 'added', newValue: after[key] })
    } else if (!(key in after)) {
      changes.push({ path: keyPath, type: 'removed', oldValue: before[key] })
    } else {
      changes.push(...computeDiff(before[key], after[key], keyPath))
    }
  }

  return changes
}

// Compute diff changes for selected history
const diffChanges = computed<DiffChange[]>(() => {
  if (!selectedHistory.value) return []

  const before = filterSnapshot(selectedHistory.value.beforeSnapshot)
  const after = filterSnapshot(selectedHistory.value.afterSnapshot)

  // Handle create action
  if (selectedHistory.value.action === 'create') {
    return Object.entries(after).map(([key, value]) => ({
      path: key,
      type: 'added' as const,
      newValue: value
    }))
  }

  // Handle delete action
  if (selectedHistory.value.action === 'delete') {
    return Object.entries(before).map(([key, value]) => ({
      path: key,
      type: 'removed' as const,
      oldValue: value
    }))
  }

  // Compute diff for update actions
  return computeDiff(before, after)
})

// Extract unique top-level field names from diff changes
function extractChangedFields(changes: DiffChange[]): string[] {
  const fields = new Set<string>()
  for (const change of changes) {
    // Get the top-level field name (before first dot or bracket)
    const topLevelField = change.path.split(/[.\[]/)[0]
    fields.add(topLevelField)
  }
  return Array.from(fields)
}

// Get actual changed fields for selected history (computed)
const actualChangedFields = computed<string[]>(() => {
  return extractChangedFields(diffChanges.value)
})

// Get actual changed fields for any history item (for list display)
function getActualChangedFields(history: EditHistory): string[] {
  const before = filterSnapshot(history.beforeSnapshot)
  const after = filterSnapshot(history.afterSnapshot)

  let changes: DiffChange[]

  if (history.action === 'create') {
    changes = Object.entries(after).map(([key, value]) => ({
      path: key,
      type: 'added' as const,
      newValue: value
    }))
  } else if (history.action === 'delete') {
    changes = Object.entries(before).map(([key, value]) => ({
      path: key,
      type: 'removed' as const,
      oldValue: value
    }))
  } else {
    changes = computeDiff(before, after)
  }

  return extractChangedFields(changes)
}

// Filter out internal fields from snapshot
function filterSnapshot(snapshot: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!snapshot) return {}
  return Object.fromEntries(
    Object.entries(snapshot).filter(([key]) =>
      !key.startsWith('_') && key !== '__v' && key !== 'password'
    )
  )
}

// Format value for display in diff table
function formatValue(value: any): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

const actionOptions = [
  { label: '全部', value: undefined },
  { label: '創建', value: 'create' },
  { label: '更新', value: 'update' },
  { label: '刪除', value: 'delete' },
  { label: '狀態變更', value: 'status_change' }
]

async function fetchHistories() {
  loading.value = true
  try {
    const query: Record<string, any> = {
      page: currentPage.value,
      perPage: pagination.perPage
    }

    if (searchEntryId.value.trim()) {
      query.entryId = searchEntryId.value.trim()
    }

    if (filterAction.value) {
      query.action = filterAction.value
    }

    const response = await $fetch<PaginatedResponse<EditHistory>>('/api/histories', {
      query
    })

    histories.value = response.data
    pagination.total = response.total
    pagination.totalPages = response.totalPages
  } catch (error) {
    console.error('Failed to fetch histories:', error)
    histories.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

function showDiff(history: EditHistory) {
  selectedHistory.value = history
  diffModalOpen.value = true
}

function showRevertConfirm() {
  revertConfirmOpen.value = true
}

async function confirmRevert() {
  if (!selectedHistory.value) return

  reverting.value = true
  try {
    await $fetch(`/api/histories/${selectedHistory.value.id}/revert`, {
      method: 'POST'
    })

    toast.add({
      title: '撤銷成功',
      description: '已成功撤銷該更改',
      color: 'success'
    })

    revertConfirmOpen.value = false
    diffModalOpen.value = false
    selectedHistory.value = null
    await fetchHistories()
  } catch (error: any) {
    console.error('Failed to revert:', error)
    const message = error?.data?.message || '撤銷失敗'
    toast.add({
      title: '撤銷失敗',
      description: message,
      color: 'error'
    })
  } finally {
    reverting.value = false
  }
}

// Get display text for entry
function getEntryDisplay(history: EditHistory): string {
  const snapshot = history.afterSnapshot || history.beforeSnapshot
  if (snapshot) {
    const headword = (snapshot as any).headword
    if (headword?.display) {
      return headword.display
    }
    const text = (snapshot as any).text
    if (text) {
      return text
    }
  }
  return `ID: ${history.entryId.slice(-8)}`
}

// Format snapshot for display
function formatSnapshot(snapshot: Record<string, unknown> | null | undefined): string {
  const filtered = filterSnapshot(snapshot)
  if (Object.keys(filtered).length === 0) {
    return '(無數據)'
  }
  return JSON.stringify(filtered, null, 2)
}

// Debounce search
watch(searchEntryId, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchHistories()
  }, 300)
})

watch([currentPage, filterAction], fetchHistories)

onMounted(fetchHistories)

// Helpers
function getActionColor(action: string) {
  const colors: Record<string, string> = {
    create: 'success',
    update: 'info',
    delete: 'error',
    status_change: 'warning'
  }
  return colors[action] || 'neutral'
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    create: '創建',
    update: '更新',
    delete: '刪除',
    status_change: '狀態變更'
  }
  return labels[action] || action
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style scoped>
.diff-container {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.diff-container pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
