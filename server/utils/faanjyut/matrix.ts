/**
 * 泛粵矩陣只讀 API 純邏輯（見 FaanjyutV1Design.md §6/§12）：
 * 列選擇與 canEdit 計算、格四態推導、內存 pivot、響應體積估算。
 * 本模塊不觸庫，供 handler 薄殼與 vitest 直接測試。
 */

/** 每次矩陣請求最多列數（§6.2：響應體 500 KB 上限） */
export const MATRIX_MAX_COLUMNS = 30

/** 未指定列時的默認常用列集（本人可編輯列 + 廣州、香港） */
export const MATRIX_DEFAULT_DIALECT_IDS = ['guangzhou', 'hongkong'] as const

/** 矩陣可查詢的列角色（域外格一律只讀，但仍作矩陣列下發） */
export const MATRIX_COLUMN_SOURCE_ROLES = ['domestic', 'external'] as const

export interface MatrixUser {
  role: string
  dialectPermissions?: Array<{ dialectName: string; role?: string }>
}

/** 列文檔的最小結構（handler 傳 lean 結果，測試傳內存 fake） */
export interface MatrixColumnDoc {
  id: string
  sourceRole: string
  status: string
  dialectId?: string
  languageCode?: string
  label: string
  shortLabel?: string
  order?: { originalOrder?: number }
  style?: { color?: string; defaultTextColor?: string } | null
}

export interface MatrixSelectedColumn extends MatrixColumnDoc {
  canEdit: boolean
}

export type ColumnSelectionResult =
  | { ok: true; columns: MatrixSelectedColumn[] }
  | { ok: false; error: string }

export type MatrixCellStateName = 'null' | 'normal' | 'absent' | 'cleared'

/** 格狀態文檔的最小結構 */
export interface MatrixCellDoc {
  id?: string
  lexemeId: string
  columnId: string
  raw?: string
  status?: {
    flags?: {
      explicitlyAbsent?: boolean
      explicitlyCleared?: boolean
      [key: string]: unknown
    }
  }
  source?: { sourceCell?: string }
  editedAfterImport?: boolean
  version?: number
}

/** 格視圖（§6.3 四態；UI 據 state 渲染，absent 顯示 `_`） */
export interface MatrixCellView {
  state: MatrixCellStateName
  raw?: string
  sourceCell?: string
  editedAfterImport?: boolean
  version?: number
}

/**
 * 詞條文檔的最小結構（handler 傳 lean 結果，測試傳內存 fake）：
 * 供無 cell_state 的 domestic 格回退取值（值只在 entries.phonetic.original）。
 */
export interface MatrixEntryDoc {
  lexemeId?: string
  dialect?: { name?: string }
  phonetic?: { original?: string | string[] | null }
  meta?: {
    sourceCell?: string
    sourceColumnIndex?: number
    editedAfterImport?: boolean
  }
}

/** 詞條文檔的最小結構 */
export interface MatrixLexemeDoc {
  id: string
  meta?: {
    sourceKey?: string
    matrixOrder?: number
    representativeChar?: { raw?: string; display?: string; warnings?: string[] }
    compositePronunciation?: {
      raw?: string
      display?: string
      markers?: { hasQuestion?: boolean; hasBang?: boolean }
    }
  }
  status?: { publicationStatus?: string }
}

export interface MatrixRow {
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
  cells: Record<string, MatrixCellView>
}

/**
 * 列級 canEdit（§4/§6.4）：
 * 僅 domestic 且 active 的列可編輯；admin 全部 domestic 列可編輯；
 * 否則要求 column.dialectId 命中本人 dialectPermissions[].dialectName。
 */
export function canEditColumn(column: MatrixColumnDoc, user: MatrixUser): boolean {
  if (column.sourceRole !== 'domestic' || column.status !== 'active') return false
  if (user.role === 'admin') return true
  if (!column.dialectId) return false
  return (user.dialectPermissions ?? []).some((p) => p.dialectName === column.dialectId)
}

