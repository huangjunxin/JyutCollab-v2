import type { EditHistory } from '~/types'
import { useCachedAsyncData, CACHE_TTL } from './useDataCache'

export const useRecentActivities = (limit: number = 5, scope: 'mine' | 'all' = 'mine') => {
  const { isAuthenticated } = useAuth()
  
  const cacheKey = `activities:${scope}:${limit}`

  const result = useCachedAsyncData<EditHistory[]>(
    cacheKey,
    async () => {
      if (!isAuthenticated.value) {
        return []
      }

      const query: Record<string, any> = {
        perPage: limit,
        page: 1
      }

      if (scope === 'mine') {
        query.userId = 'me'
      }

      const response = await $fetch<{ data: EditHistory[] }>('/api/histories', { query })
      return response.data || []
    },
    {
      ttl: CACHE_TTL.histories,
      lazy: true,
      immediate: false,
      default: () => [],
      watch: [isAuthenticated]
    }
  )

  const activities = computed(() => result.data.value ?? [])
  const loading = computed(() => result.pending.value)
  const error = computed(() => result.error.value?.message || null)

  async function fetchActivities() {
    await result.execute()
  }

  return {
    activities,
    loading,
    error,
    fetchActivities,
    refresh: fetchActivities
  }
}
