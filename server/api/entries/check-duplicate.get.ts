import { z } from 'zod'
import { connectDB } from '../../utils/db'
import { Entry } from '../../utils/Entry'

const QuerySchema = z.object({
  headword: z.string().min(1),
  dialect: z.string().min(1)
})

/**
 * 檢查數據庫中是否已存在相同詞頭+方言的詞條（用於新建時重複性檢測）。
 * 返回匹配的詞條列表（不含當前未保存的新條目）。
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
      return { data: [], total: 0 }
    }

    const matches = await Entry.find({
      'headword.display': displayTrimmed,
      'dialect.name': dialect
    })
      .select('id headword dialect status createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    const data = matches.map((e: any) => ({
      id: e._id?.toString() || e.id,
      headword: e.headword,
      dialect: e.dialect,
      status: e.status,
      createdAt: e.createdAt?.toISOString?.() || e.createdAt
    }))

    return {
      data,
      total: data.length
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || '重複性檢測失敗'
    })
  }
})
