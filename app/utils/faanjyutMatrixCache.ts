import type {
  FaanjyutMatrixCell,
  FaanjyutMatrixColumn,
  FaanjyutMatrixData,
  FaanjyutMatrixRow,
  FetchMatrixParams
} from '~/composables/useFaanjyutMatrix'

export const FAANJYUT_MATRIX_FRESH_TTL = 2 * 60 * 1000
export const FAANJYUT_MATRIX_STALE_TTL = 10 * 60 * 1000
export const FAANJYUT_COLUMNS_TTL = 30 * 60 * 1000
export const FAANJYUT_MATRIX_MAX_VIEWS = 4
export const FAANJYUT_MATRIX_MAX_CELLS = 100_000

interface NormalizedMatrixParams {
  page: number
  perPage: number
  columnIds: string[]
  cellFilter: string | null
  q: string
}

interface MatrixCacheRecord {
  key: string
  scope: string
  params: NormalizedMatrixParams
  data: FaanjyutMatrixData
  cachedAt: number
  lastAccess: number
  weight: number
}

interface ColumnsCacheRecord {
  scope: string
  data: { columns: FaanjyutMatrixColumn[]; total: number }
  cachedAt: number
}

export interface FaanjyutMatrixCacheLookup {
  data: FaanjyutMatrixData
  freshness: 'fresh' | 'stale'
  cachedAt: number
}

const matrixCache = new Map<string, MatrixCacheRecord>()
const columnsCache = new Map<string, ColumnsCacheRecord>()
const inFlightRequests = new Map<string, Promise<unknown>>()
const rowPatches = new Map<string, {
  patch: Partial<Omit<FaanjyutMatrixRow, 'id' | 'cells'>>
  revision: number
}>()
let matrixCacheRevision = 0

function normalizeParams(params: FetchMatrixParams): NormalizedMatrixParams {
  return {
    page: params.page,
    perPage: params.perPage,
    columnIds: params.columnIds?.filter(Boolean) ?? [],
    cellFilter: params.cellFilter ?? null,
    q: params.q?.trim() ?? ''
  }
}

export function buildFaanjyutMatrixCacheKey(scope: string, params: FetchMatrixParams): string {
  const normalized = normalizeParams(params)
  return JSON.stringify([
    scope,
    normalized.q,
    normalized.cellFilter,
    normalized.columnIds,
    normalized.page,
    normalized.perPage
  ])
}

function recordWeight(data: FaanjyutMatrixData): number {
  return data.rows.length * Math.max(data.columns.length, 1)
}

function pruneMatrixCache(now: number) {
  for (const [key, record] of matrixCache) {
    if (now - record.cachedAt > FAANJYUT_MATRIX_STALE_TTL) matrixCache.delete(key)
  }

  const totalWeight = () => [...matrixCache.values()].reduce((sum, record) => sum + record.weight, 0)
  while (matrixCache.size > FAANJYUT_MATRIX_MAX_VIEWS || totalWeight() > FAANJYUT_MATRIX_MAX_CELLS) {
    const oldest = [...matrixCache.values()].sort((a, b) => a.lastAccess - b.lastAccess)[0]
    if (!oldest) break
    matrixCache.delete(oldest.key)
  }
}

export function getFaanjyutMatrixCache(
  scope: string,
  params: FetchMatrixParams,
  now = Date.now()
): FaanjyutMatrixCacheLookup | null {
  if (params.page !== 1) return null
  const key = buildFaanjyutMatrixCacheKey(scope, params)
  const record = matrixCache.get(key)
  if (!record) return null
  const age = now - record.cachedAt
  if (age > FAANJYUT_MATRIX_STALE_TTL) {
    matrixCache.delete(key)
    return null
  }
  record.lastAccess = now
  return {
    data: record.data,
    freshness: age <= FAANJYUT_MATRIX_FRESH_TTL ? 'fresh' : 'stale',
    cachedAt: record.cachedAt
  }
}

export function setFaanjyutMatrixCache(
  scope: string,
  params: FetchMatrixParams,
  data: FaanjyutMatrixData,
  now = Date.now()
) {
  if (params.page !== 1) return
  const key = buildFaanjyutMatrixCacheKey(scope, params)
  matrixCache.set(key, {
    key,
    scope,
    params: normalizeParams(params),
    data,
    cachedAt: now,
    lastAccess: now,
    weight: recordWeight(data)
  })
  pruneMatrixCache(now)
}

