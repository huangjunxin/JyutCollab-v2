<script setup lang="ts">
/**
 * 泛粵頁面統一的區塊頭：左側紅色描邊圖示盒 + 標題（jc-serif）+ 副標。
 * 對應 UI 預覽稿各區塊標題形態。
 */
defineProps<{
  icon: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="flex items-start gap-3 mb-3">
    <div
      class="w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--jc-accent)] bg-[var(--jc-accent-soft-strong)]"
    >
      <UIcon :name="icon" class="w-5 h-5 text-[var(--jc-accent)]" />
    </div>
    <div class="min-w-0">
      <h2 class="jc-serif text-xl font-bold text-[var(--jc-ink-strong)] dark:text-white">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="text-sm text-gray-500 dark:text-slate-400">
        <span v-html="subtitle" />
      </p>
    </div>
  </div>
</template>
