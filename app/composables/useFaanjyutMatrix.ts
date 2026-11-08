import {
  buildFaanjyutMatrixCacheKey,
  clearFaanjyutMatrixDataCache,
  getFaanjyutColumnsCache,
  getFaanjyutMatrixCache,
  getFaanjyutMatrixCacheRevision,
  reconcileFaanjyutMatrixRowPatches,
  setFaanjyutColumnsCache,
  setFaanjyutMatrixCache,
  shareFaanjyutRequest
} from '~/utils/faanjyutMatrixCache'

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
  /** 2026-08-06 行頭「釋義」列數據源 */
  definitionRaw?: string
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

/**
 * P4 格寫入契約（FaanjyutV1Design §12 `POST /api/faanjyut/cells/batch`）：
 * 單格自動保存每格一條 edits（batch 保留設計不變），單格 transaction、批次允許部分成功。
 * op 語義：set=寫值（raw，trim 後非空）；clear=曾有內容被清空；absent=確定沒有（`_`）。
 * 請求以 dialectId 鍵定格（與服務端 CellEditSchema 一致；clear/absent 不得攜帶 raw）。
 */
export type FaanjyutCellOp = 'set' | 'clear' | 'absent'

export interface FaanjyutCellEdit {
  lexemeId: string
  /** 方言 ID（矩陣列 dialectId；僅域內可編輯列持有） */
  dialectId?: string
  /** 列 ID（域外列以 columnId 鍵定格） */
  columnId?: string
  op: FaanjyutCellOp
  raw?: string
  baseVersion: number
}

export interface FaanjyutCellWriteResult {
  lexemeId: string
  dialectId?: string
  columnId?: string
  ok: boolean
  entryId?: string
  version?: number
  error?: string
  code?: 'VERSION_CONFLICT'
}

export interface FaanjyutCellWriteData {
  results: FaanjyutCellWriteResult[]
  succeeded: number
  failed: number
}

/** P5 新建詞條契約（FaanjyutV1Design §8 `POST /api/faanjyut/lexemes`） */
export interface FaanjyutCreateLexemePayload {
  definitionRaw: string
  compositePronunciation?: string
  representativeChar?: string
  note?: string
  initialCells: Array<{ dialectId: string; raw: string }>
}

export interface FaanjyutCreateLexemeData {
  lexemeId: string
  sourceKey: string
  entries: Array<{ dialectId: string; entryId: string }>
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
  q?: string
}

export interface FetchMatrixOptions {
  force?: boolean
}

export function useFaanjyutMatrix() {
  const { user } = useAuth()

  function cacheScope(): string {
    const current = user.value as any
    const permissions = Array.isArray(current?.dialectPermissions)
      ? current.dialectPermissions
        .map((item: any) => `${item?.dialectName ?? ''}:${item?.role ?? ''}`)
        .sort()
      : []
    return JSON.stringify([current?.id ?? 'anonymous', current?.role ?? '', permissions])
  }

  function getCachedMatrix(params: FetchMatrixParams) {
    if (!import.meta.client) return null
    return getFaanjyutMatrixCache(cacheScope(), params)
  }

  async function fetchMatrix(
    params: FetchMatrixParams,
    options: FetchMatrixOptions = {}
  ): Promise<FaanjyutMatrixData> {
    const scope = cacheScope()
    if (import.meta.client && !options.force) {
      const cached = getFaanjyutMatrixCache(scope, params)
      if (cached?.freshness === 'fresh') return cached.data
    }
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
    if (params.q) {
      query.q = params.q
    }
    const revision = getFaanjyutMatrixCacheRevision()
    const requestKey = `matrix:${revision}:${buildFaanjyutMatrixCacheKey(scope, params)}`
    return await shareFaanjyutRequest(requestKey, async () => {
      const res = await $fetch<ApiEnvelope<FaanjyutMatrixData>>('/api/faanjyut/matrix', { query })
      if (import.meta.client) reconcileFaanjyutMatrixRowPatches(res.data.rows, revision)
      if (import.meta.client && revision === getFaanjyutMatrixCacheRevision()) {
        setFaanjyutMatrixCache(scope, params, res.data)
      }
      return res.data
    })
  }

  /** 全量列清單（列選擇器用） */
  async function fetchColumns(options: FetchMatrixOptions = {}): Promise<{ columns: FaanjyutMatrixColumn[]; total: number }> {
    const scope = cacheScope()
    if (import.meta.client && !options.force) {
      const cached = getFaanjyutColumnsCache(scope)
      if (cached) return cached
    }
    const revision = getFaanjyutMatrixCacheRevision()
    return await shareFaanjyutRequest(`columns:${revision}:${scope}`, async () => {
      const res = await $fetch<ApiEnvelope<{ columns: FaanjyutMatrixColumn[]; total: number }>>(
        '/api/faanjyut/columns'
      )
      if (import.meta.client && revision === getFaanjyutMatrixCacheRevision()) {
        setFaanjyutColumnsCache(scope, res.data)
      }
      return res.data
    })
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
   * P4 格寫入（§6.4 即改即存 / §13.1）：POST /api/faanjyut/cells/batch。
   * 響應信封 { success, data: { results, succeeded, failed } }；單格失敗以 200 +
   * 逐格 result 表達（部分成功），整批級錯誤（503 flag 關閉等）由 $fetch 拋出。
   */
  async function writeCells(edits: FaanjyutCellEdit[]): Promise<FaanjyutCellWriteData> {
    const res = await $fetch<ApiEnvelope<FaanjyutCellWriteData>>('/api/faanjyut/cells/batch', {
      method: 'POST',
      body: { edits }
    })
    return res.data
  }

  /**
   * P5 新建詞條（§8 / §13.1）：POST /api/faanjyut/lexemes。
   * 成功返回 { lexemeId, sourceKey, entries }；整批級錯誤（401/400/403/503/409/500）由 $fetch 拋出。
   */
  async function createLexeme(payload: FaanjyutCreateLexemePayload): Promise<FaanjyutCreateLexemeData> {
    const res = await $fetch<ApiEnvelope<FaanjyutCreateLexemeData>>('/api/faanjyut/lexemes', {
      method: 'POST',
      body: payload
    })
    if (import.meta.client) clearFaanjyutMatrixDataCache()
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

  return {
    fetchMatrix,
    fetchColumns,
    getCachedMatrix,
    getCacheScope: cacheScope,
    search,
    writeCells,
    createLexeme,
    locatePageByMatrixOrder
  }
}
