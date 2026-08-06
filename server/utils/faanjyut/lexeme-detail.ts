/**
 * 泛粵字表詞條詳情聚合純函數（FaanjyutV1Design §7 七區塊）。
 *
 * 輸入為 handler 以等值查詢取回的 lean 文檔（本文件不 import mongoose）：
 *   1. header：詞條頭（key/代表字/綜合音/常用字候選/釋義/狀態/matrixOrder）
 *   2. senses：泛粵 entries 的義項去重聚合
 *   3. pronunciations：全部 active 列小卡 + 四態格視圖；域內列附對應 Entry 的 headword/phonetic
 *   4. externalMaterials：按 languageCode 分組（排除 meta.softDeleted），附語言 label
 *   5. links：從本詞條出發的關係卡（targetLexeme 已由 handler 解析附入）
 *   6. comments：targetType ∈ lexeme/cell/externalEtymon 且屬於本詞條，按原表時間排序
 *   7. editHistory：時間倒序；userId 原樣返回（`system:faanjyut_import` 由前端顯示「泛粵導入程序」）
 *   8. importTrace：sourceWorkbook/Sheet/Row、importBatchId、穩定 ID
 */

import {
  FAANJYUT_LANGUAGE_CODES,
  getFaanJyutLanguageLabel
} from '../../../shared/faanjyut-languages'

// ---- 輸入結構（鬆散結構，兼容 mongoose lean 文檔與測試 fixture） ----

export interface DetailLexemeInput {
  id: string
  meta?: Record<string, any>
  status?: Record<string, any>
}

export interface DetailColumnInput {
  id: string
  label: string
  shortLabel?: string
  sourceRole?: string
  dialectId?: string
  languageCode?: string
  order?: { originalOrder?: number }
  style?: Record<string, unknown> | null
  status?: string
}

export interface DetailCellInput {
  id: string
  columnId: string
  raw?: string
  status?: { flags?: Record<string, unknown> }
  projection?: { entryId?: string; externalEtymonIds?: string[] }
  source?: { importBatchId?: string }
}

export interface DetailEntryInput {
  id: string
  dialect?: { name?: string }
  headword?: Record<string, unknown> | null
  phonetic?: Record<string, unknown> | null
  senses?: Array<Record<string, unknown>>
}

export interface DetailEtymonInput {
  id: string
  languageCode: string
  scriptForm?: string
  raw?: string
  phonetic?: string
  gloss?: string
  sourceType?: string
  sourceDetail?: string
  note?: string
  meta?: { softDeleted?: boolean }
}

export interface DetailLinkInput {
  id: string
  fromLexemeId: string
  toLexemeId?: string
  targetKey?: string
  targetRaw?: string
  type?: string
  rawSource?: string
  rawLabel?: string
  rawValue?: string
  status?: string
  /** handler 已解析命中的目標詞條（toLexemeId 存在且找到時） */
  targetLexeme?: {
    id: string
    sourceKey?: string | null
    representativeChar?: { display?: string; raw?: string } | null
  } | null
}

export interface DetailCommentInput {
  id: string
  targetType?: string
  targetId?: string
  source?: string
  authorDisplay?: string
  content?: string
  legacyMeta?: {
    originalAuthor?: string
    originalTimestamp?: Date | string | number
    threadedPlaceholder?: boolean
    sourceCell?: string
  }
}

export interface DetailHistoryInput {
  _id?: string
  id?: string
  entryId: string
  userId: string
  action?: string
  changedFields?: string[]
  beforeSnapshot?: Record<string, unknown>
  afterSnapshot?: Record<string, unknown>
  comment?: string
  createdAt: Date | string | number
  isReverted?: boolean
}

export interface AssembleLexemeDetailInput {
  lexeme: DetailLexemeInput
  columns: DetailColumnInput[]
  cells: DetailCellInput[]
  entries: DetailEntryInput[]
  etymons: DetailEtymonInput[]
  links: DetailLinkInput[]
  comments: DetailCommentInput[]
  histories: DetailHistoryInput[]
}

// ---- 四態格視圖（與矩陣同邏輯，見 FaanjyutV1Design §6.3） ----

export type CellView =
  | { state: 'null' }
  | { state: 'absent' }
  | { state: 'cleared' }
  | { state: 'normal'; raw: string | null }

/**
 * 由 CellState 文檔推導四態：
 *   無文檔 → null；flags.explicitlyAbsent → absent；flags.explicitlyCleared → cleared；否則 normal+raw。
 */
