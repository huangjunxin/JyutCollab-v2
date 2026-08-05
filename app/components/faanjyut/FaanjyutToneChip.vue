<script setup lang="ts">
/**
 * 泛粵頁面通用色調徽章（圓角藥丸）。tone 對應導入報告與詳情頁的狀態/嚴重度色。
 */
const props = withDefaults(defineProps<{
  tone?: 'green' | 'red' | 'amber' | 'gray' | 'blue' | 'indigo' | 'slate'
  label: string
  title?: string
}>(), {
  tone: 'gray'
})

const toneClass: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  gray: 'bg-slate-200 text-slate-600 dark:bg-slate-600/30 dark:text-slate-300',
  slate: 'bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap rounded-full"
    :class="toneClass[props.tone]"
    :title="title"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
