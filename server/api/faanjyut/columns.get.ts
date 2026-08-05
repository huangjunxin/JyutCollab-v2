import { FaanJyutColumn } from '../../utils/FaanJyutColumn'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import {
  MATRIX_COLUMN_SOURCE_ROLES,
  listMatrixColumns
} from '../../utils/faanjyut/matrix'

/**
 * GET /api/faanjyut/columns（P3 子任務 D，列選擇器數據源）
 * 返回全部 active 的 domestic/external 矩陣列（含 per-column canEdit），
 * 供矩陣頁列選擇器列舉；矩陣數據本身走 /api/faanjyut/matrix。
 * 要求登錄（與 matrix API 一致）。
 */
export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  await connectDB()

  const columnDocs = await FaanJyutColumn.find({
    sourceBook: FAANJYUT_SOURCE_BOOK,
    sourceRole: { $in: [...MATRIX_COLUMN_SOURCE_ROLES] },
    status: 'active'
  })
    .sort({ 'order.originalOrder': 1 })
    .lean()

  const columns = listMatrixColumns({ allColumns: columnDocs, user })

  return {
    success: true,
    data: {
      columns: columns.map((c) => ({
        id: c.id,
        label: c.label,
        shortLabel: c.shortLabel,
        dialectId: c.dialectId,
        languageCode: c.languageCode,
        sourceRole: c.sourceRole,
        canEdit: c.canEdit,
        style: c.style ?? null
      })),
      total: columns.length
    }
  }
})
