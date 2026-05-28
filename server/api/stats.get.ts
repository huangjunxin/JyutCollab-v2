/**
 * 返回詞條統計：總數、已發佈、待審核、已拒絕。
 * 供左側欄統計數據使用，無需登入。
 */
import { Entry } from '../utils/Entry'
import { EditHistory } from '../utils/EditHistory'
import { connectDB } from '../utils/db'

export default defineEventHandler(async () => {
  try {
    await connectDB()

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [approved, contributors, activeContributors, recentContributions] = await Promise.all([
      Entry.countDocuments({ status: 'approved' }),
      Entry.distinct('createdBy', { status: 'approved' }).then(userIds => userIds.filter(Boolean).length),
      EditHistory.distinct('userId', { createdAt: { $gte: sevenDaysAgo } }).then(userIds => userIds.filter(Boolean).length),
      EditHistory.countDocuments({ createdAt: { $gte: sevenDaysAgo } })
    ])

    return { total: approved, approved, pending: 0, rejected: 0, contributors, activeContributors, recentContributions }
  } catch (error: any) {
    console.error('[Stats API]', error?.message || error)
    throw createError({
      statusCode: 500,
      message: error?.message || '獲取統計失敗'
    })
  }
})
