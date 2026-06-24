<template>
  <div class="flex-shrink-0 overflow-x-auto scrollbar-hide">
    <div class="flex gap-1.5 px-3 py-2 min-w-max">
      <button
        v-for="view in views"
        :key="view.value"
        class="px-3 py-1.5 text-xs font-medium rounded-none border transition-colors whitespace-nowrap"
        :class="modelValue === view.value
          ? 'bg-primary text-white border-primary shadow-[var(--jc-shadow-hard)]'
          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] hover:bg-gray-50 dark:hover:bg-slate-700'"
        @click="$emit('update:modelValue', view.value)"
      >
        {{ view.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  views: Array<{ value: string; label: string }>
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
