import { z } from 'zod'
import { ExternalEtymon } from '../../utils/ExternalEtymon'
import { assertNotFaanJyutExternalEtymon } from '../../utils/faanjyut/intercept'

const ParamsSchema = z.object({
  id: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }
  const role = event.context.auth.role
  if (role !== 'reviewer' && role !== 'admin') {
    throw createError({ statusCode: 403, message: '你沒有權限刪除域外方音' })
  }

  await connectDB()

  const idRaw = getRouterParam(event, 'id')
  const parsedParams = ParamsSchema.safeParse({ id: idRaw })
  if (!parsedParams.success) throw createError({ statusCode: 400, message: '缺少 ID' })
  const { id } = parsedParams.data

  const existing = await ExternalEtymon.findOne({ id }).lean()
  if (!existing) {
    throw createError({ statusCode: 404, message: '域外方音不存在' })
  }
  // 泛粵字表數據一律拒絕普通寫入口（FaanjyutV1Design.md §9）
  assertNotFaanJyutExternalEtymon(existing)

  await ExternalEtymon.findOneAndDelete({ id }).lean()

  return { success: true }
})

