<template>
  <div
    class="rounded-lg border p-3"
    :class="message.role === 'user'
      ? 'ml-8 border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-950/40'
      : 'mr-8 border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'"
  >
    <div class="mb-1 flex items-center gap-2 text-xs text-gray-500">
      <UIcon :name="message.role === 'user' ? 'i-lucide-user' : 'i-lucide-sparkles'" class="size-4" />
      <span>{{ message.role === 'user' ? '你' : 'AI 助手' }}</span>
    </div>

    <div v-if="message.progress?.length" class="mb-3 space-y-1 text-xs text-gray-500">
      <div v-for="step in message.progress" :key="step.label" class="flex items-center gap-2">
        <UIcon
          :name="step.status === 'completed' ? 'i-lucide-check-circle-2' : step.status === 'failed' ? 'i-lucide-alert-circle' : 'i-lucide-loader-2'"
          class="size-3.5"
          :class="step.status === 'running' ? 'animate-spin' : ''"
        />
        <span>
          {{ step.label }}
          <span v-if="step.detail" class="text-gray-400"> — {{ step.detail }}</span>
        </span>
      </div>
    </div>

    <div class="agent-markdown text-sm text-gray-900 dark:text-gray-100" v-html="renderMarkdown(primaryMarkdown)" />

    <details v-if="message.streamingToolCall || message.toolCall" class="mt-3 rounded-md border border-blue-100 bg-blue-50/60 p-2 text-xs dark:border-blue-900 dark:bg-blue-950/20">
      <summary class="cursor-pointer select-none font-medium text-gray-700 dark:text-gray-200">
        {{ detailsSummary }}
      </summary>
      <div v-if="message.streamingToolCall" class="mt-2 rounded-md border border-blue-200 bg-white p-2 dark:border-blue-800 dark:bg-gray-900">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="font-medium">{{ message.streamingToolCall.name }}</span>
          <UBadge :color="message.streamingToolCall.status === 'completed' ? 'success' : message.streamingToolCall.status === 'failed' ? 'error' : 'info'" variant="soft">
            {{ toolStatusLabel(message.streamingToolCall.status) }}
          </UBadge>
        </div>
        <pre v-if="message.streamingToolCall.argumentsText" class="max-h-28 overflow-auto rounded bg-gray-50 p-2 text-[11px] dark:bg-gray-950">{{ message.streamingToolCall.argumentsText }}</pre>
      </div>
      <div v-if="message.toolCall" class="mt-2 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="font-medium">{{ message.toolCall.name }}</span>
          <UBadge color="success" variant="soft">{{ formatRisk(message.toolCall.risk) }}</UBadge>
        </div>
        <p>{{ message.toolCall.summary }}</p>
        <pre v-if="showRawData" class="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-[11px] dark:bg-gray-950">{{ formatData(message.toolCall.data) }}</pre>
      </div>
    </details>

    <div v-if="secondaryMarkdown" class="agent-markdown mt-3 text-sm text-gray-900 dark:text-gray-100" v-html="renderMarkdown(secondaryMarkdown)" />

    <div v-if="message.toolCall && (entryResults.length || dialectResults.length)" class="mt-3 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs dark:border-gray-800 dark:bg-gray-950">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="font-medium">查詢結果</span>
        <UBadge color="success" variant="soft">{{ formatRisk(message.toolCall.risk) }}</UBadge>
      </div>
      <p>{{ message.toolCall.summary }}</p>
      <ul v-if="message.toolCall.warnings?.length" class="mt-2 list-disc pl-4 text-amber-700 dark:text-amber-300">
        <li v-for="warning in message.toolCall.warnings" :key="warning">{{ warning }}</li>
      </ul>
      <div v-if="entryResults.length" class="mt-2 space-y-2">
        <div
          v-for="entry in entryResults"
          :key="entry.id"
          class="rounded border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="font-medium text-gray-900 dark:text-gray-100">{{ entry.headword || entry.id }}</div>
              <div class="mt-0.5 text-gray-500">
                {{ formatDialect(entry.dialect) }}
                <span v-if="entry.jyutping?.length"> · {{ entry.jyutping.join('; ') }}</span>
                <span v-if="entry.status"> · {{ formatStatus(entry.status) }}</span>
              </div>
            </div>
            <UBadge v-if="entry.entryType" color="neutral" variant="soft">{{ formatEntryType(entry.entryType) }}</UBadge>
          </div>
          <p v-if="entry.definitionPreview" class="mt-1 text-gray-700 dark:text-gray-300">{{ entry.definitionPreview }}</p>
        </div>
      </div>
      <div v-else-if="dialectResults.length" class="mt-2 grid grid-cols-1 gap-2">
        <div
          v-for="dialect in dialectResults"
          :key="dialect.id"
          class="flex items-center justify-between rounded border border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-gray-900"
        >
          <span>{{ dialect.label }}</span>
          <code class="text-[11px] text-gray-500">{{ dialect.id }}</code>
        </div>
      </div>
    </div>

    <div v-if="message.localAction" class="mt-3 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs dark:border-blue-800 dark:bg-blue-950/30">
      <div class="mb-2 font-medium">{{ message.localAction.label }}</div>
      <UButton size="xs" color="primary" variant="soft" :to="message.localAction.to">
        前往 {{ message.localAction.to }}
      </UButton>
    </div>

    <AgentConfirmationCard
      v-if="message.confirmation"
      class="mt-3"
      :confirmation="message.confirmation"
      @confirm="$emit('confirm', $event)"
      @cancel="$emit('cancel', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { AgentChatMessage, AgentEntrySummary } from '../../types/agent'
