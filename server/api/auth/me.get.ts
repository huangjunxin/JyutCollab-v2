import { Entry } from '../../utils/Entry'
import { User } from '../../utils/User'

/** 當前登錄用戶的完整資料（不含密碼），供個人資料頁使用 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  await connectDB()
  const doc = await User.findById(session.user.id).lean()
  if (!doc) {
    throw createError({
      statusCode: 404,
      message: '用戶不存在'
    })
  }

  const u = doc as Record<string, unknown>
  delete u.passwordHash

  const userId = session.user.id
  const [contributionCount, reviewCount] = await Promise.all([
    Entry.countDocuments({ createdBy: userId }),
    Entry.countDocuments({ reviewedBy: userId })
  ])

  return {
    success: true,
    data: {
      id: u._id?.toString(),
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      location: u.location,
      nativeDialect: u.nativeDialect,
      role: u.role,
      bio: u.bio,
      dialectPermissions: (u.dialectPermissions as Array<{ dialectName: string; role?: string }>)?.map(p => ({
        dialectName: p.dialectName,
        role: p.role ?? 'contributor'
      })) ?? [],
      contributionCount,
      reviewCount,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }
  }
})
