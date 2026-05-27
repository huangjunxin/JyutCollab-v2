<template>
  <div class="flex h-screen flex-col border-l border-[var(--jc-border)] bg-white dark:bg-slate-900">
    <!-- Panel header -->
    <div class="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--jc-border)] px-4">
      <USelectMenu
        v-model="selectedConversationId"
        class="min-w-0 flex-1"
        value-key="id"
        label-key="title"
        :items="conversations"
        placeholder="歷史對話"
        :loading="loadingHistory"
        @update:model-value="handleConversationChange"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-plus"
        :loading="loadingHistory"
        aria-label="新對話"
        @click="createConversation"
      />
      <UButton
        v-if="currentConversationId"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-archive"
        :loading="loadingHistory"
        aria-label="封存目前對話"
        @click="archiveConversation(currentConversationId)"
      />
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-x"
        aria-label="關閉 AI 助手"
        @click="open = false"
      />
    </div>

    <!-- Messages -->
    <div class="flex-1 min-h-0 overflow-y-auto space-y-3 bg-gray-50/70 dark:bg-slate-900/50 p-4">
      <AgentMessage
        v-for="message in messages"
        :key="message.id"
        :message="message"
        @confirm="handleConfirm"
        @cancel="handleCancel"
      />
    </div>

    <!-- Error -->
    <div v-if="error" class="px-4 pb-1">
      <UAlert color="error" variant="soft" :title="error" />
    </div>

    <!-- Input -->
    <form class="border-t border-[var(--jc-border)] p-3" @submit.prevent="handleSubmit">
      <div class="flex gap-2">
        <UInput
          v-model="draft"
          class="flex-1"
          placeholder="例如：查 食飯；找粵拼 ang1；檢查重複"
          :disabled="pending || loadingHistory"
        />
        <UButton type="submit" color="primary" size="sm" :loading="pending" :disabled="!draft.trim() || loadingHistory">
          發送
        </UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const {
  open,
  conversations,
  currentConversationId,
  messages,
  pending,
  loadingHistory,
  error,
  refreshConversations,
  createConversation,
  loadConversation,
  archiveConversation,
  sendMessage,
  resolveConfirmation
} = useAgentChat()
const draft = ref('')
const selectedConversationId = ref<string | null>(null)

watch(open, async (isOpen) => {
  if (isOpen) await refreshConversations()
})

watch(currentConversationId, (id) => {
  selectedConversationId.value = id
})

async function handleConversationChange(id: string | null) {
  if (id) await loadConversation(id)
}

async function handleSubmit() {
  const content = draft.value
  draft.value = ''
  await sendMessage(content)
}

async function handleConfirm(payload: { id: string, echo?: string, reason?: string }) {
  await resolveConfirmation(payload.id, true, payload.echo, payload.reason)
}

async function handleCancel(id: string) {
  await resolveConfirmation(id, false)
}
</script>
