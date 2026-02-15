<template>
  <td
    class="cell-td px-1 py-1 border-r border-gray-200 dark:border-gray-700 relative transition-[box-shadow]"
    :class="[
      isSelected && !isEditing && 'ring-2 ring-primary/60 ring-inset',
      wrap && 'cell-td-wrap',
      !canEdit && 'cursor-default'
    ]"
    :style="cellStyle"
    @click="$emit('click', $event)"
  >
    <!-- 編輯態 -->
    <template v-if="isEditing">
      <!-- 主題列：禁止編輯，點擊時展開；需轉發 keydown 以便 Tab/Enter/Escape 由表格處理 -->
      <template v-if="col.type === 'theme'">
        <div
          ref="themeEditWrapperRef"
          class="cell-inline-input flex flex-col gap-0.5 w-full min-h-[2rem] px-2 py-1 text-sm rounded bg-white dark:bg-gray-900 border border-primary/80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 focus:ring-inset"
          tabindex="-1"
          @keydown="$emit('keydown', $event)"
        >
          <div class="flex gap-1 items-center min-h-[24px]">
            <UTooltip
              v-if="themePath"
              :text="themePath"
              :ui="{ content: 'max-w-xs' }"
            >
              <div
                class="flex-1 px-0 py-0 text-sm min-h-[24px] cursor-pointer rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors truncate"
              >
                {{ displayText }}
              </div>
            </UTooltip>
            <div
              v-else
              class="flex-1 px-0 py-0 text-sm text-gray-400 min-h-[24px] cursor-pointer rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
            >
              選擇分類
            </div>
            <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
              <UButton
                v-if="showAiTheme"
                color="primary"
                variant="ghost"
                size="xs"
                icon="i-heroicons-sparkles"
                title="AI 分類"
                class="flex-shrink-0"
                :loading="aiLoadingTheme"
                @click="$emit('ai-theme')"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="isThemeExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                :title="isThemeExpanded ? '收起' : '展開選擇分類'"
                class="flex-shrink-0"
                @click="$emit('theme-expand-click')"
              />
            </div>
          </div>
          <!-- AI 建議提示 -->
          <div
            v-if="themeExpandHint"
            class="flex items-center justify-between px-1 py-0.5 min-h-[24px] bg-blue-50 dark:bg-blue-900/20 rounded"
            @click.stop
          >
            <span class="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">
              {{ themeExpandHint }}
            </span>
            <div class="flex items-center gap-1">
              <UButton
                color="primary"
                size="xs"
                @click="$emit('accept-theme-ai')"
              >
                接受
              </UButton>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                @click="$emit('dismiss-theme-ai')"
              >
                忽略
              </UButton>
            </div>
          </div>
        </div>
      </template>
      <!-- 文本輸入（包括粵拼） -->
      <textarea
        v-else-if="col.type === 'text' || col.type === 'phonetic'"
        :ref="(el: any) => $emit('setRef', el)"
        :value="editValue"
        class="cell-inline-input cell-inline-textarea w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-900 border border-primary/80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40 resize-none min-h-[2rem] max-h-[240px] overflow-y-hidden"
        rows="1"
        :class="{ 'font-mono': col.type === 'phonetic' }"
        @input="onTextareaInput($event)"
        @keydown="$emit('keydown', $event)"
        @blur="$emit('blur')"
      />
      <!-- 下拉選擇 -->
      <select
        v-else-if="col.type === 'select'"
        :ref="(el: any) => $emit('setRef', el)"
        :value="editValue"
        class="cell-inline-input w-full px-2 py-1 text-sm rounded bg-white dark:bg-gray-900 border border-primary/80 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/40"
        @change="(e: Event) => $emit('update:editValue', (e.target as HTMLSelectElement).value)"
        @keydown="$emit('keydown', $event)"
        @blur="$emit('blur')"
      >
        <option v-for="opt in columnOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
    </template>
    <!-- 顯示態 -->
    <template v-else>
      <div class="flex flex-col gap-0.5">
        <!-- 第一行：內容 + 右側按鈕 -->
        <div
          class="flex gap-1"
          :class="showExpand && !expandHint ? 'items-end' : 'items-center'"
        >
          <!-- 主題顯示（帶 tooltip 顯示完整路徑），與其他列一致：換行 + 超過高度省略 -->
          <template v-if="col.type === 'theme'">
            <UTooltip
              v-if="themePath"
              :text="themePath"
              :ui="{ content: 'max-w-xs' }"
            >
              <div
                class="flex-1 px-2 py-1 text-sm min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors overflow-hidden"
                :class="[
                  cellClass,
                  wrap ? 'cell-display-wrap whitespace-pre-wrap break-words line-clamp-4' : 'truncate'
                ]"
              >
                {{ displayText }}
              </div>
            </UTooltip>
            <div
              v-else
              class="flex-1 px-2 py-1 text-sm text-gray-400 min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
            >
              選擇分類
            </div>
          </template>
          <!-- 普通文本顯示 -->
          <div
            v-else
            class="flex-1 px-2 py-1 text-sm min-h-[24px] cursor-text rounded hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
            :class="[
              cellClass,
              wrap ? 'cell-display-wrap whitespace-pre-wrap break-words line-clamp-4' : 'truncate'
            ]"
          >
            {{ displayText }}
          </div>
          <!-- 按鈕區 -->
          <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
            <UTooltip
              v-if="reviewNotes"
              :text="reviewNotes"
              :ui="{ content: 'max-w-xs whitespace-pre-wrap' }"
            >
              <UIcon
                name="i-heroicons-information-circle"
                class="w-4 h-4 text-amber-500 cursor-help flex-shrink-0"
              />
            </UTooltip>
            <UButton
              v-if="showAiDefinition"
              color="primary"
              variant="ghost"
              size="xs"
              icon="i-heroicons-sparkles"
              title="AI 釋義"
              class="flex-shrink-0"
              :loading="aiLoadingDefinition"
              @click="$emit('ai-definition')"
            />
            <UButton
              v-if="showAiTheme"
              color="primary"
              variant="ghost"
              size="xs"
              icon="i-heroicons-sparkles"
              title="AI 分類"
              class="flex-shrink-0"
              :loading="aiLoadingTheme"
              @click="$emit('ai-theme')"
            />
            <UButton
              v-if="showExpand && !expandHint"
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              :title="isExpanded ? '收起釋義詳情' : '展開釋義詳情（例句、分義項）'"
              class="flex-shrink-0"
              @click="$emit('expand-click')"
            />
          </div>
        </div>
        <!-- 第二行：展開提示 -->
        <div
          v-if="showExpand && expandHint"
          class="flex items-center justify-between px-1 py-0.5 min-h-[24px]"
          @click.stop
        >
          <span
            class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap"
            :title="`${expandHint}，點擊展開查看`"
          >
            {{ expandHint }}
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            :icon="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
            :title="isExpanded ? '收起釋義詳情' : '展開釋義詳情（例句、分義項）'"
            class="flex-shrink-0"
            @click="$emit('expand-click')"
          />
        </div>
      </div>
    </template>
  </td>
