<script setup lang="ts">
import type { FaanJyutLexemeDetail } from '~/types/faanjyut'
import type { FaanJyutCellView } from '~/types/faanjyut'

/**
 * 方言點方音小卡（詞條詳情區塊 2）：列名 + shortLabel 徽章 + 四態格值 + 狀態提示。
 * 全部唯讀；列 label/shortLabel 來自導入列，狀態由四態格視圖推導。
 */
const props = defineProps<{
  item: FaanJyutLexemeDetail['pronunciations'][number]
}>()

const chipPalette = ['blue', 'green', 'indigo', 'amber', 'red', 'slate'] as const

const chipTone = computed(() => {
  let hash = 0
  for (const ch of props.item.label) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return chipPalette[hash % chipPalette.length]
})

function stateHint(cell: FaanJyutCellView): string {
  switch (cell.state) {
    case 'normal': return '有值'
    case 'absent': return '_（確定沒有）'
    case 'cleared': return '已清空（曾有內容）'
    default: return '空白'
  }
}

function cellTitle(cell: FaanJyutCellView): string {
  switch (cell.state) {
    case 'normal': return 'normal：有值'
    case 'absent': return '_：確定沒有'
    case 'cleared': return 'cleared：曾有內容，已被清空'
    default: return 'null：原表無記錄'
  }
}
</script>

<template>
  <div class="jc-card p-3" :title="cellTitle(item.cell)">
    <div class="flex items-center justify-between gap-1 mb-2">
      <span class="text-sm font-medium text-[var(--jc-ink-strong)] dark:text-slate-100 truncate">
        {{ item.label }}
      </span>
      <FaanjyutToneChip
        v-if="item.shortLabel"
        :tone="chipTone"
        :label="item.shortLabel"
      />
    </div>
    <FaanjyutCellBadge :cell="item.cell" large />
    <div class="text-[11px] text-center mt-1.5 text-[var(--jc-muted)] dark:text-slate-400">
      {{ stateHint(item.cell) }}
    </div>
  </div>
</template>
