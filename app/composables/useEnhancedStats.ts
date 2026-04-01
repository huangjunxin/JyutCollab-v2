/**
 * 增強用戶統計 Composable
 */

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
  const userStats = ref<EnhancedUserStats | null>(null)
  const reviewerStats = ref<EnhancedReviewerStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { isAuthenticated, canReview } = useAuth()

  async function fetchStats() {
    if (!isAuthenticated.value) {
      userStats.value = null
      reviewerStats.value = null
      return
    }

    loading.value = true
    error.value = null

    try {
      const results = await Promise.all([
        $fetch<EnhancedUserStats>('/api/stats/mine/enhanced').catch(() => null),
        canReview.value ? $fetch<EnhancedReviewerStats>('/api/stats/reviewer/enhanced').catch(() => null) : Promise.resolve(null)
      ])

      userStats.value = results[0]
      reviewerStats.value = results[1]
    } catch (e: any) {
      error.value = e?.message || '獲取統計失敗'
    } finally {
      loading.value = false
    }
  }

  return {
    userStats,
    reviewerStats,
    loading,
    error,
    fetchStats
  }
}
