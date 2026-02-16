<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            審核隊列
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            待審核詞條 <span class="font-semibold text-amber-600 dark:text-amber-400">{{ pagination.total }}</span> 個
          </p>
        </div>
        <div class="flex gap-2">
          <USelectMenu
            v-model="selectedDialect"
            :items="dialectOptions"
            value-key="value"
            placeholder="方言篩選"
            class="w-32"
            @update:model-value="handleDialectChange"
          />
        </div>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div class="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p class="mt-4 text-gray-500 dark:text-gray-400">加載中...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="entries.length === 0" class="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <UIcon name="i-heroicons-check-circle" class="w-10 h-10 text-green-500" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">審核隊列已清空</h3>
      <p class="text-gray-500 dark:text-gray-400">所有詞條都已審核完畢</p>
    </div>

    <!-- Entry list -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
      >
        <div class="p-5">
          <div class="flex justify-between gap-4">
            <div class="flex-1 min-w-0">
              <!-- Header -->
              <div class="flex items-center gap-3 mb-3">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ entry.headword?.display || entry.text }}
                </h3>
                <UBadge :color="(getDialectColor(entry.dialect?.name ?? entry.region ?? '') as 'primary' | 'secondary' | 'neutral' | 'success' | 'error' | 'warning' | 'info')" variant="subtle">
                  {{ getDialectLabel(entry.dialect?.name ?? entry.region ?? '') }}
                </UBadge>
                <UBadge :color="(getEntryTypeColor(entry.entryType ?? '') as 'primary' | 'secondary' | 'neutral' | 'success' | 'error' | 'warning' | 'info')" variant="subtle" size="xs">
                  {{ getEntryTypeLabel(entry.entryType) }}
                </UBadge>
              </div>

              <!-- Phonetic -->
              <div v-if="entry.phonetic?.jyutping?.length || entry.phoneticNotation" class="mb-3">
                <span class="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {{ entry.phonetic?.jyutping?.join(' ') || entry.phoneticNotation }}
                </span>
              </div>

              <!-- Definition -->
              <div class="mb-3">
                <p class="text-gray-700 dark:text-gray-300">
                  {{ entry.senses?.[0]?.definition || entry.definition || '暫無釋義' }}
                </p>
              </div>

              <!-- Theme -->
              <div v-if="entry.theme?.level3" class="mb-3 text-sm text-gray-500 dark:text-gray-400">
                <span class="font-medium">分類:</span>
                {{ entry.theme.level1 }} → {{ entry.theme.level2 }} → {{ entry.theme.level3 }}
              </div>

              <!-- Usage notes -->
              <div v-if="entry.meta?.usage || entry.usageNotes" class="text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span class="font-medium">使用説明:</span> {{ entry.meta?.usage || entry.usageNotes }}
              </div>

              <!-- Examples -->
              <div v-if="(entry.senses?.[0]?.examples?.length || entry.examples?.length)" class="mt-4">
                <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">例句:</p>
                <ul class="space-y-2">
                  <li
                    v-for="(example, idx) in (entry.senses?.[0]?.examples || entry.examples || []).slice(0, 2)"
                    :key="idx"
                    class="text-sm text-gray-600 dark:text-gray-400 pl-4 border-l-2 border-primary/50"
                  >
                    {{ example.text || example.sentence }}
                    <span v-if="example.translation || example.explanation" class="text-gray-400">
                      — {{ example.translation || example.explanation }}
                    </span>
                  </li>
                </ul>
              </div>

              <!-- Meta info -->
              <div class="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>提交者: {{ entry.createdBy }}</span>
                <span>提交時間: {{ formatDate(entry.createdAt) }}</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex flex-col gap-2 flex-shrink-0">
              <UButton
                color="success"
                icon="i-heroicons-check"
                :loading="processing === entry.id && action === 'approve'"
                @click="handleApprove(entry.id)"
              >
                通過
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-heroicons-x-mark"
                :loading="processing === entry.id && action === 'reject'"
                @click="showRejectModal(entry)"
              >
                拒絕
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-eye"
                @click="handleView(entry)"
              >
                詳情
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div class="flex justify-center mt-6">
        <UPagination
          v-model:page="currentPage"
          :total="pagination.total"
          :items-per-page="pagination.perPage"
        />
      </div>
    </div>

    <!-- Reject Modal -->
    <UModal v-model:open="rejectModalOpen">
      <template #content>
        <UCard class="w-full max-w-lg">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">拒絕詞條</h3>
            </div>
          </template>

          <div v-if="rejectingEntry" class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ rejectingEntry.headword?.display || rejectingEntry.text }}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              拒絕理由 <span class="text-red-500">*</span>
            </label>
            <UTextarea
              v-model="rejectReason"
              placeholder="請説明拒絕原因，幫助貢獻者改進..."
              :rows="5"
              class="w-full"
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="rejectModalOpen = false">
                取消
              </UButton>
              <UButton
                color="error"
                :loading="rejecting"
                :disabled="!rejectReason.trim()"
                @click="handleReject"
              >
                確認拒絕
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- View Modal -->
    <UModal v-model:open="viewModalOpen">
      <template #content>
        <UCard class="max-w-2xl max-h-[90vh] overflow-y-auto">
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">詞條詳情</h3>
              <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="viewModalOpen = false" />
            </div>
          </template>

          <div v-if="viewingEntry" class="space-y-4">
            <!-- Basic info: 詞頭、粵拼、方言、類型 -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">詞頭</label>
                <p class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ viewingEntry.headword?.display || viewingEntry.text || '-' }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">粵拼</label>
                <p class="text-gray-900 dark:text-white font-mono">
                  {{ viewingEntry.phonetic?.jyutping?.join(' ') || viewingEntry.phoneticNotation || '-' }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">方言</label>
                <p class="text-gray-900 dark:text-white">
                  {{ getDialectLabel(viewingEntry.dialect?.name ?? viewingEntry.region ?? '') }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">類型</label>
                <p class="text-gray-900 dark:text-white">
                  {{ getEntryTypeLabel(viewingEntry.entryType) }}
                </p>
              </div>
            </div>

            <!-- Definition -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">釋義</label>
              <p class="text-gray-900 dark:text-white">
                {{ viewingEntry.senses?.[0]?.definition || viewingEntry.definition || '-' }}
              </p>
            </div>

            <!-- Theme -->
            <div v-if="viewingEntry.theme?.level1 || viewingEntry.theme?.level2 || viewingEntry.theme?.level3">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">分類</label>
              <p class="text-gray-900 dark:text-white">
                {{ [viewingEntry.theme.level1, viewingEntry.theme.level2, viewingEntry.theme.level3].filter(Boolean).join(' → ') }}
              </p>
            </div>

            <!-- Meta info: 語域、詞性、用法、備註 -->
            <div class="grid grid-cols-2 gap-4">
              <div v-if="viewingEntry.meta?.register">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">語域</label>
                <p class="text-gray-900 dark:text-white">{{ viewingEntry.meta.register }}</p>
              </div>
              <div v-if="viewingEntry.meta?.pos">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">詞性</label>
                <p class="text-gray-900 dark:text-white">{{ viewingEntry.meta.pos }}</p>
              </div>
            </div>

            <div v-if="viewingEntry.meta?.usage">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">用法説明</label>
              <p class="text-gray-900 dark:text-white">{{ viewingEntry.meta.usage }}</p>
            </div>

            <div v-if="viewingEntry.meta?.notes">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">備註</label>
              <p class="text-gray-900 dark:text-white">{{ viewingEntry.meta.notes }}</p>
            </div>

            <!-- Examples -->
            <div v-if="viewingEntry.senses?.[0]?.examples?.length || viewingEntry.examples?.length">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">例句</label>
              <ul class="mt-2 space-y-2">
                <li
                  v-for="(ex, i) in (viewingEntry.senses?.[0]?.examples || viewingEntry.examples || [])"
                  :key="i"
                  class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <p class="text-gray-900 dark:text-white">{{ ex.text || ex.sentence }}</p>
                  <p v-if="ex.jyutping" class="text-sm text-gray-500 font-mono mt-1">{{ ex.jyutping }}</p>
                  <p v-if="ex.translation || ex.explanation" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {{ ex.translation || ex.explanation }}
                  </p>
                </li>
              </ul>
            </div>

            <!-- Contributor info -->
            <div class="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
              提交者: {{ viewingEntry.createdBy }} · 提交時間: {{ formatDate(viewingEntry.createdAt) }}
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <UButton
                color="success"
                icon="i-heroicons-check"
                @click="handleApproveFromView"
              >
                通過
              </UButton>
              <UButton
                color="error"
                variant="soft"
                icon="i-heroicons-x-mark"
                @click="handleRejectFromView"
              >
                拒絕
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import { dialectOptionsWithAll, getDialectLabel, getDialectColor } from '~/utils/dialects'

definePageMeta({
  layout: 'default',
  middleware: ['reviewer']
})

const entries = ref<Entry[]>([])
const loading = ref(false)
const currentPage = ref(1)
const processing = ref<string | null>(null)
const action = ref<string | null>(null)
// Sentinel for "all" – ComboboxItem does not allow value to be empty string
const ALL_DIALECT_VALUE = '__all__'

const selectedDialect = ref(ALL_DIALECT_VALUE)

const pagination = reactive({
  total: 0,
  perPage: 10,
  totalPages: 0
})

const rejectModalOpen = ref(false)
const rejectReason = ref('')
const rejecting = ref(false)
const rejectingEntry = ref<Entry | null>(null)

const viewModalOpen = ref(false)
const viewingEntry = ref<Entry | null>(null)

const dialectOptions = dialectOptionsWithAll(ALL_DIALECT_VALUE)

async function fetchEntries() {
  loading.value = true
  try {
    const query: Record<string, any> = {
      page: currentPage.value,
      perPage: pagination.perPage,
      status: 'pending_review'
    }

    if (selectedDialect.value && selectedDialect.value !== ALL_DIALECT_VALUE) {
      query.dialectName = selectedDialect.value
    }

    const response = await $fetch('/api/reviews', { query })

    entries.value = response.data as Entry[]
    pagination.total = response.total
    pagination.totalPages = response.totalPages

    // 如果當前頁沒有數據但總數大於0，跳轉到第一頁
    if (entries.value.length === 0 && pagination.total > 0 && currentPage.value > 1) {
      currentPage.value = 1
    }
  } catch (error) {
    console.error('Failed to fetch entries:', error)
  } finally {
    loading.value = false
  }
}

// 切換方言篩選時重置頁碼
function handleDialectChange() {
  currentPage.value = 1
  fetchEntries()
}

async function handleApprove(id: string) {
  processing.value = id
  action.value = 'approve'
  try {
    await $fetch(`/api/reviews/${id}/approve`, {
      method: 'POST'
    })
    // 先從列表中移除已審核的條目
    entries.value = entries.value.filter(e => e.id !== id)
    pagination.total--

    // 如果當前頁沒有數據了，且還有其他頁，則重新獲取
    if (entries.value.length === 0 && pagination.total > 0) {
      await fetchEntries()
    }
  } catch (error: any) {
    console.error('Failed to approve:', error)
    // 顯示錯誤提示
    const errorMessage = error?.data?.message || error?.message || '審核操作失敗'
    alert(errorMessage)
    // 出錯時重新獲取以確保數據一致性
    await fetchEntries()
  } finally {
    processing.value = null
    action.value = null
  }
}

function showRejectModal(entry: Entry) {
  rejectingEntry.value = entry
  rejectReason.value = ''
  rejectModalOpen.value = true
}

async function handleReject() {
  if (!rejectingEntry.value || !rejectReason.value.trim()) return

  const entryId = rejectingEntry.value.id
  rejecting.value = true
  try {
    await $fetch(`/api/reviews/${entryId}/reject`, {
      method: 'POST',
      body: {
        reason: rejectReason.value
      }
    })
    rejectModalOpen.value = false
    // 先從列表中移除已審核的條目
    entries.value = entries.value.filter(e => e.id !== entryId)
    pagination.total--

    // 如果當前頁沒有數據了，且還有其他頁，則重新獲取
    if (entries.value.length === 0 && pagination.total > 0) {
      await fetchEntries()
    }

    rejectingEntry.value = null
  } catch (error: any) {
    console.error('Failed to reject:', error)
    // 顯示錯誤提示
    const errorMessage = error?.data?.message || error?.message || '審核操作失敗'
    alert(errorMessage)
    // 出錯時重新獲取以確保數據一致性
    await fetchEntries()
  } finally {
    rejecting.value = false
  }
}

function handleView(entry: Entry) {
  viewingEntry.value = entry
  viewModalOpen.value = true
}

async function handleApproveFromView() {
  if (!viewingEntry.value) return
  const entryId = viewingEntry.value.id
  viewModalOpen.value = false
  await handleApprove(entryId)
}

async function handleRejectFromView() {
  if (!viewingEntry.value) return
  const entry = viewingEntry.value
  viewModalOpen.value = false
  // 等待彈窗關閉動畫完成
  await nextTick()
  showRejectModal(entry)
}

watch(currentPage, fetchEntries)

onMounted(fetchEntries)

// Helpers（方言標籤與顏色由 ~/utils/dialects 提供）

function getEntryTypeColor(type: string) {
  const colors: Record<string, string> = {
    character: 'purple',
    word: 'blue',
    phrase: 'cyan'
  }
  return colors[type] || 'gray'
}

function getEntryTypeLabel(type: string) {
  const labels: Record<string, string> = {
    character: '字',
    word: '詞',
    phrase: '短語'
  }
  return labels[type] || type || '詞'
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
