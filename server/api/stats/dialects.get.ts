/**
 * 返回方言覆蓋度統計
 * 直接顯示每個方言點的詞條數量
 */
import { Entry } from '../../utils/Entry'
import { User } from '../../utils/User'
import { connectDB } from '../../utils/db'
import { DIALECT_IDS, DIALECT_LABELS, getDialectColor } from '~shared/dialects'

interface DialectCoverage {
  id: string
  name: string
  entries: number
  approved: number
  contributors: number
  color: string
}

interface UserDialectStats {
  id: string
  name: string
  entries: number
  approved: number
  hasPermission: boolean
}

export default defineEventHandler(async (event) => {
  const userId = event.context.auth?.id

  try {
    await connectDB()

    // 獲取每個方言的詞條統計
    const dialectStats = await Entry.aggregate([
      {
        $group: {
          _id: '$dialect.name',
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          contributors: { $addToSet: '$createdBy' }
        }
      }
    ])

    // 獲取用戶的方言權限
    let userDialectPermissions: string[] = []
    if (userId) {
      const user = await User.findById(userId).select('dialectPermissions').lean()
      if (user?.dialectPermissions) {
        userDialectPermissions = user.dialectPermissions.map((p: any) => p.dialectName)
      }
    }

    // 構建方言覆蓋數據
    const dialectMap = new Map<string, { entries: number; approved: number; contributors: number }>()

    dialectStats.forEach(stat => {
      const name = stat._id || '其他'
      dialectMap.set(name, {
        entries: stat.total,
        approved: stat.approved,
        contributors: stat.contributors?.length || 0
      })
    })

    // 構建方言列表（只返回有詞條的方言）
    const dialects: DialectCoverage[] = DIALECT_IDS
      .filter(id => id !== 'other')
      .map(id => {
        const name = DIALECT_LABELS[id]
        const stats = dialectMap.get(name)
        if (!stats || stats.entries === 0) return null
        return {
          id,
          name,
          entries: stats.entries,
          approved: stats.approved,
          contributors: stats.contributors,
          color: getDialectColor(id)
        }
      })
      .filter((d): d is DialectCoverage => d !== null)
      .sort((a, b) => b.entries - a.entries)

    // 統計覆蓋的方言數量
    const coveredCount = dialects.length
    const totalDialects = DIALECT_IDS.length - 1 // 排除 'other'

    // 用戶有權限方言的統計
    const userDialects: UserDialectStats[] = userId ? userDialectPermissions.map(dialectName => {
      const stats = dialectMap.get(dialectName) || { entries: 0, approved: 0 }
      const id = DIALECT_IDS.find(did => DIALECT_LABELS[did] === dialectName) || ''
      return {
        id,
        name: dialectName,
        entries: stats.entries,
        approved: stats.approved,
        hasPermission: true
      }
    }) : []

    return {
      totalDialects,
      coveredDialects: coveredCount,
      coverageRate: Math.round((coveredCount / totalDialects) * 100) / 100,
      dialects,
      userDialects
    }
  } catch (error: any) {
    console.error('[Stats Dialects API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取方言統計失敗'
    })
  }
})
