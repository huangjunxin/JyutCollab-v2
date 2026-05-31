import { getActiveAuthUserById } from '../../utils/auth'

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

    const lookupConditions: Record<string, any>[] = [{ id }]
    if (/^[a-f\d]{24}$/i.test(id)) {
      lookupConditions.push({ _id: id })
    }

    const entry = await Entry.findOne({ $or: lookupConditions }).lean()

    if (!entry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    const session = await getUserSession(event)
    const viewer = session?.user?.id ? await getActiveAuthUserById(session.user.id) : null
    const isReviewerOrAdmin = viewer?.role === 'admin' || viewer?.role === 'reviewer'
    const isOwner = viewer?.id === entry.createdBy
    const canView = entry.status === 'approved' || isReviewerOrAdmin || isOwner

    if (!canView) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    // 增加瀏覽計數並取回更新後的值
    const viewCountResult = await Entry.findByIdAndUpdate(
      entry._id,
      { $inc: { viewCount: 1 } },
      { new: true, projection: { viewCount: 1 } }
    ).lean()
    const currentViewCount = viewCountResult?.viewCount ?? ((entry.viewCount ?? 0) + 1)

    // 解析提交者顯示名稱（優先顯示名稱，其次用戶名）
    let createdByDisplay = entry.createdBy
    if (entry.createdBy) {
      const isObjectId = /^[a-f\d]{24}$/i.test(entry.createdBy)
      const creator = await User.findOne(
        isObjectId ? { _id: entry.createdBy } : { username: entry.createdBy }
      )
        .select('username displayName')
        .lean()
      if (creator) {
        createdByDisplay = (creator as any).displayName || (creator as any).username
      }
    }

    // 轉換響應格式
    const response = {
      success: true,
      data: {
        id: entry.id || entry._id.toString(),
        // 新格式字段
        sourceBook: entry.sourceBook,
        lexemeId: entry.lexemeId,
        morphemeRefs: entry.morphemeRefs,
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
        textNormalized: entry.headword?.normalized,
        region: entry.dialect?.name,
        themeIdL1: entry.theme?.level1Id,
        themeIdL2: entry.theme?.level2Id,
        themeIdL3: entry.theme?.level3Id,
        definition: entry.senses?.[0]?.definition,
        usageNotes: entry.meta?.usage,
        examples: entry.senses?.[0]?.examples?.map((ex: any) => ({
          sentence: ex.text,
          text: ex.text,
          jyutping: ex.jyutping,
          translation: ex.translation,
          explanation: ex.explanation,
          scenario: ex.scenario
        })),
        phoneticNotation: entry.phonetic?.jyutping?.join('; '),
        notationSystem: 'jyutping' as const,
        // 通用字段
        status: entry.status,
        createdBy: createdByDisplay,
        contributorId: entry.createdBy,
        updatedBy: entry.updatedBy,
        reviewedBy: entry.reviewedBy,
        reviewedAt: entry.reviewedAt?.toISOString(),
        reviewNotes: entry.reviewNotes,
        viewCount: currentViewCount,
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
