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

    <!-- Entry list (DictCard-style)，復用 EntryDetailCard -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="review-dict-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
      >
        <EntriesEntryDetailCard :display-entry="entryToDisplay(entry)">
          <template #actions>
            <div class="flex gap-2 flex-shrink-0">
              <UButton
                color="success"
                size="sm"
                icon="i-heroicons-check"
                :loading="processing === entry.id && action === 'approve'"
                @click="handleApprove(entry.id)"
              >
                通過
              </UButton>
              <UButton
                color="error"
                variant="soft"
                size="sm"
                icon="i-heroicons-x-mark"
                :loading="processing === entry.id && action === 'reject'"
                @click="showRejectModal(entry)"
              >
                拒絕
              </UButton>
            </div>
          </template>
        </EntriesEntryDetailCard>
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

  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import { dialectOptionsWithAll } from '~/utils/dialects'
import { entryToDisplay } from '~/composables/useEntryDisplay'

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

watch(currentPage, fetchEntries)

onMounted(fetchEntries)

</script>

<style scoped>
.review-dict-card {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
