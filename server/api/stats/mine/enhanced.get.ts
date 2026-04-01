/**
 * 返回當前用戶的增強統計數據
 * 包括：按方言分布、按類型分布、最近活動、連續貢獻、審批通過率等
 */
import { Entry } from '../../../utils/Entry'
import { connectDB } from '../../../utils/db'
import { EditHistory } from '../../../utils/EditHistory'

interface DialectStat {
  dialect: string
  count: number
  approved: number
}

interface TypeStat {
  type: string
  count: number
}

interface DailyActivity {
  date: string
  created: number
  approved: number
  updated: number
}

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const userId = event.context.auth.id

  try {
    await connectDB()

    const baseFilter = { createdBy: userId }

    // 基礎統計
    const [total, pending, approved, rejected] = await Promise.all([
      Entry.countDocuments(baseFilter),
      Entry.countDocuments({ ...baseFilter, status: 'pending_review' }),
      Entry.countDocuments({ ...baseFilter, status: 'approved' }),
      Entry.countDocuments({ ...baseFilter, status: 'rejected' })
    ])

    // 按方言統計
    const dialectAggregation = await Entry.aggregate([
      { $match: baseFilter },
      { $group: {
        _id: '$dialect.name',
        count: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      }},
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    const byDialect: DialectStat[] = dialectAggregation.map(d => ({
      dialect: d._id || '未知',
      count: d.count,
      approved: d.approved
    }))

    // 按詞條類型統計
    const typeAggregation = await Entry.aggregate([
      { $match: baseFilter },
      { $group: {
        _id: '$entryType',
        count: { $sum: 1 }
      }},
      { $sort: { count: -1 } }
    ])

    const byType: TypeStat[] = typeAggregation.map(t => ({
      type: t._id || '未知',
      count: t.count
    }))

    // 最近30天活動統計
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentEntries = await Entry.find({
      ...baseFilter,
      createdAt: { $gte: thirtyDaysAgo }
    }).select('createdAt status').lean()

    const recentUpdates = await EditHistory.countDocuments({
      userId,
      action: 'update',
      createdAt: { $gte: thirtyDaysAgo }
    })

    // 按日期分組活動
    const dailyActivityMap = new Map<string, { created: number; approved: number; updated: number }>()

    recentEntries.forEach(entry => {
      const date = entry.createdAt.toISOString().split('T')[0]
      const existing = dailyActivityMap.get(date) || { created: 0, approved: 0, updated: 0 }
      existing.created += 1
      if (entry.status === 'approved') {
        existing.approved += 1
      }
      dailyActivityMap.set(date, existing)
    })

    // 連續貢獻天數計算
    const allEntryDates = await Entry.distinct('createdAt', baseFilter)
    const uniqueDates = [...new Set(
      allEntryDates
        .filter(d => d instanceof Date)
        .map(d => (d as Date).toISOString().split('T')[0])
    )].sort((a, b) => b.localeCompare(a))

    let currentStreak = 0
    let longestStreak = 0
    const today = new Date().toISOString().split('T')[0]

    if (uniqueDates.length > 0) {
      // 計算最長連續天數
      let tempStreak = 1
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1])
        const currDate = new Date(uniqueDates[i])
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          tempStreak++
        } else {
          longestStreak = Math.max(longestStreak, tempStreak)
          tempStreak = 1
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak)

      // 計算當前連續天數
      const lastContributionDate = uniqueDates[0]
      const lastDate = new Date(lastContributionDate)
      const todayDate = new Date(today)
      const daysSinceLastContribution = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastContribution <= 1) {
        // 從最近一次貢獻開始計算連續天數
        let checkDate = daysSinceLastContribution === 0 ? today : new Date(todayDate.getTime() - 86400000).toISOString().split('T')[0]
        currentStreak = 0

        for (const date of uniqueDates) {
          if (date === checkDate || (currentStreak === 0 && new Date(date) <= new Date(checkDate))) {
            currentStreak++
            const prevDate = new Date(checkDate)
            prevDate.setDate(prevDate.getDate() - 1)
            checkDate = prevDate.toISOString().split('T')[0]
          } else if (currentStreak > 0) {
            break
          }
        }
      }
    }

    // 審批通過率
    const reviewedCount = approved + rejected
    const approvalRate = reviewedCount > 0 ? approved / reviewedCount : 0

    // 平均審核時間（針對已審核的詞條）
    const approvedEntries = await Entry.find({
      ...baseFilter,
      status: { $in: ['approved', 'rejected'] },
      reviewedAt: { $exists: true }
    }).select('createdAt reviewedAt').lean()

    let totalReviewDays = 0
    approvedEntries.forEach(entry => {
      if (entry.reviewedAt && entry.createdAt) {
        const diffMs = new Date(entry.reviewedAt).getTime() - new Date(entry.createdAt).getTime()
        totalReviewDays += diffMs / (1000 * 60 * 60 * 24)
      }
    })
    const avgReviewTime = approvedEntries.length > 0 ? totalReviewDays / approvedEntries.length : 0

    // 最近7天統計
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentActivity = {
      entriesCreated: await Entry.countDocuments({ ...baseFilter, createdAt: { $gte: sevenDaysAgo } }),
      entriesApproved: await Entry.countDocuments({ ...baseFilter, status: 'approved', reviewedAt: { $gte: sevenDaysAgo } }),
      entriesUpdated: recentUpdates
    }

    return {
      // 基礎統計
      total,
      pending,
      approved,
      rejected,
      // 新增維度
      byDialect,
      byType,
      recentActivity,
      streak: {
        current: currentStreak,
        longest: longestStreak
      },
      approvalRate: Math.round(approvalRate * 100) / 100,
      avgReviewTime: Math.round(avgReviewTime * 10) / 10,
      dailyActivity: Object.entries(dailyActivityMap)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30)
    }
  } catch (error: any) {
    console.error('[Stats Mine Enhanced API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取增強統計失敗'
    })
  }
})
