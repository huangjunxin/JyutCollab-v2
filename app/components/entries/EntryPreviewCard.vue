<template>
  <div
    :class="[
      'rounded border bg-white/60 dark:bg-gray-800/40 px-2 py-1.5 text-xs',
      variantBorderClass
    ]"
  >
    <!-- 第一行：詞頭、方言/狀態/日期 或 粵拼/出處 -->
    <div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-gray-700 dark:text-gray-300">
      <span class="font-medium text-gray-900 dark:text-gray-100">{{ item.headwordDisplay }}</span>
      <template v-if="isDbStyle">
        <span v-if="item.dialectLabel" :class="accentTextClass">{{ item.dialectLabel }}</span>
        <span
          v-if="item.status !== undefined"
          :class="[
            item.status === 'draft' && 'text-gray-500 dark:text-gray-400',
            item.status === 'pending_review' && 'text-amber-600 dark:text-amber-400',
            item.status === 'approved' && 'text-green-600 dark:text-green-400',
            item.status === 'rejected' && 'text-red-600 dark:text-red-400'
          ]"
        >
          {{ item.statusLabel }}
        </span>
        <span v-if="item.createdAtLabel" class="text-gray-400 dark:text-gray-500">{{ item.createdAtLabel }}</span>
      </template>
      <template v-else>
        <span v-if="item.jyutping" class="font-mono text-gray-600 dark:text-gray-400">{{ item.jyutping }}</span>
        <span v-if="item.dialectLabel" :class="accentTextClass">{{ item.dialectLabel }}</span>
        <span v-if="item.sourceBook" class="text-gray-400 dark:text-gray-500">{{ item.sourceBook }}</span>
      </template>
      <UButton
        v-if="showApplyTemplate"
        size="xs"
        color="primary"
        variant="ghost"
        class="ml-auto"
        @click="$emit('apply-template', item.id)"
      >
        用作範本填寫此行
      </UButton>
    </div>

    <!-- 第二段：釋義摘要、分類/義項（僅 DB）、查看完整詞條 -->
    <div class="mt-0.5 flex items-start gap-2">
      <div class="flex-1 min-w-0">
        <p class="text-gray-600 dark:text-gray-400 line-clamp-2">
          {{ item.definitionSummary }}
        </p>
        <div
          v-if="isDbStyle && (item.themeLabel !== undefined || item.senseCount !== undefined)"
          class="mt-0.5 flex flex-wrap items-center gap-x-2 text-gray-500 dark:text-gray-500"
        >
          <span v-if="item.themeLabel">分類：{{ item.themeLabel }}</span>
          <span v-if="item.themeLabel != null && item.senseCount != null">·</span>
          <span v-if="item.senseCount != null">共 {{ item.senseCount }} 個義項</span>
          <span v-if="item.metaLabel">· {{ item.metaLabel }}</span>
        </div>
      </div>
      <UButton
        size="xs"
        color="neutral"
        variant="ghost"
        :class="[accentTextClass, 'flex-shrink-0']"
        type="button"
        @click.stop="$emit('open-detail', item.id)"
      >
        查看完整詞條
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/** 本系統詞條預覽（詞頭重複檢測、其他方言點參考） */
export interface EntryPreviewItemDb {
  id: string
  headwordDisplay: string
  definitionSummary: string
  dialectLabel?: string
  status?: string
  statusLabel?: string
  createdAtLabel?: string
  themeLabel?: string
  senseCount?: number
  metaLabel?: string
}

/** 粵語辭叢參考預覽 */
export interface EntryPreviewItemJyutjyu {
  id: string
  headwordDisplay: string
  definitionSummary: string
  jyutping?: string
  dialectLabel?: string
  sourceBook?: string
}

export type EntryPreviewItem = EntryPreviewItemDb | EntryPreviewItemJyutjyu

function isDbItem(item: EntryPreviewItem): item is EntryPreviewItemDb {
  return 'themeLabel' in item || 'status' in item
}

const props = withDefaults(
  defineProps<{
    item: EntryPreviewItem
    /** 視覺主題，用於邊框與按鈕顏色 */
    variant: 'amber' | 'blue' | 'emerald'
    showApplyTemplate?: boolean
  }>(),
  { showApplyTemplate: false }
)

defineEmits<{
  'open-detail': [id: string]
  'apply-template': [id: string]
}>()

const isDbStyle = computed(() => isDbItem(props.item))

const variantBorderClass = computed(() => {
  switch (props.variant) {
    case 'amber':
      return 'border-amber-100 dark:border-amber-800/50'
    case 'blue':
      return 'border-blue-100 dark:border-blue-800/50'
    case 'emerald':
      return 'border-emerald-100 dark:border-emerald-800/50'
    default:
      return 'border-gray-200 dark:border-gray-700'
  }
})

const accentTextClass = computed(() => {
  switch (props.variant) {
    case 'amber':
      return 'text-amber-600 dark:text-amber-400'
    case 'blue':
      return 'text-blue-600 dark:text-blue-400'
    case 'emerald':
      return 'text-emerald-700 dark:text-emerald-300'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
})
</script>
