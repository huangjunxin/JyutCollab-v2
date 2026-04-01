import type { EditHistory } from '~/types'

export const useRecentActivities = (limit: number = 5, scope: 'mine' | 'all' = 'mine') => {
  const activities = ref<EditHistory[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { isAuthenticated } = useAuth()

  async function fetchActivities() {
    if (!isAuthenticated.value) {
      activities.value = []
      return
    }

    loading.value = true
    error.value = null
    try {
      const query: Record<string, any> = {
        perPage: limit,
        page: 1
      }

      // 'mine' scope: only current user's activities
      // 'all' scope: all activities (for reviewer/admin)
      if (scope === 'mine') {
        query.userId = 'me'
      }

      const response = await $fetch<{ data: EditHistory[] }>('/api/histories', { query })
      activities.value = response.data || []
    } catch (e: any) {
      error.value = e?.message || '獲取活動記錄失敗'
      activities.value = []
    } finally {
      loading.value = false
    }
  }

  return {
    activities,
    loading,
    error,
    fetchActivities
  }
}
