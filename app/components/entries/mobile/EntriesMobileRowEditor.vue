<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
          <div class="min-w-0">
            <h2 class="jc-serif text-base font-bold text-gray-900 dark:text-white truncate">
              {{ entry.headword?.display || entry.text || '新建詞條' }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {{ getDialectLabel(entry.dialect?.name || '') || '—' }}
              <span v-if="entry.phonetic?.jyutping?.[0]" class="ml-1">{{ entry.phonetic.jyutping[0] }}</span>
              <span class="ml-1" :class="statusClass">· {{ statusLabel }}</span>
              <span v-if="entry._isDirty" class="ml-1 text-amber-600">· 未儲存</span>
            </p>
          </div>
        </div>
        <div v-if="!readOnly" class="flex items-center gap-1 shrink-0">
          <UButton icon="i-heroicons-ellipsis-vertical" variant="ghost" color="neutral" size="sm" @click="showMoreMenu = !showMoreMenu" />
        </div>
      </div>
      <!-- More menu -->
      <div v-if="showMoreMenu && !readOnly" class="mt-2 py-1 border-t border-gray-200 dark:border-gray-700 space-y-0.5">
        <UButton v-if="!entry._isNew" icon="i-heroicons-document-duplicate" variant="ghost" color="neutral" size="sm" block class="justify-start" @click="$emit('duplicate', entry); showMoreMenu = false">複製詞條</UButton>
        <UButton v-if="!entry._isNew" icon="i-heroicons-folder-plus" variant="ghost" color="neutral" size="sm" block class="justify-start" @click="$emit('make-new-lexeme', entry); showMoreMenu = false">拆出成新詞語</UButton>
        <UButton v-if="!entry._isNew" icon="i-heroicons-arrows-right-left" variant="ghost" color="neutral" size="sm" block class="justify-start" @click="$emit('join-lexeme', entry); showMoreMenu = false">加入其他詞語組</UButton>
        <UButton v-if="!entry._isNew" icon="i-heroicons-trash" variant="ghost" color="error" size="sm" block class="justify-start" @click="$emit('delete', entry); showMoreMenu = false">刪除詞條</UButton>
      </div>
    </div>

    <!-- Field list -->
    <div class="flex-1 overflow-auto px-4 py-3 space-y-1">
      <!-- ===== 基本 ===== -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-1">基本</h3>

      <EntriesMobileFieldRow label="詞頭" icon="i-heroicons-language" :value="entry.headword?.display || entry.text || ''" type="text" :is-editing="editingField === 'headword'" :disabled="readOnly" @click="!readOnly && startEdit('headword')" @update:model-value="(v: string) => updateField('headword', v)" @finish="finishEdit" />
      <EntriesMobileFieldRow label="方言" icon="i-heroicons-map-pin" :value="getDialectLabel(entry.dialect?.name || '') || entry.dialect?.name || ''" type="select" :options="dialectOptions" :disabled="readOnly" @click="!readOnly && openSelectSheet('dialect')" />
      <EntriesMobileFieldRow label="粵拼" icon="i-heroicons-speaker-wave" :value="entry.phonetic?.jyutping?.join('; ') || ''" type="text" :is-editing="editingField === 'phonetic'" :disabled="readOnly" @click="!readOnly && startEdit('phonetic')" @update:model-value="(v: string) => updateField('phonetic', v)" @finish="finishEdit" />
      <EntriesMobileFieldRow label="類型" icon="i-heroicons-tag" :value="entryTypeLabel" type="select" :options="entryTypeOptions" :disabled="readOnly" @click="!readOnly && openSelectSheet('entryType')" />
      <EntriesMobileFieldRow label="語域" icon="i-heroicons-chat-bubble-left-right" :value="entry.meta?.register || ''" type="select" :options="registerOptions" :disabled="readOnly" @click="!readOnly && openSelectSheet('register')" />
      <div v-if="registerAISuggestion" class="p-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p class="text-xs text-blue-700 dark:text-blue-300 mb-1">AI 語域建議</p>
        <p class="text-sm text-gray-900 dark:text-white">
          {{ registerAISuggestion.register }}
          <span v-if="typeof registerAISuggestion.confidence === 'number'" class="text-xs text-gray-500 dark:text-gray-400">
            · {{ Math.round(registerAISuggestion.confidence * 100) }}%
          </span>
        </p>
        <p v-if="registerAISuggestion.explanation" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ registerAISuggestion.explanation }}
        </p>
        <div class="flex gap-2 mt-1">
          <UButton size="xs" color="primary" @click="$emit('accept-register-ai')">採納</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-register-ai')">忽略</UButton>
        </div>
      </div>
      <EntriesMobileFieldRow label="狀態" icon="i-heroicons-check-circle" :value="statusLabel" type="select" :options="statusOptionsForSelect" :disabled="readOnly || !canChangeStatus" @click="(readOnly || !canChangeStatus) ? undefined : openSelectSheet('status')" />

      <div v-if="!readOnly && canGenerateAI" class="px-3 py-3 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
        <div class="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-primary" />
          <span>AI 輔助</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-folder" block :loading="aiLoadingTheme" @click="$emit('ai-categorize')">
            AI 分類
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-book-open" block :loading="aiLoadingDefinition" @click="$emit('ai-definition')">
            AI 釋義
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-chat-bubble-left-ellipsis" block :loading="aiLoadingExamples" @click="$emit('ai-examples')">
            AI 例句
          </UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-heroicons-chat-bubble-left-right" block :loading="aiLoadingRegister" @click="$emit('ai-register')">
            AI 語域
          </UButton>
        </div>
      </div>

      <!-- ===== 分類 ===== -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">分類</h3>
      <button
        class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
        @click="$emit('open-theme-page')"
      >
        <div class="flex flex-1 items-center gap-3 min-w-0 text-left">
          <UIcon name="i-heroicons-folder" class="w-4 h-4 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span class="text-xs text-gray-500 dark:text-gray-400 block">主題分類</span>
            <span class="text-sm text-gray-900 dark:text-white truncate block" :class="{ 'text-gray-400': !themeLabel }">
              {{ themeLabel || '點擊選擇' }}
            </span>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      <!-- AI theme suggestion -->
      <div v-if="themeAISuggestion" class="p-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p class="text-xs text-blue-700 dark:text-blue-300 mb-1">AI 建議：{{ themeAISuggestion.level3Name }}（{{ themeAISuggestion.level1Name }}）</p>
        <div class="flex gap-2">
          <UButton size="xs" color="primary" @click="$emit('accept-theme-ai')">採納</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-theme-ai')">忽略</UButton>
        </div>
      </div>

      <!-- ===== 釋義 ===== -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">釋義</h3>
      <button
        class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
        @click="$emit('open-senses-page')"
      >
        <div class="flex flex-1 items-center gap-3 min-w-0 text-left">
          <UIcon name="i-heroicons-book-open" class="w-4 h-4 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span class="text-xs text-gray-500 dark:text-gray-400 block">義項詳情</span>
            <span class="text-sm text-gray-900 dark:text-white truncate block">
              {{ sensesSummary || '點擊編輯' }}
            </span>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      <!-- AI definition suggestion -->
      <div v-if="definitionAISuggestion" class="p-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p class="text-xs text-blue-700 dark:text-blue-300 mb-1">AI 釋義建議</p>
        <p class="text-sm text-gray-900 dark:text-white">{{ definitionAISuggestion.definition }}</p>
        <div class="flex gap-2 mt-1">
          <UButton size="xs" color="primary" @click="$emit('accept-definition-ai')">採納</UButton>
          <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-definition-ai')">忽略</UButton>
        </div>
      </div>

      <!-- ===== 參考 ===== -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">參考</h3>

      <!-- Morpheme refs entry -->
      <button
        class="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
        @click="$emit('open-morpheme-page')"
      >
        <div class="flex flex-1 items-center gap-3 min-w-0 text-left">
          <UIcon name="i-heroicons-link" class="w-4 h-4 text-gray-400 shrink-0" />
          <div class="flex-1 min-w-0">
            <span class="text-xs text-gray-500 dark:text-gray-400 block">詞素引用</span>
            <span class="text-sm text-gray-900 dark:text-white truncate block">
              {{ morphemeSummary || '無' }}
            </span>
          </div>
        </div>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      <!-- Duplicate check card -->
      <div v-if="duplicateEntries.length > 0" class="p-2 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <p class="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">同方言重複</p>
        <div v-for="dup in duplicateEntries.slice(0, 3)" :key="dup.id" class="text-xs text-gray-600 dark:text-gray-400">
          {{ dup.headwordDisplay }}（{{ dup.dialectLabel }} · {{ dup.statusLabel }}）
        </div>
      </div>

      <!-- Other dialects card -->
      <div v-if="otherDialectEntries.length > 0" class="p-2 bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
        <p class="text-xs font-medium text-green-700 dark:text-green-300 mb-1">其他方言點已有</p>
        <div v-for="od in otherDialectEntries.slice(0, 3)" :key="od.id" class="flex items-center justify-between gap-2 text-xs">
          <span class="text-gray-600 dark:text-gray-400">{{ od.headwordDisplay }}（{{ od.dialectLabel }}）</span>
          <UButton size="xs" variant="ghost" color="primary" @click="$emit('apply-other-dialect', od.id)">套用</UButton>
        </div>
      </div>

      <!-- Jyutjyu ref card -->
      <div v-if="jyutjyuResults.length > 0" class="p-2 bg-purple-50/50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <p class="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">Jyutjyu 參考</p>
        <div v-for="jy in jyutjyuResults.slice(0, 3)" :key="jy.id" class="flex items-center justify-between gap-2 text-xs">
          <span class="text-gray-600 dark:text-gray-400">{{ jy.headwordDisplay }}（{{ jy.jyutping }}）</span>
          <UButton size="xs" variant="ghost" color="primary" @click="$emit('apply-jyutjyu', jy.id)">套用</UButton>
        </div>
      </div>
    </div>

    <!-- Bottom action bar -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div v-if="readOnly" class="text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">此詞條由其他用戶創建，僅供查看</p>
      </div>
      <div v-else-if="entry._isNew" class="flex gap-2">
        <UButton color="neutral" variant="soft" size="sm" block @click="$emit('cancel', entry)">取消</UButton>
        <UButton color="primary" size="sm" block :loading="isSaving" @click="$emit('save', entry)">儲存草稿</UButton>
      </div>
      <div v-else class="flex gap-2">
        <UButton v-if="entry._isDirty" color="neutral" variant="soft" size="sm" block @click="$emit('cancel', entry)">取消更改</UButton>
        <UButton v-if="entry._isDirty" color="primary" size="sm" block :loading="isSaving" @click="$emit('save', entry)">儲存</UButton>
        <p v-if="!entry._isDirty" class="text-sm text-gray-500 dark:text-gray-400 text-center w-full">點擊欄位可編輯</p>
      </div>
    </div>

    <!-- Select sheet -->
    <EntriesMobileSelectSheet
      v-if="activeSelectField"
      :open="!!activeSelectField"
      :title="activeSelectLabel"
      :options="activeSelectOptions"
      :model-value="activeSelectValue"
      :required="activeSelectField === 'dialect' || activeSelectField === 'entryType'"
      @update:open="(v: boolean) => { if (!v) activeSelectField = null }"
      @select="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import { getDialectLabel } from '~/utils/dialects'
