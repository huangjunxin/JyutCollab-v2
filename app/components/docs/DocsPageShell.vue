<template>
  <div class="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
    <DocsSidebar class="lg:sticky lg:top-0 lg:self-start" :docs="docsList" :current-path="currentPath" />

    <div class="min-w-0 space-y-6">
      <div class="border border-[var(--jc-border)] bg-white p-6 shadow-[var(--jc-shadow-hard-lg)] dark:border-[var(--jc-dark-border)] dark:bg-slate-900 lg:p-8">
        <div class="max-w-3xl">
          <div class="mb-4 inline-flex h-12 w-12 items-center justify-center bg-[var(--jc-accent)] text-white shadow-[var(--jc-shadow-hard)]">
            <UIcon name="i-heroicons-book-open" class="h-6 w-6" />
          </div>
          <h1 class="jc-serif text-3xl font-bold text-gray-900 dark:text-white">JyutCollab 使用指南</h1>
        </div>
        <div class="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p class="text-gray-600 dark:text-gray-300">
            面向粵方言詞語編纂、跨方言比較同審核工作的完整操作說明。
          </p>
          <div class="w-full shrink-0 lg:w-[28rem]">
            <DocsSearch :docs="searchItems" />
          </div>
        </div>
      </div>

      <article class="jc-card-lg min-w-0 border border-[var(--jc-border)] bg-white p-6 dark:border-[var(--jc-dark-border)] dark:bg-slate-900 lg:p-10">
        <div v-if="page" class="docs-prose">
          <ContentRenderer :value="page" />
        </div>
        <div v-else class="py-16 text-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="mx-auto h-10 w-10 text-amber-500" />
          <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">找不到這份文檔</h2>
          <p class="mt-2 text-gray-500 dark:text-gray-400">請返回快速開始，或者使用上方搜尋尋找相關功能。</p>
          <UButton to="/docs" class="mt-6" icon="i-heroicons-arrow-left">返回快速開始</UButton>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  slug?: string
}>()

const resolvedSlug = computed(() => props.slug || 'quick-start')
const currentPath = computed(() => `/docs/${resolvedSlug.value}`)

const { data: docs } = await useAsyncData('docs-list', () => queryCollection('docs')
  .select('path', 'title', 'description', 'order', 'category', 'updatedAt')
  .order('order', 'ASC')
  .all())

const { data: page } = await useAsyncData(() => `docs-page-${resolvedSlug.value}`, () => queryCollection('docs')
  .path(currentPath.value)
  .first(), { watch: [resolvedSlug] })

const docsList = computed(() => (docs.value || []).map(doc => ({
  path: doc.path,
  title: doc.title,
  description: doc.description,
  order: doc.order,
  category: doc.category
})))

const searchItems = computed(() => (docs.value || []).map(doc => ({
  path: doc.path,
  title: doc.title,
  description: doc.description,
  category: doc.category,
  keywords: [doc.title, doc.description, doc.category].join(' ')
})))

useSeoMeta({
  title: computed(() => page.value ? `${page.value.title}｜JyutCollab 使用指南` : 'JyutCollab 使用指南'),
  description: computed(() => page.value?.description || 'JyutCollab 粵方言詞語編纂平台使用指南')
})
</script>
