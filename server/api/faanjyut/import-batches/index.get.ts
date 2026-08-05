import { z } from 'zod'
import { formatZodErrorToMessage } from '../../../utils/validation'
import { FaanJyutImportBatch } from '../../../utils/FaanJyutImportBatch'
import { connectDB } from '../../../utils/db'
import { summarizeBatch } from '../../../utils/faanjyut/import-batches'

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20)
})

export default defineEventHandler(async (event) => {
  try {
    // 全局 middleware 已保證登錄；admin 判定與 users/index.get.ts 一致
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    if (event.context.auth.role !== 'admin') {
      throw createError({ statusCode: 403, message: '無權查看導入批次' })
    }

    const query = getQuery(event)
    const validated = QuerySchema.safeParse(query)
    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({ statusCode: 400, message: message || '查詢參數無效' })
    }

    await connectDB()

    const { page, perPage } = validated.data
    const skip = (page - 1) * perPage
    const [batches, total] = await Promise.all([
      FaanJyutImportBatch.find({})
        .sort({ startedAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      FaanJyutImportBatch.countDocuments({})
    ])

    return {
      success: true,
      data: batches.map((batch) => summarizeBatch(batch)),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '獲取導入批次列表失敗' })
  }
})