import { STATUS_LABELS, ENTRY_TYPE_LABELS } from '~/utils/entriesTableConstants'
import { getThemeNameById } from '~/composables/useThemeData'

interface ThemeAISuggestion { level1Name: string; level2Name: string; level3Name: string; level1Id: number; level2Id: number; level3Id: number }
interface DefinitionAISuggestion { definition: string; usageNotes?: string }
interface RegisterAISuggestion { register: string; confidence?: number; explanation?: string }
interface FormattedDuplicateEntry { id: string; headwordDisplay: string; dialectLabel: string; statusLabel: string }
interface JyutjyuRefFormattedItem { id: string; headwordDisplay: string; jyutping: string }

const props = defineProps<{
  entry: Entry
  dialectOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  canChangeStatus: boolean
  readOnly?: boolean
  isSaving: boolean

  // AI suggestions
  themeAISuggestion?: ThemeAISuggestion | null
  definitionAISuggestion?: DefinitionAISuggestion | null
  registerAISuggestion?: RegisterAISuggestion | null
  aiLoadingTheme?: boolean
  aiLoadingDefinition?: boolean
  aiLoadingExamples?: boolean
  aiLoadingRegister?: boolean

  // Reference helpers
  duplicateEntries?: FormattedDuplicateEntry[]
  otherDialectEntries?: FormattedDuplicateEntry[]
  jyutjyuResults?: JyutjyuRefFormattedItem[]
}>()

