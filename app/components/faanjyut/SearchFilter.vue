<template>
  <div class="flex min-w-[280px] flex-1 items-center gap-2">
    <div class="relative min-w-[200px] flex-1">
      <UIcon
        name="i-heroicons-magnifying-glass"
        class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      />
      <input
        :value="modelValue"
        type="text"
        role="searchbox"
        inputmode="search"
        maxlength="100"
        aria-label="篩選整張泛粵字表"
        placeholder="篩選整張字表：詞條、讀音、代表字、釋義…"
        class="h-9 w-full border border-[var(--jc-border)] bg-white pl-8 pr-8 text-sm text-[var(--jc-ink)] focus:border-[var(--jc-accent)] focus:outline-none dark:border-[var(--jc-dark-border)] dark:bg-slate-800 dark:text-gray-200"
        @input="onInput"
        @keydown.enter.prevent="emit('submit')"
        @keydown.esc="clear"
      >
      <button
        v-if="modelValue"
        type="button"
        aria-label="清除搜尋"
        title="清除搜尋"
        class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-[var(--jc-ink-strong)] dark:hover:text-white"
        @click="clear"
      >
        <UIcon name="i-heroicons-x-mark" class="h-4 w-4" />
      </button>
    </div>
    <UButton
      type="button"
      size="sm"
      color="primary"
      icon="i-heroicons-funnel"
      :loading="loading"
      class="h-9 shrink-0"
      @click="emit('submit')"
    >
      篩選
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  submit: []
}>()

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function clear() {
  emit('update:modelValue', '')
  emit('submit')
}
</script>
