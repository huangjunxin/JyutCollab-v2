import { z } from 'zod'
import { DIALECT_IDS } from '../../../shared/dialects'
import { User } from '../../utils/User'
import { getActiveAuthUserById, toAuthUser } from '../../utils/auth'
import { formatZodErrorToMessage } from '../../utils/validation'

const VALID_DIALECTS: string[] = [...DIALECT_IDS]

const SetupSchema = z.object({
  dialects: z.array(
    z.string().trim().refine(val => VALID_DIALECTS.includes(val), {
      message: '請選擇有效的方言點'
    })
  ).min(1, '請至少選擇一個方言點'),
  nativeDialect: z.string().trim().max(50).refine(
    val => !val || VALID_DIALECTS.includes(val),
    { message: '請選擇有效的方言點' }
  ).optional()
})

/** OAuth 新用戶設定方言點 — 一次性的初始設定 */
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }

  const activeUser = await getActiveAuthUserById(session.user.id)
  if (!activeUser) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, message: '帳戶已停用或不存在，請重新登錄' })
  }

  // 已有方言權限則拒絕覆蓋（防止直接 POST 繞過前端 guard）
  if (activeUser.dialectPermissions && activeUser.dialectPermissions.length > 0) {
    return { success: false, error: '您已設定過方言點，無需再次設定' }
  }

  const body = await readBody(event).catch(() => ({}))
  const parsed = SetupSchema.safeParse(body)
  if (!parsed.success) {
    return { success: false, error: formatZodErrorToMessage(parsed.error) }
  }

  await connectDB()
  const dialectPermissions = parsed.data.dialects.map(name => ({
    dialectName: name,
    role: 'contributor' as const
  }))

  const updates: Record<string, unknown> = { dialectPermissions }
  if (parsed.data.nativeDialect) {
    updates.nativeDialect = parsed.data.nativeDialect
  }

  const doc = await User.findByIdAndUpdate(
    session.user.id,
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  ).lean()

  if (!doc) {
    throw createError({ statusCode: 404, message: '用戶不存在' })
  }

  const u = doc as Record<string, unknown>
  const sessionUser = toAuthUser({
    _id: u._id as string,
    email: u.email as string,
    username: u.username as string,
    displayName: u.displayName as string | undefined,
    avatarUrl: u.avatarUrl as string | undefined,
    role: (u.role as 'contributor' | 'reviewer' | 'admin') || 'contributor',
    dialectPermissions: dialectPermissions,
    contributionCount: (u.contributionCount as number) || 0,
    reviewCount: (u.reviewCount as number) || 0,
    isActive: true,
    createdAt: u.createdAt as Date,
    updatedAt: u.updatedAt as Date
  } as any)

  await setUserSession(event, {
    user: sessionUser,
    loggedInAt: session.loggedInAt ?? Date.now()
  })

  return { success: true, data: { user: sessionUser } }
})
