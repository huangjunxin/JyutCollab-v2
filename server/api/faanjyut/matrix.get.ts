import { z } from 'zod'
import { Lexeme } from '../../utils/Lexeme'
import { Entry } from '../../utils/Entry'
import { FaanJyutColumn } from '../../utils/FaanJyutColumn'
import { FaanJyutCellState } from '../../utils/FaanJyutCellState'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import {
  MATRIX_COLUMN_SOURCE_ROLES,
  buildColumnSelection,
  pivotMatrix,
  type MatrixCellStateName,
  type MatrixSelectedColumn
} from '../../utils/faanjyut/matrix'
import { buildSearchRegex } from '../../utils/faanjyut/search'

/**
 * 審計 M25：cellFilter 的 DB 層選擇器（與 pivotMatrix 的內存 filter 同語義，後者保留作兜底）。
 * 返回 { match } 表示「命中該狀態的 lexemeId 集合」；{ exclude } 表示「其餘全部」（null 態 =
 * 全集 − 有值集合，故返回有值集合供 $nin）。0 列時無格可匹配 → match=[]（與原內存 filter
 * 空列全 false 行為一致）。
 */
async function cellFilterLexemeSelector(
  cellFilter: MatrixCellStateName,
  selectedColumns: MatrixSelectedColumn[]
): Promise<{ match: string[] | null; exclude: string[] | null }> {
  const columnIds = selectedColumns.map((c) => c.id)
  if (columnIds.length === 0) return { match: [], exclude: null }
  const colFilter = { columnId: { $in: columnIds } }

  if (cellFilter === 'absent') {
    return { match: await FaanJyutCellState.distinct('lexemeId', { ...colFilter, 'status.flags.explicitlyAbsent': true }), exclude: null }
  }
  if (cellFilter === 'cleared') {
    return { match: await FaanJyutCellState.distinct('lexemeId', { ...colFilter, 'status.flags.explicitlyCleared': true }), exclude: null }
  }

  // normal / null：有值集合 = cell raw 非空（非 absent/cleared）∪ hasOldNote 格 ∪ domestic entry 有值
  // fromEntries 須按選中列的方言過濾，否則非選中方言有值的詞條會污染 null 篩選（BUG #2 修復）
  const domesticDialectIds = selectedColumns
    .filter((c) => c.sourceRole === 'domestic' && c.dialectId)
    .map((c) => c.dialectId!)

  const [fromCells, fromEntries] = await Promise.all([
    FaanJyutCellState.distinct('lexemeId', {
      ...colFilter,
      'status.flags.explicitlyAbsent': { $ne: true },
      'status.flags.explicitlyCleared': { $ne: true },
      $or: [{ raw: { $exists: true, $ne: '' } }, { 'status.flags.hasOldNote': true }]
    }),
    domesticDialectIds.length > 0
      ? Entry.distinct('lexemeId', {
          sourceBook: FAANJYUT_SOURCE_BOOK,
          'dialect.name': { $in: domesticDialectIds },
          'phonetic.original': { $exists: true, $ne: '' }
        })
      : Promise.resolve([] as string[])
  ])
  const hasValue = [...new Set([...fromCells, ...fromEntries])]
  if (cellFilter === 'normal') return { match: hasValue, exclude: null }
  return { match: null, exclude: hasValue }
}

/**
 * GET /api/faanjyut/matrix（見 FaanjyutV1Design.md §6/§12，P3 子任務 A）
 * 三次等值查詢 + 內存 pivot；要求登錄（全局 auth middleware 已強制）。
 * 響應含 per-column canEdit 與 writeEnabled（P4 寫接口開關，P3 恒 false）。
 */
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // 2026-08-07 無限滾動（方案 A）：前端每塊 200 行，上限隨之放寬
  perPage: z.coerce.number().int().min(1).max(200).default(50),
  columns: z.string().optional(),
  cellFilter: z.enum(['null', 'normal', 'absent', 'cleared']).optional(),
  q: z.string().trim().min(1).max(100).optional()
})

