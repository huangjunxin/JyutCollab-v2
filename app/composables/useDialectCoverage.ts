/**
 * 方言覆蓋度統計 Composable
 */

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
  const data = ref<DialectCoverageData | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchCoverage() {
    loading.value = true
    error.value = null

    try {
      const result = await $fetch<DialectCoverageData>('/api/stats/dialects')
      data.value = result
    } catch (e: any) {
      error.value = e?.message || '獲取方言統計失敗'
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    fetchCoverage
  }
}
