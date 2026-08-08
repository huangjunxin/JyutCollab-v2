<script setup lang="ts">
import type { FaanJyutLexemeDetail } from '~/types/faanjyut'
import type { FaanJyutCellView } from '~/types/faanjyut'

const props = defineProps<{
  item: FaanJyutLexemeDetail['pronunciations'][number]
}>()

const chipPalette = ['blue', 'green', 'indigo', 'amber', 'red', 'slate'] as const

const chipTone = computed(() => {
  let hash = 0
  for (const ch of props.item.label) hash = (hash * 31 + ch.charCodeAt(0)) % 997
  return chipPalette[hash % chipPalette.length]
})

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
  <div
    class="min-w-0 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-[var(--jc-dark-surface)] p-2 hover:border-slate-400 dark:hover:border-slate-500"
    :title="cellTitle(item.cell)"
  >
    <div class="flex items-center justify-between gap-1.5 mb-1.5">
      <span class="text-[13px] font-medium text-[var(--jc-ink-strong)] dark:text-slate-100 truncate">
        {{ item.label }}
      </span>
      <FaanjyutToneChip
        v-if="item.shortLabel"
        :tone="chipTone"
        :label="item.shortLabel"
      />
    </div>
    <FaanjyutCellBadge :cell="item.cell" large />
  </div>
</template>
