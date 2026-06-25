<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white truncate">釋義詳情</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ entry.headword?.display || '—' }}</p>
        </div>
      </div>
    </div>

    <!-- AI definition suggestion -->
    <div
      v-if="aiDefinitionSuggestion"
      class="flex-shrink-0 mx-4 mt-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">AI 釋義建議</p>
          <p class="text-sm text-gray-900 dark:text-white">{{ aiDefinitionSuggestion.definition }}</p>
          <p v-if="aiDefinitionSuggestion.usageNotes" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            用法：{{ aiDefinitionSuggestion.usageNotes }}
          </p>
        </div>
      </div>
      <div v-if="!readOnly" class="flex gap-2 mt-2">
        <UButton size="xs" color="primary" @click="$emit('accept-definition-ai')">採納</UButton>
        <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-definition-ai')">忽略</UButton>
      </div>
    </div>

    <!-- Senses list -->
    <div class="flex-1 overflow-auto px-4 py-3 space-y-4">
      <div
        v-for="(sense, senseIdx) in senses"
        :key="senseIdx"
        class="bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] p-3 space-y-3"
      >
        <!-- Sense header -->
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
            義項 {{ senseIdx + 1 }}
            <span v-if="sense.label" class="text-xs font-normal text-gray-500 ml-1">({{ sense.label }})</span>
          </h3>
          <UButton
            v-if="senses.length > 1 && !readOnly"
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="handleRemoveSense(senseIdx)"
          />
        </div>

        <!-- Sense label -->
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">詞性/標籤（可選）</label>
          <input
            :value="sense.label || ''"
            placeholder="如：動詞、名詞"
            :disabled="readOnly"
            class="w-full max-w-xs text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            @input="(e) => updateSenseLabel(senseIdx, (e.target as HTMLInputElement).value)"
          />
        </div>

        <!-- Definition -->
        <div>
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">釋義</label>
          <UTextarea
            :model-value="sense.definition"
            :rows="4"
            size="sm"
            autoresize
            class="w-full"
            :disabled="readOnly"
            :ui="{ root: 'w-full', base: 'w-full min-h-28 bg-white dark:bg-slate-800' }"
            @update:model-value="(v: string) => updateSenseDefinition(senseIdx, v)"
          />
        </div>

        <!-- Examples -->
        <div v-if="sense.examples && sense.examples.length > 0">
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">例句</label>
          <div class="space-y-2">
            <div
              v-for="(ex, exIdx) in sense.examples"
              :key="exIdx"
              class="flex items-start gap-2 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700"
            >
              <div class="flex-1 min-w-0 space-y-1">
                <input
                  :value="ex.text"
                  placeholder="例句"
                  :disabled="readOnly"
                  class="w-full text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  @input="(e) => updateExampleText(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                />
                <div class="flex items-center gap-1">
                  <input
                    :value="ex.jyutping"
                    placeholder="粵拼"
                    :disabled="readOnly"
                    class="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-mono"
                    @input="(e) => updateExampleJyutping(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                  />
                  <UButton
                    v-if="!readOnly"
                    icon="i-heroicons-book-open"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :loading="exampleJyutpingLoading[`${senseIdx}-${exIdx}`]"
                    :disabled="!ex.text"
                    title="從泛粵典生成粵拼"
                    @click="generateExampleJyutping(ex, `${senseIdx}-${exIdx}`)"
                  >
                    粵拼
                  </UButton>
                </div>
                <input
                  :value="ex.translation"
                  placeholder="翻譯"
                  :disabled="readOnly"
                  class="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                  @input="(e) => updateExampleTranslation(senseIdx, exIdx, (e.target as HTMLInputElement).value)"
                />
              </div>
              <UButton v-if="!readOnly" icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" class="mt-1" @click="handleRemoveExample(senseIdx, exIdx)" />
            </div>
          </div>
        </div>
        <div v-if="!readOnly" class="flex gap-2">
          <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-plus" @click="handleAddExample(senseIdx)">
            例句
          </UButton>
        </div>

        <!-- Sub-senses -->
        <div v-if="sense.subSenses && sense.subSenses.length > 0">
          <label class="text-xs text-gray-500 dark:text-gray-400 block mb-1">分義項</label>
          <div class="space-y-2">
            <div
              v-for="(sub, subIdx) in sense.subSenses"
              :key="subIdx"
              class="p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {{ sub.label || `分義項 ${subIdx + 1}` }}
                </span>
                <UButton v-if="!readOnly" icon="i-heroicons-trash" color="error" variant="ghost" size="xs" @click="handleRemoveSubSense(senseIdx, subIdx)" />
              </div>
              <input
                :value="sub.definition"
                placeholder="分義項釋義"
                :disabled="readOnly"
                class="w-full min-h-10 text-sm px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                @input="(e) => updateSubSenseDefinition(senseIdx, subIdx, (e.target as HTMLInputElement).value)"
              />
              <!-- Sub-sense examples -->
              <div v-if="sub.examples && sub.examples.length > 0" class="space-y-1">
                <div
                  v-for="(subEx, subExIdx) in sub.examples"
                  :key="subExIdx"
                  class="space-y-1"
                >
                  <div class="flex items-center gap-1">
                    <input
                      :value="subEx.text"
                      placeholder="例句"
                      :disabled="readOnly"
                      class="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
                      @input="(e) => updateSubSenseExampleText(senseIdx, subIdx, subExIdx, (e.target as HTMLInputElement).value)"
                    />
                    <UButton v-if="!readOnly" icon="i-heroicons-x-mark" color="error" variant="ghost" size="xs" @click="handleRemoveSubSenseExample(senseIdx, subIdx, subExIdx)" />
                  </div>
                  <div v-if="!readOnly" class="flex items-center gap-1">
                    <input
                      :value="subEx.jyutping || ''"
                      placeholder="粵拼"
                      :disabled="readOnly"
                      class="flex-1 text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800 font-mono"
                      @input="(e) => updateSubSenseExampleJyutping(senseIdx, subIdx, subExIdx, (e.target as HTMLInputElement).value)"
                    />
                    <UButton
                      icon="i-heroicons-book-open"
                      color="primary"
                      variant="ghost"
                      size="xs"
                      :loading="exampleJyutpingLoading[`sub-${senseIdx}-${subIdx}-${subExIdx}`]"
                      :disabled="!subEx.text"
                      title="從泛粵典生成粵拼"
                      @click="generateExampleJyutping(subEx, `sub-${senseIdx}-${subIdx}-${subExIdx}`)"
                    >
                      粵拼
                    </UButton>
                  </div>
                  <input
                    v-if="!readOnly"
                    :value="subEx.translation || ''"
                    placeholder="翻譯"
                    :disabled="readOnly"
                    class="w-full text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
                    @input="(e) => updateSubSenseExampleTranslation(senseIdx, subIdx, subExIdx, (e.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
              <UButton v-if="!readOnly" size="xs" variant="ghost" color="neutral" icon="i-heroicons-plus" @click="handleAddSubSenseExample(senseIdx, subIdx)">
                分義項例句
              </UButton>
            </div>
          </div>
        </div>
        <div v-if="!readOnly" class="flex gap-2">
          <UButton size="xs" variant="soft" color="neutral" icon="i-heroicons-plus" @click="handleAddSubSense(senseIdx)">
            分義項
          </UButton>
        </div>

        <!-- 釋義配圖 -->
        <div>
          <div class="flex items-center gap-2 mb-2">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400">
              釋義配圖（已 {{ (sense.images?.length ?? 0) }}/{{ MAX_IMAGES_PER_SENSE }} 張）
            </label>
            <template v-if="!readOnly && (sense.images?.length ?? 0) < MAX_IMAGES_PER_SENSE">
              <label class="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
                  class="hidden"
                  @change="(e: Event) => onImageSelect(e, senseIdx)"
                />
                <UButton
                  as="span"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-photo"
                  :loading="uploadingSenseIdx === senseIdx"
                >
                  上傳圖片
                </UButton>
              </label>
            </template>
            <span v-else-if="!readOnly && (sense.images?.length ?? 0) >= MAX_IMAGES_PER_SENSE" class="text-xs text-gray-500 dark:text-gray-400">已達 3 張，可刪除後再上傳</span>
          </div>
          <div v-if="(sense.images?.length ?? 0) > 0" class="flex flex-wrap gap-2 mt-2">
            <div
              v-for="(publicId, imgIdx) in (sense.images || [])"
              :key="publicId"
              class="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
            >
              <img
                :src="getOptimizedUrl(publicId)"
                :alt="`配圖 ${imgIdx + 1}`"
                class="w-20 h-20 object-cover cursor-zoom-in"
                loading="lazy"
                @click="openImagePreview(publicId)"
              />
              <button
                v-if="!readOnly"
                type="button"
                class="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="刪除圖片"
                @click.stop="removeSenseImage(senseIdx, imgIdx)"
              >
                <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] flex gap-2">
      <div v-if="readOnly" class="w-full text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">此詞條由其他用戶創建，僅供查看</p>
      </div>
      <template v-else>
        <UButton size="sm" color="primary" icon="i-heroicons-plus" @click="handleAddSense">
          新增義項
        </UButton>
        <UButton
          v-if="canGenerateAI"
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-sparkles"
          :loading="aiLoadingExamples"
          @click="$emit('ai-examples')"
        >
          AI 例句
        </UButton>
        <UButton
          v-if="canGenerateAI"
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-lucide-sparkles"
          :loading="aiLoadingDefinition"
          @click="$emit('ai-definition')"
        >
          AI 釋義
        </UButton>
      </template>
    </div>

    <!-- 釋義配圖預覽 -->
    <UModal v-model:open="imagePreviewVisible">
      <template #content>
        <UCard class="jc-modal-card max-w-4xl max-h-[90vh] overflow-y-auto rounded-none [&>*]:rounded-none">
          <div class="relative">
            <img
              v-if="imagePreviewPublicId"
              :src="getOptimizedUrl(imagePreviewPublicId, { width: 1200 })"
              alt="釋義配圖預覽"
              class="max-h-[80vh] w-auto mx-auto object-contain"
            />
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import {
  ensureSensesStructure,
  addSense, removeSense,
  addExample, removeExample,
  addSubSense, removeSubSense,
  addSubSenseExample, removeSubSenseExample
} from '~/composables/useEntrySenses'
import { useExampleJyutping } from '~/composables/useExampleJyutping'
import { getDialectLabel } from '~/utils/dialects'

