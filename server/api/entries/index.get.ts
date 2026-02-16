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
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  groupBy: z.enum(['headword']).optional() // 聚合視圖：按詞形分組
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
      sortOrder,
      groupBy
    } = validated.data

    // Build filter
    const filter: Record<string, any> = {}

    if (searchQuery) {
      filter.$or = [
        // 主詞頭
        { 'headword.display': { $regex: searchQuery, $options: 'i' } },
        // 異形詞（variants 為 string[]，Mongo 會對每個元素應用 regex）
        { 'headword.variants': { $regex: searchQuery, $options: 'i' } },
        // 釋義
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

    const skip = (page - 1) * perPage

    const transformEntry = (entry: any) => ({
      id: entry.id || entry._id?.toString?.(),
      sourceBook: entry.sourceBook,
      dialect: entry.dialect,
      headword: entry.headword,
      phonetic: entry.phonetic,
      entryType: entry.entryType,
      senses: entry.senses,
      refs: entry.refs,
      theme: entry.theme,
      meta: entry.meta,
      text: entry.headword?.display,
      // 舊字段：用 display + 第一個異形詞作簡單兼容
      textNormalized: entry.headword?.variants?.[0] ?? entry.headword?.display,
      region: entry.dialect?.name,
      themeIdL1: entry.theme?.level1Id,
      themeIdL2: entry.theme?.level2Id,
      themeIdL3: entry.theme?.level3Id,
      definition: entry.senses?.[0]?.definition,
      usageNotes: entry.meta?.usage,
      formalityLevel: entry.meta?.register,
      examples: entry.senses?.[0]?.examples,
      phoneticNotation: entry.phonetic?.jyutping?.join?.(' '),
      notationSystem: 'jyutping' as const,
      status: entry.status,
      createdBy: entry.createdBy,
      contributorId: entry.createdBy,
      updatedBy: entry.updatedBy,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt?.toISOString?.(),
      reviewNotes: entry.reviewNotes,
      viewCount: entry.viewCount ?? 0,
      likeCount: entry.likeCount ?? 0,
      createdAt: entry.createdAt?.toISOString?.() ?? entry.createdAt,
      updatedAt: entry.updatedAt?.toISOString?.() ?? entry.updatedAt
    })

    if (groupBy === 'headword') {
      const sortStage = Object.keys(sort).length ? { $sort: sort } : { $sort: { 'headword.display': 1 } }
      const groupKey = { $ifNull: ['$headword.normalized', '$headword.display'] }
      const facetResult = await Entry.aggregate([
        { $match: filter },
        sortStage,
        {
          $facet: {
            totalGroups: [
              { $group: { _id: groupKey } },
              { $count: 'count' }
            ],
            groups: [
              { $group: { _id: groupKey, headwordDisplay: { $first: '$headword.display' }, entries: { $push: '$$ROOT' } } },
              { $sort: { _id: sortOrder === 'asc' ? 1 : -1 } },
              { $skip: skip },
              { $limit: perPage }
            ]
          }
        }
      ])
      const total = facetResult[0]?.totalGroups?.[0]?.count ?? 0
      const groups = (facetResult[0]?.groups ?? []).map((g: any) => ({
        headwordNormalized: g._id,
        headwordDisplay: g.headwordDisplay ?? g._id,
        entries: (g.entries ?? []).map((e: any) => transformEntry(e))
      }))
      return {
        data: groups,
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
        grouped: true
      }
    }

    const [entries, total] = await Promise.all([
      Entry.find(filter).sort(sort).skip(skip).limit(perPage).lean(),
      Entry.countDocuments(filter)
    ])
    const data = entries.map((entry: any) => transformEntry(entry))

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
