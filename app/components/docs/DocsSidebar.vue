<template>
  <aside class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <div class="px-3 pb-3">
      <p class="text-sm font-semibold text-gray-900 dark:text-white">使用指南</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">由快速開始到進階編纂流程</p>
    </div>

    <nav class="space-y-4">
      <div v-for="group in groupedDocs" :key="group.label" class="space-y-1">
        <p class="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ group.label }}</p>
        <NuxtLink
          v-for="doc in group.docs"
          :key="doc.path"
          :to="doc.path"
          class="flex items-start gap-2 rounded-xl px-3 py-2 text-sm transition-colors"
          :class="doc.path === currentPath
            ? 'bg-primary/10 text-primary dark:bg-primary/15'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white'"
        >
          <span>
            <span class="block font-medium">{{ doc.title }}</span>
            <span class="mt-0.5 line-clamp-2 block text-xs opacity-75">{{ doc.description }}</span>
          </span>
        </NuxtLink>
      </div>
    </nav>
  </aside>
</template>

<script setup lang="ts">
type DocsListItem = {
  path: string
  title: string
  description: string
  order: number
  category: string
}

const props = defineProps<{
  docs: DocsListItem[]
  currentPath: string
}>()

const GROUP_MAP: Record<string, string> = {
  '入門': '入門',
  '帳戶': '入門',
  '詞條編輯': '詞條編輯',
  '詞條內容': '詞條編輯',
  '工作流程': '工作流程',
  '審核': '工作流程',
  'AI': '進階功能',
  '語言學概念': '進階功能',
  '搜尋整理': '進階功能',
  '快捷鍵': '參考',
  '歷史': '參考',
  '支援': '參考',
}

const GROUP_ORDER: Record<string, number> = {
  '入門': 0,
  '詞條編輯': 1,
  '工作流程': 2,
  '進階功能': 3,
  '參考': 4,
}

const groupedDocs = computed(() => {
  const sorted = [...props.docs].sort((a, b) => a.order - b.order)
  const groups: Record<string, { label: string; docs: DocsListItem[] }> = {}

  for (const doc of sorted) {
    const groupLabel = GROUP_MAP[doc.category] || doc.category
    if (!groups[groupLabel]) {
      groups[groupLabel] = { label: groupLabel, docs: [] }
    }
    groups[groupLabel].docs.push(doc)
  }

  return Object.values(groups).sort((a, b) => (GROUP_ORDER[a.label] ?? 99) - (GROUP_ORDER[b.label] ?? 99))
})
</script>
