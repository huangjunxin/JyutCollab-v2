<script setup lang="ts">
import { truncateFaanJyutHash } from '~/utils/faanjyutFormat'

/**
 * 可複製的等寬文字（詞條鍵、穩定 ID、SHA-256 等）。
 * value 原樣等寬顯示；truncated 時縮短為「頭12…尾5」（title 掛完整值）。
 */
const props = withDefaults(defineProps<{
  value: string
  truncated?: boolean
  mono?: boolean
}>(), {
  truncated: false,
  mono: true
})

const copied = ref(false)
const display = computed(() =>
  props.truncated ? truncateFaanJyutHash(props.value) : props.value
)

async function copyValue() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  } catch {
    // 剪貼簿不可用（如非安全上下文）時靜默失敗
  }
}
</script>

<template>
  <span class="inline-flex items-center gap-1.5 min-w-0">
    <code
      class="px-2 py-1 text-sm border border-[var(--jc-border)] bg-[var(--jc-canvas-soft)] dark:bg-[var(--jc-dark-surface-muted)] dark:text-slate-200"
      :class="props.mono ? 'jc-mono' : ''"
      :title="props.truncated ? props.value : undefined"
    >{{ display }}</code>
    <button
      type="button"
      class="p-1 shrink-0 text-[var(--jc-muted)] hover:text-[var(--jc-ink-strong)] hover:bg-black/5 dark:hover:text-white"
      :title="copied ? '已複製' : '複製'"
      :aria-label="`複製 ${props.value}`"
      @click="copyValue"
    >
      <UIcon :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'" class="w-4 h-4" />
    </button>
  </span>
</template>
