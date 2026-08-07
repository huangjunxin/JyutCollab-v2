<template>
  <!-- 矩陣格編輯態（FaanjyutV1Design §6.4）：textarea 自動換行 + 自適應高度，
       與顯示態 break-all 一致，避免長音值編輯時跳動。
       Enter/Tab/Esc/blur 由 useFaanjyutCellEdit 統一處理（本組件只透傳原生事件）。 -->
  <td
    class="fj-cell fj-cell-editing text-center align-middle px-2 text-[13px]"
    :title="error"
  >
    <template v-if="pending">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-gray-400 animate-spin" />
    </template>
    <textarea
      v-else
      ref="textareaRef"
      rows="1"
      class="w-full px-2 py-1 text-[13px] jc-mono bg-white dark:bg-slate-900 rounded-sm border focus:outline-none focus:ring-2 resize-none break-all leading-tight max-h-24 overflow-y-auto"
      :class="error
        ? 'border-red-500 focus:ring-red-500/40'
        : 'border-[var(--jc-accent)] focus:ring-[var(--jc-accent)]/40'"
      :value="modelValue"
      @input="onInput"
      @keydown="$emit('keydown', $event)"
      @blur="$emit('blur')"
    />
  </td>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  /** 保存中（當前流程保存即退出編輯，spinner 落在 Cell.vue；此 prop 為協議預留） */
  pending?: boolean
  /** 該格上次保存失敗的錯誤文案（重試時提示） */
  error?: string
  /** 鍵盤激活進入編輯時游標置末（鼠標點擊不置，方便選中文字） */
  cursorToEnd?: boolean
}>(), {
  pending: false,
  error: undefined,
  cursorToEnd: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  keydown: [event: KeyboardEvent]
  blur: []
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

onMounted(() => {
  const el = textareaRef.value
  if (!el) return
  el.focus()
  autoResize()
  if (props.cursorToEnd) {
    el.setSelectionRange(el.value.length, el.value.length)
  }
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  autoResize()
}
</script>

<style scoped>
.fj-cell-editing { background: #FBF3F1; }
.dark .fj-cell-editing { background: #2A2530; }
</style>
