<template>
  <div ref="searchRoot" class="relative">
    <UInput
      v-model="query"
      icon="i-heroicons-magnifying-glass"
      size="lg"
      class="w-full"
      placeholder="搜尋使用方法、快捷鍵、欄位、審核流程……"
      autocomplete="off"
      @focus="isOpen = true"
      @keydown.esc="isOpen = false"
    />

    <div
      v-if="isOpen && query.trim()"
      class="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900"
    >
      <NuxtLink
        v-for="result in results"
        :key="result.path"
        :to="result.path"
        class="block rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="isOpen = false"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-document-magnifying-glass" class="h-4 w-4 text-primary" />
          <span class="font-medium text-gray-900 dark:text-white">{{ result.title }}</span>
          <UBadge color="neutral" variant="soft" size="xs">{{ result.category }}</UBadge>
        </div>
        <p class="mt-1 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{{ result.description }}</p>
        <p v-if="result.keywords" class="mt-1 line-clamp-1 text-xs text-gray-400 dark:text-gray-500">{{ result.keywords }}</p>
      </NuxtLink>

      <div v-if="results.length === 0" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
        找不到相關文檔。可以試試搜尋「Tab」、「粵拼」、「審核」、「AI」或「快捷鍵」。
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as OpenCC from 'opencc-js'

type DocsSearchItem = {
  path: string
  title: string
  description: string
  category: string
  keywords?: string
}

const props = defineProps<{
  docs: DocsSearchItem[]
}>()

const query = ref('')
const isOpen = ref(false)
const searchRoot = ref<HTMLElement | null>(null)
const simplifiedToHongKong = OpenCC.Converter({ from: 'cn', to: 'hk' })
const traditionalToHongKong = OpenCC.Converter({ from: 't', to: 'hk' })

function normalizeForSearch(value: string): string {
  return traditionalToHongKong(simplifiedToHongKong(value)).toLowerCase()
}

function getSearchTerms(value: string): string[] {
  const rawTerms = value.trim().split(/\s+/).filter(Boolean)
  return [...new Set(rawTerms.flatMap(term => [term.toLowerCase(), normalizeForSearch(term)]))]
}

const results = computed(() => {
  const terms = getSearchTerms(query.value)
  if (terms.length === 0) return []

  return props.docs
    .map((doc) => {
      const rawHaystack = [doc.title, doc.description, doc.category, doc.keywords].filter(Boolean).join(' ')
      const haystack = `${rawHaystack.toLowerCase()} ${normalizeForSearch(rawHaystack)}`
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0)
      return { ...doc, score }
    })
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'zh-Hant-HK'))
    .slice(0, 8)
})

function handleClickOutside(event: MouseEvent) {
  if (!searchRoot.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', handleClickOutside))
</script>
