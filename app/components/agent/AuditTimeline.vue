<template>
  <div class="space-y-1">
    <div v-if="loading" class="flex items-center justify-center py-8 text-sm text-gray-400">
      <UIcon name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
      載入中…
    </div>
    <div v-else-if="!events.length" class="py-8 text-center text-sm text-gray-400">
      暫無審計記錄
    </div>
    <template v-else>
      <div
        v-for="event in events"
        :key="event.id"
        class="group flex gap-3 rounded-md px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
      >
        <!-- Icon -->
        <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" :class="eventIconBg(event)">
          <UIcon :name="eventIcon(event)" class="h-3.5 w-3.5" :class="eventIconColor(event)" />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
              {{ eventLabel(event) }}
            </span>
            <UBadge
              v-if="event.toolName"
              size="xs"
              variant="soft"
              color="primary"
              :label="event.toolName.replace('jyutcollab.', '')"
            />
            <UBadge
              v-if="event.risk && event.risk !== 'safe'"
              size="xs"
              variant="soft"
              :color="riskColor(event.risk)"
              :label="event.risk"
            />
          </div>
          <p v-if="event.outputSummary" class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" :title="event.outputSummary">
            {{ event.outputSummary }}
          </p>
          <p v-if="event.blockedReason" class="mt-0.5 text-xs text-red-500">
            {{ event.blockedReason }}
          </p>
          <span class="text-[10px] text-gray-400 dark:text-gray-500">
            {{ formatTime(event.createdAt) }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { AgentAuditEventItem } from '~/types/agent'

defineProps<{
  events: AgentAuditEventItem[]
  loading?: boolean
}>()

const EVENT_LABELS: Record<string, string> = {
  conversation_created: '建立對話',
  user_message: '用戶訊息',
  assistant_message: '助手回覆',
  tool_call_started: '工具調用開始',
  tool_call_result: '工具調用結果',
  confirmation_requested: '請求確認',
  confirmation_accepted: '確認已接受',
  confirmation_rejected: '確認已拒絕',
  confirmation_failed: '確認失敗',
  confirmation_expired: '確認已過期',
  blocked_action: '操作被阻止',
  model_error: '模型錯誤'
}

function eventLabel(event: AgentAuditEventItem): string {
  return EVENT_LABELS[event.eventType] || event.eventType
}

function eventIcon(event: AgentAuditEventItem): string {
  const map: Record<string, string> = {
    user_message: 'i-lucide-user',
    assistant_message: 'i-lucide-bot',
    tool_call_started: 'i-lucide-play',
    tool_call_result: 'i-lucide-check-circle',
    confirmation_requested: 'i-lucide-alert-circle',
    confirmation_accepted: 'i-lucide-check',
    confirmation_rejected: 'i-lucide-x-circle',
    blocked_action: 'i-lucide-shield-x',
    model_error: 'i-lucide-alert-triangle'
  }
  return map[event.eventType] || 'i-lucide-circle'
}

function eventIconBg(event: AgentAuditEventItem): string {
  if (event.eventType === 'blocked_action' || event.eventType === 'model_error') return 'bg-red-100 dark:bg-red-900/30'
  if (event.eventType.startsWith('confirmation_')) return 'bg-amber-100 dark:bg-amber-900/30'
  if (event.eventType === 'tool_call_result') return 'bg-green-100 dark:bg-green-900/30'
  return 'bg-gray-100 dark:bg-gray-800'
}

function eventIconColor(event: AgentAuditEventItem): string {
  if (event.eventType === 'blocked_action' || event.eventType === 'model_error') return 'text-red-500'
  if (event.eventType.startsWith('confirmation_')) return 'text-amber-500'
  if (event.eventType === 'tool_call_result') return 'text-green-600'
  return 'text-gray-500'
}

function riskColor(risk: string): 'error' | 'warning' | 'info' {
  if (risk.includes('admin') || risk.includes('delete') || risk.includes('editorial')) return 'error'
  if (risk.includes('draft') || risk.includes('write')) return 'warning'
  return 'info'
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  if (diffMs < 60_000) return '剛才'
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)} 分鐘前`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)} 小時前`
  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>
