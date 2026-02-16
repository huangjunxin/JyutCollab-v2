import { z } from 'zod'
import { User } from '../../utils/User'

const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  nativeDialect: z.string().trim().optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal(''))
})

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
    const msg = parsed.error.errors[0]?.message ?? '輸入數據無效'
    throw createError({
      statusCode: 400,
      message: msg
    })
  }

  const updates = parsed.data as Record<string, unknown>
  if (updates.avatarUrl === '') {
    updates.avatarUrl = undefined
  }
  // 只保留允許更新的欄位
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
