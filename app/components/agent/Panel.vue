<template>
  <div class="flex h-screen flex-col border-l border-[var(--jc-border)] bg-white dark:bg-slate-900">
    <!-- Panel header -->
    <div class="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--jc-border)] px-4">
      <!-- Tab switcher -->
      <div class="flex rounded-md border border-[var(--jc-border)] text-xs">
        <button
          type="button"
          class="px-2.5 py-1 font-medium transition-colors"
          :class="activeTab === 'chat' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="activeTab = 'chat'"
        >
          對話
        </button>
        <button
          type="button"
          class="border-l border-[var(--jc-border)] px-2.5 py-1 font-medium transition-colors"
          :class="activeTab === 'audit' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
          @click="switchToAudit"
        >
          審計
        </button>
      </div>

      <template v-if="activeTab === 'chat'">
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
      </template>
      <template v-else>
        <span class="flex-1 text-xs text-gray-400">操作記錄</span>
      </template>

      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-x"
        aria-label="關閉 AI 助手"
        @click="open = false"
      />
    </div>

    <!-- Chat view -->
    <template v-if="activeTab === 'chat'">
      <!-- Messages -->
      <div ref="messagesContainer" class="flex-1 min-h-0 overflow-y-auto space-y-3 bg-gray-50/70 dark:bg-slate-900/50 p-4">
        <AgentMessage
          v-for="message in messages"
          :key="message.id"
          :message="message"
          @confirm="handleConfirm"
          @cancel="handleCancel"
          @content-resize="scheduleScrollToBottom"
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
    </template>

    <!-- Audit view -->
    <template v-else>
      <div class="flex-1 min-h-0 overflow-y-auto bg-gray-50/70 dark:bg-slate-900/50 p-4">
        <AgentAuditTimeline :events="auditEvents" :loading="auditLoading" />
      </div>
      <div v-if="auditError" class="px-4 pb-1">
        <UAlert color="error" variant="soft" :title="auditError" />
      </div>
    </template>
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

const { events: auditEvents, loading: auditLoading, error: auditError, fetchEvents } = useAgentAudit()

const activeTab = ref<'chat' | 'audit'>('chat')
const draft = ref('')
const selectedConversationId = ref<string | null>(null)
const messagesContainer = ref<HTMLElement | null>(null)
let scrollFrame: number | null = null

function scrollToBottom() {
  const container = messagesContainer.value
  if (!container) return
  container.scrollTop = container.scrollHeight
}

function scheduleScrollToBottom() {
  if (!import.meta.client) return
  if (scrollFrame !== null) cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = null
    scrollToBottom()
  })
}

watch(messages, scheduleScrollToBottom, { deep: true, flush: 'post' })

watch(open, async (isOpen) => {
  if (isOpen) {
    await refreshConversations()
    const isFreshSession = messages.value.length === 1 && messages.value[0]?.id === 'agent-welcome'
    if (isFreshSession) {
      const currentConv = currentConversationId.value
        ? conversations.value.find(c => c.id === currentConversationId.value)
        : null
      const alreadyFresh = currentConv && currentConv.messageCount === 0
      if (!alreadyFresh) {
        await createConversation()
      }
    }
    await nextTick()
    scheduleScrollToBottom()
  }
}, { immediate: true })

watch(currentConversationId, (id) => {
  selectedConversationId.value = id
})

async function handleConversationChange(id: string | null) {
  if (id) {
    await loadConversation(id)
    await nextTick()
    scheduleScrollToBottom()
  }
}

async function handleSubmit() {
  const content = draft.value
  draft.value = ''
  scheduleScrollToBottom()
  await sendMessage(content)
}

async function handleConfirm(payload: { id: string, echo?: string, reason?: string }) {
  await resolveConfirmation(payload.id, true, payload.echo, payload.reason)
}

async function handleCancel(id: string) {
  await resolveConfirmation(id, false)
}

function switchToAudit() {
  activeTab.value = 'audit'
  fetchEvents(currentConversationId.value || undefined)
}
</script>
