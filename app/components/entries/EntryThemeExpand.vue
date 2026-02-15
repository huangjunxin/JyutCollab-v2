<template>
  <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
    <!-- 標題欄 -->
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">主題分類</h4>
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

    <!-- AI 建議區域 -->
    <div
      v-if="aiSuggestion"
      class="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
    >
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-blue-800 dark:text-blue-200">
            AI 建議: {{ aiSuggestion.level3Name }}
          </div>
          <div class="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {{ aiSuggestion.level1Name }} > {{ aiSuggestion.level2Name }}
          </div>
          <div v-if="aiSuggestion.confidence" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            置信度: {{ Math.round(aiSuggestion.confidence * 100) }}%
          </div>
          <div v-if="aiSuggestion.explanation" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {{ aiSuggestion.explanation }}
          </div>
        </div>
        <div class="flex items-center gap-1 flex-shrink-0">
          <UButton
            color="primary"
            size="xs"
            @click="acceptAISuggestion"
          >
            接受
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            @click="$emit('dismiss-ai')"
          >
            忽略
          </UButton>
        </div>
      </div>
    </div>

    <!-- 手動選擇區域 -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ aiSuggestion ? '或手動選擇：' : '選擇分類：' }}
        </div>
        <UButton
          v-if="entry.headword?.display"
          color="primary"
          variant="ghost"
          size="xs"
          icon="i-heroicons-sparkles"
          :loading="aiLoading"
          @click="$emit('ai-categorize')"
        >
          AI 分類
        </UButton>
      </div>

      <!-- 三級選擇器 -->
      <div class="grid grid-cols-3 gap-3">
        <!-- 一級分類 -->
        <div>
          <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">一級分類</label>
          <USelectMenu
            v-model="selectedLevel1"
            :items="level1Options"
            value-key="value"
            placeholder="選擇大類"
            size="sm"
            class="w-full"
            @update:model-value="onLevel1Select"
          />
        </div>
        <!-- 二級分類 -->
        <div>
          <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">二級分類</label>
          <USelectMenu
            v-model="selectedLevel2"
            :items="level2Options"
            value-key="value"
            placeholder="選擇"
            size="sm"
            class="w-full"
            :disabled="!selectedLevel1"
            @update:model-value="onLevel2Select"
          />
        </div>
        <!-- 三級分類 -->
        <div>
          <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">三級分類</label>
          <USelectMenu
            v-model="selectedLevel3"
            :items="level3Options"
            value-key="value"
            placeholder="選擇"
            size="sm"
            class="w-full"
            :disabled="!selectedLevel2"
            searchable
            searchable-placeholder="搜索..."
            @update:model-value="onLevel3Select"
          />
        </div>
      </div>

      <!-- 當前選擇預覽 -->
      <div v-if="selectedThemePreview" class="text-xs text-gray-500 dark:text-gray-400">
        已選擇: {{ selectedThemePreview }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  getLevel1Themes,
  getLevel2ThemesByLevel1,
  getLevel3ThemesByLevel2,
  getThemeById
} from '~/composables/useThemeData'

interface AISuggestion {
  level1Name: string
  level2Name: string
  level3Name: string
  level1Id: number
  level2Id: number
  level3Id: number
  confidence?: number
  explanation?: string
}

const props = defineProps<{
  entry: any
  aiSuggestion?: AISuggestion | null
  aiLoading?: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:theme': [theme: {
    level1: string
    level2: string
    level3: string
    level1Id: number
    level2Id: number
    level3Id: number
  }]
  'dismiss-ai': []
  'accept-ai': [theme: AISuggestion]
  'ai-categorize': []
}>()

// 一級分類選項（格式：一 人物）
const level1Options = computed(() => {
  return getLevel1Themes().map(t => ({
    value: t.id,
    label: `${t.chineseNum} ${t.name}`
  }))
})

// 當前選中的值
const selectedLevel1 = ref<number | undefined>(props.entry.theme?.level1Id || undefined)
const selectedLevel2 = ref<number | undefined>(props.entry.theme?.level2Id || undefined)
const selectedLevel3 = ref<number | undefined>(props.entry.theme?.level3Id || undefined)

// 根據當前 level3Id 初始化
watchEffect(() => {
  if (props.entry.theme?.level3Id) {
    const theme = getThemeById(props.entry.theme.level3Id)
    if (theme) {
      selectedLevel1.value = theme.level1Id
      selectedLevel2.value = theme.level2Id
      selectedLevel3.value = theme.level3Id
    }
  }
})

// 二級分類選項（格式：A 人稱、指代）
const level2Options = computed(() => {
  if (!selectedLevel1.value) return []

  const themes = getLevel2ThemesByLevel1(selectedLevel1.value)
  return themes.map(t => ({
    value: t.id,
    label: `${t.letter} ${t.name}`
  }))
})

// 三級分類選項（基於選中的二級分類）
const level3Options = computed(() => {
  if (!selectedLevel2.value) return []

  const themes = getLevel3ThemesByLevel2(selectedLevel2.value)
  return themes.map(t => ({
    value: t.id,
    label: `${t.code} ${t.name}`
  }))
})

// 當一級分類變化時，重置二級和三級
function onLevel1Select(level1Id: number | undefined) {
  selectedLevel2.value = undefined
  selectedLevel3.value = undefined
}

// 當二級分類變化時，重置三級
function onLevel2Select(level2Id: number | undefined) {
  selectedLevel3.value = undefined
}

// 當前選擇預覽
const selectedThemePreview = computed(() => {
  if (!selectedLevel3.value) return ''
  const theme = getThemeById(selectedLevel3.value)
  if (!theme) return ''
  return `${theme.level1Name} > ${theme.level2Name} > ${theme.level3Name}`
})

// 選擇三級分類
function onLevel3Select(themeId: number | undefined) {
  if (!themeId) return

  const theme = getThemeById(themeId)
  if (theme) {
    emit('update:theme', {
      level1: theme.level1Name,
      level2: theme.level2Name,
      level3: theme.level3Name,
      level1Id: theme.level1Id,
      level2Id: theme.level2Id,
      level3Id: theme.level3Id
    })
    // 標記為已修改
    props.entry._isDirty = true
  }
}

// 接受 AI 建議
function acceptAISuggestion() {
  if (props.aiSuggestion) {
    emit('accept-ai', props.aiSuggestion)
  }
}
</script>
