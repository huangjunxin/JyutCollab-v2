import type { EditHistory as EditHistoryType, PaginatedResponse } from '~/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<EditHistoryType>> => {
  try {
    await connectDB()

    const entryId = getRouterParam(event, 'entryId')
    const page = parseInt(getQuery(event).page as string) || 1
    const perPage = parseInt(getQuery(event).perPage as string) || 20

    const filter: any = {}
    if (entryId) {
      filter.entryId = entryId
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
