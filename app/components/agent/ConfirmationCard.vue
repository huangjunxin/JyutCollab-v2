<template>
  <div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
    <div class="mb-2 flex items-center justify-between gap-2">
      <div class="font-semibold text-amber-900 dark:text-amber-100">需要確認</div>
      <UBadge color="warning" variant="soft">{{ confirmation.risk }}</UBadge>
    </div>
    <p class="mb-2 text-amber-900 dark:text-amber-100">{{ confirmation.summary }}</p>
    <div class="mb-2 text-xs text-amber-800 dark:text-amber-200">
      目標：{{ confirmation.target.label }}
    </div>
    <ul class="mb-3 list-disc pl-4 text-xs text-amber-800 dark:text-amber-200">
      <li v-for="item in confirmation.consequences" :key="item">{{ item }}</li>
    </ul>

    <div v-if="confirmation.requiredEcho" class="mb-2">
      <UInput v-model="echo" :placeholder="`輸入 ${confirmation.requiredEcho} 確認`" />
    </div>
    <div v-if="confirmation.action === 'reject_review_entry'" class="mb-2">
      <UTextarea v-model="reason" placeholder="拒絕原因" :rows="2" />
    </div>

    <div class="flex justify-end gap-2">
      <UButton color="neutral" variant="ghost" size="sm" @click="$emit('cancel', confirmation.id)">
        取消
      </UButton>
      <UButton
        color="warning"
        size="sm"
        :disabled="!canConfirm"
        @click="$emit('confirm', { id: confirmation.id, echo, reason })"
      >
        確認執行
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AgentConfirmationSummary } from '../../types/agent'

const props = defineProps<{ confirmation: AgentConfirmationSummary }>()
defineEmits<{
  confirm: [{ id: string, echo?: string, reason?: string }]
  cancel: [string]
}>()

const echo = ref('')
const reason = ref('')
const canConfirm = computed(() => {
  if (props.confirmation.requiredEcho && echo.value !== props.confirmation.requiredEcho) return false
  if (props.confirmation.action === 'reject_review_entry' && !reason.value.trim()) return false
  return true
})
</script>
