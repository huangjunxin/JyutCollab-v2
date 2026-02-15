import type { EditHistory as EditHistoryType, PaginatedResponse } from '~/types'

export default defineEventHandler(async (event): Promise<PaginatedResponse<EditHistoryType>> => {
  try {
    await connectDB()

    const page = parseInt(getQuery(event).page as string) || 1
    const perPage = parseInt(getQuery(event).perPage as string) || 20
    const entryId = getQuery(event).entryId as string | undefined
    const action = getQuery(event).action as string | undefined

    const filter: any = {}
    if (entryId) {
      filter.entryId = entryId
    }
    if (action && ['create', 'update', 'delete', 'status_change'].includes(action)) {
      filter.action = action
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

    // Get unique user IDs
    const userIds = [...new Set(histories.map(h => h.userId))]
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username displayName')
      .lean()
    const userMap = new Map(users.map(u => [u._id.toString(), u]))

    const data = histories.map(h => {
      const user = userMap.get(h.userId)
      return {
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
        revertedBy: h.revertedBy,
        user: user ? {
          id: user._id.toString(),
          username: user.username,
          displayName: user.displayName
        } : undefined
      }
    })

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