import { DIALECT_LABELS } from '~shared/dialects'

const props = defineProps<{ message: AgentChatMessage }>()
defineEmits<{
  confirm: [{ id: string, echo?: string, reason?: string }]
  cancel: [string]
}>()

const toolData = computed(() => props.message.toolCall?.data as any)
const entryResults = computed<AgentEntrySummary[]>(() => {
  const data = toolData.value
  if (!data) return []
  if (Array.isArray(data.entries)) return data.entries
  if (Array.isArray(data.sameDialect) || Array.isArray(data.otherDialects)) return [...(data.sameDialect || []), ...(data.otherDialects || [])]
  if (data.entry) {
    return [{
      id: String(data.entry.id || data.entry._id || ''),
      headword: String(data.entry.headword?.display || ''),
      dialect: String(data.entry.dialect?.name || ''),
      status: String(data.entry.status || ''),
      entryType: data.entry.entryType,
      definitionPreview: data.entry.senses?.[0]?.definition,
      jyutping: data.entry.phonetic?.jyutping
    }]
  }
  return []
})
const dialectResults = computed<Array<{ id: string, label: string }>>(() => toolData.value?.dialects || [])
const showRawData = computed(() => Boolean(props.message.toolCall?.data) && import.meta.dev)
const markdownParts = computed(() => splitMarkdownForDetails(props.message.content))
const primaryMarkdown = computed(() => markdownParts.value.primary)
const secondaryMarkdown = computed(() => markdownParts.value.secondary)
const detailsSummary = computed(() => {
  if (props.message.streamingToolCall?.status === 'streaming') return `正在生成工具參數：${props.message.streamingToolCall.name}`
  if (props.message.streamingToolCall?.status === 'running') return `正在執行工具：${props.message.streamingToolCall.name}`
  if (props.message.toolCall) return `查詢細節：${props.message.toolCall.name}`
  return '查詢細節'
})

function toolStatusLabel(status: string) {
  if (status === 'streaming') return '生成參數'
  if (status === 'running') return '執行中'
  if (status === 'completed') return '完成'
  if (status === 'failed') return '失敗'
  return status
}

function formatRisk(risk: string) {
  const labels: Record<string, string> = {
    safe: '安全',
    local_ui: '本地操作',
    draft_write: '草稿寫入',
    editorial: '審核操作',
    destructive: '高風險',
    admin: '管理操作'
  }
  return labels[risk] || risk
}

function formatEntryType(type: string) {
  const labels: Record<string, string> = {
    word: '詞',
    character: '字',
    phrase: '短語',
    idiom: '熟語',
    proverb: '諺語'
  }
  return labels[type] || type
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿',
    pending_review: '待審核',
    approved: '已通過',
    rejected: '已退回'
  }
  return labels[status] || status
}

