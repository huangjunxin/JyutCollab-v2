import { useCachedAsyncData, CACHE_TTL } from './useDataCache'

export interface DialectStat {
  dialect: string
  count: number
  approved: number
}

export interface TypeStat {
  type: string
  count: number
}

export interface DailyActivity {
  date: string
  created: number
  approved: number
  updated: number
}

export interface EnhancedUserStats {
  total: number
  pending: number
  approved: number
  rejected: number
  byDialect: DialectStat[]
  byType: TypeStat[]
  recentActivity: {
    entriesCreated: number
    entriesApproved: number
    entriesUpdated: number
  }
  streak: {
    current: number
    longest: number
  }
  approvalRate: number
  avgReviewTime: number
  dailyActivity: DailyActivity[]
}

export interface UrgencyBucket {
  range: string
  count: number
}

export interface DialectPending {
  dialect: string
  pending: number
  total: number
}

export interface EnhancedReviewerStats {
  pending: number
  reviewedByMe: number
  urgencyBuckets: UrgencyBucket[]
  byDialect: DialectPending[]
  myPerformance: {
    avgReviewTime: number
    approvalRate: number
    todayReviewed: number
    thisWeekReviewed: number
  }
}

export const useEnhancedStats = () => {
  const { isAuthenticated, canReview } = useAuth()

  const userStatsAsync = useCachedAsyncData<EnhancedUserStats | null>(
    'stats:user:enhanced',
    () => $fetch<EnhancedUserStats>('/api/stats/mine/enhanced').catch(() => null),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: () => null
    }
  )

  const reviewerStatsAsync = useCachedAsyncData<EnhancedReviewerStats | null>(
    'stats:reviewer:enhanced',
    () => $fetch<EnhancedReviewerStats>('/api/stats/reviewer/enhanced').catch(() => null),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: () => null
    }
  )

  const loading = computed(() => 
    (isAuthenticated.value && userStatsAsync.pending.value) ||
    (canReview.value && reviewerStatsAsync.pending.value)
  )

  const error = ref<string | null>(null)

  async function fetchStats() {
    if (!isAuthenticated.value) {
      userStatsAsync.data.value = null
      reviewerStatsAsync.data.value = null
      return
    }

    error.value = null

    try {
      await Promise.all([
        userStatsAsync.execute(),
        canReview.value ? reviewerStatsAsync.execute() : Promise.resolve()
      ])
    } catch (e: any) {
      error.value = e?.message || '獲取統計失敗'
    }
  }

  return {
    userStats: userStatsAsync.data,
    reviewerStats: reviewerStatsAsync.data,
    loading,
    error,
    fetchStats,
    refresh: fetchStats
  }
}
