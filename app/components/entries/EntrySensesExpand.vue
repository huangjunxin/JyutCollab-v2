<template>
  <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">釋義詳情（義項、例句、分義項）</h4>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-heroicons-chevron-up"
        @click="$emit('close')"
      >
        收起
      </UButton>
    </div>
    <!-- AI 建議區域（有建議時先展示，採納後才寫入） -->
    <div
      v-if="aiSuggestion"
      class="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
    >
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">AI 釋義建議</div>
          <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{{ aiSuggestion.definition }}</p>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <UButton color="primary" size="xs" @click="$emit('accept-definition-ai')">
            接受
          </UButton>
          <UButton color="neutral" variant="ghost" size="xs" @click="$emit('dismiss-definition-ai')">
            忽略
          </UButton>
        </div>
      </div>
    </div>
    <div class="space-y-4">
      <template v-for="(sense, senseIdx) in (entry.senses || [])" :key="senseIdx">
        <div
          class="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 space-y-3"
        >
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">義項 {{ senseIdx + 1 }}</span>
            <UButton
              v-if="(entry.senses?.length ?? 0) > 1"
              color="error"
              variant="ghost"
              size="xs"
              icon="i-heroicons-trash"
              title="刪除此義項"
              @click="$emit('remove-sense', senseIdx)"
            />
            <UButton
              v-if="senseIdx === (entry.senses?.length ?? 1) - 1"
              color="primary"
              variant="ghost"
              size="xs"
              icon="i-heroicons-plus"
              @click="$emit('add-sense')"
            >
              添加義項
            </UButton>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <div>
              <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">詞性/標籤（可選）</label>
              <input
                v-model="sense.label"
                type="text"
                placeholder="如：動詞、名詞"
                class="w-full max-w-xs px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                @input="entry._isDirty = true"
              />
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <label class="text-xs text-gray-500 dark:text-gray-400">釋義</label>
                <UButton
                  v-if="senseIdx === 0 && entry.headword?.display"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-sparkles"
                  title="AI 生成釋義"
                  :loading="aiLoading"
                  @click="$emit('ai-definition')"
                >
                  AI 釋義
                </UButton>
              </div>
              <textarea
                v-model="sense.definition"
                rows="2"
                placeholder="釋義內容"
                class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 resize-y"
                @input="entry._isDirty = true"
              />
            </div>
          </div>
          <!-- 例句 -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">例句</label>
              <div class="flex items-center gap-1">
                <UButton
                  color="primary"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-plus"
                  @click="$emit('add-example', senseIdx)"
                >
                  添加例句
                </UButton>
                <UButton
                  v-if="senseIdx === 0 && entry.headword?.display && sense.definition"
                  color="primary"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-sparkles"
                  title="AI 例句"
                  :loading="aiLoadingExamples"
                  @click="$emit('ai-examples')"
                >
                  AI 例句
                </UButton>
              </div>
            </div>
            <div class="space-y-2">
              <div
                v-for="(ex, exIdx) in (sense.examples || [])"
                :key="exIdx"
                class="rounded bg-gray-100 dark:bg-gray-800 p-3 space-y-2 relative"
              >
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-heroicons-trash"
                  class="absolute top-2 right-2"
                  @click="$emit('remove-example', { senseIdx, exIdx })"
                />
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">例句內容</label>
                  <input
                    v-model="ex.text"
                    type="text"
                    placeholder="例句內容"
                    class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    @input="entry._isDirty = true"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">粵拼</label>
                  <input
                    v-model="ex.jyutping"
                    type="text"
                    placeholder="粵拼"
                    class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono"
                    @input="entry._isDirty = true"
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-500 dark:text-gray-400 mb-0.5">翻譯</label>
                  <input
                    v-model="ex.translation"
                    type="text"
                    placeholder="翻譯"
                    class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    @input="entry._isDirty = true"
                  />
                </div>
              </div>
            </div>
          </div>
          <!-- 釋義配圖（例句下方，每義項最多 3 張） -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">
                釋義配圖（已 {{ (sense.images?.length ?? 0) }}/{{ MAX_IMAGES_PER_SENSE }} 張）
              </label>
              <template v-if="(sense.images?.length ?? 0) < MAX_IMAGES_PER_SENSE">
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
              <span v-else class="text-xs text-gray-500 dark:text-gray-400">已達 3 張，可刪除後再上傳</span>
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
                  class="w-24 h-24 object-cover cursor-zoom-in"
                  loading="lazy"
                  @click="openImagePreview(publicId)"
                />
                <button
                  type="button"
                  class="absolute top-1 right-1 inline-flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="刪除圖片"
                  @click.stop="removeSenseImage(senseIdx, imgIdx)"
                >
                  <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <!-- 分義項 -->
          <div>
            <div class="flex items-center gap-2 mb-2">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400">分義項（A、B、C…）</label>
              <UButton
                color="primary"
                variant="ghost"
                size="xs"
                icon="i-heroicons-plus"
                @click="$emit('add-sub-sense', senseIdx)"
              >
                添加分義項
              </UButton>
            </div>
            <div class="space-y-3 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
              <div
                v-for="(sub, subIdx) in (sense.subSenses || [])"
                :key="subIdx"
                class="rounded bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="sub.label"
                    type="text"
                    placeholder="標籤（如 A、B、C）"
                    class="w-14 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    @input="entry._isDirty = true"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    size="xs"
                    icon="i-heroicons-trash"
                    title="刪除此分義項"
                    @click="$emit('remove-sub-sense', { senseIdx, subIdx })"
                  />
                </div>
                <textarea
                  v-model="sub.definition"
                  rows="1"
                  placeholder="分義項釋義"
                  class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 resize-y"
                  @input="entry._isDirty = true"
                />
                <div class="mt-2">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs text-gray-500 dark:text-gray-400">例句</span>
                    <UButton
                      color="neutral"
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-plus"
                      @click="$emit('add-sub-sense-example', { senseIdx, subIdx })"
                    >
                      添加
                    </UButton>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(subEx, subExIdx) in (sub.examples || [])"
                      :key="subExIdx"
                      class="flex flex-wrap items-center gap-2"
                    >
                      <input
                        v-model="subEx.text"
                        type="text"
                        placeholder="例句"
                        class="flex-1 min-w-[100px] px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        @input="entry._isDirty = true"
                      />
                      <input
                        v-model="subEx.jyutping"
                        type="text"
                        placeholder="粵拼"
                        class="flex-1 min-w-[100px] px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono"
                        @input="entry._isDirty = true"
                      />
                      <input
                        v-model="subEx.translation"
                        type="text"
                        placeholder="翻譯"
                        class="flex-1 min-w-[100px] px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                        @input="entry._isDirty = true"
                      />
                      <UButton
                        color="error"
                        variant="ghost"
                        size="xs"
                        icon="i-heroicons-trash"
                        @click="$emit('remove-sub-sense-example', { senseIdx, subIdx, exIdx: subExIdx })"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <!-- 若無義項則顯示添加按鈕 -->
      <div
        v-if="!entry.senses?.length"
        class="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">尚無義項</p>
        <UButton color="primary" variant="soft" size="sm" icon="i-heroicons-plus" @click="$emit('add-sense')">
          添加義項
        </UButton>
      </div>
    </div>

    <!-- 釋義配圖預覽（點擊縮圖放大） -->
    <UModal v-model:open="imagePreviewVisible">
      <template #content>
        <UCard class="max-w-4xl max-h-[90vh] overflow-y-auto">
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

