/**
 * POST /api/faanjyut/cells/batch（FaanjyutV1Design §12、§13.1 P4）
 * 逐格寫入 set/clear/absent：每格 Entry+CellState+EditHistory 單格 transaction、
 * 批次部分成功（§11）；未登錄 401；結構非法 400；runtime flag 關閉 503（§9）。
 */
import { z } from 'zod'
import mongoose from 'mongoose'
import {
  CELL_BATCH_MAX_EDITS,
  checkWriteFlag,
  runCellBatch
} from '../../../utils/faanjyut/cells'
import { adaptMongooseCellsDb } from '../../../utils/faanjyut/mongo-db'

const CellEditSchema = z.object({
  lexemeId: z.string().min(1),
  dialectId: z.string().min(1),
  op: z.enum(['set', 'clear', 'absent']),
  raw: z.string().optional(),
  baseVersion: z.number().int().optional()
}).superRefine((edit, ctx) => {
  if (edit.op === 'set') {
    if (edit.raw === undefined || edit.raw.trim() === '') {
      ctx.addIssue({ code: 'custom', path: ['raw'], message: 'set 必須提供非空 raw' })
    }
  } else if (edit.raw !== undefined) {
    ctx.addIssue({ code: 'custom', path: ['raw'], message: 'clear/absent 不得攜帶 raw' })
  }
})

const BatchBodySchema = z.object({
  edits: z.array(CellEditSchema).min(1).max(CELL_BATCH_MAX_EDITS)
}).superRefine((body, ctx) => {
  // 同一請求內不得重複編輯同一格（§12）
  const seen = new Set<string>()
  body.edits.forEach((edit, index) => {
    const key = `${edit.lexemeId}::${edit.dialectId}`
    if (seen.has(key)) {
      ctx.addIssue({ code: 'custom', path: ['edits', index], message: '同一請求內不得重複編輯同一格' })
    }
    seen.add(key)
  })
})

export default defineEventHandler(async (event) => {
  const user = event.context.auth
  if (!user) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const config = useRuntimeConfig(event)
  const flagError = checkWriteFlag(config)
  if (flagError) {
    throw createError({ statusCode: 503, message: flagError })
  }

  const body = await readBody(event)
  const validated = BatchBodySchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: formatZodErrorToMessage(validated.error)
    })
  }

  await connectDB()

  const db = adaptMongooseCellsDb(mongoose.connection)
  const data = await runCellBatch(db, { edits: validated.data.edits, user })

  return { success: true, data }
})
