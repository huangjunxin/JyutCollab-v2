/**
 * POST /api/faanjyut/lexemes（FaanjyutV1Design §8、§12、§13 P5）
 * 新建詞條：JC- sourceKey（faanjyut_counters 計數器，事務內原子遞增）、publication=draft，
 * Lexeme + 每格 Entry + CellState + EditHistory 單一事務；未登錄 401；結構非法 400；
 * runtime flag 關閉 503（§9）；列不存在/無權 400/403；撞唯一索引 409（httpErrorForCreateLexeme）。
 */
import mongoose from 'mongoose'
import { checkWriteFlag } from '../../../utils/faanjyut/cells'
import {
  CreateLexemeBodySchema,
  LEXEME_CREATE_FAILED_MESSAGE,
  createLexeme,
  httpErrorForCreateLexeme
} from '../../../utils/faanjyut/lexeme-create'
import { adaptMongooseLexemeCreateDb } from '../../../utils/faanjyut/mongo-db'

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
  const validated = CreateLexemeBodySchema.safeParse(body)
  if (!validated.success) {
    throw createError({
      statusCode: 400,
      message: formatZodErrorToMessage(validated.error)
    })
  }

  await connectDB()

  const db = adaptMongooseLexemeCreateDb(mongoose.connection)
  try {
    const data = await createLexeme(db, validated.data, user)
    return { success: true, data }
  } catch (error: any) {
    const mapped = httpErrorForCreateLexeme(error)
    if (mapped) {
      throw createError({ statusCode: mapped.statusCode, message: mapped.message })
    }
    console.error('Create faanjyut lexeme error:', error?.message ?? error)
    throw createError({ statusCode: 500, message: LEXEME_CREATE_FAILED_MESSAGE })
  }
})
