<script setup lang="ts">
import type { FaanJyutCellView } from '~/types/faanjyut'

/**
 * 四態格值框（FaanjyutV1Design §6.3，全站統一視覺）：
 *  normal = 白底顯示 raw；absent = 淺藍灰底灰色 `_`；
 *  cleared = 淡黃底＋刪除線佔位；null = 空白。
 */
const props = withDefaults(defineProps<{
  cell: FaanJyutCellView
  /** 大尺寸（方言格卡內主值） */
  large?: boolean
}>(), {
  large: false
})

const sizeClass = computed(() =>
  props.large ? 'text-lg py-2' : 'text-[11px] py-0.5'
)

function cellStateTitle(cell: FaanJyutCellView): string {
  switch (cell.state) {
    case 'normal': return 'normal：有值'
    case 'absent': return '_：確定沒有'
    case 'cleared': return 'cleared：曾有內容，已被清空'
    default: return 'null：原表無記錄'
  }
}
</script>

<template>
  <div
    class="flex items-center justify-center border border-gray-300 jc-mono select-none"
    :class="[
      sizeClass,
      cell.state === 'normal' && 'bg-white dark:bg-transparent',
      cell.state === 'absent' && 'bg-slate-100 dark:bg-slate-700/40',
      cell.state === 'cleared' && 'bg-amber-50 dark:bg-amber-500/10',
      cell.state === 'null' && 'bg-transparent'
    ]"
    :title="cellStateTitle(cell)"
  >
    <template v-if="cell.state === 'normal'">
      <span class="text-blue-600 dark:text-blue-400 font-semibold">{{ cell.raw || '·' }}</span>
    </template>
    <template v-else-if="cell.state === 'absent'">
      <span class="text-gray-400 dark:text-slate-400 font-semibold">_</span>
    </template>
    <template v-else-if="cell.state === 'cleared'">
      <span class="text-gray-400 dark:text-slate-400 font-semibold">∅</span>
    </template>
    <template v-else>
      <span class="text-gray-300 dark:text-slate-600">·</span>
    </template>
  </div>
</template>
