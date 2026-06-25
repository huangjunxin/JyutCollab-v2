<template>
  <div
    class="bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] rounded-none overflow-hidden"
    :class="{ 'ring-2 ring-primary/40': isEditing }"
  >
    <!-- Field display row -->
    <button
      class="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50 active:bg-gray-100 dark:active:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="disabled"
      @click="handleClick"
    >
      <UIcon v-if="icon" :name="icon" class="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
      <div class="flex-1 min-w-0">
        <span class="text-xs text-gray-500 dark:text-gray-400 block">{{ label }}</span>
        <span
          v-if="!isEditing"
          class="text-sm text-gray-900 dark:text-white block truncate"
          :class="{ 'text-gray-400 dark:text-gray-500': !value }"
        >
          {{ value || '點擊編輯' }}
        </span>
      </div>
      <UIcon
        v-if="type === 'select'"
        name="i-heroicons-chevron-right"
        class="w-4 h-4 text-gray-400 shrink-0"
      />
    </button>

    <!-- Inline text expansion -->
    <div v-if="isEditing && type === 'text'" class="px-3 pb-3">
      <UTextarea
        ref="inputRef"
        :model-value="localValue"
        :rows="2"
        size="sm"
        class="w-full"
        :ui="{ root: 'w-full', base: 'w-full bg-white dark:bg-slate-800' }"
        @update:model-value="localValue = $event"
        @blur="commitEdit"
        @keyup.escape="$emit('finish')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  label: string
  icon?: string
  value: string
  type: 'text' | 'select'
  isEditing?: boolean
  disabled?: boolean
  options?: Array<{ value: string; label: string }>
}>()

const emit = defineEmits<{
  'click': []
  'update:model-value': [value: string]
  'finish': []
}>()

const localValue = ref('')
const inputRef = ref<any>(null)

watch(() => props.isEditing, (editing) => {
  if (editing) {
    localValue.value = props.value
    nextTick(() => {
      const el = inputRef.value?.$el?.querySelector('textarea') || inputRef.value?.$el?.querySelector('input')
      el?.focus()
    })
  }
})

function handleClick() {
  if (props.disabled) return
  emit('click')
}

function commitEdit() {
  if (localValue.value !== props.value) {
    emit('update:model-value', localValue.value)
  }
  emit('finish')
}
</script>