/**
 * 列選擇（§6.2）：
 * - 指定 requestedColumnIds：去重後超過 30 列返回錯誤標記（handler 轉 400）；
 *   未命中（不存在/非矩陣列）的 id 靜默略過，結果按 order.originalOrder 排序。
 * - 未指定：默認列集 = 本人 canEdit 列 + 廣州/香港列（去重、按 originalOrder 排序），
 *   超過 30 列截斷。
 */
export function buildColumnSelection(args: {
  allColumns: MatrixColumnDoc[]
  requestedColumnIds?: string[]
  user: MatrixUser
}): ColumnSelectionResult {
  const { allColumns, requestedColumnIds, user } = args
  const byId = new Map(allColumns.map((c) => [c.id, c]))
  const isDefault = !requestedColumnIds || requestedColumnIds.length === 0

  let picked: MatrixColumnDoc[]
  if (isDefault) {
    const seen = new Set<string>()
    picked = allColumns.filter((c) => {
      const isMine = canEditColumn(c, user)
      const isDefaultDialect = !!c.dialectId
        && (MATRIX_DEFAULT_DIALECT_IDS as readonly string[]).includes(c.dialectId)
      if (!isMine && !isDefaultDialect) return false
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })
  } else {
    const uniqueIds = [...new Set(requestedColumnIds)]
    if (uniqueIds.length > MATRIX_MAX_COLUMNS) {
      return { ok: false, error: `一次最多選擇 ${MATRIX_MAX_COLUMNS} 列` }
    }
    picked = uniqueIds
      .map((id) => byId.get(id))
      .filter((c): c is MatrixColumnDoc => !!c)
  }

  picked = [...picked].sort(
    (a, b) => (a.order?.originalOrder ?? 0) - (b.order?.originalOrder ?? 0)
  )
  if (isDefault && picked.length > MATRIX_MAX_COLUMNS) {
    picked = picked.slice(0, MATRIX_MAX_COLUMNS)
  }

  return {
    ok: true,
    columns: picked.map((c) => ({ ...c, canEdit: canEditColumn(c, user) }))
  }
}

/**
 * 格四態推導（§6.3）：
 * 無文檔 → null；flags.explicitlyAbsent → absent；flags.explicitlyCleared → cleared；
 * 否則 normal（有值，顯示 raw）。absent 優先於 cleared。
 */
export function computeCellState(cell: MatrixCellDoc | null | undefined): MatrixCellView {
  if (!cell) return { state: 'null' }
  const flags = cell.status?.flags ?? {}
  const base = {
    sourceCell: cell.source?.sourceCell,
    editedAfterImport: cell.editedAfterImport,
    version: cell.version
  }
  if (flags.explicitlyAbsent) return { ...base, state: 'absent', raw: cell.raw }
  if (flags.explicitlyCleared) return { ...base, state: 'cleared', raw: cell.raw }
  return { ...base, state: 'normal', raw: cell.raw }
}

/**
 * 由 Entry 推導 domestic 格視圖（§6.3 之 normal）：
 * ETL 對 domestic 正常值不生成 cell_state，值只存在於 entries.phonetic.original
 *（實測：entries 80884 條 ↔ cell_states 僅 48438 條，後者幾乎全為 absent/域外/批注格），
 * 故無 cell_state 的 domestic 格須回退查 Entry。本函數僅在格無 cell_state 時被調用
 *（cell_state 優先——P4 編輯過的格 cell_state.raw 才是最新值）。entry 缺失 → null 態。
 */
export function entryCellView(entry: MatrixEntryDoc | null | undefined): MatrixCellView {
  if (!entry) return { state: 'null' }
  const original = entry.phonetic?.original
  const raw = typeof original === 'string' && original.length > 0
    ? original
    : Array.isArray(original)
      ? original.join(' ')
      : undefined
  return {
    state: 'normal',
    raw,
    sourceCell: entry.meta?.sourceCell,
    editedAfterImport: entry.meta?.editedAfterImport ?? false
  }
}

