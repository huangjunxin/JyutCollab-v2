<template>
  <tr
    class="bg-purple-50/80 dark:bg-purple-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="ai-suggestion-inline-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-purple-500 flex-shrink-0" />
            <h3 id="ai-suggestion-inline-title" class="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {{ title }}
            </h3>
          </div>
          <p class="text-sm text-gray-700 dark:text-gray-300 break-words">{{ text }}</p>
        </div>
        <div class="flex gap-2 flex-shrink-0">
          <UButton size="xs" color="neutral" variant="ghost" @mousedown.prevent="$emit('dismiss')">
            關閉 (Esc)
          </UButton>
          <UButton size="xs" color="primary" @mousedown.prevent="$emit('accept')">
            採納 (Tab)
          </UButton>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
defineProps<{
  text: string
  title: string
  colspan: number
}>()

defineEmits<{
  accept: []
  dismiss: []
}>()
</script>
