import { z } from 'zod'
import { connectDB } from '../../utils/db'
import { Entry } from '../../utils/Entry'

const QuerySchema = z.object({
  headword: z.string().min(1),
  dialect: z.string().min(1)
})

/** 同方言 / 其他方言詞條均帶 senses、theme、meta 供前端預覽釋義與分類 */
const mapEntryWithPreview = (e: any) => ({
  id: e._id?.toString() || e.id,
  headword: e.headword,
  dialect: e.dialect,
  status: e.status,
  createdAt: e.createdAt?.toISOString?.() || e.createdAt,
  senses: e.senses,
  theme: e.theme,
  meta: e.meta
})

/**
 * 檢查數據庫中是否已有相同詞頭的詞條（用於新建時重複性與參考提示）。
 * - sameDialect: 相同詞頭+相同方言（真正重複，需提示用戶）
 * - otherDialects: 相同詞頭、不同方言（可參考其他方言點已有詞條）
 */
export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const query = getQuery(event)
    const validated = QuerySchema.safeParse(query)
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: '請提供 headword 與 dialect 參數'
      })
    }

    const { headword, dialect } = validated.data
    const displayTrimmed = headword.trim()
    if (!displayTrimmed) {
      return { sameDialect: [], otherDialects: [] }
    }

    const [sameDialectRaw, otherDialectsRaw] = await Promise.all([
      Entry.find({
        'headword.display': displayTrimmed,
        'dialect.name': dialect
      })
        .select('id headword dialect status createdAt senses theme meta')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Entry.find({
        'headword.display': displayTrimmed,
        'dialect.name': { $ne: dialect }
      })
        .select('id headword dialect status createdAt senses theme meta')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ])

    return {
      sameDialect: sameDialectRaw.map(mapEntryWithPreview),
      otherDialects: otherDialectsRaw.map(mapEntryWithPreview)
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || '重複性檢測失敗'
    })
  }
})
