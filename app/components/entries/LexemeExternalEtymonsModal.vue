<template>
  <UModal :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <template #content>
      <UCard class="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">
                域外方音
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                詞語：{{ lexemeLabel || '—' }} · ID：{{ lexemeId || '—' }}
              </p>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="emit('update:open', false)"
            />
          </div>
        </template>

        <div v-if="loading" class="flex flex-col items-center justify-center py-10">
          <div class="w-10 h-10 border-2 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin" />
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">加載中...</p>
        </div>

        <div v-else class="flex-1 min-h-0 overflow-y-auto">
          <div v-if="errorMessage" class="px-4 py-3">
            <div class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              {{ errorMessage }}
            </div>
          </div>

          <div class="px-4 pb-4">
            <div class="flex items-center justify-between gap-2 mb-3">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                共 {{ items.length }} 條
              </p>
              <UButton
                v-if="canEdit"
                size="sm"
                color="primary"
                icon="i-heroicons-plus"
                :loading="savingNew"
                @click="addNew"
              >
                新增
              </UButton>
            </div>

            <!-- 新增表單（點擊「新增」時顯示） -->
            <div v-if="editingId === '__new__'" class="rounded-xl border-2 border-primary/40 border-dashed bg-primary/5 dark:bg-primary/10 p-4 mb-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">新增域外方音</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">語言</label>
                  <USelectMenu
                    v-model="editDraft.languageCode"
                    :items="LANGUAGE_OPTIONS"
                    value-key="value"
                    size="sm"
                    searchable
                    searchable-placeholder="搜索語言..."
                  />
                  <p v-if="editDraft.languageCode && !LANGUAGE_OPTIONS.some(o => o.value === editDraft.languageCode)" class="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                    已使用自定義代碼：{{ editDraft.languageCode }}
                  </p>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">方言點（可選）</label>
                  <UInput v-model="editDraft.dialectName" size="sm" placeholder="例如：海陸、四縣、X 片..." />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">詞形</label>
                  <UInput v-model="editDraft.scriptForm" size="sm" placeholder="輸入該語言的詞形" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">音標（可選）</label>
                  <UInput v-model="editDraft.phonetic" size="sm" placeholder="IPA 或慣用音標" />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">釋義（可選）</label>
                  <UInput v-model="editDraft.gloss" size="sm" placeholder="簡短釋義" />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">來源類型（可選）</label>
                  <USelectMenu
                    v-model="editDraft.sourceType"
                    :items="SOURCE_TYPE_OPTIONS"
                    value-key="value"
                    size="sm"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">來源細節（可選）</label>
                  <UInput v-model="editDraft.sourceDetail" size="sm" placeholder="書名、頁碼、田野編號..." />
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">備註（可選）</label>
                  <UTextarea v-model="editDraft.note" size="sm" :rows="3" placeholder="補充說明..." />
                </div>
              </div>
              <div class="mt-3 flex items-center justify-end gap-2">
                <UButton size="sm" color="neutral" variant="soft" @click="cancelEdit">取消</UButton>
                <UButton size="sm" color="primary" :loading="savingNew" @click="saveEdit">保存</UButton>
              </div>
            </div>

            <div v-if="items.length === 0 && editingId !== '__new__'" class="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              暫無域外方音
            </div>

            <div v-else-if="items.length > 0" class="space-y-3">
              <div
                v-for="row in items"
                :key="row.id"
                class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/20 p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <UBadge size="xs" variant="soft" color="neutral">
                        {{ languageLabel(row.languageCode) }}
                      </UBadge>
                      <span class="text-sm font-medium text-gray-900 dark:text-white break-all">
                        {{ row.scriptForm || '—' }}
                      </span>
                      <span v-if="row.phonetic" class="text-xs text-gray-500 dark:text-gray-400 break-all">
                        {{ row.phonetic }}
                      </span>
                    </div>
                    <div class="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                      <div v-if="row.dialectName">方言點：{{ row.dialectName }}</div>
                      <div v-if="row.gloss">釋義：{{ row.gloss }}</div>
                      <div v-if="row.sourceType || row.sourceDetail">
                        來源：{{ row.sourceType || '—' }}<span v-if="row.sourceDetail"> · {{ row.sourceDetail }}</span>
                      </div>
                      <div v-if="row.note">備註：{{ row.note }}</div>
                    </div>
                  </div>

                  <div class="flex items-center gap-1 flex-shrink-0">
                    <UButton
                      v-if="canEdit"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      icon="i-heroicons-pencil-square"
                      title="編輯"
                      @click="startEdit(row)"
                    />
                    <UButton
                      v-if="canEdit"
                      size="xs"
                      color="error"
                      variant="ghost"
                      icon="i-heroicons-trash"
                      title="刪除"
                      :loading="deletingId === row.id"
                      @click="removeRow(row)"
                    />
                  </div>
                </div>

                <!-- Edit form -->
                <div v-if="editingId === row.id" class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">語言</label>
                      <USelectMenu
                        v-model="editDraft.languageCode"
                        :items="LANGUAGE_OPTIONS"
                        value-key="value"
                        size="sm"
                        searchable
                        searchable-placeholder="搜索語言..."
                      />
                      <p v-if="editDraft.languageCode && !LANGUAGE_OPTIONS.some(o => o.value === editDraft.languageCode)" class="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                        已使用自定義代碼：{{ editDraft.languageCode }}
                      </p>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">方言點（可選）</label>
                      <UInput v-model="editDraft.dialectName" size="sm" placeholder="例如：海陸、四縣、X 片..." />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">詞形</label>
                      <UInput v-model="editDraft.scriptForm" size="sm" placeholder="輸入該語言的詞形" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">音標（可選）</label>
                      <UInput v-model="editDraft.phonetic" size="sm" placeholder="IPA 或慣用音標" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">釋義（可選）</label>
                      <UInput v-model="editDraft.gloss" size="sm" placeholder="簡短釋義" />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">來源類型（可選）</label>
                      <USelectMenu
                        v-model="editDraft.sourceType"
                        :items="SOURCE_TYPE_OPTIONS"
                        value-key="value"
                        size="sm"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">來源細節（可選）</label>
                      <UInput v-model="editDraft.sourceDetail" size="sm" placeholder="書名、頁碼、田野編號..." />
                    </div>
                    <div class="md:col-span-2">
                      <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">備註（可選）</label>
                      <UTextarea v-model="editDraft.note" size="sm" :rows="3" placeholder="補充說明..." />
                    </div>
                  </div>

                  <div class="mt-3 flex items-center justify-end gap-2">
                    <UButton size="sm" color="neutral" variant="soft" @click="cancelEdit">取消</UButton>
                    <UButton size="sm" color="primary" :loading="savingEdit" @click="saveEdit">保存</UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-between w-full">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ canEdit ? '只有審核員及以上可新增/修改。' : '你目前只有查看權限。' }}
            </p>
            <UButton color="neutral" variant="soft" size="sm" @click="emit('update:open', false)">
              關閉
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
type SourceType = 'fieldwork' | 'dictionary' | 'literature' | 'corpus'