const emit = defineEmits<{
  'back': []
  'save': [entry: Entry]
  'cancel': [entry: Entry]
  'duplicate': [entry: Entry]
  'delete': [entry: Entry]
  'update:entry': [entry: Entry]
  'make-new-lexeme': [entry: Entry]
  'join-lexeme': [entry: Entry]

  // Sub-page navigation
  'open-theme-page': []
  'open-senses-page': []
  'open-morpheme-page': []

  // AI
  'ai-categorize': []
  'ai-definition': []
  'ai-examples': []
  'accept-theme-ai': []
  'dismiss-theme-ai': []
  'accept-definition-ai': []
  'dismiss-definition-ai': []
  'ai-register': []
  'accept-register-ai': []
  'dismiss-register-ai': []

  // Reference helpers
  'apply-other-dialect': [sourceId: string]
  'apply-jyutjyu': [sourceId: string]
}>()

const showMoreMenu = ref(false)
const editingField = ref<string | null>(null)

// Select sheet state
const activeSelectField = ref<string | null>(null)
const activeSelectOptions = ref<Array<{ value: string; label: string }>>([])
const activeSelectValue = ref('')

const entryTypeOptions = [
  { value: 'word', label: '詞' },
  { value: 'phrase', label: '短語' },
  { value: 'character', label: '字' }
]
const registerOptions = [
  { value: '', label: '（無）' },
  { value: '口語', label: '口語' },
  { value: '書面', label: '書面' },
  { value: '粗俗', label: '粗俗' },
  { value: '文雅', label: '文雅' },
  { value: '中性', label: '中性' }
]
const statusOptionsForSelect = computed(() => props.statusOptions)

