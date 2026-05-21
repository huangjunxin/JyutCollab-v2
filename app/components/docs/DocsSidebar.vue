<template>
  <aside class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div class="px-3 pb-3">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">使用指南</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">由快速開始到進階編纂流程</p>
    </div>

    <nav class="space-y-1">
      <NuxtLink
        v-for="doc in sortedDocs"
        :key="doc.path"
        :to="doc.path"
        class="flex items-start gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
        :class="doc.path === currentPath
          ? 'bg-primary/10 text-primary dark:bg-primary/15'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'"
      >
        <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" :class="doc.path === currentPath ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'">
          {{ doc.order }}
        </span>
        <span>
          <span class="block font-medium">{{ doc.title }}</span>
          <span class="mt-0.5 line-clamp-2 block text-xs opacity-75">{{ doc.description }}</span>
        </span>
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
type DocsListItem = {
  path: string
  title: string
  description: string
  order: number
}

const props = defineProps<{
  docs: DocsListItem[]
  currentPath: string
}>()

const sortedDocs = computed(() => [...props.docs].sort((a, b) => a.order - b.order))
</script>
