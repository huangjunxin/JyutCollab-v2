import type { FaanJyutImportBatchSummary } from '~/types/faanjyut'
import type { PaginatedResponse } from '~/types'

/**
 * 泛粵導入批次列表（FaanjyutV1Design §10.1：GET /api/faanjyut/import-batches）。
 * 分頁參數 page/perPage；響應信封 { success, data, total, page, perPage, totalPages }。
 */
export function useFaanjyutImportBatches() {
  const batches = ref<FaanJyutImportBatchSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const perPage = ref(20)
  const totalPages = ref(1)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function fetchBatches(options: { page?: number; perPage?: number } = {}): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(options.page ?? page.value))
      params.set('perPage', String(options.perPage ?? perPage.value))
      const response = await $fetch<PaginatedResponse<FaanJyutImportBatchSummary>>(
        `/api/faanjyut/import-batches?${params.toString()}`
      )
      batches.value = response.data
      total.value = response.total
      page.value = response.page
      perPage.value = response.perPage
      totalPages.value = response.totalPages
    } catch (error: any) {
      errorMessage.value = error?.data?.message || error?.message || '獲取導入批次列表失敗'
    } finally {
      loading.value = false
    }
  }

  return { batches, total, page, perPage, totalPages, loading, errorMessage, fetchBatches }
}
