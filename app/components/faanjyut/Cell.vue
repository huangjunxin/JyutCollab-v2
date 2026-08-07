<template>
  <!-- 格四態（FaanjyutV1Design §6.3）：normal=白底 raw；absent=淺藍灰底灰色 `_`；
       cleared=淡黃底 `∅`（2026-08-06 起；原「空格+刪除線」與下劃線難分辨，見 §6.4 反饋）；
       null=空白。
       P4 加三種格級狀態：pending=保存中 spinner；error=失敗標紅 + tooltip（點擊重試，
       重進編輯由 MatrixTable @edit 觸發）；editable=本人權限列可點擊進入編輯。 -->
  <td
    class="fj-cell text-center align-middle px-2 h-9 text-[13px]"
    :class="[stateClass, { 'fj-cell-editable': editable, 'fj-cell-error': error }]"
    :data-source-cell="cell?.sourceCell"
    @click="editable && $emit('edit')"
  >
    <!-- hover 提示：UPopover mode="hover"，與行頭釋義列同款（MatrixTable 2026-08-06）。
         有提示（error > 截斷全文 > 唯讀 > 狀態）才包，避免空彈層 -->
    <UPopover
      v-if="cellTitle"
      mode="hover"
      :content="{ side: 'top', sideOffset: 6, align: 'center' }"
      :ui="popoverUi"
    >
      <span v-if="pending" class="inline-flex items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-gray-400 animate-spin" />
      </span>
      <template v-else>
        <template v-if="cell?.state === 'normal'">
          <span ref="contentRef" class="jc-mono break-all leading-tight line-clamp-5">{{ cell.raw }}</span>
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
      <template #content>
        <div class="max-w-md whitespace-pre-line break-words">{{ cellTitle }}</div>
      </template>
    </UPopover>
    <span v-else-if="pending" class="inline-flex items-center justify-center">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-gray-400 animate-spin" />
    </span>
    <template v-else>
      <template v-if="cell?.state === 'normal'">
        <span ref="contentRef" class="jc-mono break-all leading-tight line-clamp-5">{{ cell.raw }}</span>
      </template>
      <template v-else-if="cell?.state === 'absent'">
        <span class="jc-mono text-gray-400">_</span>
      </template>
      <template v-else-if="cell?.state === 'cleared'">
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

const contentRef = ref<HTMLElement | null>(null)
const isTruncated = ref(false)

function checkTruncation() {
  const el = contentRef.value
  if (!el) return
  isTruncated.value = el.scrollHeight > el.clientHeight + 1
}

onMounted(() => {
  checkTruncation()
  requestAnimationFrame(checkTruncation)
})
watch(() => props.cell?.raw, () => {
  nextTick(() => {
    checkTruncation()
    requestAnimationFrame(checkTruncation)
  })
})

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

/** 統一彈層提示（UPopover #content）：錯誤 > 截斷全文 > 唯讀提示 > 狀態提示；空則不包彈層 */
const cellTitle = computed(() => {
  if (props.error) return props.error
  if (props.cell?.state === 'normal' && isTruncated.value) return props.cell.raw
  if (props.readonlyHint) return props.readonlyHint
  return stateTitle.value
})

/** hover 彈層樣式：與 MatrixTable 行頭釋義列的 UPopover 同款（bg-default + ring + 長文可滾動） */
const popoverUi = {
  content: 'bg-default text-highlighted shadow-sm rounded-sm ring ring-default px-2.5 py-1.5 text-xs select-none max-w-md max-h-[50vh] overflow-y-auto whitespace-pre-line break-words'
}
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