/**
 * 內存 pivot（§12）：行 = 詞條摘要 + cells: Record<columnId, CellView>。
 * 格視圖推導優先序：
 *   1. 有 cell_state → computeCellState（cell_state 優先，P4 編輯過的格以 cell_state 為準）；
 *   2. 無 cell_state 且列為 domestic → 按 (lexemeId, dialectId) 回退查 Entry
 *      （domestic 正常值只在 entries.phonetic.original，ETL 不落 cell_state）；
 *   3. 其餘（無 cell_state 且 external / 無 dialectId 可匹配）→ null 態。
 * cellFilter 指定時，只保留在所選列中至少一格命中該態的行（§6.5 篩選 chip）。
 */
export function pivotMatrix(args: {
  lexemes: MatrixLexemeDoc[]
  cells: MatrixCellDoc[]
  columns: Array<{ id: string; sourceRole?: string; dialectId?: string }>
  entries?: MatrixEntryDoc[]
  cellFilter?: MatrixCellStateName
}): MatrixRow[] {
  const { lexemes, cells, columns, entries = [], cellFilter } = args
  const cellByKey = new Map(cells.map((c) => [`${c.lexemeId}::${c.columnId}`, c]))
  // 無 cell_state 的 domestic 格回退：按 (lexemeId, dialectId) 匹配 Entry
  const entryByLexemeDialect = new Map<string, MatrixEntryDoc>()
  for (const e of entries) {
    if (e.lexemeId && e.dialect?.name) {
      entryByLexemeDialect.set(`${e.lexemeId}::${e.dialect.name}`, e)
    }
  }

  const rows: MatrixRow[] = lexemes.map((lex) => {
    const cellViews: Record<string, MatrixCellView> = {}
    for (const col of columns) {
      const cell = cellByKey.get(`${lex.id}::${col.id}`)
      if (cell) {
        // ① cell_state 優先
        cellViews[col.id] = computeCellState(cell)
      } else if (col.sourceRole === 'domestic' && col.dialectId) {
        // ② domestic 正常值回退 Entry
        cellViews[col.id] = entryCellView(
          entryByLexemeDialect.get(`${lex.id}::${col.dialectId}`)
        )
      } else {
        // ③ external 值一律在 cell_states；無 cell_state → null
        cellViews[col.id] = { state: 'null' }
      }
    }
    return {
      id: lex.id,
      sourceKey: lex.meta?.sourceKey,
      representativeChar: lex.meta?.representativeChar,
      compositePronunciation: lex.meta?.compositePronunciation,
      matrixOrder: lex.meta?.matrixOrder,
      publicationStatus: lex.status?.publicationStatus,
      cells: cellViews
    }
  })

  if (!cellFilter) return rows
  return rows.filter((row) =>
    columns.some((col) => row.cells[col.id]?.state === cellFilter)
  )
}

/**
 * 全量矩陣列清單（列選擇器用）：所有 domestic/external 且 active 的列，
 * 按 order.originalOrder 排序並附 per-column canEdit。不截斷、不過濾。
 */
export function listMatrixColumns(args: {
  allColumns: MatrixColumnDoc[]
  user: MatrixUser
}): MatrixSelectedColumn[] {
  const { allColumns, user } = args
  return [...allColumns]
    .sort((a, b) => (a.order?.originalOrder ?? 0) - (b.order?.originalOrder ?? 0))
    .map((c) => ({ ...c, canEdit: canEditColumn(c, user) }))
}

/** 響應體積估算（§6.6 性能預算守衛：50 行 × 30 列 < 500 KB） */
export function estimatePayloadBytes(data: unknown): number {
  return Buffer.byteLength(JSON.stringify(data), 'utf8')
}
