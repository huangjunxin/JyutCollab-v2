<template>
  <div>
    <!-- Page header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="jc-serif text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div class="w-10 h-10 aspect-square flex items-center justify-center bg-[var(--jc-accent-soft-strong)] border border-[var(--jc-accent)]">
              <UIcon name="i-heroicons-clipboard-document-check" class="w-6 h-6 text-[var(--jc-accent)]" />
            </div>
            審核隊列
          </h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            待審核詞條 <span class="font-semibold text-amber-600 dark:text-amber-400">{{ pagination.total }}</span> 個
          </p>
        </div>
      </div>
    </div>

    <!-- Search and filters -->
    <SharedSearchFilterBar
      v-model:search-query="searchQuery"
      v-model:filter-user="filterUser"
      v-model:filter-dialect="filterDialect"
      v-model:filter-theme="filterTheme"
      v-model:filter-status="filterStatus"
      :user-filter-options="userFilterOptions"
      :dialect-options="dialectOptions"
      :theme-filter-options="themeFilterOptions"
      :status-options="statusOptions"
      @search="handleSearch"
    />

    <!-- Error state -->
    <div v-if="error" class="text-center py-16 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard)]">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <UIcon name="i-heroicons-exclamation-triangle" class="w-10 h-10 text-red-500" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">載入失敗</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">{{ error?.message || '無法載入審核隊列，請檢查網絡後重新整理頁面' }}</p>
      <UButton color="primary" size="sm" @click="refreshEntries">重新載入</UButton>
    </div>

    <!-- Loading state -->
    <div v-else-if="entries == null || loading" class="flex flex-col items-center justify-center py-20">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div class="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p class="mt-4 text-gray-500 dark:text-gray-400">加載中...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="entryList.length === 0" class="text-center py-16 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard)]">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
        <UIcon name="i-heroicons-check-circle" class="w-10 h-10 text-green-500" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">審核隊列已清空</h3>
      <p class="text-gray-500 dark:text-gray-400">所有詞條都已審核完畢</p>
    </div>

    <!-- Entry list (DictCard-style)，復用 EntryDetailCard -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entryList"
        :key="entry.id"
        class="review-dict-card review-dict-card-sans transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 overflow-hidden"
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
        <UCard class="jc-modal-card w-full max-w-lg rounded-none [&>*]:rounded-none">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">拒絕詞條</h3>
            </div>
          </template>

          <div v-if="rejectingEntry" class="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <p class="jc-headword-rare-font font-medium text-gray-900 dark:text-white">
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
              <UButton color="neutral" variant="ghost" class="rounded-none [&>*]:rounded-none" @click="rejectModalOpen = false">
                取消
              </UButton>
              <UButton
                color="error"
                :loading="rejecting"
                :disabled="!rejectReason.trim()"
                class="rounded-none [&>*]:rounded-none"
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
import { useSearchFilters } from '~/composables/useSearchFilters'
import { useAgentActions } from '~/composables/useAgentActions'
import { entryToDisplay } from '~/composables/useEntryDisplay'

definePageMeta({
  layout: 'default',
  middleware: ['reviewer'],
  name: 'review-index'
})

useHead({
  link: [
    { rel: 'stylesheet', href: '/fonts/jyutcollab-headword-rare.css' }
  ]
})

const currentPage = ref(1)
const processing = ref<string | null>(null)
const action = ref<string | null>(null)

const {
  searchQuery,
  filters,
  ALL_FILTER_VALUE,
  filterDialect,
  filterStatus,
  filterTheme,
  filterUser,
  dialectOptions,
  statusOptions,
  themeFilterOptions,
  userFilterOptions,
  fetchContributors
} = useSearchFilters({ statusDefault: 'pending_review' })

const pagination = reactive({
  total: 0,
  perPage: 10,
  totalPages: 0
})

const rejectModalOpen = ref(false)
const rejectReason = ref('')
const rejecting = ref(false)
const rejectingEntry = ref<Entry | null>(null)

