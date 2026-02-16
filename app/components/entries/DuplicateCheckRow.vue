<template>
  <tr
    class="bg-amber-50/80 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="duplicate-check-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-amber-500 flex-shrink-0" />
            <h3 id="duplicate-check-title" class="text-sm font-semibold text-amber-700 dark:text-amber-400">
              詞頭重複檢測
            </h3>
            <span v-if="isLoading" class="text-xs text-amber-600 dark:text-amber-400">檢測中...</span>
          </div>
          <template v-if="!isLoading && entries.length > 0">
            <p class="text-sm text-gray-700 dark:text-gray-300 mb-2 break-words">
              數據庫中已存在相同「詞頭 + 方言」的詞條，共 {{ entries.length }} 條。請確認是否改寫詞頭或方言，或直接編輯已有詞條。
            </p>
            <button
              type="button"
              class="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              @click="showDetail = !showDetail"
            >
              {{ showDetail ? '收起詳情' : '查看已有詞條' }}
            </button>
            <div v-if="showDetail" class="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
              <div
                v-for="e in entries"
                :key="e.id"
                class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-700 dark:text-gray-300 py-1"
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
          </template>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" class="flex-shrink-0" @mousedown.prevent="$emit('dismiss')">
          忽略 (Esc)
        </UButton>
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
