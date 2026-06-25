<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">主題分類</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ entry.headword?.display || '—' }}</p>
        </div>
      </div>
    </div>

    <!-- AI suggestion -->
    <div
      v-if="aiSuggestion"
      class="flex-shrink-0 mx-4 mt-3 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20"
    >
      <p class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
        AI 建議
        <span v-if="aiSuggestion.confidence" class="ml-1">（{{ Math.round(aiSuggestion.confidence * 100) }}%）</span>
      </p>
      <p class="text-sm text-gray-900 dark:text-white">
        {{ aiSuggestion.level3Name }}（{{ aiSuggestion.level1Name }} > {{ aiSuggestion.level2Name }}）
      </p>
      <p v-if="aiSuggestion.explanation" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {{ aiSuggestion.explanation }}
      </p>
      <div class="flex gap-2 mt-2">
        <UButton size="xs" color="primary" @click="acceptAISuggestion">採納</UButton>
        <UButton size="xs" color="neutral" variant="ghost" @click="$emit('dismiss-ai')">忽略</UButton>
      </div>
    </div>

    <!-- Search -->
    <div class="flex-shrink-0 px-4 py-2 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="搜尋主題分類..."
        size="sm"
        class="w-full"
        :ui="{ root: 'w-full', base: 'w-full bg-white dark:bg-slate-800' }"
      >
        <template #trailing>
          <UButton
            v-if="searchQuery"
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            size="xs"
            class="p-0.5"
            @click="searchQuery = ''"
          />
        </template>
      </UInput>
    </div>

    <div class="flex-1 overflow-auto">
      <!-- Search results -->
      <div v-if="searchQuery.trim()" class="px-4 py-3 space-y-1">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">搜尋結果</p>
        <button
          v-for="result in searchResults"
          :key="result.id"
          class="w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
          :class="{ 'ring-2 ring-primary/40': result.id === currentThemeId }"
          @click="selectTheme(result)"
        >
          <div class="min-w-0">
            <span class="text-sm text-gray-900 dark:text-white block truncate">{{ result.level3Name }}</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">{{ result.level1Name }} > {{ result.level2Name }}</span>
          </div>
          <UBadge v-if="result.score" size="xs" variant="soft" color="neutral">{{ Math.round(result.score * 100) }}%</UBadge>
        </button>
        <p v-if="searchResults.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          沒有匹配的主題分類
        </p>
      </div>

      <!-- 3-level browser -->
      <div v-else class="px-4 py-3">
        <!-- Current selection -->
        <div v-if="currentThemeId" class="mb-3 p-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <p class="text-xs text-primary-700 dark:text-primary-300">目前分類</p>
          <p class="text-sm font-medium text-gray-900 dark:text-white">
            {{ currentThemeName }}
          </p>
          <UButton size="xs" variant="ghost" color="error" class="mt-1" @click="clearTheme">清除分類</UButton>
        </div>

        <!-- Level 1 -->
        <div class="space-y-1">
          <button
            v-for="l1 in level1Themes"
            :key="l1.id"
            class="w-full flex items-center justify-between px-3 py-2.5 text-left bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :class="{ 'border-primary': selectedL1 === l1.id }"
            @click="selectL1(l1.id)"
          >
            <span class="text-sm text-gray-900 dark:text-white">{{ l1.name }}</span>
            <UIcon
              :name="selectedL1 === l1.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-4 h-4 text-gray-400"
            />
          </button>
        </div>

        <!-- Level 2 -->
        <div v-if="selectedL1 && level2Themes.length > 0" class="mt-3 space-y-1 pl-3 border-l-2 border-primary/30">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ selectedL1Name }}</p>
          <button
            v-for="l2 in level2Themes"
            :key="l2.id"
            class="w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :class="{ 'border-primary': selectedL2 === l2.id }"
            @click="selectL2(l2.id)"
          >
            <span class="text-sm text-gray-900 dark:text-white">{{ l2.name }}</span>
            <UIcon
              :name="selectedL2 === l2.id ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-4 h-4 text-gray-400"
            />
          </button>
        </div>

        <!-- Level 3 -->
        <div v-if="selectedL2 && level3Themes.length > 0" class="mt-3 space-y-1 pl-6 border-l-2 border-primary/20">
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">{{ selectedL2Name }}</p>
          <button
            v-for="l3 in level3Themes"
            :key="l3.id"
            class="w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
            :class="{ 'ring-2 ring-primary/40 bg-primary-50 dark:bg-primary-900/20': l3.id === currentThemeId }"
            @click="selectTheme(l3)"
          >
            <span class="text-sm text-gray-900 dark:text-white">{{ l3.level3Name }}</span>
            <UIcon v-if="l3.id === currentThemeId" name="i-heroicons-check" class="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom: AI button -->
    <div v-if="canGenerateAI" class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-lucide-sparkles"
        block
        :loading="aiLoading"
        @click="$emit('ai-categorize')"
      >
        AI 自動分類
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import {
  getLevel1Themes,
  getLevel2ThemesByLevel1,
  getThemesByLevel1,
  searchThemes,
  getThemeById,
  getThemePathById,
  type ThemeWithPath,
  type ScoredTheme
} from '~/composables/useThemeData'

