<template>
  <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">詞頭與其他詞形</h4>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-heroicons-chevron-up"
        @click="$emit('close')"
      >
        收起
      </UButton>
    </div>
    <div class="space-y-4">
      <!-- 主詞頭 -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400">主詞頭</span>
        </div>
        <div class="grid grid-cols-1 gap-2">
          <div>
            <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">顯示詞頭</label>
            <input
              v-model="entry.headword.display"
              type="text"
              placeholder="詞頭文本"
              class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              @input="onHeadwordChange"
            />
          </div>
        </div>
      </div>
      <!-- 其他詞形（存儲在搜索詞頭中） -->
      <div class="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">其他詞形</span>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">存儲在搜索詞頭中，用於搜索匹配</p>
          </div>
          <UButton
            color="primary"
            variant="ghost"
            size="xs"
            icon="i-heroicons-plus"
            @click="addVariant"
          >
            添加詞形
          </UButton>
        </div>
        <div class="space-y-2">
          <div
            v-for="(variant, variantIdx) in variants"
            :key="variantIdx"
            class="flex items-center gap-2"
          >
            <input
              v-model="variants[variantIdx]"
              type="text"
              placeholder="其他詞形"
              class="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              @input="onVariantChange"
            />
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              title="刪除此詞形"
              @click="removeVariant(variantIdx)"
            />
          </div>
          <div
            v-if="variants.length === 0"
            class="text-center py-4 text-sm text-gray-400 dark:text-gray-500"
          >
            暫無其他詞形
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'

const props = defineProps<{
  entry: Entry
}>()

const emit = defineEmits<{
  close: []
}>()

// 從 entry.headword.search 讀取其他詞形（用空格分隔）
// search 字段格式：主詞頭 其他詞形1 其他詞形2 ...
function parseSearchField(search: string | undefined, display: string | undefined): string[] {
  if (!search || !search.trim()) return []
  const displayLower = (display || '').toLowerCase().trim()
  const searchLower = search.toLowerCase().trim()
  
  // 如果 search 等於 display（小寫），則沒有其他詞形
  if (searchLower === displayLower) return []
  
  // 分割搜索字段，移除主詞頭，返回其他詞形
  const parts = search.split(/\s+/).filter(p => p.trim() !== '')
  const variants: string[] = []
  
  for (const part of parts) {
    const partLower = part.toLowerCase().trim()
    // 跳過主詞頭（不區分大小寫）
    if (partLower !== displayLower) {
      variants.push(part)
    }
  }
  
  return variants
}

// 將其他詞形數組轉換為搜索字段字符串
function buildSearchField(display: string | undefined, variants: string[]): string {
  const displayStr = (display || '').trim()
  const variantStrs = variants.filter(v => v && v.trim() !== '').map(v => v.trim())
  return [displayStr, ...variantStrs].join(' ').trim()
}

// 初始化：確保 search 和 normalized 字段正確設置
if (props.entry.headword) {
  // 如果 normalized 為空，設為 display
  if (!props.entry.headword.normalized && props.entry.headword.display) {
    props.entry.headword.normalized = props.entry.headword.display
  }
  // 確保 search 字段包含 display
  if (props.entry.headword.display) {
    const displayLower = props.entry.headword.display.toLowerCase().trim()
    if (!props.entry.headword.search || props.entry.headword.search.trim() === '') {
      // 如果 search 為空，設為 display
      props.entry.headword.search = props.entry.headword.display
    } else {
      // 如果 search 已有內容，檢查是否包含 display
      const searchParts = props.entry.headword.search.split(/\s+/).filter(p => p.trim() !== '')
      const hasDisplay = searchParts.some(p => p.toLowerCase().trim() === displayLower)
      if (!hasDisplay) {
        // 如果 search 中沒有 display，將其添加到開頭
        props.entry.headword.search = [props.entry.headword.display, ...searchParts].join(' ').trim()
      } else {
        // 如果 search 中有 display，確保它在第一個位置
        const displayIndex = searchParts.findIndex(p => p.toLowerCase().trim() === displayLower)
        if (displayIndex > 0) {
          searchParts.splice(displayIndex, 1)
          searchParts.unshift(props.entry.headword.display)
          props.entry.headword.search = searchParts.join(' ').trim()
        }
      }
    }
  }
}

// 從 search 字段解析其他詞形
const variants = ref<string[]>(
  parseSearchField(props.entry.headword?.search, props.entry.headword?.display)
)

// 監聽 variants 變化，同步到 entry.headword.search
watch(variants, (newVariants) => {
  if (!props.entry.headword) {
    props.entry.headword = { display: '', search: '', normalized: '', isPlaceholder: false }
  }
  // 將其他詞形合併到搜索字段
  props.entry.headword.search = buildSearchField(props.entry.headword.display, newVariants)
  props.entry._isDirty = true
}, { deep: true })

// 監聽 display 變化，更新 normalized 和 search
watch(() => props.entry.headword?.display, (newDisplay, oldDisplay) => {
  if (!props.entry.headword) return
  
  // 標準化詞頭默認等於顯示詞頭
  if (newDisplay !== undefined) {
    props.entry.headword.normalized = newDisplay
    
    // 確保顯示詞頭始終包含在搜索詞頭中
    // 重新構建 search 字段（新的 display 作為第一個詞，然後是其他詞形）
    props.entry.headword.search = buildSearchField(newDisplay, variants.value)
  }
  props.entry._isDirty = true
})

function onHeadwordChange() {
  // 同步 headword.display 到 text（兼容舊格式）
  if (props.entry.headword?.display) {
    props.entry.text = props.entry.headword.display
  }
  // normalized 會通過 watch 自動更新
  props.entry._isDirty = true
}

function onVariantChange() {
  props.entry._isDirty = true
}

function addVariant() {
  variants.value.push('')
  props.entry._isDirty = true
}

function removeVariant(index: number) {
  variants.value.splice(index, 1)
  props.entry._isDirty = true
}
</script>
