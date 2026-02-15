import type { EditHistory as EditHistoryType, PaginatedResponse } from '~/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<EditHistoryType>> => {
  try {
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const entryIdParam = getRouterParam(event, 'entryId')
    if (!entryIdParam) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    const page = parseInt(getQuery(event).page as string) || 1
    const perPage = parseInt(getQuery(event).perPage as string) || 20
    const userRole = event.context.auth.role
    const userId = event.context.auth.id

    // 解析 entryId（可能為自定義 id 或 MongoDB _id），歷史記錄存的是 entry._id.toString()
    let entry = await Entry.findOne({ id: entryIdParam })
    if (!entry && /^[a-f\d]{24}$/i.test(entryIdParam)) {
      entry = await Entry.findById(entryIdParam)
    }
    if (!entry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    const filter: Record<string, unknown> = {}
    if (entry) {
      filter.entryId = entry._id.toString()
    }

    // 貢獻者只能查看自己創建的詞條的歷史，且僅顯示自己的操作記錄；審核員/管理員可查看任意詞條的全部歷史
    if (userRole === 'contributor') {
      if (!entry || entry.createdBy !== userId) {
        throw createError({
          statusCode: 403,
          message: '無權查看此詞條的編輯歷史'
        })
      }
      filter.userId = userId
    }

    const skip = (page - 1) * perPage
    const [histories, total] = await Promise.all([
      EditHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      EditHistory.countDocuments(filter)
    ])

    const data = histories.map(h => ({
      id: h._id.toString(),
      entryId: h.entryId,
      userId: h.userId,
      beforeSnapshot: h.beforeSnapshot,
      afterSnapshot: h.afterSnapshot,
      changedFields: h.changedFields,
      action: h.action,
      comment: h.comment,
      createdAt: h.createdAt.toISOString(),
      isReverted: h.isReverted || false,
      revertedAt: h.revertedAt?.toISOString(),
      revertedBy: h.revertedBy
    }))

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  } catch (error: any) {
    console.error('Get histories error:', error)
    throw createError({
      statusCode: 500,
      message: '獲取歷史記錄失敗'
    })
  }
})
