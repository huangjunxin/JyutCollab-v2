import { useCachedAsyncData, CACHE_TTL } from './useDataCache'

export interface DialectCoverage {
  id: string
  name: string
  entries: number
  approved: number
  contributors: number
  color: string
}

export interface UserDialectStats {
  id: string
  name: string
  entries: number
  approved: number
  hasPermission: boolean
}

export interface DialectCoverageData {
  totalDialects: number
  coveredDialects: number
  coverageRate: number
  dialects: DialectCoverage[]
  userDialects: UserDialectStats[]
}

export const useDialectCoverage = () => {
  const result = useCachedAsyncData<DialectCoverageData>(
    'stats:dialects',
    () => $fetch<DialectCoverageData>('/api/stats/dialects'),
    {
      ttl: CACHE_TTL.dialects,
      lazy: true,
      immediate: false
    }
  )

  const loading = computed(() => result.pending.value)
  const error = computed(() => result.error.value?.message || null)

  async function fetchCoverage() {
    await result.execute()
  }

  return {
    data: result.data,
    loading,
    error,
    fetchCoverage,
    refresh: fetchCoverage
  }
}
