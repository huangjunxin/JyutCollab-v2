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

// 初始化：確保 normalized 存在
if (props.entry.headword) {
  if (!props.entry.headword.normalized && props.entry.headword.display) {
    props.entry.headword.normalized = props.entry.headword.display
  }
}

// 從 variants 初始化本地編輯狀態
const variants = ref<string[]>([])
{
  const hw = props.entry.headword
  if (hw) {
    if (Array.isArray(hw.variants) && hw.variants.length > 0) {
      variants.value = [...hw.variants]
    }
  }
}

// 監聽 variants 變化，同步到 entry.headword.variants
watch(variants, (newVariants) => {
  if (!props.entry.headword) {
    props.entry.headword = { display: '', normalized: '', isPlaceholder: false, variants: [] }
  }
  props.entry.headword.variants = newVariants.filter((v) => v.trim() !== '')
  props.entry._isDirty = true
}, { deep: true })

// 監聽 display 變化，更新 normalized
watch(() => props.entry.headword?.display, (newDisplay, oldDisplay) => {
  if (!props.entry.headword) return
  
  // 標準化詞頭默認等於顯示詞頭
  if (newDisplay !== undefined) {
    props.entry.headword.normalized = newDisplay
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
