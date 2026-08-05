<template>
  <!-- 搜索框 + 下拉建議（§6.5 簡化版）：直接調 GET /api/faanjyut/search，
       命中項點擊跳 /faanjyut/lexemes/<lexemeId>；Enter 跳第一個命中。 -->
  <div ref="rootRef" class="relative flex-1 min-w-[220px]">
    <UIcon
      name="i-heroicons-magnifying-glass"
      class="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
    />
    <input
      v-model="query"
      type="text"
      placeholder="搜尋詞條鍵／綜合音／代表字／釋義…"
      class="w-full h-9 pl-8 pr-8 text-sm border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800 text-[var(--jc-ink)] dark:text-gray-200 focus:outline-none focus:border-[var(--jc-accent)]"
      @focus="onFocus"
      @keydown.enter.prevent="goFirstHit"
      @keydown.esc="closeDropdown"
    >
    <UIcon
      v-if="searching"
      name="i-heroicons-arrow-path"
      class="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin"
    />

    <div
      v-if="dropdownOpen"
      class="absolute z-30 mt-1 w-full max-h-[380px] overflow-y-auto bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard-lg)]"
    >
      <p v-if="!searching && totalHits === 0" class="px-3 py-3 text-xs text-gray-400">
        沒有命中「{{ lastSearchedQuery }}」的結果
      </p>
      <div v-for="group in groups" :key="group.dimension">
        <p class="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400">{{ group.dimensionLabel }}</p>
        <button
          v-for="hit in group.hits"
          :key="`${group.dimension}-${hit.lexemeId}`"
          type="button"
          class="w-full text-left px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-baseline gap-2"
          @mousedown.prevent="goHit(hit)"
        >
          <span class="truncate text-[var(--jc-body)] dark:text-gray-200">{{ hit.snippet }}</span>
          <span v-if="hit.extra?.sourceKey" class="jc-mono text-[10px] text-gray-400 shrink-0">{{ hit.extra.sourceKey }}</span>
          <span v-else-if="hit.extra?.languageLabel" class="text-[10px] text-gray-400 shrink-0">{{ hit.extra.languageLabel }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaanjyutSearchGroup, FaanjyutSearchHit } from '~/composables/useFaanjyutMatrix'

const { search } = useFaanjyutMatrix()

const rootRef = ref<HTMLElement | null>(null)
const query = ref('')
const lastSearchedQuery = ref('')
const groups = ref<FaanjyutSearchGroup[]>([])
const totalHits = ref(0)
const searching = ref(false)
const dropdownOpen = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = value.trim()
  if (!q) {
    groups.value = []
    totalHits.value = 0
    dropdownOpen.value = false
    return
  }
  debounceTimer = setTimeout(() => runSearch(q), 300)
})

async function runSearch(q: string) {
  searching.value = true
  try {
    const res = await search(q, 5)
    // 只接受最新一次查詢的結果
    if (query.value.trim() !== q) return
    groups.value = res.groups.filter((g) => g.hits.length > 0)
    totalHits.value = res.totalHits
    lastSearchedQuery.value = q
    dropdownOpen.value = true
  } catch {
    // 搜索失敗不打斷頁面，僅收起下拉
    dropdownOpen.value = false
  } finally {
    searching.value = false
  }
}

function onFocus() {
  if (groups.value.length > 0 || totalHits.value > 0) dropdownOpen.value = true
}

function closeDropdown() {
  dropdownOpen.value = false
}

function goHit(hit: FaanjyutSearchHit) {
  closeDropdown()
  navigateTo(`/faanjyut/lexemes/${hit.lexemeId}`)
}

function goFirstHit() {
  const first = groups.value.flatMap((g) => g.hits)[0]
  if (first) goHit(first)
}

function onClickOutside(event: MouseEvent) {
  if (dropdownOpen.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>
