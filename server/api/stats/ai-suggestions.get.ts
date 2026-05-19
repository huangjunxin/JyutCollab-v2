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

    const suggestionTypeFilter = { suggestionType: { $in: ['definition', 'theme_classification', 'example'] } }
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
      modified: 0
    }

    byAction.forEach((item: { _id?: keyof typeof actions; count: number }) => {
      if (item._id && item._id in actions) actions[item._id] = item.count
    })

    const typeLabels = {
      definition: '釋義',
      theme_classification: '分類',
      example: '例句'
    }

    const byTypeMap = new Map<string, {
      type: string
      label: string
      total: number
      pending: number
      accepted: number
      rejected: number
      modified: number
      acceptanceRate: number
      modificationRate: number
      rejectionRate: number
    }>()

    ;(['definition', 'theme_classification', 'example'] as const).forEach((type) => {
      byTypeMap.set(type, {
        type,
        label: typeLabels[type],
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        modified: 0,
        acceptanceRate: 0,
        modificationRate: 0,
        rejectionRate: 0
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

    const byTypeRows = Array.from(byTypeMap.values()).map(row => ({
      ...row,
      acceptanceRate: row.total > 0 ? row.accepted / row.total : 0,
      modificationRate: row.total > 0 ? row.modified / row.total : 0,
      rejectionRate: row.total > 0 ? row.rejected / row.total : 0
    }))

    return {
      total,
      ...actions,
      acceptanceRate: total > 0 ? actions.accepted / total : 0,
      modificationRate: total > 0 ? actions.modified / total : 0,
      rejectionRate: total > 0 ? actions.rejected / total : 0,
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
