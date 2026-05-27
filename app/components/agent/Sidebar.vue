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
      <div class="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div class="flex-1 space-y-3 overflow-y-auto pr-1">
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

        <form class="flex gap-2" @submit.prevent="handleSubmit">
          <UInput
            v-model="draft"
            class="flex-1"
            placeholder="例如：找粵拼為 ang1 的詞；查 食飯；準備草稿 食飯 香港"
            :disabled="pending"
          />
          <UButton type="submit" :loading="pending" :disabled="!draft.trim()">
            發送
          </UButton>
        </form>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
const { open, messages, pending, error, sendMessage, resolveConfirmation } = useAgentChat()
const draft = ref('')

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
