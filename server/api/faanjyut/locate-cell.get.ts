/**
 * GET /api/faanjyut/locate-cell?cell=<sourceCell>&perPage=<n>（審計 M64，2026-08-07）
 * 導入報告 sourceCell → 矩陣定位：查 cell_state.source.sourceCell → lexeme → matrixOrder →
 * 按排序位置計算所在頁（同 matrixOrder 詞條按 id 次排序，頁碼為近似值）。
 * 找不到 → 404。要求登錄。
 */
import { z } from 'zod'
import { Lexeme } from '../../../utils/Lexeme'
import { FaanJyutCellState } from '../../../utils/FaanJyutCellState'
import { connectDB } from '../../../utils/db'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'

const QuerySchema = z.object({
  cell: z.string().trim().min(1, '缺少 cell 參數'),
  perPage: z.coerce.number().int().min(1).max(100).default(50)
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const validated = QuerySchema.safeParse(getQuery(event))
  if (!validated.success) {
    throw createError({ statusCode: 400, message: 'cell 參數無效' })
  }
  const { cell, perPage } = validated.data

  await connectDB()
  const cellState = await FaanJyutCellState.findOne({ 'source.sourceCell': cell })
    .select('lexemeId source.sourceCell')
    .lean()
  if (!cellState) {
    throw createError({ statusCode: 404, message: `找不到原表格 ${cell} 對應的格` })
  }

  const lexeme = await Lexeme.findOne({ id: cellState.lexemeId, 'meta.sourceBook': FAANJYUT_SOURCE_BOOK })
    .select('meta.matrixOrder meta.sourceKey')
    .lean()
  if (!lexeme) {
    throw createError({ statusCode: 404, message: `原表格 ${cell} 對應的詞條不存在` })
  }
  const matrixOrder = (lexeme.meta as { matrixOrder?: unknown }).matrixOrder
  if (typeof matrixOrder !== 'number') {
    throw createError({ statusCode: 404, message: `原表格 ${cell} 對應的詞條缺少排序鍵` })
  }

  // 排序位置 = matrixOrder ≤ 目標的詞條數（同值詞條按 id 次排序，頁碼近似）
  const position = await Lexeme.countDocuments({
    'meta.sourceBook': FAANJYUT_SOURCE_BOOK,
    'meta.matrixOrder': { $lte: matrixOrder }
  })
  const page = Math.max(1, Math.ceil(position / perPage))

  return {
    success: true,
    data: {
      sourceCell: cell,
      lexemeId: cellState.lexemeId,
      sourceKey: (lexeme.meta as { sourceKey?: string }).sourceKey ?? null,
      matrixOrder,
      page,
      perPage
    }
  }
})
