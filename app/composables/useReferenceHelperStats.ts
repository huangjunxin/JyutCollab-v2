import { useCachedAsyncData, CACHE_TTL } from './useDataCache'
import type { ReferenceHelperType } from './useReferenceHelperTracking'

export interface ReferenceHelperTypeStats {
  type: ReferenceHelperType
  label: string
  total: number
  pending: number
  accepted: number
  rejected: number
  modified: number
  reviewed: number
  adopted: number
  adoptionRate: number
  acceptanceRate: number
  modificationRate: number
  rejectionRate: number
}

export interface ReferenceHelperStats {
  total: number
  pending: number
  accepted: number
  rejected: number
  modified: number
  reviewed: number
  adopted: number
  adoptionRate: number
  acceptanceRate: number
  modificationRate: number
  rejectionRate: number
  byType: ReferenceHelperTypeStats[]
}

const emptyReferenceHelperStats = (): ReferenceHelperStats => ({
  total: 0,
  pending: 0,
  accepted: 0,
  rejected: 0,
  modified: 0,
  reviewed: 0,
  adopted: 0,
  adoptionRate: 0,
  acceptanceRate: 0,
  modificationRate: 0,
  rejectionRate: 0,
  byType: [
    { type: 'jyutdict_pronunciation', label: '泛粵典粵拼', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'jyutjyu_template', label: 'Jyutjyu 參考', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'internal_dialect_template', label: '其他方言參考', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'manual_reference_search', label: '手動參考搜尋', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'morpheme_search', label: '語素搜尋', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'morpheme_linked', label: '已連結語素', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'morpheme_unlinked', label: '未連結語素', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 },
    { type: 'external_etymon', label: '域外方音', total: 0, pending: 0, accepted: 0, rejected: 0, modified: 0, reviewed: 0, adopted: 0, adoptionRate: 0, acceptanceRate: 0, modificationRate: 0, rejectionRate: 0 }
  ]
})

export const useReferenceHelperStats = () => {
  const { canReview } = useAuth()

  const statsAsync = useCachedAsyncData<ReferenceHelperStats | null>(
    'stats:reference-helpers',
    () => $fetch<ReferenceHelperStats>('/api/stats/reference-helpers', { query: { scope: 'filling' } }).catch(() => emptyReferenceHelperStats()),
    {
      ttl: CACHE_TTL.stats,
      lazy: true,
      immediate: false,
      default: emptyReferenceHelperStats
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
      error.value = e?.message || '獲取參考資料輔助統計失敗'
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
