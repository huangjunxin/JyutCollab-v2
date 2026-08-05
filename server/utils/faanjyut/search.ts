/**
 * 泛粵字表只讀搜索純函數（FaanjyutV1Design §6.1 六維度搜索）。
 *
 * 六維度：key（詞條鍵）/ compositePronunciation（綜合音）/ representativeChar（代表字）/
 * definition（釋義）/ entry（地點方音）/ externalEtymon（域外材料）。
 * 本文件只含與 mongoose 無關的純邏輯（正則轉義、命中分組/去重/限量/排序），
 * 供 handler 與 vitest（純數據 fake）共用；實際 DB 查詢在 server/api/faanjyut/search.get.ts。
 */

/** 六維度標識，順序即 API 輸出順序 */
export const SEARCH_DIMENSIONS = [
  'key',
  'compositePronunciation',
  'representativeChar',
  'definition',
  'entry',
  'externalEtymon'
] as const

export type SearchDimension = (typeof SEARCH_DIMENSIONS)[number]

/** 六維度顯示標籤（繁體中文，見設計 §6.4 顯示層標籤中文化） */
export const SEARCH_DIMENSION_LABELS: Record<SearchDimension, string> = {
  key: '詞條鍵',
  compositePronunciation: '綜合音',
  representativeChar: '代表字',
  definition: '釋義',
  entry: '地點方音',
  externalEtymon: '域外材料'
}

/** 轉義正則特殊字符，使查詢詞作為字面量參與匹配 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export interface BuildSearchRegexOptions {
  /** 匹配策略：contains（包含，預設）或 prefix（前綴，用於 key 維度） */
  mode?: 'contains' | 'prefix'
  /** 正則 flags；預設 i（不區分大小寫，兼容綜合音大小寫混寫，如 `Jyut6` 可被 `jyut6` 命中） */
  flags?: string
}

/**
 * 由查詢詞構建搜索正則。查詢詞先轉義再組裝，保證 `>`、`.` 等字符按字面量匹配；
 * 前綴模式以 `^` 錨定（key 維度的「精確或前綴」由 `^escaped(q)` 一併覆蓋：q 為完整 key 時即精確）。
 */
export function buildSearchRegex(q: string, options: BuildSearchRegexOptions = {}): RegExp {
  const { mode = 'contains', flags = 'i' } = options
  const escaped = escapeRegExp(q)
  return new RegExp(mode === 'prefix' ? `^${escaped}` : escaped, flags)
}

/** 命中片段截斷長度（釋義/域外 raw 可能很長） */
export const SNIPPET_MAX_LENGTH = 80

export function truncateText(text: string, max = SNIPPET_MAX_LENGTH): string {
  const s = String(text)
  return s.length <= max ? s : `${s.slice(0, max)}…`
}

export interface SearchHit {
  lexemeId: string
  /** 命中片段：展示用（如詞條鍵、綜合音、`代表字 + 音`、語言名） */
  snippet: string
  /**
   * 額外信息：matrixOrder（每維內排序鍵）與各維度上下文
   * （如地點方音的 dialectName/headword/phonetic、域外材料的 languageCode/languageLabel）。
   */
  extra?: Record<string, unknown>
}

export interface SearchDimensionHits {
  dimension: SearchDimension
  hits: SearchHit[]
}

export interface MergeSearchHitsOptions {
  /** 每維最多返回的命中數（handler 已按 zod clamp 到 1–50） */
  limitPerDimension: number
}

export interface SearchDimensionResult {
  dimension: SearchDimension
  dimensionLabel: string
  hits: SearchHit[]
}

/** 每維內排序鍵：matrixOrder 優先（缺省置後），再以 lexemeId 字典序兜底，保證輸出穩定 */
function hitSortKey(hit: SearchHit): [number, string] {
  const matrixOrder = hit.extra?.matrixOrder
  const order = typeof matrixOrder === 'number' && Number.isFinite(matrixOrder) ? matrixOrder : Number.POSITIVE_INFINITY
  return [order, hit.lexemeId]
}

/**
 * 六路查詢結果合併：按維度分組、維內按 lexemeId 去重、每維限量、每維內排序。
 * 同一詞條可出現在多個維度（各維度獨立展示）。
 */
export function mergeSearchHits(
  input: SearchDimensionHits[],
  options: MergeSearchHitsOptions
): SearchDimensionResult[] {
  const { limitPerDimension } = options
  return input.map(({ dimension, hits }) => {
    const seen = new Set<string>()
    const deduped: SearchHit[] = []
    for (const hit of hits ?? []) {
      if (!hit?.lexemeId || seen.has(hit.lexemeId)) continue
      seen.add(hit.lexemeId)
      deduped.push(hit)
    }
    deduped.sort((a, b) => {
      const [orderA, idA] = hitSortKey(a)
      const [orderB, idB] = hitSortKey(b)
      return orderA - orderB || idA.localeCompare(idB)
    })
    return {
      dimension,
      dimensionLabel: SEARCH_DIMENSION_LABELS[dimension],
      hits: deduped.slice(0, limitPerDimension)
    }
  })
}
