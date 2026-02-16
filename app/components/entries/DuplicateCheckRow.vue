<template>
  <tr
    class="bg-amber-50/80 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="duplicate-check-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div
        class="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 p-3 shadow-sm"
      >
        <!-- 與粵拼/AI 建議一致的標題行 -->
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500 flex-shrink-0" />
          <h3 id="duplicate-check-title" class="text-sm font-semibold text-amber-700 dark:text-amber-400">
            詞頭重複檢測
          </h3>
          <span v-if="isLoading" class="text-xs text-amber-600 dark:text-amber-400">檢測中...</span>
        </div>
        <template v-if="!isLoading">
          <p class="text-gray-700 dark:text-gray-300 text-sm mb-3 break-words">
            數據庫中已存在相同「詞頭 + 方言」的詞條，共 {{ entries.length }} 條。請確認是否改寫詞頭或方言，或直接編輯已有詞條。
          </p>
          <div class="mb-3">
            <button
              type="button"
              class="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              @click="showDetail = !showDetail"
            >
              {{ showDetail ? '收起詳情' : '查看已有詞條' }}
            </button>
            <div v-if="showDetail" class="mt-2 space-y-2 max-h-48 overflow-y-auto rounded border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-2">
              <div
                v-for="e in entries"
                :key="e.id"
                class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-700 dark:text-gray-300 py-1.5 border-b border-amber-100 dark:border-amber-800/50 last:border-0"
              >
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ e.headwordDisplay }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ e.dialectLabel }}</span>
                <span
                  :class="[
                    e.status === 'draft' && 'text-gray-500',
                    e.status === 'pending_review' && 'text-amber-600 dark:text-amber-400',
                    e.status === 'approved' && 'text-green-600 dark:text-green-400',
                    e.status === 'rejected' && 'text-red-600 dark:text-red-400'
                  ]"
                >
                  {{ e.statusLabel }}
                </span>
                <span class="text-gray-400 dark:text-gray-500">{{ e.createdAtLabel }}</span>
              </div>
            </div>
          </div>
        </template>
        <!-- 與粵拼一致的按鈕行：僅忽略，標註 Esc -->
        <div class="flex gap-2">
          <UButton size="xs" color="neutral" variant="ghost" @mousedown.prevent="$emit('dismiss')">
            忽略 (Esc)
          </UButton>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
defineProps<{
  colspan: number
  entries: Array<{
    id: string
    headwordDisplay: string
    dialectLabel: string
    status: string
    statusLabel: string
    createdAtLabel: string
  }>
  isLoading: boolean
}>()

defineEmits<{
  dismiss: []
}>()

const showDetail = ref(false)
</script>
