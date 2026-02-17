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

    <!-- Entry list (DictCard-style) -->
    <div v-else class="space-y-4">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="review-dict-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
      >
        <!-- 頭部：詞頭 + 粵拼 + 標籤 + 操作 -->
        <div class="card-header px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
            <div class="flex-1 min-w-0">
              <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 break-words">
                {{ entry.headword?.display || entry.text }}
                <sup
                  v-if="entry.meta?.variant_number"
                  class="ml-1 text-sm text-gray-500 dark:text-gray-400"
                >
                  {{ entry.meta.variant_number }}
                </sup>
              </h3>
              <div class="mt-2 font-mono text-lg text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                {{ (entry.phonetic?.jyutping || (entry.phoneticNotation ? [entry.phoneticNotation] : [])).join(' ') }}
              </div>
              <p
                v-if="entry.meta?.headword_variants?.length"
                class="text-sm text-gray-600 dark:text-gray-400 break-words mt-2"
              >
                異形詞：{{ entry.meta.headword_variants.join('、') }}
              </p>
              <p
                v-if="entry.headword?.display && entry.headword?.normalized && entry.headword.display !== entry.headword.normalized"
                class="text-sm text-gray-500 dark:text-gray-400 break-words mt-1"
              >
                標準寫法：{{ entry.headword.normalized }}
              </p>
            </div>

            <!-- 右側：標籤 + 通過/拒絕 -->
            <div class="flex flex-wrap gap-2 md:justify-end md:mt-0 md:ml-4 md:max-w-[40%] items-start">
              <span class="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm whitespace-nowrap">
                {{ getDialectLabel(entry.dialect?.name ?? entry.region ?? '') }}
              </span>
              <span class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm whitespace-nowrap">
                {{ getEntryTypeLabel(entry.entryType) }}
              </span>
              <span
                v-if="entry.meta?.register"
                class="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm whitespace-nowrap"
              >
                {{ entry.meta.register }}
              </span>
              <!-- 分類（與 DictCard 一致：紫色 pill） -->
              <span
                v-if="entry.meta?.category || entry.theme?.level3"
                class="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm break-words max-w-full"
              >
                {{ entry.meta?.category || [entry.theme?.level1, entry.theme?.level2, entry.theme?.level3].filter(Boolean).join(' → ') }}
              </span>
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
            </div>
          </div>
        </div>

        <!-- 內容：釋義、例句、分類、提交信息 -->
        <div class="card-body px-6 py-4">
          <div
            v-for="(sense, senseIdx) in (entry.senses?.length ? entry.senses : [{ definition: entry.definition || '暫無釋義', examples: entry.examples || [] }])"
            :key="senseIdx"
            class="mb-4 last:mb-0"
          >
            <div class="flex items-start gap-3">
              <span
                v-if="(entry.senses?.length || 1) > 1"
                class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-center font-semibold"
              >
                {{ senseIdx + 1 }}
              </span>
              <div class="flex-1">
                <span
                  v-if="sense.label"
                  class="inline-block text-xs text-gray-500 dark:text-gray-400 mb-1"
                >
                  {{ sense.label }}
                </span>
                <p class="text-gray-800 dark:text-gray-200 text-base leading-relaxed mb-2">
                  {{ sense.definition }}
                </p>
                <div
                  v-if="(sense.examples?.length || sense.subSenses?.some((s) => s.examples?.length))"
                  class="space-y-2"
                >
                  <div
                    v-for="(example, exIdx) in (sense.examples || []).slice(0, 3)"
                    :key="exIdx"
                    class="pl-4 border-l-2 border-gray-200 dark:border-gray-600"
                  >
                    <p class="text-gray-700 dark:text-gray-300 text-base">
                      {{ example.text || example.sentence }}
                    </p>
                    <p
                      v-if="example.jyutping"
                      class="text-sm text-blue-600 dark:text-blue-400 font-mono mt-1"
                    >
                      {{ example.jyutping }}
                    </p>
                    <p
                      v-if="example.translation || example.explanation"
                      class="text-base text-gray-500 dark:text-gray-400 mt-1"
                    >
                      → {{ example.translation || example.explanation }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="entry.meta?.usage || entry.usageNotes"
            class="mt-3 p-3 border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold text-blue-700 dark:text-blue-300">使用説明：</span>
            {{ entry.meta?.usage || entry.usageNotes }}
          </div>

          <div
            v-if="entry.meta?.notes"
            class="mt-3 p-3 border-l-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold text-yellow-700 dark:text-yellow-300">備註：</span>
            {{ entry.meta.notes }}
          </div>

          <div class="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>提交者：{{ entry.createdBy }}</span>
            <span>提交時間：{{ formatDate(entry.createdAt) }}</span>
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

// Helpers（方言標籤與顏色由 ~/utils/dialects 提供）

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
