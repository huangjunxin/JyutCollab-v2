<template>
  <tr
    class="bg-blue-50/80 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="other-dialects-ref-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 flex-shrink-0" />
            <h3 id="other-dialects-ref-title" class="text-sm font-semibold text-blue-700 dark:text-blue-400">
              其他方言點已有該詞條，可參考
            </h3>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
            共 {{ entries.length }} 條（不同方言），可參考釋義與分類後填寫本條。
          </p>

          <div class="mt-1 space-y-2">
            <EntriesEntryPreviewCard
              v-for="e in entries.slice(0, 3)"
              :key="e.id"
              :item="e"
              variant="blue"
              :show-apply-template="true"
              @open-detail="openDetailFor"
              @apply-template="(id) => $emit('apply-template', id)"
            />

            <template v-if="entries.length > 3">
              <button
                type="button"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                @click="showDetail = !showDetail"
              >
                {{ showDetail ? '收起其他方言詞條' : `另外還有 ${entries.length - 3} 條，點此展開` }}
              </button>
              <div v-if="showDetail" class="mt-1 space-y-2 max-h-64 overflow-y-auto">
                <EntriesEntryPreviewCard
                  v-for="e in entries.slice(3)"
                  :key="e.id"
                  :item="e"
                  variant="blue"
                  :show-apply-template="true"
                  @open-detail="openDetailFor"
                  @apply-template="(id) => $emit('apply-template', id)"
                />
              </div>
            </template>
          </div>
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
}>()

defineEmits<{
  dismiss: []
  'apply-template': [id: string]
}>()

const showDetail = ref(false)
const detailModalOpen = ref(false)
const detailEntryId = ref<string | null>(null)

function openDetailFor(id: string) {
  detailEntryId.value = id
  detailModalOpen.value = true
}
</script>
