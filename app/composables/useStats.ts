import type { SiteStats, UserStats, ReviewerStats } from '~/types'
import { useCachedAsyncData, CACHE_TTL } from './useDataCache'

export const useStats = () => {
  const { isAuthenticated, canReview } = useAuth()

  const siteStatsAsync = useCachedAsyncData<SiteStats>(
    'stats:site',
    () => $fetch<SiteStats>('/api/stats'),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: () => ({ total: 0, approved: 0, pending: 0, rejected: 0 })
    }
  )

  const userStatsAsync = useCachedAsyncData<UserStats | null>(
    'stats:user',
    () => $fetch<UserStats>('/api/stats/mine').catch(() => null),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: () => null
    }
  )

  const reviewerStatsAsync = useCachedAsyncData<ReviewerStats | null>(
    'stats:reviewer',
    () => $fetch<ReviewerStats>('/api/stats/reviewer').catch(() => null),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: () => null
    }
  )

  const loading = computed(() => 
    siteStatsAsync.pending.value || 
    (isAuthenticated.value && userStatsAsync.pending.value) ||
    (canReview.value && reviewerStatsAsync.pending.value)
  )

  const error = ref<string | null>(null)

  async function fetchStats() {
    error.value = null
    
    try {
      await Promise.all([
        siteStatsAsync.execute(),
        isAuthenticated.value ? userStatsAsync.execute() : Promise.resolve(),
        canReview.value ? reviewerStatsAsync.execute() : Promise.resolve()
      ])
    } catch (e: any) {
      error.value = e?.message || '獲取統計失敗'
    }
  }

  async function refresh() {
    await fetchStats()
  }

  return {
    siteStats: siteStatsAsync.data,
    userStats: userStatsAsync.data,
    reviewerStats: reviewerStatsAsync.data,
    loading,
    error,
    fetchStats,
    refresh
  }
}
