<template>
  <!-- 格四態（FaanjyutV1Design §6.3）：normal=白底 raw；absent=淺藍灰底灰色 `_`；
       cleared=淡黃底 `∅`（2026-08-06 起；原「空格+刪除線」與下劃線難分辨，見 §6.4 反饋）；
       null=空白。
       P4 加三種格級狀態：pending=保存中 spinner；error=失敗標紅 + tooltip（點擊重試，
       重進編輯由 MatrixTable @edit 觸發）；editable=本人權限列可點擊進入編輯。 -->
  <td
    class="fj-cell text-center align-middle px-2 h-14 text-[13px]"
    :class="[stateClass, { 'fj-cell-editable': editable, 'fj-cell-error': error }]"
    :title="error ?? readonlyHint ?? stateTitle"
    :data-source-cell="cell?.sourceCell"
    @click="editable && $emit('edit')"
  >
    <span v-if="pending" class="inline-flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-gray-400 animate-spin" />
    </span>
    <template v-else>
      <template v-if="cell?.state === 'normal'">
        <span class="jc-mono break-all">{{ cell.raw }}</span>
      </template>
      <template v-else-if="cell?.state === 'absent'">
        <span class="jc-mono text-gray-400">_</span>
      </template>
      <template v-else-if="cell?.state === 'cleared'">
        <!-- 已清空格：原表导入不存在 cleared（平台生成态），clear 时服务端已卸载 raw，
             统一显示 ∅（2026-08-06 用户反馈：旧「空格+删除线」与下划线难分辨） -->
        <span class="jc-mono text-gray-400">∅</span>
      </template>
    </template>
  </td>
</template>

<script setup lang="ts">
import type { FaanjyutMatrixCell } from '~/composables/useFaanjyutMatrix'

const props = withDefaults(defineProps<{
  cell?: FaanjyutMatrixCell
  /** 本格可進入編輯（服務端 col.canEdit && writeEnabled，由 MatrixTable 計算） */
  editable?: boolean
  /** 唯讀格 hover 提示（僅在全局寫入旗標開啟時顯示「你沒有此列的編輯權限」） */
  readonlyHint?: string
  /** 保存中：格內輕量 spinner（§6.4） */
  pending?: boolean
  /** 保存失敗：格標紅 + 錯誤文案 tooltip，點擊重試（§6.4） */
  error?: string
}>(), {
  cell: undefined,
  editable: false,
  readonlyHint: undefined,
  pending: false,
  error: undefined
})

const emit = defineEmits<{
  edit: []
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
.fj-cell-editable { cursor: text; }
.dark .fj-cell-absent { background: #263242; }
.dark .fj-cell-cleared { background: #3A3421; }
.dark .fj-cell-null { background: #1B2530; }
</style>
