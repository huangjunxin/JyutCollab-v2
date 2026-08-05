/**
 * 泛粵字表矩陣頁數據層（FaanjyutV1Design §6，P3 只讀版）。
 * 直接消費已實現的只讀 API：
 *   GET /api/faanjyut/matrix   矩陣數據（分頁 + 列集 + cellFilter）
 *   GET /api/faanjyut/columns  全量列清單（列選擇器數據源）
 *   GET /api/faanjyut/search   六維度搜索（下拉建議 / ?q= 定位）
 * 響應信封統一為 { success, data }。
 */

export type FaanjyutCellState = 'normal' | 'absent' | 'cleared' | 'null'

export interface FaanjyutMatrixCell {
  state: FaanjyutCellState
  raw?: string
  sourceCell?: string
  editedAfterImport?: boolean
  version?: number
}

export interface FaanjyutMatrixColumn {
  id: string
  label: string
  shortLabel?: string
  dialectId?: string
  languageCode?: string
  sourceRole: 'domestic' | 'external'
  canEdit: boolean
  style?: { color?: string; defaultTextColor?: string } | null
}

export interface FaanjyutMatrixRow {
  id: string
  sourceKey?: string
  representativeChar?: { raw?: string; display?: string; warnings?: string[] }
  compositePronunciation?: {
    raw?: string
    display?: string
    markers?: { hasQuestion?: boolean; hasBang?: boolean }
  }
  matrixOrder?: number
  publicationStatus?: string
  cells: Record<string, FaanjyutMatrixCell>
}

export interface FaanjyutMatrixPagination {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface FaanjyutMatrixData {
  columns: FaanjyutMatrixColumn[]
  rows: FaanjyutMatrixRow[]
  pagination: FaanjyutMatrixPagination
  writeEnabled: boolean
}

export interface FaanjyutSearchHit {
  lexemeId: string
  snippet: string
  extra?: {
    sourceKey?: string | null
    matrixOrder?: number | null
    dialectName?: string | null
    languageCode?: string | null
    languageLabel?: string | null
    [key: string]: unknown
  }
}

export interface FaanjyutSearchGroup {
  dimension: string
  dimensionLabel: string
  hits: FaanjyutSearchHit[]
}

interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export interface FetchMatrixParams {
  page: number
  perPage: number
  /** 逗號分隔 columnId；空數組/未設 = 服務端默認列集 */
  columnIds?: string[]
  cellFilter?: FaanjyutCellState | null
}

/** 每次最多可選列數（與服務端 MATRIX_MAX_COLUMNS 一致） */
export const FAANJYUT_MATRIX_MAX_COLUMNS = 30

export function useFaanjyutMatrix() {
  async function fetchMatrix(params: FetchMatrixParams): Promise<FaanjyutMatrixData> {
    const query: Record<string, string | number> = {
      page: params.page,
      perPage: params.perPage
    }
    if (params.columnIds && params.columnIds.length > 0) {
      query.columns = params.columnIds.join(',')
    }
    if (params.cellFilter) {
      query.cellFilter = params.cellFilter
    }
    const res = await $fetch<ApiEnvelope<FaanjyutMatrixData>>('/api/faanjyut/matrix', { query })
    return res.data
  }

  /** 全量列清單（列選擇器用） */
  async function fetchColumns(): Promise<{ columns: FaanjyutMatrixColumn[]; total: number }> {
    const res = await $fetch<ApiEnvelope<{ columns: FaanjyutMatrixColumn[]; total: number }>>(
      '/api/faanjyut/columns'
    )
    return res.data
  }

  /** 六維度搜索（下拉建議 / ?q= 定位） */
  async function search(q: string, limit = 5): Promise<{ groups: FaanjyutSearchGroup[]; totalHits: number }> {
    const res = await $fetch<ApiEnvelope<{ q: string; groups: FaanjyutSearchGroup[]; totalHits: number }>>(
      '/api/faanjyut/search',
      { query: { q, limit } }
    )
    return res.data
  }

  /**
   * 按 matrixOrder 二分定位詞條所在頁（?q= 定位用）。
   * 矩陣按 meta.matrixOrder 升序分頁，頁邊界可由每頁首行的 matrixOrder 判定。
   * 返回 1-based 頁碼；matrixOrder 缺失或定位失敗時返回 null。
   */
  async function locatePageByMatrixOrder(
    matrixOrder: number,
    perPage: number,
    totalPages: number
  ): Promise<number | null> {
    if (totalPages < 1) return null
    // 頁首行 matrixOrder 單調不減；用極小列集請求降低負載
    const firstOrderOf = async (page: number): Promise<number> => {
      const data = await fetchMatrix({ page, perPage, columnIds: [] })
      const first = data.rows[0]
      if (!first || typeof first.matrixOrder !== 'number') return Number.POSITIVE_INFINITY
      return first.matrixOrder
    }
    const firstOfPage1 = await firstOrderOf(1)
    if (matrixOrder < firstOfPage1) return 1
    let lo = 1
    let hi = totalPages
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2)
      const firstOrder = await firstOrderOf(mid)
      if (matrixOrder >= firstOrder) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  return { fetchMatrix, fetchColumns, search, locatePageByMatrixOrder }
}
