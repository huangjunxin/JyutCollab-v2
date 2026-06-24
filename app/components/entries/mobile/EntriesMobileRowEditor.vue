<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <UButton
            icon="i-heroicons-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="$emit('back')"
          />
          <div class="min-w-0">
            <h2 class="jc-serif text-base font-bold text-gray-900 dark:text-white truncate">
              {{ entry.headword?.display || entry.text || '新建詞條' }}
            </h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {{ getDialectLabel(entry.dialect?.name || '') || entry.dialect?.name || '—' }}
              <span v-if="entry.phonetic?.jyutping?.[0]" class="ml-1">{{ entry.phonetic.jyutping[0] }}</span>
              <span class="ml-1" :class="statusClass">· {{ statusLabel }}</span>
              <span v-if="entry._isDirty" class="ml-1 text-amber-600">· 未儲存</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-heroicons-ellipsis-vertical"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="showMoreMenu = !showMoreMenu"
          />
        </div>
      </div>
      <!-- More menu dropdown -->
      <div v-if="showMoreMenu" class="mt-2 py-1 border-t border-gray-200 dark:border-gray-700">
        <UButton
          v-if="!entry._isNew"
          icon="i-heroicons-document-duplicate"
          variant="ghost"
          color="neutral"
          size="sm"
          block
          class="justify-start"
          @click="$emit('duplicate', entry); showMoreMenu = false"
        >
          複製詞條
        </UButton>
        <UButton
          v-if="!entry._isNew"
          icon="i-heroicons-trash"
          variant="ghost"
          color="error"
          size="sm"
          block
          class="justify-start"
          @click="$emit('delete', entry); showMoreMenu = false"
        >
          刪除詞條
        </UButton>
      </div>
    </div>

    <!-- Field list -->
    <div class="flex-1 overflow-auto px-4 py-3 space-y-1">
      <!-- Basic section -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-1">基本</h3>

      <EntriesMobileFieldRow
        label="詞頭"
        icon="i-heroicons-language"
        :value="entry.headword?.display || entry.text || ''"
        type="text"
        :is-editing="editingField === 'headword'"
        @click="startEdit('headword')"
        @update:model-value="(v: string) => updateField('headword', v)"
        @finish="finishEdit"
      />
      <EntriesMobileFieldRow
        label="方言"
        icon="i-heroicons-map-pin"
        :value="getDialectLabel(entry.dialect?.name || '') || entry.dialect?.name || ''"
        type="select"
        :options="dialectOptions"
        @click="openSelectSheet('dialect')"
      />
      <EntriesMobileFieldRow
        label="粵拼"
        icon="i-heroicons-speaker-wave"
        :value="entry.phonetic?.jyutping?.join('; ') || ''"
        type="text"
        :is-editing="editingField === 'phonetic'"
        @click="startEdit('phonetic')"
        @update:model-value="(v: string) => updateField('phonetic', v)"
        @finish="finishEdit"
      />
      <EntriesMobileFieldRow
        label="類型"
        icon="i-heroicons-tag"
        :value="entryTypeLabel"
        type="select"
        :options="entryTypeOptions"
        @click="openSelectSheet('entryType')"
      />
      <EntriesMobileFieldRow
        label="語域"
        icon="i-heroicons-chat-bubble-left-right"
        :value="entry.meta?.register || ''"
        type="select"
        :options="registerOptions"
        @click="openSelectSheet('register')"
      />
      <EntriesMobileFieldRow
        label="狀態"
        icon="i-heroicons-check-circle"
        :value="statusLabel"
        type="select"
        :options="statusOptionsForSelect"
        :disabled="!canChangeStatus"
        @click="canChangeStatus ? openSelectSheet('status') : undefined"
      />

      <!-- Classification section -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">分類</h3>
      <EntriesMobileFieldRow
        label="主題分類"
        icon="i-heroicons-folder"
        :value="themeLabel"
        type="text"
        @click="() => {}"
      />

      <!-- Definition section -->
      <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">釋義</h3>
      <EntriesMobileFieldRow
        label="釋義"
        icon="i-heroicons-book-open"
        :value="entry.senses?.[0]?.definition || ''"
        type="text"
        :is-editing="editingField === 'definition'"
        @click="startEdit('definition')"
        @update:model-value="(v: string) => updateField('definition', v)"
        @finish="finishEdit"
      />
    </div>

    <!-- Bottom action bar -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div v-if="entry._isNew" class="flex gap-2">
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          block
          @click="$emit('cancel', entry)"
        >
          取消
        </UButton>
        <UButton
          color="primary"
          size="sm"
          block
          :loading="isSaving"
          @click="$emit('save', entry)"
        >
          儲存草稿
        </UButton>
      </div>
      <div v-else class="flex gap-2">
        <UButton
          v-if="entry._isDirty"
          color="neutral"
          variant="soft"
          size="sm"
          block
          @click="$emit('cancel', entry)"
        >
          取消更改
        </UButton>
        <UButton
          v-if="entry._isDirty"
          color="primary"
          size="sm"
          block
          :loading="isSaving"
          @click="$emit('save', entry)"
        >
          儲存
        </UButton>
        <p v-if="!entry._isDirty" class="text-sm text-gray-500 dark:text-gray-400 text-center w-full">
          點擊欄位可編輯
        </p>
      </div>
    </div>

    <!-- Select sheet -->
    <EntriesMobileSelectSheet
      v-if="activeSelectField"
      :open="!!activeSelectField"
      :title="activeSelectLabel"
      :options="activeSelectOptions"
      :model-value="activeSelectValue"
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

