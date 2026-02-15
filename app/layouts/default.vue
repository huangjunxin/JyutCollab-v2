<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <LayoutAppHeader />
    <div class="flex">
      <LayoutAppSidebar
        v-model:stats="stats"
      />
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const stats = ref({
  total: 0,
  approved: 0,
  pending: 0,
  rejected: 0
})

// 載入左側欄統計（總詞條、已發佈、待審核、已拒絕）
async function loadStats() {
  try {
    const data = await $fetch<{ total: number; approved: number; pending: number; rejected: number }>('/api/stats')
    stats.value = data
  } catch (_) {
    // 保持 0，不阻擋頁面
  }
}

onMounted(loadStats)
// Provide stats to child components
provide('stats', stats)
</script>
