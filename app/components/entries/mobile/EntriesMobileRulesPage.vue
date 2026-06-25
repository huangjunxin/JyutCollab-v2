<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">條件着色規則</h2>
      </div>
    </div>

    <div class="flex-1 overflow-auto px-4 py-3">
      <div v-if="rules.length === 0" class="text-center py-8">
        <UIcon name="i-heroicons-paint-brush" class="w-10 h-10 text-gray-400 mb-3 mx-auto" />
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">暫無條件着色規則</p>
        <p class="text-xs text-gray-400 dark:text-gray-500">
          你可以在桌面端進階篩選面板中建立規則，手機端可切換啟用與停用。
        </p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="rule in rules"
          :key="rule.id"
          class="bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] p-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span
                  class="w-3 h-3 rounded-full shrink-0"
                  :style="{ backgroundColor: rule.colorHex || presetColor(rule.stylePreset) }"
                />
                <span class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ rule.name }}</span>
                <UBadge size="xs" variant="soft" :color="rule.enabled ? 'primary' : 'neutral'">
                  {{ rule.enabled ? '啟用' : '停用' }}
                </UBadge>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ rule.kind === 'formatting' ? '格式化' : '驗證' }}
                · {{ rule.condition.kind === 'formula' ? '公式' : '正則' }}
                · 欄位：{{ rule.targetFields.join(', ') }}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                class="relative w-10 h-5 rounded-full transition-colors"
                :class="rule.enabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'"
                @click="$emit('toggle-rule', rule.id)"
              >
                <span
                  class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  :class="{ 'translate-x-5': rule.enabled }"
                />
              </button>
              <UButton
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                size="xs"
                @click="$emit('remove-rule', rule.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RuleOverlay {
  id: string
  name: string
  kind: 'formatting' | 'validation'
  enabled: boolean
  targetFields: string[]
  condition: { kind: 'formula' | 'regex' }
  stylePreset: 'green' | 'blue' | 'purple' | 'amber'
  colorHex?: string
}

defineProps<{
  rules: RuleOverlay[]
}>()

defineEmits<{
  'back': []
  'toggle-rule': [ruleId: string]
  'remove-rule': [ruleId: string]
}>()

function presetColor(preset: string): string {
  const colors: Record<string, string> = {
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#a855f7',
    amber: '#f59e0b'
  }
  return colors[preset] || '#6b7280'
}
</script>
