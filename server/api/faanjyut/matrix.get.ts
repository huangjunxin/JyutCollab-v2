import { z } from 'zod'
import { Lexeme } from '../../utils/Lexeme'
import { FaanJyutColumn } from '../../utils/FaanJyutColumn'
import { FaanJyutCellState } from '../../utils/FaanJyutCellState'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import {
  MATRIX_COLUMN_SOURCE_ROLES,
  buildColumnSelection,
  pivotMatrix
} from '../../utils/faanjyut/matrix'

/**
 * GET /api/faanjyut/matrix（見 FaanjyutV1Design.md §6/§12，P3 子任務 A）
 * 三次等值查詢 + 內存 pivot；要求登錄（全局 auth middleware 已強制）。
 * 響應含 per-column canEdit 與 writeEnabled（P4 寫接口開關，P3 恒 false）。
 */
const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  columns: z.string().optional(),
  cellFilter: z.enum(['null', 'normal', 'absent', 'cleared']).optional()
})

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
  const { page, perPage, columns: columnsParam, cellFilter } = validated.data

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
  const lexemeFilter = { 'meta.sourceBook': FAANJYUT_SOURCE_BOOK }
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

  const rows = pivotMatrix({
    lexemes: lexemeDocs,
    cells: cellDocs,
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
