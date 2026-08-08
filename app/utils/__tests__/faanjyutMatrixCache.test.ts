import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  FaanjyutMatrixColumn,
  FaanjyutMatrixData,
  FetchMatrixParams
} from '~/composables/useFaanjyutMatrix'
import {
  FAANJYUT_COLUMNS_TTL,
  FAANJYUT_MATRIX_FRESH_TTL,
  FAANJYUT_MATRIX_MAX_CELLS,
  FAANJYUT_MATRIX_MAX_VIEWS,
  FAANJYUT_MATRIX_STALE_TTL,
  buildFaanjyutMatrixCacheKey,
  getFaanjyutColumnsCache,
  getFaanjyutMatrixCache,
  getFaanjyutMatrixCacheRevision,
  getFaanjyutMatrixCacheStats,
  invalidateFaanjyutMatrixCacheForLexeme,
  patchFaanjyutMatrixCachedCell,
  patchFaanjyutMatrixCachedLexeme,
  reconcileFaanjyutMatrixRowPatches,
  resetFaanjyutMatrixCacheForTests,
  setFaanjyutColumnsCache,
  setFaanjyutMatrixCache,
  shareFaanjyutRequest
} from '../faanjyutMatrixCache'

function params(overrides: Partial<FetchMatrixParams> = {}): FetchMatrixParams {
  return { page: 1, perPage: 200, columnIds: ['gz', 'hk'], ...overrides }
}

function matrix(rowIds = ['lex-1'], columnCount = 2): FaanjyutMatrixData {
  const columns: FaanjyutMatrixColumn[] = Array.from({ length: columnCount }, (_, index) => ({
    id: `col-${index}`,
    label: `列${index}`,
    sourceRole: 'domestic',
    canEdit: false
  }))
  return {
    columns,
    rows: rowIds.map((id) => ({
      id,
      cells: Object.fromEntries(columns.map((column) => [column.id, { state: 'null' }]))
    })),
    pagination: { page: 1, perPage: 200, total: rowIds.length, totalPages: 1 },
    writeEnabled: false
  }
}