interface ThemeAISuggestion {
  level1Name: string; level2Name: string; level3Name: string
  level1Id: number; level2Id: number; level3Id: number
  confidence?: number; explanation?: string
}

const props = defineProps<{
  entry: Entry
  aiSuggestion?: ThemeAISuggestion | null
  aiLoading?: boolean
}>()

const emit = defineEmits<{
  'back': []
  'update:theme': [theme: { level1: string; level2: string; level3: string; level1Id: number; level2Id: number; level3Id: number }]
  'dismiss-ai': []
  'accept-ai': [suggestion: ThemeAISuggestion]
  'ai-categorize': []
}>()

const searchQuery = ref('')

// Current theme
const currentThemeId = computed(() => props.entry.theme?.level3Id)
const currentThemeName = computed(() => {
  if (!currentThemeId.value) return ''
  return getThemePathById(currentThemeId.value) || ''
})

const canGenerateAI = computed(() => !!props.entry.headword?.display?.trim())

// Search
const searchResults = computed((): ScoredTheme[] => {
  if (!searchQuery.value.trim()) return []
  return searchThemes(searchQuery.value).slice(0, 20)
})

// 3-level browser
const level1Themes = getLevel1Themes()
const selectedL1 = ref<number | null>(props.entry.theme?.level1Id || null)
const selectedL2 = ref<number | null>(props.entry.theme?.level2Id || null)

const selectedL1Name = computed(() => level1Themes.find(t => t.id === selectedL1.value)?.name || '')
const level2Themes = computed(() => selectedL1.value ? getLevel2ThemesByLevel1(selectedL1.value) : [])
const selectedL2Name = computed(() => level2Themes.value.find(t => t.id === selectedL2.value)?.name || '')
const level3Themes = computed((): ThemeWithPath[] => {
  if (!selectedL1.value) return []
  return getThemesByLevel1(selectedL1.value).filter(t => !selectedL2.value || t.level2Id === selectedL2.value)
})

function selectL1(id: number) {
  selectedL1.value = selectedL1.value === id ? null : id
  selectedL2.value = null
}

function selectL2(id: number) {
  selectedL2.value = selectedL2.value === id ? null : id
}

function selectTheme(theme: ThemeWithPath | ScoredTheme) {
  emit('update:theme', {
    level1: theme.level1Name,
    level2: theme.level2Name,
    level3: theme.level3Name,
    level1Id: theme.level1Id,
    level2Id: theme.level2Id,
    level3Id: theme.id
  })
}

function clearTheme() {
  // Reset theme to empty
  props.entry.theme = {}
  props.entry._isDirty = true
}

function acceptAISuggestion() {
  if (props.aiSuggestion) {
    emit('accept-ai', props.aiSuggestion)
  }
}
</script>
