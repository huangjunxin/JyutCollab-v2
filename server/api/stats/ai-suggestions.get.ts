import { AISuggestion } from '../../utils/AISuggestion'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const user = event.context.auth
  if (user.role !== 'reviewer' && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      message: '無權訪問 AI 建議統計'
    })
  }

  try {
    await connectDB()

    const suggestionTypeFilter = { suggestionType: { $in: ['definition', 'theme_classification', 'example', 'register'] } }
    const [byAction, byType, total] = await Promise.all([
      AISuggestion.aggregate([
        { $match: suggestionTypeFilter },
        { $group: { _id: '$userAction', count: { $sum: 1 } } }
      ]),
      AISuggestion.aggregate([
        { $match: suggestionTypeFilter },
        {
          $group: {
            _id: {
              type: '$suggestionType',
              action: '$userAction'
            },
            count: { $sum: 1 }
          }
        }
      ]),
      AISuggestion.countDocuments(suggestionTypeFilter)
    ])

    const actions = {
      pending: 0,
      accepted: 0,
      rejected: 0,
      modified: 0,
      ignored: 0
    }

    byAction.forEach((item: { _id?: keyof typeof actions; count: number }) => {
      if (item._id && item._id in actions) actions[item._id] = item.count
    })

    const typeLabels = {
      definition: '釋義',
      theme_classification: '分類',
      example: '例句',
      register: '語域'
    }

    const byTypeMap = new Map<string, {
      type: string
      label: string
      total: number
      pending: number
      accepted: number
      rejected: number
      modified: number
      ignored: number
      acceptanceRate: number
      modificationRate: number
      rejectionRate: number
      ignoredRate: number
    }>()

    ;(['definition', 'theme_classification', 'example', 'register'] as const).forEach((type) => {
      byTypeMap.set(type, {
        type,
        label: typeLabels[type],
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        ignored: 0,
        acceptanceRate: 0,
        modificationRate: 0,
        rejectionRate: 0,
        ignoredRate: 0
      })
    })

    byType.forEach((item: { _id?: { type?: string; action?: keyof typeof actions }; count: number }) => {
      const type = item._id?.type
      const action = item._id?.action
      if (!type || !action) return
      const row = byTypeMap.get(type)
      if (!row || !(action in actions)) return
      row[action] = item.count
      row.total += item.count
    })

    // 被評估過的建議（用戶明確操作過）= accepted + rejected + modified
    const reviewedTotal = actions.accepted + actions.rejected + actions.modified

    const byTypeRows = Array.from(byTypeMap.values()).map(row => {
      const rowReviewed = row.accepted + row.rejected + row.modified
      return {
        ...row,
        // 採納率 = 採納數 / 被評估數（只看用戶操作過的，不含 pending/ignored）
        acceptanceRate: rowReviewed > 0 ? row.accepted / rowReviewed : 0,
        modificationRate: rowReviewed > 0 ? row.modified / rowReviewed : 0,
        rejectionRate: rowReviewed > 0 ? row.rejected / rowReviewed : 0,
        // 忽略率 = 忽略數 / 總數
        ignoredRate: row.total > 0 ? row.ignored / row.total : 0
      }
    })

    return {
      total,
      reviewedTotal,
      ...actions,
      // 採納率 = 採納數 / 被評估數
      acceptanceRate: reviewedTotal > 0 ? actions.accepted / reviewedTotal : 0,
      modificationRate: reviewedTotal > 0 ? actions.modified / reviewedTotal : 0,
      rejectionRate: reviewedTotal > 0 ? actions.rejected / reviewedTotal : 0,
      // 互動率 = 被評估數 / 總數
      engagementRate: total > 0 ? reviewedTotal / total : 0,
      // 忽略率 = 忽略數 / 總數
      ignoredRate: total > 0 ? actions.ignored / total : 0,
      byType: byTypeRows
    }
  } catch (error: any) {
    console.error('[AI Suggestion Stats API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取 AI 建議統計失敗'
    })
  }
})
