import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'
import { User } from '../../utils/User'
import { connectDB } from '../../utils/db'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(['contributor', 'reviewer', 'admin', 'all']).default('all'),
  isActive: z.enum(['true', 'false', 'all']).default('all'),
  sortBy: z.enum(['createdAt', 'username', 'contributionCount', 'reviewCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export default defineEventHandler(async (event) => {
  try {
    // 檢查認證
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const currentUser = event.context.auth
    if (currentUser.role !== 'admin') {
      throw createError({
        statusCode: 403,
        message: '無權訪問用戶列表'
      })
    }

    await connectDB()

    const query = getQuery(event)
    const validated = QuerySchema.safeParse(query)

    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({
        statusCode: 400,
        message: message || '查詢參數無效'
      })
    }

    const { page, perPage, search, role, isActive, sortBy, sortOrder } = validated.data

    // 構建篩選條件
    const filter: Record<string, any> = {}

    // 搜索條件
    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { displayName: searchRegex }
      ]
    }

    // 角色篩選
    if (role !== 'all') {
      filter.role = role
    }

    // 狀態篩選
    if (isActive !== 'all') {
      filter.isActive = isActive === 'true'
    }

    // 構建排序
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    }

    // 執行查詢
    const skip = (page - 1) * perPage
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),
      User.countDocuments(filter)
    ])

    // 轉換響應
    const data = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      dialectPermissions: user.dialectPermissions,
      contributionCount: user.contributionCount,
      reviewCount: user.reviewCount,
      isActive: user.isActive,
      createdAt: user.createdAt?.toISOString?.() || user.createdAt,
      updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt
    }))

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  } catch (error: any) {
    console.error('Get users error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '獲取用戶列表失敗'
    })
  }
})
