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

            <!-- 直接顯示前 3 條 -->
            <div
              v-for="r in visibleResults.slice(0, 3)"
              :key="r.id"
              class="rounded border border-emerald-100 dark:border-emerald-800/50 bg-white/60 dark:bg-gray-800/40 px-2 py-1.5 text-xs"
            >
              <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-700 dark:text-gray-300">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ r.headwordDisplay }}</span>
                <span v-if="r.jyutping" class="font-mono text-gray-600 dark:text-gray-400">{{ r.jyutping }}</span>
                <span v-if="r.dialectLabel" class="text-emerald-700 dark:text-emerald-300">{{ r.dialectLabel }}</span>
                <span v-if="r.sourceBook" class="text-gray-400 dark:text-gray-500">{{ r.sourceBook }}</span>
                <UButton
                  size="xs"
                  color="primary"
                  variant="ghost"
                  class="ml-auto"
                  @click="$emit('apply-template', r.id)"
                >
                  用作範本填寫此行
                </UButton>
              </div>
              <p v-if="r.definitionSummary" class="mt-0.5 text-gray-600 dark:text-gray-400 line-clamp-2">
                {{ r.definitionSummary }}
              </p>
            </div>

            <!-- 若超過 3 條，提供展開/收起更多 -->
            <template v-if="results.length > 3">
              <button
                type="button"
                class="text-xs text-emerald-700 dark:text-emerald-300 hover:underline"
                @click="showDetail = !showDetail"
              >
                {{ showDetail ? '收起更多結果' : `另外還有 ${results.length - 3} 條，點此展開` }}
              </button>
              <div v-if="showDetail" class="mt-1 space-y-2 max-h-64 overflow-y-auto">
                <div
                  v-for="r in visibleResults.slice(3)"
                  :key="r.id"
                  class="rounded border border-emerald-100 dark:border-emerald-800/50 bg-white/60 dark:bg-gray-800/40 px-2 py-1.5 text-xs"
                >
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-700 dark:text-gray-300">
                    <span class="font-medium text-gray-900 dark:text-gray-100">{{ r.headwordDisplay }}</span>
                    <span v-if="r.jyutping" class="font-mono text-gray-600 dark:text-gray-400">{{ r.jyutping }}</span>
                    <span v-if="r.dialectLabel" class="text-emerald-700 dark:text-emerald-300">{{ r.dialectLabel }}</span>
                    <span v-if="r.sourceBook" class="text-gray-400 dark:text-gray-500">{{ r.sourceBook }}</span>
                    <UButton
                      size="xs"
                      color="primary"
                      variant="ghost"
                      class="ml-auto"
                      @click="$emit('apply-template', r.id)"
                    >
                      用作範本填寫此行
                    </UButton>
                  </div>
                  <p v-if="r.definitionSummary" class="mt-0.5 text-gray-600 dark:text-gray-400 line-clamp-2">
                    {{ r.definitionSummary }}
                  </p>
                </div>
              </div>
            </template>
          </div>
        </div>

        <UButton size="xs" color="neutral" variant="ghost" class="flex-shrink-0" @mousedown.prevent="$emit('dismiss')">
          忽略 (Esc)
        </UButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
export interface JyutjyuRefItem {
  id: string
  headwordDisplay: string
  jyutping: string
  dialectLabel: string
  sourceBook: string
  definitionSummary: string
}

const props = defineProps<{
  colspan: number
  query: string
  results: JyutjyuRefItem[]
  total: number | null
  isLoading: boolean
  errorMessage: string
}>()

defineEmits<{
  dismiss: []
  'apply-template': [id: string]
}>()

const showDetail = ref(false)

const visibleResults = computed(() => props.results || [])

watch(
  () => props.query,
  () => {
    showDetail.value = false
  }
)
</script>
