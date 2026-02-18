import { z } from 'zod'
import { ExternalEtymon } from '../../utils/ExternalEtymon'

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

  const deleted = await ExternalEtymon.findOneAndDelete({ id }).lean()
  if (!deleted) {
    throw createError({ statusCode: 404, message: '域外方音不存在' })
  }

  return { success: true }
})

