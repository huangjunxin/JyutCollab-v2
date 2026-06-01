import { DIALECT_IDS, DIALECT_LABELS } from '../../../shared/dialects'
import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  query: z.string().optional(),
  dialectName: z.string().optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  themeIdL3: z.coerce.number().int().optional(),
  createdBy: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc')
})

export default defineEventHandler(async (event) => {
  try {
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

    const { page, perPage, query: searchQuery, dialectName, status, themeIdL3, createdBy, sortBy, sortOrder } = validated.data

    const normalizedDialectName = typeof dialectName === 'string'
      ? dialectName.trim()
      : ''
    const dialectLabelToId = new Map(Object.entries(DIALECT_LABELS).map(([id, label]) => [label, id]))
    const dialectFilter = normalizedDialectName && normalizedDialectName !== '全部方言'
      ? DIALECT_IDS.includes(normalizedDialectName as any)
        ? normalizedDialectName
        : dialectLabelToId.get(normalizedDialectName)
      : ''

    const filter: Record<string, any> = {}

    if (status) {
      filter.status = status
    }

    if (dialectFilter) {
      filter['dialect.name'] = dialectFilter
    }

    if (themeIdL3) {
      filter['theme.level3Id'] = themeIdL3
    }

    if (createdBy) {
      filter.createdBy = createdBy
    }

    const trimmedSearch = searchQuery?.trim()
    if (trimmedSearch) {
      const escaped = escapeRegex(trimmedSearch)
      filter.$or = [
        { id: { $regex: escaped, $options: 'i' } },
        { 'headword.display': { $regex: escaped, $options: 'i' } },
        { 'headword.normalized': { $regex: escaped, $options: 'i' } },
        { 'headword.variants': { $regex: escaped, $options: 'i' } },
        { 'phonetic.jyutping': { $regex: escaped, $options: 'i' } },
        { 'senses.definition': { $regex: escaped, $options: 'i' } },
        { 'senses.examples.text': { $regex: escaped, $options: 'i' } },
        { 'senses.examples.jyutping': { $regex: escaped, $options: 'i' } },
        { 'senses.examples.translation': { $regex: escaped, $options: 'i' } },
        { 'dialect.name': { $regex: escaped, $options: 'i' } },
        { status: { $regex: escaped, $options: 'i' } },
        { createdBy: { $regex: escaped, $options: 'i' } }
      ]
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    }

    const skip = (page - 1) * perPage
    const [entries, total] = await Promise.all([
      Entry.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(perPage)
        .lean(),
      Entry.countDocuments(filter)
    ])

    const creatorIds = [...new Set(entries.map(e => e.createdBy))]

    const users = await User.find({
      $or: [
        { _id: { $in: creatorIds.map(id => {
          if (/^[a-f\d]{24}$/i.test(id)) return id
          return null
        }).filter(Boolean) } },
        { username: { $in: creatorIds } }
      ]
    }).lean()

    const userMap = new Map<string, { username: string; displayName?: string }>()
    users.forEach(u => {
      userMap.set(u._id.toString(), { username: u.username, displayName: u.displayName })
      userMap.set(u.username, { username: u.username, displayName: u.displayName })
    })

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