const cacheKey = computed(() => {
  const dialect = filters.dialect === ALL_FILTER_VALUE ? 'all' : filters.dialect
  const status = filters.status === ALL_FILTER_VALUE ? 'all' : filters.status
  const theme = filters.theme === ALL_FILTER_VALUE ? 'all' : filters.theme
  const user = filters.createdBy || 'all'
  const q = searchQuery.value.trim() || 'none'
  return `review-live:${currentPage.value}:${dialect}:${status}:${theme}:${user}:${q}`
})

interface ReviewResponse {
  data: Entry[]
  total: number
  totalPages: number
}

const { data: entries, pending: loading, refresh: refreshEntries, error } = useAsyncData<ReviewResponse>(
  'review',
  async () => {
    const query: Record<string, any> = {
      page: currentPage.value,
      perPage: pagination.perPage
    }

    if (searchQuery.value.trim()) {
      query.query = searchQuery.value.trim()
    }
    if (filters.dialect && filters.dialect !== ALL_FILTER_VALUE) {
      query.dialectName = filters.dialect
    }
    if (filters.status && filters.status !== ALL_FILTER_VALUE) {
      query.status = filters.status
    }
    if (filters.theme && filters.theme !== ALL_FILTER_VALUE) {
      query.themeIdL3 = Number(filters.theme)
    }
    if (filters.createdBy) {
      query.createdBy = filters.createdBy
    }

    return await $fetch('/api/reviews', { query })
  },
  {
    server: false,
    default: () => null as any,
    watch: [cacheKey],
    getCachedData: () => undefined,
    transform: (response) => {
      pagination.total = response.total
      pagination.totalPages = response.totalPages
      return response
    }
  }
)

const entryList = computed(() => entries.value?.data ?? [])

watch(entryList, (list) => {
  if (list.length === 0 && pagination.total > 0 && currentPage.value > 1 && !loading) {
    currentPage.value = 1
  }
})

function handleSearch() {
  currentPage.value = 1
  refreshEntries()
}

provide('agentPageContext', computed(() => ({
  route: '/review',
  filters: {
    query: searchQuery.value || undefined,
    dialect: filters.dialect !== ALL_FILTER_VALUE ? filters.dialect : undefined,
    status: filters.status !== ALL_FILTER_VALUE ? filters.status : undefined,
    theme: filters.theme !== ALL_FILTER_VALUE ? filters.theme : undefined,
    createdBy: filters.createdBy || undefined
  },
  totalCount: pagination.total,
  currentPage: currentPage.value
})))

// Watch for agent local actions (from AI assistant panel)
const { pending: agentActions, dequeue: dequeueAgentAction } = useAgentActions()
watch(agentActions, async (queue) => {
  if (!queue.length) return
  const action = dequeueAgentAction()
  if (!action) return

  switch (action.kind) {
    case 'apply_filters':
      if (action.filters?.query !== undefined) searchQuery.value = action.filters.query
      if (action.filters?.dialect) filters.dialect = action.filters.dialect
      if (action.filters?.status) filters.status = action.filters.status
      if (action.filters?.theme) filters.theme = action.filters.theme
      if (action.filters?.createdBy) filters.createdBy = action.filters.createdBy
      currentPage.value = 1
      break

    case 'open_entry':
      if (action.entryId) {
        searchQuery.value = action.entryId
        currentPage.value = 1
      }
      break
  }
}, { deep: true })

onMounted(() => {
  refreshEntries()
  fetchContributors()
})

async function handleApprove(id: string) {
  processing.value = id
  action.value = 'approve'
  try {
    await $fetch(`/api/reviews/${id}/approve`, {
      method: 'POST'
    })
    await refreshEntries()
  } catch (error: any) {
    console.error('Failed to approve:', error)
    const errorMessage = error?.data?.message || error?.message || '審核操作失敗'
    alert(errorMessage)
    await refreshEntries()
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
    await refreshEntries()
    rejectingEntry.value = null
  } catch (error: any) {
    console.error('Failed to reject:', error)
    const errorMessage = error?.data?.message || error?.message || '審核操作失敗'
    alert(errorMessage)
    await refreshEntries()
  } finally {
    rejecting.value = false
  }
}

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
