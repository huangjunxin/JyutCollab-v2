<template>
  <aside
    class="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out overflow-hidden relative"
    :class="[sidebarStore.width]"
  >
    <div
      v-show="sidebarStore.isOpen"
      class="space-y-6 p-5"
    >
      <!-- Quick actions -->
      <div>
        <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UIcon name="i-heroicons-bolt" class="w-4 h-4" />
          快速操作
        </h3>
        <div class="space-y-2">
          <NuxtLink
            to="/entries"
            class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all min-w-0"
            :class="[
              $route.path === '/entries'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            ]"
          >
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 shrink-0" />
            <span class="truncate">瀏覽詞條</span>
          </NuxtLink>
        </div>
      </div>

      <!-- My entries stats（登入後顯示） -->
      <div v-if="myStats != null" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UIcon name="i-heroicons-user" class="w-4 h-4" />
          我的詞條
        </h3>

        <div class="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-xl p-4 space-y-3">
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
      </div>

      <!-- Reviewer stats（審核員/管理員顯示） -->
      <div v-if="reviewerStats != null" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UIcon name="i-heroicons-clipboard-document-check" class="w-4 h-4" />
          審核數據
        </h3>

        <div class="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 space-y-3">
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
      </div>

      <!-- Stats（全站） -->
      <div v-if="stats" class="border-t border-gray-200 dark:border-gray-800 pt-6">
        <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UIcon name="i-heroicons-chart-bar" class="w-4 h-4" />
          全站數據
        </h3>

        <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-4 space-y-3">
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