const MAX_IMAGES_PER_SENSE = 3
const HEIF_TYPES = ['image/heic', 'image/heif']
const HEIF_EXT = /\.(heic|heif)$/i

function isHeifFile(file: File): boolean {
  if (HEIF_TYPES.includes(file.type)) return true
  return HEIF_EXT.test(file.name)
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 1 })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) throw new Error('HEIC 轉換失敗')
  return new File([blob], file.name.replace(HEIF_EXT, '.jpg'), { type: 'image/jpeg' })
}

const getOptimizedUrl = useSenseImageUrl()
const compressImage = useImageCompress()
const uploadingSenseIdx = ref<number | null>(null)
const imagePreviewVisible = ref(false)
const imagePreviewPublicId = ref<string | null>(null)

function openImagePreview(publicId: string) {
  imagePreviewPublicId.value = publicId
  imagePreviewVisible.value = true
}

async function onImageSelect(event: Event, senseIdx: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const sense = props.entry.senses?.[senseIdx]
  if (!sense) return
  if ((sense.images?.length ?? 0) >= MAX_IMAGES_PER_SENSE) {
    alert(`每個義項最多上傳 ${MAX_IMAGES_PER_SENSE} 張圖片`)
    input.value = ''
    return
  }
  uploadingSenseIdx.value = senseIdx
  try {
    let fileToCompress: File = file
    if (isHeifFile(file)) fileToCompress = await convertHeicToJpeg(file)
    const blob = await compressImage(fileToCompress, { maxSize: 1200, quality: 0.82 })
    const form = new FormData()
    form.append('file', blob, fileToCompress.name.replace(/\.[^.]+$/, '.jpg') || 'image.jpg')
    const res = await $fetch<{ success: boolean; data?: { public_id: string } }>('/api/upload/image', { method: 'POST', body: form })
    if (res.success && res.data?.public_id) {
      if (!sense.images) sense.images = []
      sense.images.push(res.data.public_id)
      markDirty()
    }
  } catch (err: any) {
    alert(err?.data?.message || err?.message || '上傳失敗')
  } finally {
    uploadingSenseIdx.value = null
    input.value = ''
  }
}

