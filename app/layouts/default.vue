<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <LayoutAppHeader />
    <div class="flex">
      <LayoutAppSidebar
        v-model:stats="stats"
        :my-stats="myStats"
        :reviewer-stats="reviewerStats"
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

/** 當前用戶的詞條統計（需登入），null 表示未登入或未加載 */
const myStats = ref<{
  total: number
  pending: number
  approved: number
  rejected: number
} | null>(null)

/** 審核員專用統計（reviewer/admin 才有），null 時側欄不顯示審核數據 */
const reviewerStats = ref<{
  pending: number
  reviewedByMe: number
} | null>(null)

// 載入左側欄統計（總詞條、已發佈、待審核、已拒絕）
async function loadStats() {
  try {
    const data = await $fetch<{ total: number; approved: number; pending: number; rejected: number }>('/api/stats')
    stats.value = data
  } catch (_) {
    // 保持 0，不阻擋頁面
  }
}

// 載入「我的詞條」統計（登入後才有數據）
async function loadMyStats() {
  try {
    const data = await $fetch<{ total: number; pending: number; approved: number; rejected: number }>('/api/stats/mine')
    myStats.value = data
  } catch (e: any) {
    if (e?.statusCode === 401) {
      myStats.value = null
    }
  }
}

// 載入「審核數據」統計（僅審核員/管理員）
async function loadReviewerStats() {
  try {
    const data = await $fetch<{ pending: number; reviewedByMe: number }>('/api/stats/reviewer')
    reviewerStats.value = data
  } catch (e: any) {
    if (e?.statusCode === 401 || e?.statusCode === 403) {
      reviewerStats.value = null
    }
  }
}

const { loggedIn } = useUserSession()

onMounted(() => {
  loadStats()
  loadMyStats()
  loadReviewerStats()
})

// 登入後自動載入「我的詞條」與「審核數據」統計
watch(loggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    loadMyStats()
    loadReviewerStats()
  } else {
    myStats.value = null
    reviewerStats.value = null
  }
})

// Provide stats to child components
provide('stats', stats)
</script>