</template>

<script setup lang="ts">
import { getThemePathById } from '~/composables/useThemeData'

const MAX_TEXTAREA_HEIGHT_PX = 240

const themeEditWrapperRef = ref<HTMLElement | null>(null)

const props = withDefaults(
  defineProps<{
    col: { key: string; type: string; width?: string }
    /** 是否可編輯此詞條（貢獻者僅自己創建的可編輯） */
    canEdit?: boolean
    isEditing: boolean
    editValue: any
    displayText: string
    cellClass: string
    wrap: boolean
    isSelected: boolean
    columnOptions?: { value: string; label: string }[]
    reviewNotes?: string
    showAiDefinition?: boolean
    showAiTheme?: boolean
    aiLoadingDefinition?: boolean
    /** 行內釋義建議正在加載（輸入粵拼時後台拉取） */
    aiLoadingInlineDefinition?: boolean
    aiLoadingTheme?: boolean
    showExpand?: boolean
    isExpanded?: boolean
    expandHint?: string
    /** 主題 ID，用於顯示 tooltip 路徑 */
    themeId?: number
    /** 主題展開狀態 */
    isThemeExpanded?: boolean
    /** 主題 AI 建議提示文字 */
    themeExpandHint?: string
  }>(),
  {
    canEdit: true,
    columnOptions: () => [],
    reviewNotes: '',
    showAiDefinition: false,
    showAiTheme: false,
    aiLoadingDefinition: false,
    aiLoadingInlineDefinition: false,
    aiLoadingTheme: false,
    showExpand: false,
    isExpanded: false,
    expandHint: '',
    themeId: undefined,
    isThemeExpanded: false,
    themeExpandHint: ''
  }
)

watch(
  () => props.isEditing && props.col.type === 'theme',
  (editing) => {
    if (editing) {
      nextTick(() => themeEditWrapperRef.value?.focus())
    }
  }
)

const cellStyle = computed(() => {
  const w = props.col.width
  return w ? { minWidth: w, maxWidth: w } : {}
})

// 主題完整路徑（用於 tooltip）
const themePath = computed(() => {
  if (props.col.type !== 'theme' || !props.themeId) return ''
  return getThemePathById(props.themeId)
})

function onTextareaInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  if (target) {
    emit('update:editValue', target.value)
    target.style.height = 'auto'
    const h = Math.min(target.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)
    target.style.height = `${h}px`
  }
}

const emit = defineEmits<{
  click: [event: MouseEvent]
  'update:editValue': [value: any]
  keydown: [event: KeyboardEvent]
  blur: []
  setRef: [el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null]
  'ai-definition': []
  'ai-theme': []
  'expand-click': []
  'theme-expand-click': []
  'accept-theme-ai': []
  'dismiss-theme-ai': []
}>()
</script>
