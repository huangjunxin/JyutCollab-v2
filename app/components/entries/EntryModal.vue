<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard class="max-w-2xl max-h-[90vh] overflow-y-auto">
        <template #header>
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UIcon :name="isEditing ? 'i-heroicons-pencil-square' : 'i-heroicons-plus'" class="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ isEditing ? '編輯詞條' : '新建詞條' }}
              </h3>
            </div>
            <UButton
              color="gray"
              variant="ghost"
              icon="i-heroicons-x-mark"
              @click="close"
            />
          </div>
        </template>

        <form @submit.prevent="handleSubmit" class="space-y-5">
          <!-- Headword -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              詞頭 <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="form.headword.display"
              placeholder="請輸入粵語表達"
              size="lg"
              icon="i-heroicons-language"
            />
          </div>

          <!-- Dialect & EntryType -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                方言 <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button
                  v-for="option in dialectOptions"
                  :key="option.value"
                  type="button"
                  @click="form.dialect.name = option.value"
                  :class="[
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    form.dialect.name === option.value
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  ]"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">詞條類型</label>
              <USelectMenu
                v-model="form.entryType"
                :options="entryTypeOptions"
                value-attribute="value"
                option-attribute="label"
                placeholder="請選擇"
              />
            </div>
          </div>

          <!-- Phonetic -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">粵拼</label>
            <UInput
              v-model="jyutpingInput"
              placeholder="請輸入粵拼，多個音節用空格分隔"
              icon="i-heroicons-microphone"
            />
          </div>

          <!-- Definition -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              釋義 <span class="text-red-500">*</span>
            </label>
            <UTextarea
              v-model="form.senses[0].definition"
              placeholder="請輸入釋義"
              :rows="3"
            />
          </div>

          <!-- Usage notes & Register -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">使用説明</label>
              <UTextarea
                v-model="form.meta.usage"
                placeholder="使用語境、注意事項等"
                :rows="2"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">語域</label>
              <USelectMenu
                v-model="form.meta.register"
                :options="registerOptions"
                value-attribute="value"
                option-attribute="label"
                placeholder="請選擇"
              />
            </div>
          </div>

          <!-- Theme -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">主題分類</label>
            <UInput
              v-model.number="form.theme.level3Id"
              type="number"
              placeholder="主題ID (60-498)"
              icon="i-heroicons-tag"
            />
          </div>

          <!-- Examples -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">例句</label>
              <UButton
                color="primary"
                variant="ghost"
                size="xs"
                icon="i-heroicons-plus"
                @click="addExample"
              >
                添加例句
              </UButton>
            </div>
            <div class="space-y-3">
              <div
                v-for="(example, index) in form.senses[0].examples"
                :key="index"
                class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-gray-500 dark:text-gray-400">例句 {{ index + 1 }}</span>
                  <UButton
                    v-if="form.senses[0].examples.length > 1"
                    color="red"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    @click="removeExample(index)"
                  />
                </div>
                <UInput
                  v-model="example.text"
                  placeholder="例句內容"
                  size="sm"
                />
                <UInput
                  v-model="example.jyutping"
                  placeholder="粵拼（可選）"
                  size="sm"
                />
                <UInput
                  v-model="example.translation"
                  placeholder="翻譯/解釋"
                  size="sm"
                />
                <UInput
                  v-model="example.scenario"
                  placeholder="使用場景"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <!-- AI Suggestions -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-5">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-sparkles" class="w-5 h-5 text-purple-500" />
                <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">AI 輔助</h4>
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton
                  color="purple"
                  variant="soft"
                  size="xs"
                  :loading="aiLoading.categorize"
                  :disabled="!form.headword.display"
                  @click="getAICategorization"
                >
                  AI 分類
                </UButton>
                <UButton
                  color="purple"
                  variant="soft"
                  size="xs"
                  :loading="aiLoading.definition"
                  :disabled="!form.headword.display"
                  @click="getAIDefinition"
                >
                  AI 釋義
                </UButton>
                <UButton
                  color="purple"
                  variant="soft"
                  size="xs"
                  :loading="aiLoading.examples"
                  :disabled="!form.headword.display || !form.senses[0].definition"
                  @click="getAIExamples"
                >
                  AI 例句
                </UButton>
              </div>
            </div>

            <!-- AI suggestion preview -->
            <div v-if="aiSuggestion" class="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div class="flex items-start gap-3">
                <div class="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex-shrink-0">
                  <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div class="flex-1">
                  <p class="font-medium text-purple-700 dark:text-purple-400">AI 建議</p>
                  <p class="text-purple-600 dark:text-purple-300 mt-2 text-sm whitespace-pre-wrap">{{ aiSuggestion }}</p>
                  <div class="flex gap-2 mt-3">
                    <UButton size="xs" color="purple" @click="applyAISuggestion">採納</UButton>
                    <UButton size="xs" color="gray" variant="ghost" @click="aiSuggestion = ''">忽略</UButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error -->
          <UAlert
            v-if="error"
            color="red"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
          >
            {{ error }}
          </UAlert>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton
              color="gray"
              variant="ghost"
              @click="close"
            >
              取消
            </UButton>
            <UButton
              color="gray"
              @click="saveDraft"
              :loading="saving"
            >
              保存草稿
            </UButton>
            <UButton
              color="primary"
              type="submit"
              :loading="saving"
              class="shadow-lg shadow-primary/25"
            >
              {{ isEditing ? '更新' : '提交審核' }}
            </UButton>
          </div>
        </form>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Example } from '~/types'
