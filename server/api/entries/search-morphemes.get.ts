import { z } from 'zod'
import { Entry } from '../../utils/Entry'
import { connectDB } from '../../utils/db'

const QuerySchema = z.object({
  // 搜索參數（可選，用於推薦）
  headword: z.string().optional(), // 當前詞條的詞頭
  dialect: z.string().optional(), // 當前詞條的方言點
  jyutping: z.string().optional(), // 當前詞條的粵拼（空格分隔）
  definition: z.string().optional(), // 當前詞條的釋義
  // 篩選參數
  entryType: z.enum(['character', 'word']).optional(), // 只搜索單音節詞（character）或詞（word，但通常是單音節）
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
})

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const query = getQuery(event)
    const parsed = QuerySchema.safeParse(query)

    if (!parsed.success) {
      throw createError({
        statusCode: 400,
        message: '無效的查詢參數'
      })
    }

    const { headword, dialect, jyutping, definition, entryType, limit } = parsed.data

    // 構建搜索條件：優先搜索單音節詞（character）或短詞（word，但 headword.display 長度 <= 1）
    const filter: any = {
      // 只搜索已審核通過的詞條
      status: 'approved'
    }

    // 如果指定了 entryType，使用它；否則默認搜索 character（單音節字）
    if (entryType) {
      filter.entryType = entryType
    } else {
      // 默認：搜索單音節字（character）或單字詞（word 但 display 長度為 1）
      filter.$or = [
        { entryType: 'character' },
        { entryType: 'word', 'headword.display': { $regex: /^.$/u } } // 單個字符
      ]
    }

    // 如果有方言點參數，優先搜索同方言點的詞素（可選：同方言更貼合，但若無結果可考慮放寬）
    if (dialect) {
      filter['dialect.name'] = dialect
    }

    // 詞素推薦：以「詞頭拆字」為主——多音節詞「有圖」應搜出單字「有」「圖」
    // 若傳入詞頭，則只按詞頭中的每個單字精確匹配，不再要求同一條目同時符合粵拼、釋義（否則永遠搜不到）
    const headwordChars = headword
      ? Array.from(headword).filter(c => c !== '□' && c.trim() && c.length === 1)
      : []

    if (headwordChars.length > 0) {
      // 單字精確匹配：headword.display 等於其中一個字即可
      filter['headword.display'] = { $in: headwordChars }
    } else {
      // 未傳詞頭時，才用粵拼或釋義做輔助搜索（任一匹配即可）
      const orConditions: any[] = []
      if (jyutping) {
        const jyutpingParts = jyutping.split(/\s+/).filter(Boolean)
        if (jyutpingParts.length > 0) {
          orConditions.push({ 'phonetic.jyutping': { $in: jyutpingParts } })
        }
      }
      if (definition) {
        const keywords = definition.split(/[\s，,。.；;：:]/).filter(k => k.length > 1)
        if (keywords.length > 0) {
          orConditions.push({ 'senses.definition': { $regex: keywords.join('|'), $options: 'i' } })
        }
      }
      if (orConditions.length > 0) {
        filter.$or = (filter.$or ? [filter.$or] : []).concat({ $or: orConditions }) as any
        // 若原本有 entryType 的 $or，需要合併進一個大 $and
        if (filter.$or && filter.entryType === undefined) {
          const entryTypeOr = filter.$or
          delete filter.$or
          filter.$and = [
            entryTypeOr,
            orConditions.length === 1 ? orConditions[0] : { $or: orConditions }
          ]
        }
      }
    }

    // 執行搜索
    let results = await Entry.find(filter)
      .select('id headword phonetic senses dialect entryType')
      .limit(limit)
      .sort({ viewCount: -1, createdAt: -1 })
      .lean()

    // 有詞頭拆字且指定了方言時：若同方言無結果，則放寬為不限制方言再搜一次（方便跨方言引用字）
    if (headwordChars.length > 0 && dialect && Array.isArray(results) && results.length === 0) {
      const relaxedFilter = { ...filter }
      delete relaxedFilter['dialect.name']
      results = await Entry.find(relaxedFilter)
        .select('id headword phonetic senses dialect entryType')
        .limit(limit)
        .sort({ viewCount: -1, createdAt: -1 })
        .lean()
    }

    // 轉換結果
    const transformed = results.map((entry: any) => ({
      id: entry.id || entry._id?.toString(),
      headword: entry.headword?.display || '',
      jyutping: Array.isArray(entry.phonetic?.jyutping) ? entry.phonetic.jyutping.join(' ') : '',
      definition: entry.senses?.[0]?.definition || '',
      dialect: entry.dialect?.name || '',
      entryType: entry.entryType || 'word'
    }))

    return {
      success: true,
      data: transformed,
      total: transformed.length
    }
  } catch (error: any) {
    console.error('Search morphemes error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '搜索詞素失敗'
    })
  }
})
