import type { FaanJyutImportBatchDetail } from '~/types/faanjyut'

/**
 * 泛粵導入批次詳情（FaanjyutV1Design §10.1：GET /api/faanjyut/import-batches/:id）。
 * :id 即 batchId（如 fjb_xxx）；報告塊（precheck/write/rollback/indexPlan）不存在時為 null。
 */
export function useFaanjyutImportBatchDetail() {
  const data = ref<FaanJyutImportBatchDetail | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  async function fetchBatch(batchId: string): Promise<FaanJyutImportBatchDetail | null> {
    loading.value = true
    errorMessage.value = null
    try {
      const response = await $fetch<{ success: boolean; data: FaanJyutImportBatchDetail }>(
        `/api/faanjyut/import-batches/${encodeURIComponent(batchId)}`
      )
      data.value = response.data
      return response.data
    } catch (error: any) {
      data.value = null
      errorMessage.value = error?.data?.message || error?.message || '獲取導入批次詳情失敗'
      return null
    } finally {
      loading.value = false
    }
  }

  return { data, loading, errorMessage, fetchBatch }
}