import { DIALECT_OPTIONS_FOR_SELECT } from '~/utils/dialects'

const props = defineProps<{
  modelValue: boolean
  entryId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'created': []
  'updated': []
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEditing = computed(() => !!props.entryId)

// Form state - using new schema
const form = reactive({
  headword: {
    display: '',
    normalized: ''
  },
  dialect: {
    name: 'hongkong'
  },
  phonetic: {
    jyutping: [] as string[]
  },
  entryType: 'word' as string,
  senses: [{
    definition: '',
    examples: [{ text: '', jyutping: '', translation: '', scenario: '' }] as Partial<Example>[]
  }],
  theme: {
    level3Id: undefined as number | undefined
  },
  meta: {
    register: '' as string,
    usage: '',
    notes: ''
  },
  status: 'draft' as string
})

// Computed for jyutping input
const jyutpingInput = computed({
  get: () => form.phonetic.jyutping?.join(' ') || '',
  set: (val) => {
    form.phonetic.jyutping = val.split(/\s+/).filter(Boolean)
  }
})

const saving = ref(false)
const error = ref('')

const aiLoading = reactive({
  categorize: false,
  definition: false,
  examples: false
})

const aiSuggestion = ref('')
const pendingAIData = ref<any>(null)

// Options（方言選項由統一常數提供）
const dialectOptions = DIALECT_OPTIONS_FOR_SELECT

const entryTypeOptions = [
  { value: 'character', label: '字' },
  { value: 'word', label: '詞' },
  { value: 'phrase', label: '短語' }
]

const registerOptions = [
  { value: '口語', label: '口語' },
  { value: '書面', label: '書面' },
  { value: '粗俗', label: '粗俗' },
  { value: '文雅', label: '文雅' },
  { value: '中性', label: '中性' }
]

// Methods
function addExample() {
  form.senses[0].examples.push({ text: '', jyutping: '', translation: '', scenario: '' })
}

function removeExample(index: number) {
  form.senses[0].examples.splice(index, 1)
}

function resetForm() {
  form.headword.display = ''
  form.headword.normalized = ''
  form.dialect.name = 'hongkong'
  form.phonetic.jyutping = []
  form.entryType = 'word'
  form.senses = [{
    definition: '',
    examples: [{ text: '', jyutping: '', translation: '', scenario: '' }]
  }]
  form.theme.level3Id = undefined
  form.meta.register = ''
  form.meta.usage = ''
  form.meta.notes = ''
  form.status = 'draft'
  error.value = ''
  aiSuggestion.value = ''
}

function close() {
  resetForm()
  isOpen.value = false
}

async function handleSubmit() {
  if (!form.headword.display || !form.dialect.name) {
    error.value = '請填寫詞頭和方言'
    return
  }

  if (!form.senses[0].definition) {
    error.value = '請填寫釋義'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const payload = {
      headword: {
        display: form.headword.display,
        normalized: form.headword.normalized || form.headword.display
      },
      dialect: {
        name: form.dialect.name
      },
      phonetic: {
        jyutping: form.phonetic.jyutping
      },
      entryType: form.entryType,
      senses: [{
        definition: form.senses[0].definition,
        examples: form.senses[0].examples
          .filter(e => e.text)
          .map(e => ({
            text: e.text,
            jyutping: e.jyutping,
            translation: e.translation,
            scenario: e.scenario
          }))
      }],
      theme: {
        level3Id: form.theme.level3Id
      },
      meta: {
        register: form.meta.register,
        usage: form.meta.usage,
        notes: form.meta.notes
      },
      status: 'pending_review'
    }

    if (isEditing.value) {
      await $fetch(`/api/entries/${props.entryId}`, {
        method: 'PUT',
        body: payload
      })
      emit('updated')
    } else {
      await $fetch('/api/entries', {
        method: 'POST',
        body: payload
      })
      emit('created')
    }

    close()
  } catch (err: any) {
    error.value = err.data?.message || '保存失敗'
  } finally {
    saving.value = false
  }
}

async function saveDraft() {
  if (!form.headword.display || !form.dialect.name) {
    error.value = '請填寫詞頭和方言'
    return
  }

  saving.value = true
  error.value = ''

  try {
    await $fetch('/api/entries', {
      method: 'POST',
      body: {
        headword: {
          display: form.headword.display,
          normalized: form.headword.normalized || form.headword.display
        },
        dialect: { name: form.dialect.name },
        phonetic: { jyutping: form.phonetic.jyutping },
        entryType: form.entryType,
        senses: [{
          definition: form.senses[0].definition,
          examples: form.senses[0].examples.filter(e => e.text)
        }],
        theme: { level3Id: form.theme.level3Id },
        meta: form.meta,
        status: 'draft'
      }
    })
    emit('created')
    close()
  } catch (err: any) {
    error.value = err.data?.message || '保存失敗'
  } finally {
    saving.value = false
  }
}

// AI functions
async function getAICategorization() {
  aiLoading.categorize = true
  try {
    const response = await $fetch('/api/ai/categorize', {
      method: 'POST',
      body: {
        expression: form.headword.display
      }
    })

    if (response.success) {
      aiSuggestion.value = `建議分類: ID ${response.data.themeId} - 置信度 ${(response.data.confidence * 100).toFixed(0)}%\n理由: ${response.data.explanation}`
      pendingAIData.value = { type: 'categorize', themeIdL3: response.data.themeId }
    }
  } catch (err) {
    console.error('AI categorize error:', err)
  } finally {
    aiLoading.categorize = false
  }
}

async function getAIDefinition() {
  aiLoading.definition = true
  try {
    const response = await $fetch('/api/ai/definitions', {
      method: 'POST',
      body: {
        expression: form.headword.display,
        region: form.dialect.name
      }
    })

    if (response.success) {
      aiSuggestion.value = `建議釋義: ${response.data.definition}\n使用説明: ${response.data.usageNotes}`
      pendingAIData.value = {
        type: 'definition',
        definition: response.data.definition,
        usageNotes: response.data.usageNotes,
        register: response.data.register
      }
    }
  } catch (err) {
    console.error('AI definition error:', err)
  } finally {
    aiLoading.definition = false
  }
}

async function getAIExamples() {
  aiLoading.examples = true
  try {
    const response = await $fetch('/api/ai/examples', {
      method: 'POST',
      body: {
        expression: form.headword.display,
        definition: form.senses[0].definition,
        region: form.dialect.name
      }
    })

    if (response.success) {
      const examples = response.data.map((e: any) =>
        `${e.sentence || e.text} (${e.scenario})`
      ).join('\n')
      aiSuggestion.value = `建議例句:\n${examples}`
      pendingAIData.value = { type: 'examples', examples: response.data }
    }
  } catch (err) {
    console.error('AI examples error:', err)
  } finally {
    aiLoading.examples = false
  }
}

function applyAISuggestion() {
  if (!pendingAIData.value) return

  if (pendingAIData.value.type === 'categorize') {
    form.theme.level3Id = pendingAIData.value.themeIdL3
  } else if (pendingAIData.value.type === 'definition') {
    form.senses[0].definition = pendingAIData.value.definition
    form.meta.usage = pendingAIData.value.usageNotes
    if (pendingAIData.value.register) {
      form.meta.register = pendingAIData.value.register
    }
  } else if (pendingAIData.value.type === 'examples') {
    form.senses[0].examples = pendingAIData.value.examples.map((e: any) => ({
      text: e.text || e.sentence,
      jyutping: e.jyutping || '',
      translation: e.translation || e.explanation || '',
      scenario: e.scenario || ''
    }))
  }

  aiSuggestion.value = ''
  pendingAIData.value = null
}

// Watch for entryId changes to load data
watch(() => props.entryId, async (id) => {
  if (id && isOpen.value) {
    try {
      const response = await $fetch(`/api/entries/${id}`)
      if (response.success) {
        const entry = response.data
        // Support both old and new formats
        form.headword.display = entry.headword?.display || entry.text || ''
        form.headword.normalized = entry.headword?.normalized || ''
        form.dialect.name = entry.dialect?.name || entry.region || 'hongkong'
        form.phonetic.jyutping = entry.phonetic?.jyutping || (entry.phoneticNotation ? entry.phoneticNotation.split(' ') : [])
        form.entryType = entry.entryType || 'word'
        form.senses[0].definition = entry.senses?.[0]?.definition || entry.definition || ''
        form.senses[0].examples = (entry.senses?.[0]?.examples || entry.examples || []).map((e: any) => ({
          text: e.text || e.sentence || '',
          jyutping: e.jyutping || '',
          translation: e.translation || e.explanation || '',
          scenario: e.scenario || ''
        }))
        if (form.senses[0].examples.length === 0) {
          form.senses[0].examples = [{ text: '', jyutping: '', translation: '', scenario: '' }]
        }
        form.theme.level3Id = entry.theme?.level3Id || entry.themeIdL3
        form.meta.register = entry.meta?.register || ''
        form.meta.usage = entry.meta?.usage || entry.usageNotes || ''
      }
    } catch (err) {
      console.error('Failed to load entry:', err)
    }
  }
}, { immediate: true })

// Also watch isOpen to load data when opening
watch(isOpen, async (open) => {
  if (open && props.entryId) {
    // Data will be loaded by the entryId watcher
  }
})
</script>
