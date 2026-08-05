<template>
  <!-- 格四態（FaanjyutV1Design §6.3）：normal=白底 raw；absent=淺藍灰底灰色 `_`；
       cleared=淡黃底+刪除線；null=空白。P3 只讀：格不可點擊進入編輯（P4）。 -->
  <td
    class="fj-cell text-center align-middle px-2 h-14 text-[13px]"
    :class="stateClass"
    :title="stateTitle"
    :data-source-cell="cell?.sourceCell"
  >
    <template v-if="cell?.state === 'normal'">
      <span class="jc-mono break-all">{{ cell.raw }}</span>
    </template>
    <template v-else-if="cell?.state === 'absent'">
      <span class="jc-mono text-gray-400">_</span>
    </template>
    <template v-else-if="cell?.state === 'cleared'">
      <span class="jc-mono text-gray-400 line-through break-all">{{ cell.raw || '　' }}</span>
    </template>
  </td>
</template>

<script setup lang="ts">
import type { FaanjyutMatrixCell } from '~/composables/useFaanjyutMatrix'

const props = defineProps<{
  cell?: FaanjyutMatrixCell
}>()

const stateClass = computed(() => {
  switch (props.cell?.state) {
    case 'normal': return 'bg-white dark:bg-slate-800'
    case 'absent': return 'fj-cell-absent'
    case 'cleared': return 'fj-cell-cleared'
    default: return 'fj-cell-null'
  }
})

const stateTitle = computed(() => {
  switch (props.cell?.state) {
    case 'absent': return '確定沒有'
    case 'cleared': return '曾有內容，已被清空'
    default: return undefined
  }
})
</script>

<style scoped>
.fj-cell-absent { background: #EDF2F7; }
.fj-cell-cleared { background: #FDF6E0; }
.fj-cell-null { background: #FBFBF8; }
.dark .fj-cell-absent { background: #263242; }
.dark .fj-cell-cleared { background: #3A3421; }
.dark .fj-cell-null { background: #1B2530; }
</style>
