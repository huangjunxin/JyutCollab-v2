<template>
  <div class="fixed bottom-6 right-6 z-50">
    <UButton
      icon="i-lucide-sparkles"
      color="primary"
      size="xl"
      class="rounded-full shadow-lg"
      aria-label="打開 JyutCollab AI 助手"
      @click="open = true"
    >
      AI
    </UButton>
  </div>

  <USlideover v-model:open="open" side="right" title="JyutCollab AI 助手" description="協助查詞、整理草稿與處理審核流程">
    <template #body>
      <div class="flex h-[calc(100vh-8rem)] min-w-0 flex-col gap-4">
        <div class="flex items-center gap-2 border-b border-gray-200 pb-3">
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
        </div>

        <div class="min-w-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
          <AgentMessage
            v-for="message in messages"
            :key="message.id"
            :message="message"
            @confirm="handleConfirm"
            @cancel="handleCancel"
          />
        </div>

        <UAlert
          v-if="error"
          color="error"
          variant="soft"
          :title="error"
        />

        <form class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm" @submit.prevent="handleSubmit">
          <div class="flex gap-2">
            <UInput
              v-model="draft"
              class="flex-1"
              placeholder="例如：查 食飯；找粵拼 ang1；檢查重複"
              :disabled="pending || loadingHistory"
            />
            <UButton type="submit" color="primary" :loading="pending" :disabled="!draft.trim() || loadingHistory">
              發送
            </UButton>
          </div>
        </form>
      </div>
    </template>
  </USlideover>
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
