import { z } from 'zod'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().optional(),
  dialectName: z.string().optional(), // 新字段
  region: z.string().optional(), // 兼容舊字段
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  entryType: z.enum(['character', 'word', 'phrase']).optional(),
  themeLevel1: z.string().optional(),
  themeLevel2: z.string().optional(),
  themeLevel3: z.string().optional(),
  themeIdL1: z.coerce.number().int().optional(),
  themeIdL2: z.coerce.number().int().optional(),
  themeIdL3: z.coerce.number().int().optional(),
  createdBy: z.string().optional(),
  contributorId: z.string().optional(), // 兼容舊字段
  register: z.enum(['口語', '書面', '粗俗', '文雅', '中性']).optional(),
  formalityLevel: z.enum(['formal', 'neutral', 'informal', 'slang', 'vulgar']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'viewCount', 'likeCount', 'headword']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const query = getQuery(event)
    const validated = QuerySchema.safeParse(query)

    if (!validated.success) {
      const issues = validated.error?.issues ?? []
      console.error('[Entries API] Validation error:', issues)
      throw createError({
        statusCode: 400,
        message: issues[0]?.message || '查詢參數無效'
      })
    }

    const {
      page,
      perPage,
      query: searchQuery,
      dialectName,
      region,
      status,
      entryType,
      themeLevel1,
      themeLevel2,
      themeLevel3,
      themeIdL1,
      themeIdL2,
      themeIdL3,
      createdBy,
      contributorId,
      register,
      formalityLevel,
      sortBy,
      sortOrder
    } = validated.data

    // Build filter
    const filter: Record<string, any> = {}

    if (searchQuery) {
      filter.$or = [
        { 'headword.display': { $regex: searchQuery, $options: 'i' } },
        { 'headword.search': { $regex: searchQuery.toLowerCase(), $options: 'i' } },
        { 'senses.definition': { $regex: searchQuery, $options: 'i' } }
      ]
    }

    // 方言篩選（兼容新舊字段）
    const dialect = dialectName || region
    if (dialect) filter['dialect.name'] = dialect

    if (status) filter.status = status
    if (entryType) filter.entryType = entryType

    // 主題篩選
    if (themeLevel1) filter['theme.level1'] = themeLevel1
    if (themeLevel2) filter['theme.level2'] = themeLevel2
    if (themeLevel3) filter['theme.level3'] = themeLevel3
    if (themeIdL1) filter['theme.level1Id'] = themeIdL1
    if (themeIdL2) filter['theme.level2Id'] = themeIdL2
    if (themeIdL3) filter['theme.level3Id'] = themeIdL3

    // 創建者篩選（兼容新舊字段）
    const creator = createdBy || contributorId
    if (creator) filter.createdBy = creator

    // 語域篩選
    if (register) filter['meta.register'] = register

    // Build sort
    const sort: Record<string, 1 | -1> = {}
    if (sortBy === 'headword') {
      sort['headword.display'] = sortOrder === 'asc' ? 1 : -1
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1
    }

    // Execute query
    const skip = (page - 1) * perPage
    const [entries, total] = await Promise.all([
      Entry.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),
      Entry.countDocuments(filter)
    ])

    // Transform entries for response
    const data = entries.map(entry => ({
      id: entry.id || entry._id.toString(),
      // 新格式字段
      sourceBook: entry.sourceBook,
      dialect: entry.dialect,
      headword: entry.headword,
      phonetic: entry.phonetic,
      entryType: entry.entryType,
      senses: entry.senses,
      refs: entry.refs,
      theme: entry.theme,
      meta: entry.meta,
      // 兼容舊格式字段
      text: entry.headword?.display,
      textNormalized: entry.headword?.search,
      region: entry.dialect?.name,
      themeIdL1: entry.theme?.level1Id,
      themeIdL2: entry.theme?.level2Id,
      themeIdL3: entry.theme?.level3Id,
      definition: entry.senses?.[0]?.definition,
      usageNotes: entry.meta?.usage,
      formalityLevel: entry.meta?.register,
      examples: entry.senses?.[0]?.examples,
      phoneticNotation: entry.phonetic?.jyutping?.join(' '),
      notationSystem: 'jyutping' as const,
      // 通用字段
      status: entry.status,
      createdBy: entry.createdBy,
      contributorId: entry.createdBy, // 兼容
      updatedBy: entry.updatedBy,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt?.toISOString(),
      reviewNotes: entry.reviewNotes,
      viewCount: entry.viewCount,
      likeCount: entry.likeCount,
      createdAt: entry.createdAt?.toISOString?.() || entry.createdAt,
      updatedAt: entry.updatedAt?.toISOString?.() || entry.updatedAt
    }))

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  } catch (error: any) {
    console.error('Get entries error:', error.message || error)
    console.error('Error stack:', error.stack)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error.message || '獲取詞條列表失敗'
    })
  }
})