async function searchLexemeIds(q: string): Promise<string[]> {
  const regex = buildSearchRegex(q)
  const [lexemeIds, entryLexemeIds, cellLexemeIds] = await Promise.all([
    Lexeme.distinct('id', {
      'meta.sourceBook': FAANJYUT_SOURCE_BOOK,
      $or: [
        { id: { $regex: regex } },
        { 'meta.sourceKey': { $regex: regex } },
        { 'meta.compositePronunciation.display': { $regex: regex } },
        { 'meta.compositePronunciation.raw': { $regex: regex } },
        { 'meta.representativeChar.display': { $regex: regex } },
        { 'meta.representativeChar.raw': { $regex: regex } },
        { 'meta.commonCharCandidates': { $regex: regex } },
        { 'meta.definitionRaw': { $regex: regex } }
      ]
    }),
    Entry.distinct('lexemeId', {
      sourceBook: FAANJYUT_SOURCE_BOOK,
      $or: [
        { 'headword.display': { $regex: regex } },
        { 'phonetic.original': { $regex: regex } }
      ]
    }),
    FaanJyutCellState.distinct('lexemeId', {
      raw: { $regex: regex },
      'status.flags.explicitlyAbsent': { $ne: true },
      'status.flags.explicitlyCleared': { $ne: true }
    })
  ])
  return [...new Set([...lexemeIds, ...entryLexemeIds, ...cellLexemeIds])]
    .filter((id): id is string => typeof id === 'string')
}

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const validated = QuerySchema.safeParse(getQuery(event))
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: formatZodErrorToMessage(validated.error)
    })
  }
  const { page, perPage, columns: columnsParam, cellFilter, q } = validated.data

  await connectDB()

  // ① 列查詢：矩陣列只取 domestic/external 且 active
  const columnDocs = await FaanJyutColumn.find({
    sourceBook: FAANJYUT_SOURCE_BOOK,
    sourceRole: { $in: [...MATRIX_COLUMN_SOURCE_ROLES] },
    status: 'active'
  })
    .sort({ 'order.originalOrder': 1 })
    .lean()

  const requestedColumnIds = columnsParam
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const selection = buildColumnSelection({
    allColumns: columnDocs,
    requestedColumnIds,
    user
  })
  if (!selection.ok) {
    throw createError({ statusCode: 400, message: selection.error })
  }
  const selectedColumns = selection.columns
  const columnIds = selectedColumns.map((c) => c.id)

  // ② Lexeme 分頁（按 meta.matrixOrder 升序）
  // 審計 M25：cellFilter 下沉 DB 層——total/分頁按「滿足狀態篩選的詞條」計算，
  // 不再先取全量頁內 50 行再內存過濾（原實現翻頁大部分頁為空）。
  const lexemeFilter: Record<string, unknown> = { 'meta.sourceBook': FAANJYUT_SOURCE_BOOK }
  const lexemeIdConditions: Array<Record<string, unknown>> = []
  const [matchedSearchIds, cellSelector] = await Promise.all([
    q ? searchLexemeIds(q) : Promise.resolve(null),
    cellFilter ? cellFilterLexemeSelector(cellFilter, selectedColumns) : Promise.resolve(null)
  ])
  if (matchedSearchIds) lexemeIdConditions.push({ id: { $in: matchedSearchIds } })
  if (cellSelector) {
    const selector = cellSelector
    if (selector.match !== null) lexemeIdConditions.push({ id: { $in: selector.match } })
    else if (selector.exclude !== null) lexemeIdConditions.push({ id: { $nin: selector.exclude } })
  }
  if (lexemeIdConditions.length > 0) lexemeFilter.$and = lexemeIdConditions
  const [total, lexemeDocs] = await Promise.all([
    Lexeme.countDocuments(lexemeFilter),
    Lexeme.find(lexemeFilter)
      .sort({ 'meta.matrixOrder': 1, id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .lean()
  ])

  // ③ 格狀態：頁內詞條 × 所選列
  const lexemeIds = lexemeDocs.map((l) => l.id)
  const cellDocs = lexemeIds.length > 0 && columnIds.length > 0
    ? await FaanJyutCellState.find({
        lexemeId: { $in: lexemeIds },
        columnId: { $in: columnIds }
      }).lean()
    : []

  // ③b 詞條回退：ETL 對 domestic 正常值不生成 cell_state，值只在 entries.phonetic.original
  //（見 FaanjyutV1Design §13.1 P4 復用清單）；cell_state 優先，本查詢僅補無 cell_state 的
  // domestic 格。50 行 × ≤30 方言列，量級很小（每行 ≤ 30 條 entry 投影）。
  const entryDocs = lexemeIds.length > 0
    ? await Entry.find({
        lexemeId: { $in: lexemeIds },
        sourceBook: FAANJYUT_SOURCE_BOOK
      })
      .select('lexemeId dialect.name phonetic.original meta.sourceCell meta.sourceColumnIndex meta.editedAfterImport')
      .lean()
    : []

  const rows = pivotMatrix({
    lexemes: lexemeDocs,
    cells: cellDocs,
    entries: entryDocs,
    columns: selectedColumns,
    cellFilter
  })

  const config = useRuntimeConfig(event)

  return {
    success: true,
    data: {
      columns: selectedColumns.map((c) => ({
        id: c.id,
        label: c.label,
        shortLabel: c.shortLabel,
        dialectId: c.dialectId,
        languageCode: c.languageCode,
        sourceRole: c.sourceRole,
        canEdit: c.canEdit,
        style: c.style ?? null
      })),
      rows,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage)
      },
      writeEnabled: config.faanjyutWriteEnabled === true
    }
  }
})