const entryTypeLabel = computed(() => (ENTRY_TYPE_LABELS as Record<string, string>)[props.entry.entryType || 'word'] || props.entry.entryType || '詞')
const statusLabel = computed(() => (STATUS_LABELS as Record<string, string>)[props.entry.status || 'draft'] || props.entry.status || '草稿')
const statusClass = computed(() => {
  const m: Record<string, string> = { draft: 'text-gray-500', pending_review: 'text-amber-600', approved: 'text-green-600', rejected: 'text-red-600' }
  return m[props.entry.status || 'draft'] || 'text-gray-500'
})
const canGenerateAI = computed(() => !!props.entry.headword?.display?.trim())

const themeLabel = computed(() => {
  const id = props.entry.theme?.level3Id
  return id ? getThemeNameById(id) : ''
})

const sensesSummary = computed(() => {
  const senses = props.entry.senses || []
  const def = senses[0]?.definition || ''
  const parts: string[] = []
  if (def) parts.push(def.length > 40 ? def.slice(0, 40) + '…' : def)
  if (senses.length > 1) parts.push(`${senses.length} 義項`)
  const exCount = senses.reduce((n, s) => n + (s.examples?.length || 0), 0)
  if (exCount > 0) parts.push(`${exCount} 例`)
  return parts.join(' · ')
})

const morphemeSummary = computed(() => {
  const refs = props.entry.morphemeRefs || []
  if (refs.length === 0) return ''
  return refs.map(r => r.char || r.jyutping || '?').join(' + ')
})

const activeSelectLabel = computed(() => {
  const m: Record<string, string> = { dialect: '方言', entryType: '類型', register: '語域', status: '狀態' }
  return m[activeSelectField.value || ''] || ''
})

function startEdit(field: string) {
  editingField.value = field
}

function updateField(field: string, value: string) {
  const entry = props.entry
  switch (field) {
    case 'headword':
      if (!entry.headword) entry.headword = { display: '', search: '', normalized: '', isPlaceholder: false }
      entry.headword.display = value
      entry.text = value
      break
    case 'phonetic':
      if (!entry.phonetic) entry.phonetic = { jyutping: [] }
      entry.phonetic.jyutping = value.split(/[;,]/).map(s => s.trim()).filter(Boolean)
      break
  }
  entry._isDirty = true
  emit('update:entry', entry)
}

function finishEdit() {
  editingField.value = null
}

function openSelectSheet(field: string) {
  activeSelectField.value = field
  switch (field) {
    case 'dialect': activeSelectOptions.value = props.dialectOptions; activeSelectValue.value = props.entry.dialect?.name || ''; break
    case 'entryType': activeSelectOptions.value = entryTypeOptions; activeSelectValue.value = props.entry.entryType || 'word'; break
    case 'register': activeSelectOptions.value = registerOptions; activeSelectValue.value = props.entry.meta?.register || ''; break
    case 'status': activeSelectOptions.value = statusOptionsForSelect.value; activeSelectValue.value = props.entry.status || 'draft'; break
  }
}

function handleSelect(value: string) {
  const field = activeSelectField.value
  if (!field) return
  const entry = props.entry
  switch (field) {
    case 'dialect': entry.dialect = { name: value }; break
    case 'entryType': entry.entryType = value as any; break
    case 'register': if (!entry.meta) entry.meta = {}; entry.meta.register = value as any; break
    case 'status': entry.status = value as any; break
  }
  entry._isDirty = true
  emit('update:entry', entry)
  activeSelectField.value = null
}
</script>
