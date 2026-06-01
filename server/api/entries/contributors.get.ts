import { Entry } from '../../utils/Entry'
import { User } from '../../utils/User'
import { connectDB } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const session = await getUserSession(event)
    const viewerId = session?.user?.id

    if (!viewerId) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }

    await connectDB()

    const viewer = await User.findOne({ _id: viewerId, isActive: true }).select('role username displayName').lean()

    if (!viewer) {
      throw createError({ statusCode: 401, message: '帳戶已停用或不存在' })
    }

    const isReviewerOrAdmin = viewer.role === 'reviewer' || viewer.role === 'admin'

    if (!isReviewerOrAdmin) {
      // 貢獻者只能看到自己
      return {
        data: [{
          id: viewer._id.toString(),
          displayName: (viewer as any).displayName || (viewer as any).username || '',
          username: (viewer as any).username || ''
        }]
      }
    }

    // 審核員/管理員：獲取所有有提交詞條的用戶
    const creatorIds = await Entry.distinct('createdBy', { createdBy: { $nin: [null, ''] } })

    if (creatorIds.length === 0) {
      return { data: [] }
    }

    // 過濾掉非 ObjectId 的值（如 "system-import" 等系統標記）
    const objectIdRegex = /^[a-f\d]{24}$/i
    const validCreatorIds = creatorIds.filter((id): id is string => typeof id === 'string' && objectIdRegex.test(id))

    if (validCreatorIds.length === 0) {
      return { data: [] }
    }

    // 查詢用戶顯示名稱
    const users = await User.find({
      _id: { $in: validCreatorIds },
      isActive: true
    })
      .select('username displayName')
      .lean()

    const data = users.map(u => ({
      id: u._id.toString(),
      displayName: (u as any).displayName || (u as any).username || '',
      username: (u as any).username || ''
    }))

    return { data }
  } catch (error: any) {
    console.error('[Contributors API]', error?.message || error)
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '獲取貢獻者列表失敗' })
  }
})
