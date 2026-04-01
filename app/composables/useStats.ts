import type { SiteStats, UserStats, ReviewerStats } from '~/types'

export const useStats = () => {
  const siteStats = ref<SiteStats>({ total: 0, approved: 0, pending: 0, rejected: 0 })
  const userStats = ref<UserStats | null>(null)
  const reviewerStats = ref<ReviewerStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { isAuthenticated, canReview } = useAuth()

  async function fetchStats() {
    loading.value = true
    error.value = null
    try {
      const results = await Promise.all([
        $fetch<SiteStats>('/api/stats'),
        isAuthenticated.value ? $fetch<UserStats>('/api/stats/mine').catch(() => null) : Promise.resolve(null),
        canReview.value ? $fetch<ReviewerStats>('/api/stats/reviewer').catch(() => null) : Promise.resolve(null)
      ])
      siteStats.value = results[0]
      userStats.value = results[1]
      reviewerStats.value = results[2]
    } catch (e: any) {
      error.value = e?.message || '獲取統計失敗'
    } finally {
      loading.value = false
    }
  }

  return {
    siteStats,
    userStats,
    reviewerStats,
    loading,
    error,
    fetchStats
  }
}
