<template>
  <tr
    class="bg-purple-50/80 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="ai-suggestion-inline-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="sticky left-3 w-[min(56rem,calc(100vw-5rem))] max-w-[calc(100vw-5rem)]">
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-purple-500 flex-shrink-0" />
          <h3 id="ai-suggestion-inline-title" class="text-sm font-semibold text-purple-600 dark:text-purple-400">
            {{ title }}
          </h3>
        </div>

        <div v-if="!alternatives || alternatives.length === 0" class="flex items-start justify-between gap-3">
          <p class="text-sm text-gray-700 dark:text-gray-300 break-words">{{ text }}</p>
          <div class="flex gap-2 flex-shrink-0">
            <UButton size="xs" color="neutral" variant="ghost" @mousedown.prevent="$emit('dismiss')">
              關閉 (Esc)
            </UButton>
            <UButton size="xs" color="primary" @mousedown.prevent="$emit('accept')">
              採納 (Tab)
            </UButton>
          </div>
        </div>

        <div v-else class="space-y-2">
          <div class="flex items-center justify-between gap-3 p-2 rounded bg-purple-100/60 dark:bg-purple-800/30 border border-purple-200 dark:border-purple-700">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-purple-500 flex-shrink-0">🥇</span>
                <span class="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">{{ text }}</span>
                <span v-if="confidence != null" class="text-xs text-purple-500 font-medium flex-shrink-0">{{ Math.round(confidence * 100) }}%</span>
              </div>
            </div>
            <UButton size="xs" color="primary" @mousedown.prevent="$emit('accept')">
              採納 (Tab)
            </UButton>
          </div>

          <div
            v-for="(alt, index) in alternatives"
            :key="index"
            class="flex items-center justify-between gap-3 p-2 rounded bg-white/60 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-600"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-400 flex-shrink-0">{{ ['🥈', '🥉'][index] || '📋' }}</span>
                <span class="text-sm text-gray-700 dark:text-gray-300 break-words">{{ alt.text }}</span>
                <span v-if="alt.confidence != null" class="text-xs text-gray-400 font-medium flex-shrink-0">{{ Math.round(alt.confidence * 100) }}%</span>
              </div>
            </div>
            <UButton size="xs" color="neutral" variant="outline" @mousedown.prevent="$emit('selectAlternative', index)">
              選擇 ({{ index + 1 }})
            </UButton>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <p class="text-xs text-gray-400 dark:text-gray-500">
              分類不準確？可以先填寫<span class="font-medium text-gray-500 dark:text-gray-400">釋義</span>，然後重新點擊 AI 按鈕
            </p>
            <UButton size="xs" color="neutral" variant="ghost" @mousedown.prevent="$emit('dismiss')">
              關閉 (Esc)
            </UButton>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
export interface AlternativeItem {
  text: string
  confidence?: number
}

defineProps<{
  text: string
  title: string
  colspan: number
  /** 多候選模式下的第二、第三候選 */
  alternatives?: AlternativeItem[]
  /** 主候選信心度 */
  confidence?: number
}>()

defineEmits<{
  accept: []
  dismiss: []
  /** 選擇第 N 個候選（index 從 0 開始，對應 alternatives[N]） */
  selectAlternative: [index: number]
}>()
</script>
