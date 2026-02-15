
export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    // 支持通過 id 或 _id 查找
    const entry = await Entry.findOne({
      $or: [
        { id },
        { _id: id }
      ]
    }).lean()

    if (!entry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    // 增加瀏覽計數
    await Entry.updateOne(
      { _id: entry._id },
      { $inc: { viewCount: 1 } }
    )

    // 轉換響應格式
    const response = {
      success: true,
      data: {
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
        examples: entry.senses?.[0]?.examples?.map((ex: any) => ({
          sentence: ex.text,
          text: ex.text,
          jyutping: ex.jyutping,
          translation: ex.translation,
          explanation: ex.explanation,
          scenario: ex.scenario
        })),
        phoneticNotation: entry.phonetic?.jyutping?.join(' '),
        notationSystem: 'jyutping' as const,
        // 通用字段
        status: entry.status,
        createdBy: entry.createdBy,
        contributorId: entry.createdBy,
        updatedBy: entry.updatedBy,
        reviewedBy: entry.reviewedBy,
        reviewedAt: entry.reviewedAt?.toISOString(),
        reviewNotes: entry.reviewNotes,
        viewCount: entry.viewCount + 1,
        likeCount: entry.likeCount,
        createdAt: entry.createdAt?.toISOString?.() || entry.createdAt,
        updatedAt: entry.updatedAt?.toISOString?.() || entry.updatedAt
      }
    }

    return response
  } catch (error: any) {
    console.error('Get entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '獲取詞條失敗'
    })
  }
})