describe('faanjyutMatrixCache', () => {
  beforeEach(() => resetFaanjyutMatrixCacheForTests())

  it('builds isolated keys from user scope and the complete matrix view', () => {
    const base = buildFaanjyutMatrixCacheKey('user-a', params())
    expect(buildFaanjyutMatrixCacheKey('user-b', params())).not.toBe(base)
    expect(buildFaanjyutMatrixCacheKey('user-a', params({ q: 'mai1' }))).not.toBe(base)
    expect(buildFaanjyutMatrixCacheKey('user-a', params({ cellFilter: 'normal' }))).not.toBe(base)
    expect(buildFaanjyutMatrixCacheKey('user-a', params({ columnIds: ['gz'] }))).not.toBe(base)
    expect(buildFaanjyutMatrixCacheKey('user-a', params({ page: 2 }))).not.toBe(base)
  })

  it('returns fresh, stale, and expired states at the configured boundaries', () => {
    setFaanjyutMatrixCache('user-a', params(), matrix(), 1_000)
    expect(getFaanjyutMatrixCache('user-a', params(), 1_000 + FAANJYUT_MATRIX_FRESH_TTL)?.freshness).toBe('fresh')
    expect(getFaanjyutMatrixCache('user-a', params(), 1_001 + FAANJYUT_MATRIX_FRESH_TTL)?.freshness).toBe('stale')
    expect(getFaanjyutMatrixCache('user-a', params(), 1_001 + FAANJYUT_MATRIX_STALE_TTL)).toBeNull()
  })

  it('only stores the first block', () => {
    const secondPage = params({ page: 2 })
    setFaanjyutMatrixCache('user-a', secondPage, matrix(), 1_000)
    expect(getFaanjyutMatrixCache('user-a', secondPage, 1_000)).toBeNull()
    expect(getFaanjyutMatrixCacheStats().views).toBe(0)
  })

  it('evicts the least recently used view when the view limit is exceeded', () => {
    for (let index = 0; index < FAANJYUT_MATRIX_MAX_VIEWS; index++) {
      setFaanjyutMatrixCache('user-a', params({ q: `q-${index}` }), matrix(), 1_000 + index)
    }
    getFaanjyutMatrixCache('user-a', params({ q: 'q-0' }), 2_000)
    setFaanjyutMatrixCache('user-a', params({ q: 'q-new' }), matrix(), 2_001)

    expect(getFaanjyutMatrixCacheStats().views).toBe(FAANJYUT_MATRIX_MAX_VIEWS)
    expect(getFaanjyutMatrixCache('user-a', params({ q: 'q-0' }), 2_002)).not.toBeNull()
    expect(getFaanjyutMatrixCache('user-a', params({ q: 'q-1' }), 2_002)).toBeNull()
  })

  it('keeps the total cached cell weight within the configured budget', () => {
    const rowCount = 200
    const columnCount = Math.floor(FAANJYUT_MATRIX_MAX_CELLS / rowCount / 2) + 1
    const data = matrix(Array.from({ length: rowCount }, (_, index) => `lex-${index}`), columnCount)
    setFaanjyutMatrixCache('user-a', params({ q: 'one' }), data, 1_000)
    setFaanjyutMatrixCache('user-a', params({ q: 'two' }), data, 1_001)
    setFaanjyutMatrixCache('user-a', params({ q: 'three' }), data, 1_002)
    expect(getFaanjyutMatrixCacheStats().cells).toBeLessThanOrEqual(FAANJYUT_MATRIX_MAX_CELLS)
  })

  it('patches unfiltered snapshots and evicts membership-sensitive snapshots after a cell write', () => {
    const unfiltered = matrix()
    const filtered = matrix()
    setFaanjyutMatrixCache('user-a', params(), unfiltered, 1_000)
    setFaanjyutMatrixCache('user-a', params({ q: 'mai1' }), filtered, 1_000)
    const revision = getFaanjyutMatrixCacheRevision()

    patchFaanjyutMatrixCachedCell('lex-1', 'col-0', { state: 'normal', raw: 'mai1' })

    expect(unfiltered.rows[0].cells['col-0']).toEqual({ state: 'normal', raw: 'mai1' })
    expect(getFaanjyutMatrixCache('user-a', params({ q: 'mai1' }), 1_001)).toBeNull()
    expect(getFaanjyutMatrixCacheRevision()).toBe(revision + 1)
  })

  it('invalidates snapshots that contain an edited lexeme and all search snapshots', () => {
    setFaanjyutMatrixCache('user-a', params(), matrix(['lex-1']), 1_000)
    setFaanjyutMatrixCache('user-a', params({ columnIds: ['gz'] }), matrix(['lex-2']), 1_000)
    setFaanjyutMatrixCache('user-a', params({ q: 'word' }), matrix(['lex-2']), 1_000)

    invalidateFaanjyutMatrixCacheForLexeme('lex-1')

    expect(getFaanjyutMatrixCache('user-a', params(), 1_001)).toBeNull()
    expect(getFaanjyutMatrixCache('user-a', params({ q: 'word' }), 1_001)).toBeNull()
    expect(getFaanjyutMatrixCache('user-a', params({ columnIds: ['gz'] }), 1_001)).not.toBeNull()
  })

  it('keeps row patches newer than an in-flight response and retires acknowledged patches', () => {
    const oldRequestRevision = getFaanjyutMatrixCacheRevision()
    patchFaanjyutMatrixCachedLexeme('lex-1', { definitionRaw: '新釋義' })
    const staleResponse = matrix(['lex-1'])
    reconcileFaanjyutMatrixRowPatches(staleResponse.rows, oldRequestRevision)
    expect(staleResponse.rows[0].definitionRaw).toBe('新釋義')
    expect(getFaanjyutMatrixCacheStats().rowPatches).toBe(1)

    const freshResponse = matrix(['lex-1'])
    freshResponse.rows[0].definitionRaw = '新釋義'
    reconcileFaanjyutMatrixRowPatches(freshResponse.rows, getFaanjyutMatrixCacheRevision())
    expect(getFaanjyutMatrixCacheStats().rowPatches).toBe(0)
  })

  it('caches columns for thirty minutes', () => {
    const data = { columns: matrix().columns, total: 2 }
    setFaanjyutColumnsCache('user-a', data, 1_000)
    expect(getFaanjyutColumnsCache('user-a', 1_000 + FAANJYUT_COLUMNS_TTL)).toBe(data)
    expect(getFaanjyutColumnsCache('user-a', 1_001 + FAANJYUT_COLUMNS_TTL)).toBeNull()
  })

  it('shares identical in-flight requests', async () => {
    const request = vi.fn(async () => matrix())
    const first = shareFaanjyutRequest('same', request)
    const second = shareFaanjyutRequest('same', request)
    expect(first).toBe(second)
    await expect(first).resolves.toEqual(matrix())
    expect(request).toHaveBeenCalledTimes(1)
    expect(getFaanjyutMatrixCacheStats().inFlight).toBe(0)
  })
})