function removeSenseImage(senseIdx: number, imgIdx: number) {
  const sense = props.entry.senses?.[senseIdx]
  if (sense?.images) {
    sense.images.splice(imgIdx, 1)
    markDirty()
  }
}

const props = defineProps<{
  entry: Entry
  readOnly?: boolean
  aiDefinitionSuggestion?: { definition: string; usageNotes?: string } | null
  aiLoadingDefinition?: boolean
  aiLoadingExamples?: boolean
}>()

const emit = defineEmits<{
  'back': []
  'ai-definition': []
  'ai-examples': []
  'accept-definition-ai': []
  'dismiss-definition-ai': []
}>()

const canGenerateAI = computed(() => !!props.entry.headword?.display?.trim())

// Ensure senses structure on mount
onMounted(() => {
  ensureSensesStructure(props.entry)
})

const senses = computed(() => props.entry.senses || [])

function markDirty() {
  props.entry._isDirty = true
}

function handleAddSense() {
  addSense(props.entry)
  markDirty()
}

function handleRemoveSense(idx: number) {
  removeSense(props.entry, idx)
  markDirty()
}

function handleAddExample(senseIdx: number) {
  addExample(props.entry, senseIdx)
  markDirty()
}

function handleRemoveExample(senseIdx: number, exIdx: number) {
  removeExample(props.entry, senseIdx, exIdx)
  markDirty()
}