const props = withDefaults(
  defineProps<{
    entry: Entry
    /** 展開區內 AI 釋義建議（先展示，用戶採納後才寫入） */
    aiSuggestion?: { definition: string; usageNotes?: string; formalityLevel?: string } | null
    /** 是否正在請求 AI 釋義（按鈕 loading） */
    aiLoading?: boolean
    /** 是否正在請求 AI 例句（按鈕 loading） */
    aiLoadingExamples?: boolean
  }>(),
  { aiSuggestion: null, aiLoading: false, aiLoadingExamples: false }
)

defineEmits([
  'close',
  'ai-definition',
  'accept-definition-ai',
  'dismiss-definition-ai',
  'ai-examples',
  'add-sense',
  'remove-sense',
  'add-example',
  'remove-example',
  'add-sub-sense',
  'remove-sub-sense',
  'add-sub-sense-example',
  'remove-sub-sense-example'
])

const MAX_IMAGES_PER_SENSE = 3

const HEIF_TYPES = ['image/heic', 'image/heif']
const HEIF_EXT = /\.(heic|heif)$/i

function isHeifFile(file: File): boolean {
  if (HEIF_TYPES.includes(file.type)) return true
  return HEIF_EXT.test(file.name)
}

/** 將 HEIC/HEIF 轉為 JPEG File，供後續壓縮與上傳。僅在客戶端動態載入 heic2any，避免 SSR 時 window 未定義。 */
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import('heic2any')).default
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 1
  })
  const blob = Array.isArray(result) ? result[0] : result
  if (!blob) throw new Error('HEIC 轉換失敗')
  const name = file.name.replace(HEIF_EXT, '.jpg')
  return new File([blob], name, { type: 'image/jpeg' })
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
  const currentCount = sense.images?.length ?? 0
  if (currentCount >= MAX_IMAGES_PER_SENSE) {
    alert(`每個義項最多上傳 ${MAX_IMAGES_PER_SENSE} 張圖片`)
    input.value = ''
    return
  }

  uploadingSenseIdx.value = senseIdx
  try {
    let fileToCompress: File = file
    if (isHeifFile(file)) {
      const converted = await convertHeicToJpeg(file)
      fileToCompress = converted
    }
    const blob = await compressImage(fileToCompress, { maxSize: 1200, quality: 0.82 })
    const form = new FormData()
    form.append('file', blob, fileToCompress.name.replace(/\.[^.]+$/, '.jpg') || 'image.jpg')
    const res = await $fetch<{ success: boolean; data?: { public_id: string } }>('/api/upload/image', {
      method: 'POST',
      body: form
    })
    if (res.success && res.data?.public_id) {
      if (!sense.images) sense.images = []
      sense.images.push(res.data.public_id)
      props.entry._isDirty = true
    }
  } catch (err: any) {
    const msg = err?.data?.message || err?.message || '上傳失敗'
    alert(msg)
  } finally {
    uploadingSenseIdx.value = null
    input.value = ''
  }
}

function removeSenseImage(senseIdx: number, imgIdx: number) {
  const sense = props.entry.senses?.[senseIdx]
  if (sense?.images) {
    sense.images.splice(imgIdx, 1)
    props.entry._isDirty = true
  }
}
</script>