export function cellViewForCellState(cell: DetailCellInput | null | undefined): CellView {
  if (!cell) return { state: 'null' }
  const flags = cell.status?.flags ?? {}
  if (flags.explicitlyAbsent === true) return { state: 'absent' }
  if (flags.explicitlyCleared === true) return { state: 'cleared' }
  return { state: 'normal', raw: cell.raw ?? null }
}

// ---- 時間處理 ----

function timeValue(value: Date | string | number | null | undefined): number {
  if (value === null || value === undefined) return Number.POSITIVE_INFINITY
  const n = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

function isoOrNull(value: Date | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const n = timeValue(value)
  if (!Number.isFinite(n)) return null
  return new Date(n).toISOString()
}

// ---- 組裝 ----

export interface LexemeDetailData {
  header: {
    id: string
    sourceKey: string | null
    representativeChar: Record<string, any> | null
    compositePronunciation: Record<string, any> | null
    commonCharCandidates: string | null
    definitionRaw: string | null
    publicationStatus: string | null
    matrixOrder: number | null
  }
  senses: Array<Record<string, unknown>>
  pronunciations: Array<{
    columnId: string
    label: string
    shortLabel: string | null
    dialectId: string | null
    languageCode: string | null
    sourceRole: string | null
    originalOrder: number | null
    style: Record<string, unknown> | null
    cell: CellView
    entry: {
      entryId: string
      headword: Record<string, unknown> | null
      phonetic: Record<string, unknown> | null
    } | null
  }>
  externalMaterials: Array<{
    languageCode: string
    languageLabel: string
    items: Array<{
      id: string
      scriptForm: string | null
      raw: string | null
      phonetic: string | null
      gloss: string | null
      sourceType: string | null
      sourceDetail: string | null
      note: string | null
    }>
  }>
  links: Array<{
    id: string
    fromLexemeId: string
    toLexemeId: string | null
    targetKey: string | null
    targetRaw: string | null
    type: string | null
    rawSource: string | null
    rawLabel: string | null
    rawValue: string | null
    status: string | null
    broken: boolean
    unresolved: boolean
    targetLexeme: {
      id: string
      sourceKey: string | null
      representativeChar: Record<string, any> | null
    } | null
  }>
  comments: Array<{
    id: string
    targetType: string | null
    targetId: string | null
    source: string | null
    author: string | null
    content: string
    threadedPlaceholder: boolean
    originalTimestamp: string | null
    sourceCell: string | null
    /** 2026-08-07：源表列名（批注坐标可读化，如 CU4216 → 融列） */
    sourceColumn: string | null
    /** 2026-08-07：批注所在格的值（entry phonetic.original / cell_state.raw / _ / ∅），无则 null */
    cellValue: string | null
  }>
  editHistory: Array<{
    id: string
    entryId: string
    userId: string
    action: string | null
    changedFields: string[]
    beforeSnapshot: Record<string, unknown> | null
    afterSnapshot: Record<string, unknown> | null
    comment: string | null
    isReverted: boolean
    createdAt: string | null
  }>
  importTrace: {
    sourceWorkbook: string | null
    sourceSheet: string | null
    sourceRow: number | null
    importBatchId: string | null
    stableId: string
  }
}

export function assembleLexemeDetail(input: AssembleLexemeDetailInput): LexemeDetailData {
  const { lexeme, columns, cells, entries, etymons, links, comments, histories } = input
  const meta = lexeme.meta ?? {}

  // ---- 1. 詞條頭 ----
  const header: LexemeDetailData['header'] = {
    id: lexeme.id,
    sourceKey: meta.sourceKey ?? null,
    representativeChar: meta.representativeChar ?? null,
    compositePronunciation: meta.compositePronunciation ?? null,
    commonCharCandidates: meta.commonCharCandidates ?? null,
    definitionRaw: meta.definitionRaw ?? null,
    publicationStatus: lexeme.status?.publicationStatus ?? null,
    matrixOrder: typeof meta.matrixOrder === 'number' ? meta.matrixOrder : (meta.matrixOrder ?? null)
  }

  // ---- 2. 義項卡：entries 的 senses 去重聚合（按 label+definition，保留首次出現） ----
  const seenSenses = new Set<string>()
  const senses: Array<Record<string, unknown>> = []
  for (const entry of entries) {
    for (const sense of entry.senses ?? []) {
      const key = `${sense.label ?? ''}\u0000${sense.definition ?? ''}`
      if (seenSenses.has(key)) continue
      seenSenses.add(key)
      senses.push(sense)
    }
  }

  // ---- 3. 各方言點方音：全部 active 列小卡 + 四態 + 域內列附 Entry ----
  const cellByColumnId = new Map(cells.map((cell) => [cell.columnId, cell]))
  const entryById = new Map(entries.filter((entry) => entry.id).map((entry) => [entry.id, entry]))
  const entryByDialectName = new Map(
    entries
      .filter((entry) => entry.dialect?.name)
      .map((entry) => [entry.dialect!.name as string, entry])
  )

  const sortedActiveColumns = [...columns]
    .filter((column) => column.status === 'active')
    .sort((a, b) => {
      const orderA = a.order?.originalOrder
      const orderB = b.order?.originalOrder
      if (orderA === undefined && orderB === undefined) return 0
      if (orderA === undefined) return 1
      if (orderB === undefined) return -1
      return orderA - orderB
    })

  const pronunciations: LexemeDetailData['pronunciations'] = sortedActiveColumns.map((column) => {
    const cell = cellByColumnId.get(column.id)
    let entry: DetailEntryInput | null = null
    if (column.sourceRole === 'domestic') {
      entry =
        (column.dialectId ? entryByDialectName.get(column.dialectId) : undefined) ??
        (cell?.projection?.entryId ? entryById.get(cell.projection.entryId) : undefined) ??
        null
    }
    const cellView = cellViewForCellState(cell)
    // 2026-08-07：與矩陣 pivot 一致——domestic 正常值回退 Entry（導入正常格無 cell_state，
    // 值在 entry.phonetic.original；有 hasOldNote 的 cell_state 無 raw 同樣回退，用戶實測）
    const entryOriginal = entry
      ? String((entry.phonetic as { original?: unknown } | null | undefined)?.original ?? '')
      : ''
    const cellNeedsEntryFallback =
      column.sourceRole === 'domestic' && entryOriginal !== '' &&
      (cellView.state === 'null' || (cellView.state === 'normal' && !cellView.raw))
    const effectiveCell: CellView =
      cellNeedsEntryFallback
        ? { state: 'normal', raw: entryOriginal }
        : cellView
    return {
      columnId: column.id,
      label: column.label,
      shortLabel: column.shortLabel ?? null,
      dialectId: column.dialectId ?? null,
      languageCode: column.languageCode ?? null,
      sourceRole: column.sourceRole ?? null,
      originalOrder: column.order?.originalOrder ?? null,
      style: column.style ?? null,
      cell: effectiveCell,
      entry: entry
        ? {
            entryId: entry.id,
            headword: entry.headword ?? null,
            phonetic: entry.phonetic ?? null
          }
        : null
    }
  })

  // ---- 4. 域外材料：按 languageCode 分組（排除 meta.softDeleted），附語言 label ----
  const codeRank = new Map(FAANJYUT_LANGUAGE_CODES.map((code, index) => [code, index]))
  const etymonsByCode = new Map<string, DetailEtymonInput[]>()
  for (const etymon of etymons) {
    if (etymon.meta?.softDeleted === true) continue
    if (!etymon.languageCode) continue
    const list = etymonsByCode.get(etymon.languageCode)
    if (list) {
      list.push(etymon)
    } else {
      etymonsByCode.set(etymon.languageCode, [etymon])
    }
  }
  const externalMaterials: LexemeDetailData['externalMaterials'] = [...etymonsByCode.entries()]
    .sort(([codeA], [codeB]) => {
      const rankA = codeRank.get(codeA)
      const rankB = codeRank.get(codeB)
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB
      if (rankA === undefined && rankB === undefined) return codeA.localeCompare(codeB)
      return rankA === undefined ? 1 : -1
    })
    .map(([languageCode, items]) => ({
      languageCode,
      languageLabel: getFaanJyutLanguageLabel(languageCode),
      items: items.map((etymon) => ({
        id: etymon.id,
        scriptForm: etymon.scriptForm ?? null,
        raw: etymon.raw ?? null,
        phonetic: etymon.phonetic ?? null,
        gloss: etymon.gloss ?? null,
        sourceType: etymon.sourceType ?? null,
        sourceDetail: etymon.sourceDetail ?? null,
        note: etymon.note ?? null
      }))
    }))

  // ---- 5. 鏈接：從本詞條出發的關係卡 ----
  const linkCards: LexemeDetailData['links'] = links.map((link) => ({
    id: link.id,
    fromLexemeId: link.fromLexemeId,
    toLexemeId: link.toLexemeId ?? null,
    targetKey: link.targetKey ?? null,
    targetRaw: link.targetRaw ?? null,
    type: link.type ?? null,
    rawSource: link.rawSource ?? null,
    rawLabel: link.rawLabel ?? null,
    rawValue: link.rawValue ?? null,
    status: link.status ?? null,
    broken: link.status === 'broken',
    unresolved: link.status === 'unresolved',
    targetLexeme: link.targetLexeme ?? null
  }))

  // ---- 6. 批注：targetType ∈ lexeme/cell/externalEtymon 且屬於本詞條 ----
  const cellIds = new Set(cells.map((cell) => cell.id))
  const etymonIds = new Set(etymons.map((etymon) => etymon.id))
  const cellById = new Map(cells.map((cell) => [cell.id, cell]))

  /** 批注所在格的值：entry 方音原文優先 → cell_state.raw → absent/cleared 符號 → null */
  function cellValueFor(comment: DetailCommentInput): string | null {
    if (comment.targetType !== 'cell' || !comment.targetId) return null
    const cell = cellById.get(comment.targetId)
    if (!cell) return null
    const flags = cell.status?.flags ?? {}
    if (flags.explicitlyAbsent === true) return '_'
    if (flags.explicitlyCleared === true) return '∅'
    if (cell.projection?.entryId) {
      const entry = entryById.get(cell.projection.entryId)
      const original = (entry?.phonetic as { original?: unknown } | null | undefined)?.original
      if (typeof original === 'string' && original.trim() !== '') return original
    }
    return cell.raw ?? null
  }

  const commentCards: LexemeDetailData['comments'] = comments
    .filter((comment) => {
      if (comment.targetType === 'lexeme') return comment.targetId === lexeme.id
      if (comment.targetType === 'cell') return Boolean(comment.targetId) && cellIds.has(comment.targetId as string)
      if (comment.targetType === 'externalEtymon') return Boolean(comment.targetId) && etymonIds.has(comment.targetId as string)
      return false
    })
    .sort((a, b) => {
      const timeA = timeValue(a.legacyMeta?.originalTimestamp)
      const timeB = timeValue(b.legacyMeta?.originalTimestamp)
      return timeA - timeB || a.id.localeCompare(b.id)
    })
    .map((comment) => ({
      id: comment.id,
      targetType: comment.targetType ?? null,
      targetId: comment.targetId ?? null,
      source: comment.source ?? null,
      author: comment.authorDisplay ?? comment.legacyMeta?.originalAuthor ?? null,
      content: comment.content ?? '',
      threadedPlaceholder: comment.legacyMeta?.threadedPlaceholder === true,
      originalTimestamp: isoOrNull(comment.legacyMeta?.originalTimestamp),
      sourceCell: comment.legacyMeta?.sourceCell ?? null,
      sourceColumn: comment.legacyMeta?.sourceColumn ?? null,
      cellValue: cellValueFor(comment)
    }))

  // ---- 7. 編輯歷史：時間倒序；userId 原樣返回 ----
  const editHistory: LexemeDetailData['editHistory'] = [...histories]
    .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
    .map((history) => ({
      id: history.id ?? history._id ?? '',
      entryId: history.entryId,
      userId: history.userId,
      action: history.action ?? null,
      changedFields: history.changedFields ?? [],
      beforeSnapshot: history.beforeSnapshot ?? null,
      afterSnapshot: history.afterSnapshot ?? null,
      comment: history.comment ?? null,
      isReverted: history.isReverted === true,
      createdAt: isoOrNull(history.createdAt)
    }))

  // ---- 8. 導入追溯 ----
  const importBatchId =
    meta.importBatchId ??
    cells.find((cell) => cell.source?.importBatchId)?.source?.importBatchId ??
    null
  const importTrace: LexemeDetailData['importTrace'] = {
    sourceWorkbook: meta.sourceWorkbook ?? null,
    sourceSheet: meta.sourceSheet ?? null,
    sourceRow: typeof meta.sourceRow === 'number' ? meta.sourceRow : (meta.sourceRow ?? null),
    importBatchId,
    stableId: lexeme.id
  }

  return {
    header,
    senses,
    pronunciations,
    externalMaterials,
    links: linkCards,
    comments: commentCards,
    editHistory,
    importTrace
  }
}
