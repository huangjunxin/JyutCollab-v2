import type { FaanJyutExportBatchSummary, FaanJyutExportOptions } from '~/types/faanjyut'
import type { PaginatedResponse } from '~/types'

/**
 * 泛粵 backup 導出（FaanjyutV1Design §10.2）。
 * POST /api/faanjyut/export 後台執行：立即返回 running 批次，本 composable 以
 * 2.5s 間隔輪詢 GET /api/faanjyut/export-batches 直到 completed/failed；
 * 下載走 <a href> 直連 GET（cookie session 自帶）。頁面卸載自動停止輪詢。
 */
export function useFaanjyutExport() {
  const batches = ref<FaanJyutExportBatchSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const perPage = ref(20)
  const totalPages = ref(1)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  /** 正在後台生成的批次 id（非空 → 生成中按鈕 loading） */
  const pendingExportId = ref<string | null>(null)
  const polling = ref(false)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  const POLL_INTERVAL_MS = 2500

  async function createExport(options: FaanJyutExportOptions): Promise<FaanJyutExportBatchSummary> {
    errorMessage.value = null
    const response = await $fetch<{ success: boolean; data: FaanJyutExportBatchSummary }>(
      '/api/faanjyut/export',
      { method: 'POST', body: options }
    )
    return response.data
  }

  async function fetchBatches(options: { page?: number; perPage?: number } = {}): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(options.page ?? page.value))
      params.set('perPage', String(options.perPage ?? perPage.value))
      const response = await $fetch<PaginatedResponse<FaanJyutExportBatchSummary>>(
        `/api/faanjyut/export-batches?${params.toString()}`
      )
      batches.value = response.data
      total.value = response.total
      page.value = response.page
      perPage.value = response.perPage
      totalPages.value = response.totalPages
    } catch (error: any) {
      errorMessage.value = error?.data?.message || error?.message || '獲取導出歷史失敗'
    } finally {
      loading.value = false
    }
  }

  /** 開始輪詢導出歷史（生成中批次狀態由頁面自行對 pendingExportId 判定） */
  function startPolling(): void {
    stopPolling()
    polling.value = true
    pollTimer = setInterval(() => {
      fetchBatches({ page: 1 })
    }, POLL_INTERVAL_MS)
  }

  function stopPolling(): void {
    polling.value = false
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  onBeforeUnmount(stopPolling)

  return {
    batches, total, page, perPage, totalPages, loading, errorMessage,
    pendingExportId, polling, createExport, fetchBatches, startPolling, stopPolling
  }
}
