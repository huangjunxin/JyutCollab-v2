<template>
  <tr
    class="bg-emerald-50/80 dark:bg-emerald-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="jyutjyu-ref-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <h3 id="jyutjyu-ref-title" class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              粵語詞叢參考
            </h3>
            <span v-if="isLoading" class="text-xs text-emerald-700 dark:text-emerald-300">查詢中...</span>
          </div>

          <p v-if="query" class="text-xs text-gray-600 dark:text-gray-400 mb-2">
            詞頭：<span class="font-medium text-gray-900 dark:text-gray-100">{{ query }}</span>
          </p>

          <p v-if="!isLoading && errorMessage" class="text-xs text-red-600 dark:text-red-400">
            {{ errorMessage }}
          </p>

          <p v-else-if="!isLoading && results.length === 0" class="text-xs text-gray-600 dark:text-gray-400">
            Jyutjyu 暫時未找到明顯相同的詞條。
          </p>

          <div v-else class="mt-1 space-y-2">
            <p class="text-xs text-gray-600 dark:text-gray-400">
              共 {{ total ?? results.length }} 條結果，下列顯示頭 3 條。
            </p>

            <EntriesEntryPreviewCard
              v-for="r in visibleResults.slice(0, 3)"
              :key="r.id"
              :item="r"
              variant="emerald"
              :show-apply-template="true"
              @open-detail="openDetailFor"
              @apply-template="(id) => $emit('apply-template', id)"
            />

            <template v-if="results.length > 3">
              <button
                type="button"
                class="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                @click="showDetail = !showDetail"
              >
                {{ showDetail ? '收起更多結果' : `另外還有 ${results.length - 3} 條，點此展開` }}
              </button>
              <div v-if="showDetail" class="mt-1 space-y-2 max-h-64 overflow-y-auto">
                <EntriesEntryPreviewCard
                  v-for="r in visibleResults.slice(3)"
                  :key="r.id"
                  :item="r"
                  variant="emerald"
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
          :jyutjyu-raw="detailJyutjyuRaw"
        />

        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            @mousedown.prevent="$emit('dismiss')"
          >
            忽略 (Esc)
          </UButton>
          <button
            type="button"
            class="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
            @click="$emit('open-reference')"
          >
            我要參考另一個詞條
          </button>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { EntryPreviewItemJyutjyu } from '~/components/entries/EntryPreviewCard.vue'

/** @deprecated 請使用 EntryPreviewItemJyutjyu */
export type JyutjyuRefItem = EntryPreviewItemJyutjyu

const props = defineProps<{
  colspan: number
  query: string
  results: EntryPreviewItemJyutjyu[]
  /** 原始搜尋結果（用於彈窗展示完整詞條） */
  rawResults?: any[]
  total: number | null
  isLoading: boolean
  errorMessage: string
}>()

defineEmits<{
  dismiss: []
  'apply-template': [id: string]
  'open-reference': []
}>()

const showDetail = ref(false)
const detailModalOpen = ref(false)
const detailJyutjyuRaw = ref<Record<string, any> | null>(null)

const visibleResults = computed(() => props.results || [])

function openDetailFor(id: string) {
  const raw = (props.rawResults || []).find((r: any) => String(r?.id) === String(id))
  detailJyutjyuRaw.value = raw ?? null
  detailModalOpen.value = true
}

watch(
  () => props.query,
  () => {
    showDetail.value = false
  }
)
</script>