export function getFaanjyutColumnsCache(
  scope: string,
  now = Date.now()
): { columns: FaanjyutMatrixColumn[]; total: number } | null {
  const record = columnsCache.get(scope)
  if (!record) return null
  if (now - record.cachedAt > FAANJYUT_COLUMNS_TTL) {
    columnsCache.delete(scope)
    return null
  }
  return record.data
}

export function setFaanjyutColumnsCache(
  scope: string,
  data: { columns: FaanjyutMatrixColumn[]; total: number },
  now = Date.now()
) {
  columnsCache.set(scope, { scope, data, cachedAt: now })
}

export function patchFaanjyutMatrixCachedCell(
  lexemeId: string,
  columnId: string,
  cell: FaanjyutMatrixCell
) {
  matrixCacheRevision += 1
  for (const [key, record] of matrixCache) {
    if (record.params.q || record.params.cellFilter) {
      matrixCache.delete(key)
      continue
    }
    const row = record.data.rows.find((item) => item.id === lexemeId)
    if (row && columnId in row.cells) row.cells[columnId] = cell
  }
}

export function patchFaanjyutMatrixCachedLexeme(
  lexemeId: string,
  patch: Partial<Omit<FaanjyutMatrixRow, 'id' | 'cells'>>
) {
  matrixCacheRevision += 1
  rowPatches.set(lexemeId, {
    patch: { ...(rowPatches.get(lexemeId)?.patch ?? {}), ...patch },
    revision: matrixCacheRevision
  })
  while (rowPatches.size > 100) {
    const oldestKey = rowPatches.keys().next().value
    if (typeof oldestKey !== 'string') break
    rowPatches.delete(oldestKey)
  }
  for (const [key, record] of matrixCache) {
    if (record.params.q || record.params.cellFilter) {
      matrixCache.delete(key)
      continue
    }
    const row = record.data.rows.find((item) => item.id === lexemeId)
    if (row) Object.assign(row, patch)
  }
}

export function applyFaanjyutMatrixRowPatches(rows: FaanjyutMatrixRow[]): number {
  let patched = 0
  for (const row of rows) {
    const record = rowPatches.get(row.id)
    if (!record) continue
    Object.assign(row, record.patch)
    patched += 1
  }
  return patched
}

export function reconcileFaanjyutMatrixRowPatches(
  rows: FaanjyutMatrixRow[],
  requestRevision: number
) {
  for (const row of rows) {
    const record = rowPatches.get(row.id)
    if (!record) continue
    if (record.revision <= requestRevision) rowPatches.delete(row.id)
    else Object.assign(row, record.patch)
  }
}

export function invalidateFaanjyutMatrixCacheForLexeme(lexemeId: string) {
  matrixCacheRevision += 1
  for (const [key, record] of matrixCache) {
    if (record.params.q || record.params.cellFilter || record.data.rows.some((row) => row.id === lexemeId)) {
      matrixCache.delete(key)
    }
  }
}

export function clearFaanjyutMatrixDataCache(scope?: string) {
  matrixCacheRevision += 1
  if (!scope) matrixCache.clear()
  for (const [key, record] of matrixCache) {
    if (record.scope === scope) matrixCache.delete(key)
  }
}

export function clearFaanjyutMatrixCache(scope?: string) {
  clearFaanjyutMatrixDataCache(scope)
  if (!scope) {
    columnsCache.clear()
    rowPatches.clear()
    return
  }
  columnsCache.delete(scope)
}

export function getFaanjyutMatrixCacheRevision(): number {
  return matrixCacheRevision
}

export function shareFaanjyutRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const existing = inFlightRequests.get(key) as Promise<T> | undefined
  if (existing) return existing
  let pending: Promise<T>
  pending = request().finally(() => {
    if (inFlightRequests.get(key) === pending) inFlightRequests.delete(key)
  })
  inFlightRequests.set(key, pending)
  return pending
}

export function resetFaanjyutMatrixCacheForTests() {
  matrixCache.clear()
  columnsCache.clear()
  inFlightRequests.clear()
  rowPatches.clear()
  matrixCacheRevision = 0
}

export function getFaanjyutMatrixCacheStats() {
  return {
    views: matrixCache.size,
    cells: [...matrixCache.values()].reduce((sum, record) => sum + record.weight, 0),
    columns: columnsCache.size,
    inFlight: inFlightRequests.size,
    rowPatches: rowPatches.size
  }
}