const props = defineProps<{
  entry: Entry
  dialectOptions: Array<{ value: string; label: string }>
  statusOptions: Array<{ value: string; label: string }>
  canChangeStatus: boolean
  isSaving: boolean
}>()

const emit = defineEmits<{
  'back': []
  'save': [entry: Entry]
  'cancel': [entry: Entry]
  'duplicate': [entry: Entry]
  'delete': [entry: Entry]
  'update:entry': [entry: Entry]
}>()

const showMoreMenu = ref(false)
const editingField = ref<string | null>(null)
const editingValue = ref<any>('')

// Select sheet state
const activeSelectField = ref<string | null>(null)
const activeSelectOptions = ref<Array<{ value: string; label: string }>>([])
const activeSelectValue = ref('')

// Static options
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

const entryTypeLabel = computed(() =>
  (ENTRY_TYPE_LABELS as Record<string, string>)[props.entry.entryType || 'word'] || props.entry.entryType || '詞'
)

const statusLabel = computed(() =>
  (STATUS_LABELS as Record<string, string>)[props.entry.status || 'draft'] || props.entry.status || '草稿'
)

const statusClass = computed(() => {
  const classes: Record<string, string> = {
    draft: 'text-gray-500',
    pending_review: 'text-amber-600',
    approved: 'text-green-600',
    rejected: 'text-red-600'
  }
  return classes[props.entry.status || 'draft'] || 'text-gray-500'
})

const themeLabel = computed(() => {
  const level3Id = props.entry.theme?.level3Id
  if (!level3Id) return ''
  return getThemeNameById(level3Id) || ''
})

const activeSelectLabel = computed(() => {
  const labels: Record<string, string> = {
    dialect: '方言',
    entryType: '類型',
    register: '語域',
    status: '狀態'
  }
  return labels[activeSelectField.value || ''] || ''
})

function startEdit(field: string) {
  editingField.value = field
  switch (field) {
    case 'headword':
      editingValue.value = props.entry.headword?.display || props.entry.text || ''
      break
    case 'phonetic':
      editingValue.value = props.entry.phonetic?.jyutping?.join('; ') || ''
      break
    case 'definition':
      editingValue.value = props.entry.senses?.[0]?.definition || ''
      break
    default:
      editingValue.value = ''
  }
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
    case 'definition':
      if (!entry.senses || entry.senses.length === 0) {
        entry.senses = [{ definition: value, examples: [] }]
      } else {
        entry.senses[0].definition = value
      }
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
    case 'dialect':
      activeSelectOptions.value = props.dialectOptions
      activeSelectValue.value = props.entry.dialect?.name || ''
      break
    case 'entryType':
      activeSelectOptions.value = entryTypeOptions
      activeSelectValue.value = props.entry.entryType || 'word'
      break
    case 'register':
      activeSelectOptions.value = registerOptions
      activeSelectValue.value = props.entry.meta?.register || ''
      break
    case 'status':
      activeSelectOptions.value = statusOptionsForSelect.value
      activeSelectValue.value = props.entry.status || 'draft'
      break
  }
}

function handleSelect(value: string) {
  const field = activeSelectField.value
  if (!field) return
  const entry = props.entry
  switch (field) {
    case 'dialect':
      entry.dialect = { name: value }
      break
    case 'entryType':
      entry.entryType = value as any
      break
    case 'register':
      if (!entry.meta) entry.meta = {}
      entry.meta.register = value as any
      break
    case 'status':
      entry.status = value as any
      break
  }
  entry._isDirty = true
  emit('update:entry', entry)
  activeSelectField.value = null
}
</script>
