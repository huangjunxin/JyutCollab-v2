import { useCachedAsyncData, CACHE_TTL } from './useDataCache'

export interface AISuggestionTypeStats {
  type: 'definition' | 'theme_classification' | 'example'
  label: string
  total: number
  pending: number
  accepted: number
  rejected: number
  modified: number
  ignored: number
  acceptanceRate: number
  modificationRate: number
  rejectionRate: number
  ignoredRate: number
}

export interface AISuggestionStats {
  total: number
  reviewedTotal: number
  pending: number
  accepted: number
  rejected: number
  modified: number
  ignored: number
  acceptanceRate: number
  modificationRate: number
  rejectionRate: number
  engagementRate: number
  ignoredRate: number
  byType: AISuggestionTypeStats[]
}

const emptyAISuggestionStats = (): AISuggestionStats => ({
  total: 0,
  reviewedTotal: 0,
  pending: 0,
  accepted: 0,
  rejected: 0,
  modified: 0,
  ignored: 0,
  acceptanceRate: 0,
  modificationRate: 0,
  rejectionRate: 0,
  engagementRate: 0,
  ignoredRate: 0,
  byType: [
    { type: 'definition', label: '釋義', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, ignored: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0, ignoredRate: 0 },
    { type: 'theme_classification', label: '分類', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, ignored: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0, ignoredRate: 0 },
    { type: 'example', label: '例句', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, ignored: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0, ignoredRate: 0 },
    { type: 'register', label: '語域', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, ignored: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0, ignoredRate: 0 }
  ]
})

export const useAISuggestionStats = () => {
  const { canReview } = useAuth()

  const statsAsync = useCachedAsyncData<AISuggestionStats | null>(
    'stats:ai-suggestions',
    () => $fetch<AISuggestionStats>('/api/stats/ai-suggestions').catch(() => emptyAISuggestionStats()),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: emptyAISuggestionStats
    }
  )

  const error = ref<string | null>(null)

  async function fetchStats() {
    if (!canReview.value) {
      statsAsync.data.value = null
      return
    }

    error.value = null
    try {
      await statsAsync.execute()
    } catch (e: any) {
      error.value = e?.message || '獲取 AI 建議統計失敗'
    }
  }

  return {
    stats: statsAsync.data,
    loading: statsAsync.pending,
    error,
    fetchStats,
    refresh: fetchStats
  }
}
