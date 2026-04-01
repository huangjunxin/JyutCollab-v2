/**
 * 返回審核員的增強統計數據
 * 包括：緊急度分桶、審核效率、按方言待審核分布等
 */
import { Entry } from '../../../utils/Entry'
import { connectDB } from '../../../utils/db'

interface UrgencyBucket {
  range: string
  count: number
}

interface DialectPending {
  dialect: string
  pending: number
  total: number
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
      message: '無權訪問審核統計'
    })
  }

  const userId = user.id

  try {
    await connectDB()

    // 基礎統計
    const [pending, reviewedByMe] = await Promise.all([
      Entry.countDocuments({ status: 'pending_review' }),
      Entry.countDocuments({ reviewedBy: userId })
    ])

    // 緊急度分桶（根據創建時間）
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      within24h,
      within3Days,
      within7Days,
      over7Days
    ] = await Promise.all([
      Entry.countDocuments({ status: 'pending_review', createdAt: { $gte: oneDayAgo } }),
      Entry.countDocuments({ status: 'pending_review', createdAt: { $gte: threeDaysAgo, $lt: oneDayAgo } }),
      Entry.countDocuments({ status: 'pending_review', createdAt: { $gte: sevenDaysAgo, $lt: threeDaysAgo } }),
      Entry.countDocuments({ status: 'pending_review', createdAt: { $lt: sevenDaysAgo } })
    ])

    const urgencyBuckets: UrgencyBucket[] = [
      { range: '24小時內', count: within24h },
      { range: '1-3天', count: within3Days },
      { range: '3-7天', count: within7Days },
      { range: '7天以上', count: over7Days }
    ]

    // 按方言統計待審核
    const dialectAggregation = await Entry.aggregate([
      { $match: { status: 'pending_review' } },
      { $group: {
        _id: '$dialect.name',
        pending: { $sum: 1 }
      }},
      { $sort: { pending: -1 } },
      { $limit: 10 }
    ])

    // 獲取每個方言的總數
    const dialectTotals = await Entry.aggregate([
      { $group: {
        _id: '$dialect.name',
        total: { $sum: 1 }
      }}
    ])

    const dialectTotalMap = new Map(dialectTotals.map(d => [d._id, d.total]))

    const byDialect: DialectPending[] = dialectAggregation.map(d => ({
      dialect: d._id || '未知',
      pending: d.pending,
      total: dialectTotalMap.get(d._id) || 0
    }))

    // 我的審核效率統計
    const myReviewedEntries = await Entry.find({
      reviewedBy: userId,
      reviewedAt: { $exists: true },
      createdAt: { $exists: true }
    }).select('createdAt reviewedAt status').lean()

    // 計算平均審核時間
    let totalReviewTime = 0
    let approvedCount = 0
    let rejectedCount = 0

    myReviewedEntries.forEach(entry => {
      if (entry.reviewedAt && entry.createdAt) {
        const diffMs = new Date(entry.reviewedAt).getTime() - new Date(entry.createdAt).getTime()
        totalReviewTime += diffMs / (1000 * 60 * 60) // 轉換為小時
      }
      if (entry.status === 'approved') approvedCount++
      if (entry.status === 'rejected') rejectedCount++
    })

    const avgReviewTime = myReviewedEntries.length > 0
      ? totalReviewTime / myReviewedEntries.length
      : 0

    const myApprovalRate = (approvedCount + rejectedCount) > 0
      ? approvedCount / (approvedCount + rejectedCount)
      : 0

    // 今日/本週審核數量
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [todayReviewed, thisWeekReviewed] = await Promise.all([
      Entry.countDocuments({ reviewedBy: userId, reviewedAt: { $gte: today } }),
      Entry.countDocuments({ reviewedBy: userId, reviewedAt: { $gte: weekAgo } })
    ])

    return {
      // 基礎統計
      pending,
      reviewedByMe,
      // 緊急度分桶
      urgencyBuckets,
      // 按方言分布
      byDialect,
      // 我的審核效率
      myPerformance: {
        avgReviewTime: Math.round(avgReviewTime * 10) / 10, // 小時
        approvalRate: Math.round(myApprovalRate * 100) / 100,
        todayReviewed,
        thisWeekReviewed
      }
    }
  } catch (error: any) {
    console.error('[Stats Reviewer Enhanced API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取審核統計失敗'
    })
  }
})
