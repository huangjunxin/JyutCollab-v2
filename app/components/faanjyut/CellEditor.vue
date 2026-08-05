<template>
  <!-- 矩陣格編輯態（FaanjyutV1Design §6.4）：單行輸入，Enter/Tab/Esc/blur 由
       useFaanjyutCellEdit 統一處理（本組件只透傳原生事件）。格值多為單行，
       input 比 textarea 更貼 Sheet 手感；Enter 即保存、無 Shift+Enter 換行需求。 -->
  <td
    class="fj-cell fj-cell-editing text-center align-middle px-2 h-14 text-[13px]"
    :title="error"
  >
    <template v-if="pending">
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 text-gray-400 animate-spin" />
    </template>
    <input
      v-else
      ref="inputRef"
      type="text"
      class="w-full h-9 px-2 text-[13px] jc-mono bg-white dark:bg-slate-900 rounded-sm border focus:outline-none focus:ring-2"
      :class="error
        ? 'border-red-500 focus:ring-red-500/40'
        : 'border-[var(--jc-accent)] focus:ring-[var(--jc-accent)]/40'"
      :value="modelValue"
      @input="onInput"
      @keydown="$emit('keydown', $event)"
      @blur="$emit('blur')"
    >
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

const inputRef = ref<HTMLInputElement | null>(null)

onMounted(() => {
  const input = inputRef.value
  if (!input) return
  input.focus()
  // 鍵盤進入（Tab 移格 / Enter / 直接打字）時游標置末，避免首鍵誤觸清空整格
  if (props.cursorToEnd) {
    input.setSelectionRange(input.value.length, input.value.length)
  }
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<style scoped>
.fj-cell-editing { background: #FBF3F1; }
.dark .fj-cell-editing { background: #2A2530; }
</style>
