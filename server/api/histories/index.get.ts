import { z } from 'zod'
import type { EditHistory as EditHistoryType, PaginatedResponse } from '~/types'
import { DIALECT_IDS, DIALECT_LABELS } from '../../../shared/dialects'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  query: z.string().optional(),
  entryId: z.string().optional(),
  action: z.enum(['create', 'update', 'delete', 'status_change']).optional(),
  userId: z.string().optional(),
  dialectName: z.string().optional(),
  themeIdL3: z.coerce.number().int().optional()
})

export default defineEventHandler(async (event): Promise<PaginatedResponse<EditHistoryType>> => {
  try {
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const rawQuery = getQuery(event)
    const validated = QuerySchema.safeParse(rawQuery)

    if (!validated.success) {
      const issues = validated.error?.issues ?? []
      console.error('[Histories API] Validation error:', issues)
      throw createError({
        statusCode: 400,
        message: issues[0]?.message || '查詢參數無效'
      })
    }

    const { page, perPage, query: searchQuery, entryId, action, userId: userIdParam, dialectName, themeIdL3 } = validated.data

    const authUser = await User.findById(event.context.auth.id)
      .select('_id role')
      .lean()
    if (!authUser) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const userRole = authUser.role
    const userId = authUser._id.toString()

    const filter: Record<string, unknown> = {}

    // Text search: fuzzy search across snapshot fields
    const trimmedSearch = searchQuery?.trim()
    if (trimmedSearch) {
      const escaped = escapeRegex(trimmedSearch)
      filter.$or = [
        { entryId: { $regex: escaped, $options: 'i' } },
        { 'beforeSnapshot.id': { $regex: escaped, $options: 'i' } },
        { 'afterSnapshot.id': { $regex: escaped, $options: 'i' } },
        { 'beforeSnapshot.headword.display': { $regex: escaped, $options: 'i' } },
        { 'afterSnapshot.headword.display': { $regex: escaped, $options: 'i' } },
        { 'beforeSnapshot.headword.normalized': { $regex: escaped, $options: 'i' } },
        { 'afterSnapshot.headword.normalized': { $regex: escaped, $options: 'i' } },
        { 'beforeSnapshot.headword.variants': { $regex: escaped, $options: 'i' } },
        { 'afterSnapshot.headword.variants': { $regex: escaped, $options: 'i' } },
        { 'beforeSnapshot.text': { $regex: escaped, $options: 'i' } },
        { 'afterSnapshot.text': { $regex: escaped, $options: 'i' } }
      ]
    }

    // Exact entryId match (backward compat, and useful for precise lookup)
    if (entryId && !trimmedSearch) {
      const escapedEntryId = entryId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(escapedEntryId, 'i')
      filter.$or = [
        { entryId },
        { 'beforeSnapshot.id': entryId },
        { 'afterSnapshot.id': entryId },
        { 'beforeSnapshot.headword.display': searchRegex },
        { 'afterSnapshot.headword.display': searchRegex },
        { 'beforeSnapshot.headword.normalized': searchRegex },
        { 'afterSnapshot.headword.normalized': searchRegex },
        { 'beforeSnapshot.headword.variants': searchRegex },
        { 'afterSnapshot.headword.variants': searchRegex },
        { 'beforeSnapshot.text': searchRegex },
        { 'afterSnapshot.text': searchRegex }
      ]
    }

    if (action && ['create', 'update', 'delete', 'status_change'].includes(action)) {
      filter.action = action
    }

    // User filtering
    if (userRole === 'contributor') {
      filter.userId = userId
    } else if (userIdParam === 'me') {
      filter.userId = userId
    } else if (userIdParam) {
      filter.userId = userIdParam
    }

    // Dialect filter on snapshot fields (AND with existing filters via $and)
    if (dialectName) {
      const dialectLabelToId = new Map(Object.entries(DIALECT_LABELS).map(([id, label]) => [label, id]))
      const resolvedDialect = DIALECT_IDS.includes(dialectName as any)
        ? dialectName
        : dialectLabelToId.get(dialectName)
      if (resolvedDialect) {
        const dialectOr = [
          { 'beforeSnapshot.dialect.name': resolvedDialect },
          { 'afterSnapshot.dialect.name': resolvedDialect }
        ]
        if (filter.$or) {
          filter.$and = [
            { $or: filter.$or },
            { $or: dialectOr }
          ]
          delete filter.$or
        } else {
          filter.$or = dialectOr
        }
      }
    }

    // Theme filter on snapshot fields (AND with existing filters via $and)
    if (themeIdL3) {
      const themeOr = [
        { 'beforeSnapshot.theme.level3Id': themeIdL3 },
        { 'afterSnapshot.theme.level3Id': themeIdL3 }
      ]
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: themeOr }
        ]
        delete filter.$or
      } else if (filter.$and) {
        filter.$and.push({ $or: themeOr })
      } else {
        filter.$or = themeOr
      }
    }

    const skip = (page - 1) * perPage
    const [histories, total] = await Promise.all([
      EditHistory.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      EditHistory.countDocuments(filter)
    ])

    const userIds = [...new Set(histories.map(h => h.userId))]
    const users = await User.find({ _id: { $in: userIds } })
      .select('_id username displayName')
      .lean()
    const userMap = new Map(users.map(u => [u._id.toString(), u]))

    const data = histories.map(h => {
      const u = userMap.get(h.userId)
      return {
        id: h._id.toString(),
        entryId: h.entryId,
        userId: h.userId,
        beforeSnapshot: h.beforeSnapshot,
        afterSnapshot: h.afterSnapshot,
        changedFields: h.changedFields,
        action: h.action,
        comment: h.comment,
        createdAt: h.createdAt.toISOString(),
        isReverted: h.isReverted || false,
        revertedAt: h.revertedAt?.toISOString(),
        revertedBy: h.revertedBy,
        user: u ? {
          id: u._id.toString(),
          username: u.username,
          displayName: u.displayName
        } : undefined
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
    console.error('Get histories error:', error)
    throw createError({
      statusCode: 500,
      message: '獲取歷史記錄失敗'
    })
  }
})
