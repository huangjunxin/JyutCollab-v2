<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
    <!-- Header -->
    <div class="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-800 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
      <div class="flex items-center gap-3">
        <UButton icon="i-heroicons-arrow-left" variant="ghost" color="neutral" size="sm" @click="$emit('back')" />
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">詞素引用</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ entry.headword?.display || '—' }}</p>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto px-4 py-3 space-y-4">
      <!-- Current refs -->
      <div>
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">目前引用</h3>
        <div v-if="morphemeRefs.length > 0" class="flex flex-wrap gap-2">
          <div
            v-for="(ref, idx) in morphemeRefs"
            :key="idx"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-800"
            :title="ref.note ? `備註：${ref.note}` : (ref.targetEntryId ? `ID: ${ref.targetEntryId}` : undefined)"
          >
            <span v-if="ref.char" class="font-medium text-gray-900 dark:text-white text-sm">{{ ref.char }}</span>
            <span v-if="ref.jyutping" class="text-xs text-gray-500 dark:text-gray-400">{{ ref.jyutping }}</span>
            <span v-if="ref.position !== undefined" class="text-xs text-gray-400 dark:text-gray-500">第{{ (ref.position ?? 0) + 1 }}字</span>
            <span v-if="!ref.targetEntryId" class="text-xs text-amber-600 dark:text-amber-400">(未連結)</span>
            <UButton
              v-if="!readOnly"
              icon="i-heroicons-x-mark"
              color="error"
              variant="ghost"
              size="xs"
              class="p-0.5 min-w-0"
              @click="$emit('remove-morpheme-ref', idx)"
            />
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">暫無詞素引用</p>
      </div>

      <!-- Unlinked morpheme candidates -->
      <div v-if="!readOnly">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">快速添加</h3>
        <div v-if="unlinkedCandidates.length > 0" class="space-y-2">
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(cand, idx) in unlinkedCandidates"
              :key="idx"
              class="inline-flex items-center gap-2 px-2.5 py-1.5 border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800"
            >
              <span class="text-xs text-gray-500 dark:text-gray-400">第{{ cand.position + 1 }}字</span>
              <span class="font-medium text-gray-900 dark:text-white text-sm">{{ cand.char }}</span>
              <span v-if="cand.jyutping" class="text-xs text-gray-500 dark:text-gray-400">{{ cand.jyutping }}</span>
              <input
                v-model="cand.note"
                type="text"
                placeholder="備註"
                class="w-16 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <UButton size="sm" color="primary" @click="$emit('confirm-unlinked-morpheme')">確認添加</UButton>
        </div>
        <UButton
          v-else
          size="sm"
          variant="soft"
          color="neutral"
          icon="i-heroicons-pencil-square"
          @click="$emit('open-unlinked-form')"
        >
          從詞頭自動帶入
        </UButton>
      </div>

      <!-- Search database -->
      <div v-if="!readOnly">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">從數據庫選擇</h3>
        <div class="flex gap-2 mb-2">
          <UInput
            v-model="searchInput"
            placeholder="輸入詞素詞頭..."
            size="sm"
            class="flex-1"
            :ui="{ base: 'bg-white dark:bg-slate-800' }"
            @keyup.enter="doSearch"
          />
          <UButton size="sm" color="primary" :loading="searchLoading" @click="doSearch">搜索</UButton>
        </div>

        <div v-if="searchResults.length > 0" class="space-y-1">
          <div
            v-for="item in searchResults"
            :key="item.id"
            class="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
            @click="$emit('add-morpheme-ref', item)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">{{ item.headword || '—' }}</span>
                <span v-if="item.jyutping" class="text-xs text-gray-500 dark:text-gray-400">{{ item.jyutping }}</span>
                <UBadge size="xs" variant="soft" color="neutral">{{ item.dialect }}</UBadge>
              </div>
              <p v-if="item.definition" class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ item.definition }}</p>
            </div>
            <UButton color="primary" variant="soft" size="xs" icon="i-heroicons-plus">添加</UButton>
          </div>
        </div>
        <p v-else-if="searchPerformed && !searchLoading" class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          暫無匹配的詞素
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'

interface MorphemeSearchResult {
  id: string; headword: string; jyutping: string; definition: string; dialect: string; entryType: string
}
interface UnlinkedMorphemeCandidate {
  position: number; char: string; jyutping: string; note: string
}

const props = defineProps<{
  entry: Entry
  readOnly?: boolean
  morphemeRefs: Entry['morphemeRefs']
  unlinkedCandidates: UnlinkedMorphemeCandidate[]
  searchResults: MorphemeSearchResult[]
  searchLoading: boolean
}>()

const emit = defineEmits<{
  'back': []
  'remove-morpheme-ref': [idx: number]
  'open-unlinked-form': []
  'confirm-unlinked-morpheme': []
  'add-morpheme-ref': [item: MorphemeSearchResult]
  'search-morphemes': [entry: Entry, query: string]
  'mounted': [entry: Entry]
}>()

onMounted(() => {
  emit('mounted', props.entry)
})

const searchInput = ref('')
const searchPerformed = ref(false)

function doSearch() {
  if (!searchInput.value.trim()) return
  searchPerformed.value = true
  emit('search-morphemes', props.entry, searchInput.value.trim())
}
</script>
