<template>
  <UModal :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <template #content>
      <UCard class="jc-modal-card w-full max-w-2xl max-h-[90vh] flex flex-col rounded-none [&>*]:rounded-none">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white truncate">新建詞條</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                生成 <span class="jc-mono">JC-</span> 開頭的詞條鍵（草稿），矩陣與詳情立即可見、可被搜索
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

        <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
          <div v-if="errorMessage" class="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/60 dark:bg-red-900/20 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {{ errorMessage }}
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                釋義<span class="text-red-500">*</span>
              </label>
              <UTextarea v-model="definitionRaw" size="sm" :rows="3" placeholder="輸入詞條釋義..." />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">綜合音（可選）</label>
                <UInput v-model="compositePronunciation" size="sm" placeholder="例如：keoi5" />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">代表字（可選）</label>
                <UInput v-model="representativeChar" size="sm" placeholder="例如：佢" />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between gap-2 mb-1">
                <label class="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  初始方音格<span class="text-red-500">*</span>
                  <span class="text-[11px] text-gray-400">（{{ initialCells.length }}/{{ MAX_INITIAL_CELLS }}，限你擁有編輯權限的方言列）</span>
                </label>
                <UButton
                  size="xs"
                  color="neutral"
                  variant="soft"
                  icon="i-heroicons-plus"
                  :disabled="initialCells.length >= MAX_INITIAL_CELLS"
                  @click="addCellRow"
                >
                  添加一格
                </UButton>
              </div>
              <div v-if="initialCells.length === 0" class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-3 text-center text-xs text-gray-400">
                請至少添加一個初始方音格
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="(cell, index) in initialCells"
                  :key="index"
                  class="flex items-center gap-2"
                >
                  <USelectMenu
                    v-model="cell.dialectId"
                    :items="editableColumnOptions"
                    value-key="value"
                    size="sm"
                    searchable
                    searchable-placeholder="搜尋方言..."
                    placeholder="選擇方言"
                    class="w-44 shrink-0"
                  />
                  <UInput
                    v-model="cell.raw"
                    size="sm"
                    placeholder="方音（例如：keoi5）"
                    class="flex-1 min-w-0"
                  />
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    title="刪除該格"
                    :disabled="initialCells.length <= 1"
                    @click="removeCellRow(index)"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">備註（可選）</label>
              <UTextarea v-model="note" size="sm" :rows="2" placeholder="補充說明..." />
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2 w-full">
            <UButton color="neutral" variant="soft" size="sm" @click="emit('update:open', false)">
              取消
            </UButton>
            <UButton color="primary" size="sm" icon="i-heroicons-plus" :loading="saving" @click="submit">
              建立詞條
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { FaanjyutMatrixColumn } from '~/composables/useFaanjyutMatrix'

const props = defineProps<{
  open: boolean
  /** 全量矩陣列（含 per-column canEdit）；下拉只取 canEdit 且有 dialectId 的列 */
  columns: FaanjyutMatrixColumn[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const MAX_INITIAL_CELLS = 30

const toast = useToast()
const { createLexeme } = useFaanjyutMatrix()

const definitionRaw = ref('')
const compositePronunciation = ref('')
const representativeChar = ref('')
const note = ref('')
const initialCells = ref<Array<{ dialectId: string | null; raw: string }>>([{ dialectId: null, raw: '' }])
const saving = ref(false)
const errorMessage = ref('')

/** 可選方言列：本人可編輯（canEdit）且持 dialectId（格寫入以 dialectId 鍵定） */
const editableColumnOptions = computed(() =>
  props.columns
    .filter((c) => c.canEdit && c.dialectId)
    .map((c) => ({ value: c.dialectId!, label: c.label || c.dialectId! }))
)

function resetForm() {
  definitionRaw.value = ''
  compositePronunciation.value = ''
  representativeChar.value = ''
  note.value = ''
  initialCells.value = [{ dialectId: null, raw: '' }]
  errorMessage.value = ''
  saving.value = false
}

function addCellRow() {
  if (initialCells.value.length >= MAX_INITIAL_CELLS) return
  initialCells.value.push({ dialectId: null, raw: '' })
}

function removeCellRow(index: number) {
  if (initialCells.value.length <= 1) return
  initialCells.value.splice(index, 1)
}

async function submit() {
  const definition = definitionRaw.value.trim()
  if (!definition) {
    errorMessage.value = '請填寫釋義'
    return
  }
  const cells = initialCells.value
    .map((cell) => ({ dialectId: cell.dialectId?.trim() || '', raw: cell.raw.trim() }))
    .filter((cell) => cell.dialectId || cell.raw)
  if (cells.length === 0) {
    errorMessage.value = '請至少填寫一個初始方音格'
    return
  }
  if (cells.some((cell) => !cell.dialectId)) {
    errorMessage.value = '請為每個初始方音格選擇方言'
    return
  }
  if (cells.some((cell) => !cell.raw)) {
    errorMessage.value = '請填寫每個初始方音格的方音'
    return
  }
  if (cells.length > MAX_INITIAL_CELLS) {
    errorMessage.value = `初始方音格最多 ${MAX_INITIAL_CELLS} 個`
    return
  }
  if (new Set(cells.map((cell) => cell.dialectId)).size !== cells.length) {
    errorMessage.value = '初始方音格不得重複同一方言'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    const data = await createLexeme({
      definitionRaw: definition,
      compositePronunciation: compositePronunciation.value.trim() || undefined,
      representativeChar: representativeChar.value.trim() || undefined,
      note: note.value.trim() || undefined,
      initialCells: cells.map((cell) => ({ dialectId: cell.dialectId!, raw: cell.raw }))
    })
    toast.add({ title: '已建立詞條', description: `已建立詞條 ${data.sourceKey}`, color: 'success' })
    emit('update:open', false)
    await navigateTo(`/faanjyut/lexemes/${data.lexemeId}`)
  } catch (e: any) {
    const message = e?.data?.message || e?.message || '建立詞條失敗'
    errorMessage.value = message
    toast.add({ title: '建立詞條失敗', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) resetForm()
  }
)
</script>