interface ExternalEtymonDto {
  id: string
  lexemeId: string
  languageCode: string
  dialectName?: string
  scriptForm: string
  phonetic?: string
  gloss?: string
  sourceType?: SourceType
  sourceDetail?: string
  note?: string
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

const props = withDefaults(defineProps<{
  open: boolean
  lexemeId: string | null
  lexemeLabel?: string
  canEdit?: boolean
}>(), {
  lexemeLabel: '',
  canEdit: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const LANGUAGE_OPTIONS = [
  { value: 'hak', label: '客家話' },
  { value: 'teochew', label: '潮汕話' },
  { value: 'minnan', label: '閩南語' },
  { value: 'zhuang', label: '壯語' },
  { value: 'thai', label: '泰語' },
  { value: 'viet', label: '越南語' },
  { value: 'tai', label: '台語／泰語系（泛用）' }
]

const SOURCE_TYPE_OPTIONS = [
  { value: undefined, label: '—' },
  { value: 'fieldwork', label: '田野' },
  { value: 'dictionary', label: '詞典' },
  { value: 'literature', label: '文獻' },
  { value: 'corpus', label: '語料' }
] as Array<{ value: SourceType | undefined; label: string }>

const loading = ref(false)
const errorMessage = ref('')
const items = ref<ExternalEtymonDto[]>([])

const editingId = ref<string | null>(null)
const savingNew = ref(false)
const savingEdit = ref(false)
const deletingId = ref<string | null>(null)

const editDraft = reactive<Partial<ExternalEtymonDto>>({})

function languageLabel(code: string) {
  return LANGUAGE_OPTIONS.find(o => o.value === code)?.label || code
}

function resetDraft() {
  Object.keys(editDraft).forEach((k) => delete (editDraft as any)[k])
  editDraft.languageCode = 'hak'
  editDraft.scriptForm = ''
  editDraft.dialectName = ''
  editDraft.phonetic = ''
  editDraft.gloss = ''
  editDraft.sourceType = undefined
  editDraft.sourceDetail = ''
  editDraft.note = ''
}

async function fetchList() {
  if (!props.lexemeId) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: ExternalEtymonDto[] }>(`/api/lexemes/${props.lexemeId}/external-etymons`)
    items.value = Array.isArray(res?.data) ? res.data : []
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '獲取域外方音失敗'
    items.value = []
  } finally {
    loading.value = false
  }
}

async function addNew() {
  if (!props.lexemeId) return
  resetDraft()
  editingId.value = '__new__'
}

function startEdit(row: ExternalEtymonDto) {
  editingId.value = row.id
  resetDraft()
  Object.assign(editDraft, {
    languageCode: row.languageCode,
    dialectName: row.dialectName || '',
    scriptForm: row.scriptForm,
    phonetic: row.phonetic || '',
    gloss: row.gloss || '',
    sourceType: row.sourceType,
    sourceDetail: row.sourceDetail || '',
    note: row.note || ''
  })
}

function cancelEdit() {
  editingId.value = null
  resetDraft()
}

async function saveEdit() {
  if (!props.lexemeId) return
  if (!props.canEdit) return
  const isNew = editingId.value === '__new__'

  const languageCode = String(editDraft.languageCode || '').trim()
  const scriptForm = String(editDraft.scriptForm || '').trim()
  if (!languageCode || !scriptForm) {
    errorMessage.value = '請填寫語言與詞形'
    return
  }

  savingEdit.value = true
  errorMessage.value = ''
  try {
    if (isNew) {
      savingNew.value = true
      const res = await $fetch<{ success: boolean; data: ExternalEtymonDto }>(`/api/lexemes/${props.lexemeId}/external-etymons`, {
        method: 'POST',
        body: {
          languageCode,
          dialectName: (editDraft.dialectName || '').trim() || undefined,
          scriptForm,
          phonetic: (editDraft.phonetic || '').trim() || undefined,
          gloss: (editDraft.gloss || '').trim() || undefined,
          sourceType: editDraft.sourceType || undefined,
          sourceDetail: (editDraft.sourceDetail || '').trim() || undefined,
          note: (editDraft.note || '').trim() || undefined
        }
      })
      if (res?.data) items.value = [res.data, ...items.value]
    } else {
      const id = editingId.value
      if (!id) return
      const res = await $fetch<{ success: boolean; data: ExternalEtymonDto }>(`/api/external-etymons/${id}`, {
        method: 'PUT',
        body: {
          languageCode,
          dialectName: (editDraft.dialectName || '').trim() || undefined,
          scriptForm,
          phonetic: (editDraft.phonetic || '').trim() || undefined,
          gloss: (editDraft.gloss || '').trim() || undefined,
          sourceType: editDraft.sourceType || undefined,
          sourceDetail: (editDraft.sourceDetail || '').trim() || undefined,
          note: (editDraft.note || '').trim() || undefined
        }
      })
      const next = items.value.map((r) => (r.id === id ? (res.data || r) : r))
      items.value = next
    }
    cancelEdit()
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '保存失敗'
  } finally {
    savingEdit.value = false
    savingNew.value = false
  }
}

async function removeRow(row: ExternalEtymonDto) {
  if (!props.canEdit) return
  if (!confirm(`確定要刪除「${languageLabel(row.languageCode)}：${row.scriptForm}」嗎？`)) return
  deletingId.value = row.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/external-etymons/${row.id}`, { method: 'DELETE' })
    items.value = items.value.filter((r) => r.id !== row.id)
    if (editingId.value === row.id) cancelEdit()
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '刪除失敗'
  } finally {
    deletingId.value = null
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      errorMessage.value = ''
      items.value = []
      cancelEdit()
      return
    }
    fetchList()
  }
)

watch(
  () => props.lexemeId,
  (id) => {
    if (props.open && id) fetchList()
  }
)

resetDraft()
</script>

