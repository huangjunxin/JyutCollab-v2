import {
  ReferenceHelperEvent,
  REFERENCE_HELPER_LABELS,
  REFERENCE_HELPER_TYPES,
  type ReferenceHelperAction,
  type ReferenceHelperType
} from '../../utils/ReferenceHelperEvent'
import { connectDB } from '../../utils/db'

const actions: Record<ReferenceHelperAction, number> = {
  pending: 0,
  accepted: 0,
  rejected: 0,
  modified: 0
}

function getRates(counts: typeof actions) {
  const total = counts.pending + counts.accepted + counts.rejected + counts.modified
  const reviewed = counts.accepted + counts.modified + counts.rejected
  const adopted = counts.accepted + counts.modified

  return {
    total,
    reviewed,
    adopted,
    adoptionRate: reviewed > 0 ? adopted / reviewed : 0,
    acceptanceRate: total > 0 ? counts.accepted / total : 0,
    modificationRate: total > 0 ? counts.modified / total : 0,
    rejectionRate: total > 0 ? counts.rejected / total : 0
  }
}

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
      message: '無權訪問參考資料輔助統計'
    })
  }

  try {
    await connectDB()

    const query = getQuery(event)
    const helperTypes = query.scope === 'filling'
      ? REFERENCE_HELPER_TYPES.filter(type => !['morpheme_search', 'morpheme_linked', 'morpheme_unlinked', 'external_etymon'].includes(type))
      : REFERENCE_HELPER_TYPES
    const helperTypeFilter = { helperType: { $in: helperTypes } }

    const [byAction, byType] = await Promise.all([
      ReferenceHelperEvent.aggregate([
        { $match: helperTypeFilter },
        { $group: { _id: '$userAction', count: { $sum: 1 } } }
      ]),
      ReferenceHelperEvent.aggregate([
        { $match: helperTypeFilter },
        {
          $group: {
            _id: {
              type: '$helperType',
              action: '$userAction'
            },
            count: { $sum: 1 }
          }
        }
      ])
    ])

    const globalCounts = { ...actions }
    byAction.forEach((item: { _id?: ReferenceHelperAction; count: number }) => {
      if (item._id && item._id in globalCounts) globalCounts[item._id] = item.count
    })

    const byTypeMap = new Map<ReferenceHelperType, {
      type: ReferenceHelperType
      label: string
      pending: number
      accepted: number
      rejected: number
      modified: number
    }>()

    helperTypes.forEach((type) => {
      byTypeMap.set(type, {
        type,
        label: REFERENCE_HELPER_LABELS[type],
        pending: 0,
        accepted: 0,
        rejected: 0,
        modified: 0
      })
    })

    byType.forEach((item: { _id?: { type?: ReferenceHelperType; action?: ReferenceHelperAction }; count: number }) => {
      const type = item._id?.type
      const action = item._id?.action
      if (!type || !action) return
      const row = byTypeMap.get(type)
      if (!row || !(action in actions)) return
      row[action] = item.count
    })

    const byTypeRows = Array.from(byTypeMap.values()).map((row) => ({
      ...row,
      ...getRates(row)
    }))

    return {
      ...globalCounts,
      ...getRates(globalCounts),
      byType: byTypeRows
    }
  } catch (error: any) {
    console.error('[Reference Helper Stats API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取參考資料輔助統計失敗'
    })
  }
})
