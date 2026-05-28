import { z } from 'zod'
import { Entry } from '../../utils/Entry'
import { User } from '../../utils/User'
import { getActiveAuthUserById } from '../../utils/auth'
import { formatZodErrorToMessage } from '../../utils/validation'

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(100, '顯示名稱最多100個字符').optional(),
  location: z.string().trim().max(100, '所在地最多100個字符').optional(),
  nativeDialect: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(500, '簡介最多500個字符').optional(),
  avatarUrl: z.union([z.string().url('請輸入有效的頭像網址'), z.literal('')]).optional()
}).strict()

const PROFILE_FIELD_LABELS: Record<string, string> = {
  displayName: '顯示名稱',
  location: '所在地',
  nativeDialect: '母語方言',
  bio: '簡介',
  avatarUrl: '頭像網址'
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
    })
  }

  const activeUser = await getActiveAuthUserById(session.user.id)
  if (!activeUser) {
    await clearUserSession(event)
    throw createError({
      statusCode: 401,
      message: '帳戶已停用或不存在，請重新登錄'
    })
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    const errorText = formatZodErrorToMessage(parsed.error, PROFILE_FIELD_LABELS)
    return {
      success: false,
      error: errorText
    }
  }

  const updates = parsed.data as Record<string, unknown>
  if (updates.avatarUrl === '') {
    updates.avatarUrl = undefined
  }
  const allowed: Record<string, unknown> = {}
  for (const key of ['displayName', 'location', 'nativeDialect', 'bio', 'avatarUrl']) {
    if (key in updates && updates[key] !== undefined) {
      allowed[key] = updates[key]
    }
  }

  await connectDB()
  const doc = await User.findByIdAndUpdate(
    session.user.id,
    { $set: allowed },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  if (!doc) {
    throw createError({
      statusCode: 404,
      message: '用戶不存在'
    })
  }

  const u = doc as Record<string, unknown>
  delete u.passwordHash

  // 更新 session，使前端 useUserSession().user 立即反映新的 dialectPermissions 等
  const sessionUser = {
    id: u._id?.toString(),
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    dialectPermissions: (u.dialectPermissions as Array<{ dialectName: string; role?: string }>)?.map(p => ({
      dialectName: p.dialectName,
      role: p.role ?? 'contributor'
    })) ?? []
  }
  await setUserSession(event, {
    user: sessionUser,
    loggedInAt: (session as { loggedInAt?: number }).loggedInAt ?? Date.now()
  })

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
      updatedAt: u.updatedAt
    }
  }
})