function formatDialect(dialect: string) {
  return (DIALECT_LABELS as Record<string, string>)[dialect] || dialect || '未知方言'
}

function splitMarkdownForDetails(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return { primary: '', secondary: '' }
  const paragraphBreak = trimmed.search(/\n\s*\n/)
  if (paragraphBreak >= 0) {
    return {
      primary: trimmed.slice(0, paragraphBreak).trim(),
      secondary: trimmed.slice(paragraphBreak).trim()
    }
  }
  const headingAfterIntro = trimmed.search(/\n(?=#{1,3}\s+)/)
  if (headingAfterIntro >= 0) {
    return {
      primary: trimmed.slice(0, headingAfterIntro).trim(),
      secondary: trimmed.slice(headingAfterIntro).trim()
    }
  }
  return { primary: trimmed, secondary: '' }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function isMarkdownTableSeparator(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line)
}

function parseTableRow(line: string) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim())
}

function renderTable(lines: string[]) {
  const [headerLine, , ...bodyLines] = lines
  const headers = parseTableRow(headerLine)
  const rows = bodyLines.map(parseTableRow)
  return `<div class="table-wrap"><table><thead><tr>${headers.map(header => `<th>${renderInlineMarkdown(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n')
  const html: string[] = []
  let inList = false
  let inCode = false
  const codeLines: string[] = []

  function closeList() {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!inCode && line.includes('|') && lines[index + 1] && isMarkdownTableSeparator(lines[index + 1])) {
      closeList()
      const tableLines = [line, lines[index + 1]]
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        tableLines.push(lines[index])
        index += 1
      }
      index -= 1
      html.push(renderTable(tableLines))
      continue
    }
    if (line.trim().startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines.length = 0
        inCode = false
      } else {
        closeList()
        inCode = true
      }
      continue
    }
    if (inCode) {
      codeLines.push(line)
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      html.push('<br>')
      continue
    }
    if (trimmed.startsWith('### ')) {
      closeList()
      html.push(`<h3>${renderInlineMarkdown(trimmed.slice(4))}</h3>`)
      continue
    }
    if (trimmed.startsWith('## ')) {
      closeList()
      html.push(`<h2>${renderInlineMarkdown(trimmed.slice(3))}</h2>`)
      continue
    }
    if (trimmed.startsWith('# ')) {
      closeList()
      html.push(`<h1>${renderInlineMarkdown(trimmed.slice(2))}</h1>`)
      continue
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`)
      continue
    }
    closeList()
    html.push(`<p>${renderInlineMarkdown(line)}</p>`)
  }
  closeList()
  if (inCode) html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  return html.join('')
}

function formatData(data: unknown) {
  return JSON.stringify(data, null, 2)
}
</script>

<style scoped>
.agent-markdown :deep(h1),
.agent-markdown :deep(h2),
.agent-markdown :deep(h3) {
  margin: 0.75rem 0 0.35rem;
  font-weight: 700;
  line-height: 1.3;
}

.agent-markdown :deep(p) {
  margin: 0.35rem 0;
}

.agent-markdown :deep(ul) {
  margin: 0.35rem 0;
  padding-left: 1.1rem;
  list-style: disc;
}

.agent-markdown :deep(.table-wrap) {
  margin: 0.5rem 0;
  overflow-x: auto;
}

.agent-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.agent-markdown :deep(th),
.agent-markdown :deep(td) {
  border: 1px solid rgb(var(--ui-border));
  padding: 0.35rem 0.45rem;
  text-align: left;
  vertical-align: top;
}

.agent-markdown :deep(th) {
  background: rgb(var(--ui-bg-muted));
  font-weight: 700;
}

.agent-markdown :deep(code) {
  border-radius: 0.25rem;
  background: rgb(var(--ui-bg-muted));
  padding: 0.08rem 0.25rem;
  font-size: 0.85em;
}

.agent-markdown :deep(pre) {
  margin: 0.5rem 0;
  overflow: auto;
  border-radius: 0.5rem;
  background: rgb(var(--ui-bg-muted));
  padding: 0.75rem;
}
</style>
