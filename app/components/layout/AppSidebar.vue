<template>
  <aside
    class="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out relative"
    :class="[sidebarStore.width, sidebarStore.collapsed ? 'p-2' : 'p-5']"
  >
    <!-- Collapse/Expand Toggle Button -->
    <button
      @click="sidebarStore.toggle"
      class="absolute -right-3 top-6 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-10"
    >
      <UIcon
        :name="sidebarStore.collapsed ? 'i-heroicons-chevron-right' : 'i-heroicons-chevron-left'"
        class="w-4 h-4 text-gray-500 dark:text-gray-400"
      />
    </button>

    <div class="space-y-6">
      <!-- Quick actions -->
      <div>
        <h3
          v-if="!sidebarStore.collapsed"
          class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
          快速操作
        </h3>
        <div v-else class="flex justify-center mb-3">
          <UIcon name="i-heroicons-bolt" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>
        <div class="space-y-2">
          <NuxtLink
            to="/entries"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all min-w-0"
            :class="[
              $route.path === '/entries'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800',
              sidebarStore.collapsed ? 'justify-center px-2 min-w-10 w-10 h-10' : ''
            ]"
            :title="sidebarStore.collapsed ? '瀏覽詞條' : ''"
          >
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 shrink-0" />
            <span v-if="!sidebarStore.collapsed" class="truncate">瀏覽詞條</span>
          </NuxtLink>
        </div>
      </div>

      <!-- My entries stats（登入後顯示） -->
      <div v-if="myStats != null" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3
          v-if="!sidebarStore.collapsed"
          class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-user" class="w-4 h-4" />
          我的詞條
        </h3>
        <div v-else class="flex justify-center mb-3">
          <UIcon name="i-heroicons-user" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>

        <!-- Expanded my stats view -->
        <div
          v-if="!sidebarStore.collapsed"
          class="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ myStats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ myStats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ myStats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ myStats.rejected }}</span>
          </div>
        </div>

        <!-- Collapsed my stats view -->
        <div v-else class="flex flex-col items-center space-y-3">
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 shrink-0 text-primary-600 dark:text-primary-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              我的總數: {{ myStats.total }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              待審核: {{ myStats.pending }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              已發佈: {{ myStats.approved }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30">
              <UIcon name="i-heroicons-x-circle" class="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              已拒絕: {{ myStats.rejected }}
            </div>
          </div>
        </div>
      </div>

      <!-- Reviewer stats（審核員/管理員顯示） -->
      <div v-if="reviewerStats != null" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3
          v-if="!sidebarStore.collapsed"
          class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-clipboard-document-check" class="w-4 h-4" />
          審核數據
        </h3>
        <div v-else class="flex justify-center mb-3">
          <UIcon name="i-heroicons-clipboard-document-check" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>

        <div
          v-if="!sidebarStore.collapsed"
          class="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 space-y-3"
        >
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

        <div v-else class="flex flex-col items-center space-y-3">
          <NuxtLink to="/review" class="relative group block">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              待審核: {{ reviewerStats.pending }}
            </div>
          </NuxtLink>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              我已審核: {{ reviewerStats.reviewedByMe }}
            </div>
          </div>
        </div>
      </div>

      <!-- Stats（全站） -->
      <div v-if="stats" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3
          v-if="!sidebarStore.collapsed"
          class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2"
        >
          <UIcon name="i-heroicons-chart-bar" class="w-4 h-4" />
          全站數據
        </h3>
        <div v-else class="flex justify-center mb-3">
          <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </div>

        <!-- Expanded stats view -->
        <div
          v-if="!sidebarStore.collapsed"
          class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-4 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-document-text" class="w-4 h-4" />
              總詞條
            </span>
            <span class="text-lg font-bold text-gray-900 dark:text-white">{{ stats.total }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-clock" class="w-4 h-4" />
              待審核
            </span>
            <span class="text-lg font-bold text-amber-600 dark:text-amber-400">{{ stats.pending }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              已發佈
            </span>
            <span class="text-lg font-bold text-green-600 dark:text-green-400">{{ stats.approved }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <UIcon name="i-heroicons-x-circle" class="w-4 h-4" />
              已拒絕
            </span>
            <span class="text-lg font-bold text-red-600 dark:text-red-400">{{ stats.rejected }}</span>
          </div>
        </div>

        <!-- Collapsed stats view (icons only with tooltips，與「瀏覽詞條」統一使用 document-text 圖標) -->
        <div v-else class="flex flex-col items-center space-y-3">
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 shrink-0 text-gray-600 dark:text-gray-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              總詞條: {{ stats.total }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 shrink-0 text-green-600 dark:text-green-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              已發佈: {{ stats.approved }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <UIcon name="i-heroicons-clock" class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              待審核: {{ stats.pending }}
            </div>
          </div>
          <div class="relative group">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30">
              <UIcon name="i-heroicons-x-circle" class="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            </div>
            <div class="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
              已拒絕: {{ stats.rejected }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useSidebarStore } from '~/stores/sidebar'

const $route = useRoute()
const sidebarStore = useSidebarStore()

const stats = defineModel<{
  total: number
  approved: number
  pending: number
  rejected: number
}>('stats', { default: () => ({ total: 0, approved: 0, pending: 0, rejected: 0 }) })

/** 當前用戶的詞條統計（登入後由 layout 傳入），null 時不顯示「我的詞條」區塊 */
const props = defineProps<{
  myStats?: {
    total: number
    pending: number
    approved: number
    rejected: number
  } | null
  /** 審核員專用統計（reviewer/admin 由 layout 傳入），null 時不顯示「審核數據」區塊 */
  reviewerStats?: {
    pending: number
    reviewedByMe: number
  } | null
}>()
const myStats = toRef(() => props.myStats ?? null)
const reviewerStats = toRef(() => props.reviewerStats ?? null)

// Initialize sidebar state from localStorage
onMounted(() => {
  sidebarStore.init()
})
</script>
