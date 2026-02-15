<template>
  <tr
    class="bg-amber-50/80 dark:bg-amber-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="jyutdict-suggestion-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div
        class="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 p-3 shadow-sm"
      >
        <!-- 與 AI 建議一致的標題行 -->
        <div class="flex items-center gap-2 mb-2">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-amber-500 flex-shrink-0" />
          <h3 id="jyutdict-suggestion-title" class="text-sm font-semibold text-amber-600 dark:text-amber-400">
            泛粵典建議
          </h3>
          <span v-if="isLoading" class="text-xs text-amber-600 dark:text-amber-400">載入中...</span>
        </div>

        <!-- 主要內容：推薦發音（與 AI 建議的 text 區塊對齊） -->
        <p v-if="!isLoading" class="text-gray-700 dark:text-gray-300 text-sm mb-3 break-words">
          <span v-if="suggestedPronunciation">
            推薦發音（根據「{{ dialectName }}」）：<span class="font-mono font-semibold text-gray-900 dark:text-gray-100">{{ suggestedPronunciation }}</span>
          </span>
          <span v-else-if="charData.length > 0" class="text-gray-500 dark:text-gray-400">未匹配到推薦發音，可從下方字表選擇。</span>
          <span v-else class="text-gray-500 dark:text-gray-400">未找到相關發音數據。</span>
        </p>

        <!-- 可選：展開字表詳情（與 AI 建議不搶主視覺） -->
        <div v-if="charData.length > 0 && !isLoading" class="mb-3">
          <button
            type="button"
            class="text-xs text-amber-600 dark:text-amber-400 hover:underline"
            @click="showDetail = !showDetail"
          >
            {{ showDetail ? '收起字表' : '查看字表詳情' }}
          </button>
          <div v-if="showDetail" class="mt-2 space-y-2 max-h-48 overflow-y-auto">
            <div class="flex gap-1 mb-2">
              <button
                :class="['px-2 py-1 text-xs rounded', activeTab === 'general' ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400']"
                @click="activeTab = 'general'"
              >
                通用字表
              </button>
              <button
                :class="['px-2 py-1 text-xs rounded', activeTab === 'sheet' ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400']"
                @click="activeTab = 'sheet'"
              >
                泛粵字表
              </button>
            </div>
            <template v-if="activeTab === 'general'">
              <div
                v-for="(data, idx) in charData"
                :key="`g-${idx}`"
                v-show="data.generalPronunciations.length > 0"
                class="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2 text-xs"
              >
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ data.char }}</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <button
                    v-for="(p, pIdx) in getDisplayedPronunciations(data.generalPronunciations, `g-${idx}`)"
                    :key="pIdx"
                    type="button"
                    class="px-1.5 py-0.5 rounded border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    :style="{ borderColor: p.color || '#d1d5db' }"
                    :title="p.note ? `${p.location}: ${p.note}` : p.location"
                    @click="$emit('accept', buildPronunciationFromChar(data.char, p.jyutping))"
                  >
                    <span :style="{ color: p.color || '#6b7280' }">{{ p.location }}</span>
                    <span class="font-mono ml-1 text-gray-700 dark:text-gray-300">{{ p.jyutping }}</span>
                  </button>
                  <button
                    v-if="data.generalPronunciations.length > 12 && !expandedItems.has(`g-${idx}`)"
                    type="button"
                    class="text-amber-600 dark:text-amber-400"
                    @click="toggleExpand(`g-${idx}`)"
                  >
                    +{{ data.generalPronunciations.length - 12 }}
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div
                v-for="(data, idx) in charData"
                :key="`s-${idx}`"
                v-show="data.sheetEntries.length > 0"
                class="bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2 text-xs"
              >
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ data.char }}</span>
                <span v-if="data.sheetEntries[0]?.summary" class="font-mono ml-1 text-gray-600 dark:text-gray-400">{{ data.sheetEntries[0].summary }}</span>
                <div class="flex flex-wrap gap-1 mt-1">
                  <button
                    v-for="(p, pIdx) in getDisplayedPronunciations(data.sheetEntries[0]?.pronunciations || [], `s-${idx}`)"
                    :key="pIdx"
                    type="button"
                    class="px-1.5 py-0.5 rounded border cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                    :style="{ borderColor: p.color || '#d1d5db' }"
                    :title="`${p.location}: ${p.jyutping}`"
                    @click="$emit('accept', buildPronunciationFromChar(data.char, p.jyutping))"
                  >
                    <span :style="{ color: p.color || '#6b7280' }">{{ p.location }}</span>
                    <span class="font-mono ml-1 text-gray-700 dark:text-gray-300">{{ p.jyutping }}</span>
                  </button>
                  <button
                    v-if="(data.sheetEntries[0]?.pronunciations?.length || 0) > 12 && !expandedItems.has(`s-${idx}`)"
                    type="button"
                    class="text-amber-600 dark:text-amber-400"
                    @click="toggleExpand(`s-${idx}`)"
                  >
                    +{{ (data.sheetEntries[0]?.pronunciations?.length || 0) - 12 }}
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 與 AI 建議一致的按鈕行 -->
        <div class="flex gap-2">
          <UButton size="xs" color="neutral" variant="ghost" @mousedown.prevent="$emit('dismiss')">
            忽略 (Esc)
          </UButton>
          <UButton
            size="xs"
            color="primary"
            :disabled="!suggestedPronunciation || isLoading"
            @mousedown.prevent="onAcceptClick"
          >
            採納 (Tab)
          </UButton>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { CharPronunciationData, ExtractedPronunciation } from '~/types/jyutdict'

const props = defineProps<{
  colspan: number
  charData: CharPronunciationData[]
  dialectName: string
  suggestedPronunciation: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  accept: [pronunciation: string]
  dismiss: []
}>()

function onAcceptClick() {
  if (props.suggestedPronunciation) emit('accept', props.suggestedPronunciation)
}

const showDetail = ref(false)
const activeTab = ref<'general' | 'sheet'>('general')
const expandedItems = ref(new Set<string>())

function getDisplayedPronunciations(pronunciations: ExtractedPronunciation[], key: string): ExtractedPronunciation[] {
  if (expandedItems.value.has(key)) return pronunciations
  return pronunciations.slice(0, 12)
}

function toggleExpand(key: string) {
  const next = new Set(expandedItems.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedItems.value = next
}

function buildPronunciationFromChar(char: string, jyutping: string): string {
  const parts = props.suggestedPronunciation.split(' ')
  const idx = props.charData.findIndex(d => d.char === char)
  if (idx >= 0 && idx < parts.length) parts[idx] = jyutping
  return parts.join(' ')
}

watch(() => props.charData, () => {
  activeTab.value = 'general'
  expandedItems.value = new Set()
})
</script>
