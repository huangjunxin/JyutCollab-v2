import { z } from 'zod'
import { DIALECT_IDS } from '../../../shared/dialects'
import { User } from '../../utils/User'
import { formatZodErrorToMessage } from '../../utils/validation'

const VALID_DIALECTS: string[] = [...DIALECT_IDS]

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(100, '顯示名稱最多100個字符').optional(),
  location: z.string().trim().max(100, '所在地最多100個字符').optional(),
  nativeDialect: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(500, '簡介最多500個字符').optional(),
  avatarUrl: z.union([z.string().url('請輸入有效的頭像網址'), z.literal('')]).optional(),
  dialects: z.array(z.string().refine(id => VALID_DIALECTS.includes(id), { message: '請選擇有效的方言點' })).min(1, '請至少選擇一個方言點').optional()
})

const PROFILE_FIELD_LABELS: Record<string, string> = {
  displayName: '顯示名稱',
  location: '所在地',
  nativeDialect: '母語方言',
  bio: '簡介',
  avatarUrl: '頭像網址',
  dialects: '可貢獻的方言'
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session?.user?.id) {
    throw createError({
      statusCode: 401,
      message: '請先登錄'
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
  // 只保留允許更新的欄位；dialects 單獨轉成 dialectPermissions
  const allowed: Record<string, unknown> = {}
  for (const key of ['displayName', 'location', 'nativeDialect', 'bio', 'avatarUrl']) {
    if (key in updates && updates[key] !== undefined) {
      allowed[key] = updates[key]
    }
  }
  if (updates.dialects !== undefined && Array.isArray(updates.dialects)) {
    const unique = [...new Set(updates.dialects as string[])]
    allowed.dialectPermissions = unique.map(name => ({
      dialectName: name,
      role: 'contributor'
    }))
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
      contributionCount: u.contributionCount ?? 0,
      reviewCount: u.reviewCount ?? 0,
      updatedAt: u.updatedAt
    }
  }
})