function handleAddSubSense(senseIdx: number) {
  addSubSense(props.entry, senseIdx)
  markDirty()
}

function handleRemoveSubSense(senseIdx: number, subIdx: number) {
  removeSubSense(props.entry, senseIdx, subIdx)
  markDirty()
}

function handleAddSubSenseExample(senseIdx: number, subIdx: number) {
  addSubSenseExample(props.entry, senseIdx, subIdx)
  markDirty()
}

function handleRemoveSubSenseExample(senseIdx: number, subIdx: number, exIdx: number) {
  removeSubSenseExample(props.entry, senseIdx, subIdx, exIdx)
  markDirty()
}

function updateSenseDefinition(senseIdx: number, value: string) {
  if (!props.entry.senses?.[senseIdx]) return
  props.entry.senses[senseIdx].definition = value
  markDirty()
}

function updateSenseLabel(senseIdx: number, value: string) {
  if (!props.entry.senses?.[senseIdx]) return
  props.entry.senses[senseIdx].label = value
  markDirty()
}

function updateExampleText(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.text = value
  markDirty()
}

function updateExampleJyutping(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.jyutping = value
  markDirty()
}

function updateExampleTranslation(senseIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.translation = value
  markDirty()
}

function updateSubSenseDefinition(senseIdx: number, subIdx: number, value: string) {
  const sub = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]
  if (!sub) return
  sub.definition = value
  markDirty()
}

function updateSubSenseExampleText(senseIdx: number, subIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.text = value
  markDirty()
}

function updateSubSenseExampleJyutping(senseIdx: number, subIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.jyutping = value
  markDirty()
}

function updateSubSenseExampleTranslation(senseIdx: number, subIdx: number, exIdx: number, value: string) {
  const ex = props.entry.senses?.[senseIdx]?.subSenses?.[subIdx]?.examples?.[exIdx]
  if (!ex) return
  ex.translation = value
  markDirty()
}

// --- 例句粵拼生成 ---
const { generate: doGenerateJyutping } = useExampleJyutping()
const exampleJyutpingLoading = ref<Record<string, boolean>>({})

async function generateExampleJyutping(
  example: { text?: string; jyutping?: string },
  key: string
) {
  if (!example.text || !props.entry.dialect?.name) return
  exampleJyutpingLoading.value[key] = true
  try {
    const result = await doGenerateJyutping(
      example.text,
      getDialectLabel(props.entry.dialect.name),
      (partial) => { example.jyutping = partial }
    )
    if (result) {
      example.jyutping = result
      props.entry._isDirty = true
    }
  } finally {
    exampleJyutpingLoading.value[key] = false
  }
}
</script>
