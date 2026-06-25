<template>
  <USlideover
    :open="open"
    side="bottom"
    :ui="{ wrapper: 'max-h-[70vh]', base: 'bg-white dark:bg-slate-800 rounded-t-none' }"
    @update:open="$emit('update:open', $event)"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <UButton
          v-if="!required"
          label="清除"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="$emit('select', ''); $emit('update:open', false)"
        />
        <span v-else />
        <div class="min-w-0 text-center">
          <DialogTitle class="text-sm font-semibold text-gray-900 dark:text-white">
            {{ title }}
          </DialogTitle>
          <DialogDescription class="sr-only">
            選擇{{ title }}
          </DialogDescription>
        </div>
        <UButton
          label="完成"
          variant="ghost"
          color="primary"
          size="sm"
          @click="$emit('update:open', false)"
        />
      </div>
    </template>
    <template #body>
      <div class="space-y-1 py-2">
        <button
          v-for="option in options"
          :key="option.value"
          class="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 active:bg-gray-100 dark:active:bg-slate-700"
          @click="handleSelect(option.value)"
        >
          <span class="text-sm text-gray-900 dark:text-white">{{ option.label }}</span>
          <UIcon
            v-if="modelValue === option.value"
            name="i-heroicons-check"
            class="w-5 h-5 text-primary shrink-0"
          />
        </button>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { DialogDescription, DialogTitle } from 'reka-ui'

defineProps<{
  open: boolean
  title: string
  options: Array<{ value: string; label: string }>
  modelValue: string
  required?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'select': [value: string]
}>()

function handleSelect(value: string) {
  emit('select', value)
  emit('update:open', false)
}
</script>
