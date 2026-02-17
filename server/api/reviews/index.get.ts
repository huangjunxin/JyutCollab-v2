import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  dialectName: z.string().optional(),
  status: z.enum(['pending_review']).default('pending_review'),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
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

    const user = event.context.auth
    if (user.role !== 'reviewer' && user.role !== 'admin') {
      throw createError({
        statusCode: 403,
        message: '無權訪問審核列表'
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

    const { page, perPage, dialectName, status, sortBy, sortOrder } = validated.data

    // 構建篩選條件
    const filter: Record<string, any> = {
      status
    }

    // 如果指定了方言篩選，使用指定的值
    if (dialectName) {
      filter['dialect.name'] = dialectName
    }

    // 構建排序
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    }

    // 執行查詢
    const skip = (page - 1) * perPage
    const [entries, total] = await Promise.all([
      Entry.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),
      Entry.countDocuments(filter)
    ])

    // 獲取所有創建者的用户ID
    const creatorIds = [...new Set(entries.map(e => e.createdBy))]

    // 查詢用户信息
    const users = await User.find({
      $or: [
        { _id: { $in: creatorIds.map(id => {
          // 嘗試將字符串 ID 轉換為 ObjectId
          if (/^[a-f\d]{24}$/i.test(id)) return id
          return null
        }).filter(Boolean) } },
        { username: { $in: creatorIds } }
      ]
    }).lean()

    // 建立用户ID到用户名的映射
    const userMap = new Map<string, { username: string; displayName?: string }>()
    users.forEach(u => {
      userMap.set(u._id.toString(), { username: u.username, displayName: u.displayName })
      userMap.set(u.username, { username: u.username, displayName: u.displayName })
    })

    // 轉換響應
    const data = entries.map(entry => {
      const creator = userMap.get(entry.createdBy)
      return {
        id: entry.id || entry._id.toString(),
        headword: entry.headword,
        phonetic: entry.phonetic,
        dialect: entry.dialect,
        entryType: entry.entryType,
        senses: entry.senses,
        theme: entry.theme,
        meta: entry.meta,
        status: entry.status,
        createdBy: creator?.displayName || creator?.username || entry.createdBy,
        createdAt: entry.createdAt?.toISOString?.() || entry.createdAt,
        updatedAt: entry.updatedAt?.toISOString?.() || entry.updatedAt
      }
    })

    return {
      data,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  } catch (error: any) {
    console.error('Get reviews error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '獲取審核列表失敗'
    })
  }
})
