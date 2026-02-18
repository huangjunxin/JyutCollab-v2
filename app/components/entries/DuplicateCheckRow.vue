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
            <div class="mt-1 space-y-2 max-h-64 overflow-y-auto">
              <EntriesEntryPreviewCard
                v-for="e in entries"
                :key="e.id"
                :item="e"
                variant="amber"
                @open-detail="openDetailFor"
              />
            </div>
          </template>
        </div>

        <EntriesEntryDetailModal
          v-model:open="detailModalOpen"
          :entry-id="detailEntryId"
        />

        <UButton size="xs" color="neutral" variant="ghost" class="flex-shrink-0" @mousedown.prevent="$emit('dismiss')">
          忽略 (Esc)
        </UButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { EntryPreviewItemDb } from '~/components/entries/EntryPreviewCard.vue'

defineProps<{
  colspan: number
  entries: EntryPreviewItemDb[]
  isLoading: boolean
}>()

defineEmits<{
  dismiss: []
}>()

const detailModalOpen = ref(false)
const detailEntryId = ref<string | null>(null)

function openDetailFor(id: string) {
  detailEntryId.value = id
  detailModalOpen.value = true
}
</script>
