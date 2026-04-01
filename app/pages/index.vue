<template>
  <div class="space-y-6">
    <!-- Welcome Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ welcomeTitle }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          這是您的 JyutCollab 儀表板
        </p>
      </div>
      <UButton
        to="/entries"
        color="primary"
        size="lg"
        icon="i-heroicons-plus"
      >
        新建詞條
      </UButton>
    </div>

    <!-- Quick Actions Grid -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <NuxtLink
        to="/entries"
        class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <UIcon name="i-heroicons-document-text" class="w-6 h-6 text-primary" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">瀏覽詞條</span>
      </NuxtLink>

      <NuxtLink
        to="/entries?filter=mine"
        class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <UIcon name="i-heroicons-user" class="w-6 h-6 text-primary" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">我的詞條</span>
      </NuxtLink>

      <NuxtLink
        v-if="canReview"
        to="/review"
        class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <UIcon name="i-heroicons-clipboard-document-check" class="w-6 h-6 text-amber-500" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">審核隊列</span>
      </NuxtLink>

      <NuxtLink
        to="/histories"
        class="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <UIcon name="i-heroicons-clock" class="w-6 h-6 text-gray-500" />
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">編輯歷史</span>
      </NuxtLink>
    </div>

    <!-- Stats Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- My Stats Card -->
      <UCard
        v-if="isAuthenticated && userStats"
        class="shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary" />
            <span class="font-semibold text-gray-900 dark:text-white">我的詞條</span>
          </div>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ userStats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ userStats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ userStats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ userStats.rejected }}</span>
          </div>
        </div>
      </UCard>

      <!-- Reviewer Stats Card -->
      <UCard
        v-if="canReview && reviewerStats"
        class="shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clipboard-document-check" class="w-5 h-5 text-amber-500" />
            <span class="font-semibold text-gray-900 dark:text-white">審核數據</span>
          </div>
        </template>
        <div class="space-y-3">
          <NuxtLink
            to="/review"
            class="flex items-center justify-between hover:opacity-80 transition-opacity"
          >
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ reviewerStats.pending }}</span>
          </NuxtLink>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              我已審核
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ reviewerStats.reviewedByMe }}</span>
          </div>
        </div>
      </UCard>

      <!-- Site Stats Card -->
      <UCard class="shadow-sm border border-gray-200 dark:border-gray-700">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-gray-500" />
            <span class="font-semibold text-gray-900 dark:text-white">全站數據</span>
          </div>
        </template>
        <div v-if="statsLoading" class="space-y-3">
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
          <USkeleton class="h-6 w-full" />
        </div>
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ siteStats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ siteStats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ siteStats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ siteStats.rejected }}</span>
          </div>
        </div>
      </UCard>
    </div>

    <!-- My Recent Activities -->
    <UCard
      v-if="isAuthenticated"
      class="shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-5 h-5 text-primary" />
          <span class="font-semibold text-gray-900 dark:text-white">我的最近活動</span>
        </div>
      </template>

      <div v-if="myActivitiesLoading" class="space-y-3">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <div v-else-if="myActivities.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
        暫無活動記錄
      </div>

      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="activity in myActivities"
          :key="activity.id"
          class="py-3 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UIcon
              :name="getActionIcon(activity.action)"
              :class="['w-5 h-5 shrink-0', getActionIconColor(activity.action)]"
            />
            <div class="min-w-0">
              <p class="text-sm text-gray-900 dark:text-white truncate">
                {{ getActionLabel(activity.action) }}
                <span class="font-medium">{{ getHeadword(activity) }}</span>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatTime(activity.createdAt) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              :to="`/entries?search=${encodeURIComponent(getHeadword(activity))}`"
              size="xs"
              color="primary"
              variant="ghost"
            >
              詞條
            </UButton>
            <UButton
              :to="`/histories?entryId=${activity.entryId}`"
              size="xs"
              color="neutral"
              variant="ghost"
            >
              歷史
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- All Recent Activities (reviewer/admin only) -->
    <UCard
      v-if="isAuthenticated && canReview"
      class="shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-globe-alt" class="w-5 h-5 text-gray-500" />
          <span class="font-semibold text-gray-900 dark:text-white">全站最近活動</span>
        </div>
      </template>

      <div v-if="allActivitiesLoading" class="space-y-3">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>

      <div v-else-if="allActivities.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
        暫無活動記錄
      </div>

      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="activity in allActivities"
          :key="activity.id"
          class="py-3 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-3 min-w-0">
            <UIcon
              :name="getActionIcon(activity.action)"
              :class="['w-5 h-5 shrink-0', getActionIconColor(activity.action)]"
            />
            <div class="min-w-0">
              <p class="text-sm text-gray-900 dark:text-white truncate">
                {{ getActionLabel(activity.action) }}
                <span class="font-medium">{{ getHeadword(activity) }}</span>
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatTime(activity.createdAt) }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UButton
              :to="`/entries?search=${encodeURIComponent(getHeadword(activity))}`"
              size="xs"
              color="primary"
              variant="ghost"
            >
              詞條
            </UButton>
            <UButton
              :to="`/histories?entryId=${activity.entryId}`"
              size="xs"
              color="neutral"
              variant="ghost"
            >
              歷史
            </UButton>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { EditHistory, EditHistoryAction } from '~/types'

const { user, isAuthenticated, canReview } = useAuth()
const { siteStats, userStats, reviewerStats, loading: statsLoading, fetchStats } = useStats()

// 我的最近活動 - 所有登錄用戶可見
const {
  activities: myActivities,
  loading: myActivitiesLoading,
  fetchActivities: fetchMyActivities
} = useRecentActivities(5, 'mine')

// 全站最近活動 - 僅 reviewer/admin 可見
const {
  activities: allActivities,
  loading: allActivitiesLoading,
  fetchActivities: fetchAllActivities
} = useRecentActivities(5, 'all')

const welcomeTitle = computed(() => {
  const displayName = user.value?.displayName || user.value?.username
  return displayName ? `歡迎回來，${displayName}` : '歡迎回來'
})

function getActionIcon(action: EditHistoryAction): string {
  const icons: Record<EditHistoryAction, string> = {
    create: 'i-heroicons-plus-circle',
    update: 'i-heroicons-pencil-square',
    delete: 'i-heroicons-trash',
    status_change: 'i-heroicons-arrow-path'
  }
  return icons[action] || 'i-heroicons-document'
}

function getActionIconColor(action: EditHistoryAction): string {
  const colors: Record<EditHistoryAction, string> = {
    create: 'text-green-500',
    update: 'text-blue-500',
    delete: 'text-red-500',
    status_change: 'text-amber-500'
  }
  return colors[action] || 'text-gray-500'
}

function getActionLabel(action: EditHistoryAction): string {
  const labels: Record<EditHistoryAction, string> = {
    create: '新建詞條',
    update: '更新詞條',
    delete: '刪除詞條',
    status_change: '狀態變更'
  }
  return labels[action] || '操作'
}

function getHeadword(activity: EditHistory): string {
  const snapshot = activity.afterSnapshot || activity.beforeSnapshot
  if (snapshot && typeof snapshot === 'object') {
    const headword = snapshot.headword as { display?: string } | undefined
    if (headword?.display) return headword.display
    const text = snapshot.text as string | undefined
    if (text) return text
  }
  return '未知詞條'
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-HK', {
    month: 'short',
    day: 'numeric'
  })
}

onMounted(() => {
  fetchStats()
  if (isAuthenticated.value) {
    fetchMyActivities()
    if (canReview.value) {
      fetchAllActivities()
    }
  }
})
</script>
