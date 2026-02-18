import { z } from 'zod'
import { ExternalEtymon } from '../../utils/ExternalEtymon'
import { convertToHongKongTraditional } from '../../utils/textConversion'

const ParamsSchema = z.object({
  id: z.string().min(1)
})

const BodySchema = z.object({
  languageCode: z.string().min(1).max(50).optional(),
  dialectName: z.string().max(100).optional(),
  scriptForm: z.string().min(1).max(200).optional(),
  phonetic: z.string().max(200).optional(),
  gloss: z.string().max(400).optional(),
  sourceType: z.enum(['fieldwork', 'dictionary', 'literature', 'corpus']).optional(),
  sourceDetail: z.string().max(400).optional(),
  note: z.string().max(1000).optional()
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }
  const role = event.context.auth.role
  if (role !== 'reviewer' && role !== 'admin') {
    throw createError({ statusCode: 403, message: '你沒有權限修改域外方音' })
  }

  await connectDB()

  const idRaw = getRouterParam(event, 'id')
  const parsedParams = ParamsSchema.safeParse({ id: idRaw })
  if (!parsedParams.success) throw createError({ statusCode: 400, message: '缺少 ID' })
  const { id } = parsedParams.data

  const body = await readBody(event)
  const parsedBody = BodySchema.safeParse(body)
  if (!parsedBody.success) {
    const msg = parsedBody.error.issues?.[0]?.message || '參數無效'
    throw createError({ statusCode: 400, message: msg })
  }

  const update: Record<string, any> = {}
  const d = parsedBody.data
  if (typeof d.languageCode === 'string') update.languageCode = d.languageCode.trim()
  if (typeof d.dialectName === 'string') update.dialectName = convertToHongKongTraditional(d.dialectName.trim())
  if (typeof d.scriptForm === 'string') update.scriptForm = d.scriptForm.trim()
  if (typeof d.phonetic === 'string') update.phonetic = d.phonetic.trim()
  if (typeof d.gloss === 'string') update.gloss = convertToHongKongTraditional(d.gloss.trim())
  if (typeof d.sourceType === 'string') update.sourceType = d.sourceType
  if (typeof d.sourceDetail === 'string') update.sourceDetail = convertToHongKongTraditional(d.sourceDetail.trim())
  if (typeof d.note === 'string') update.note = convertToHongKongTraditional(d.note.trim())

  const row = await ExternalEtymon.findOneAndUpdate({ id }, { $set: update }, { new: true }).lean()
  if (!row) {
    throw createError({ statusCode: 404, message: '域外方音不存在' })
  }

  return {
    success: true,
    data: {
      id: row.id || row._id?.toString?.(),
      lexemeId: row.lexemeId,
      languageCode: row.languageCode,
      dialectName: row.dialectName,
      scriptForm: row.scriptForm,
      phonetic: row.phonetic,
      gloss: row.gloss,
      sourceType: row.sourceType,
      sourceDetail: row.sourceDetail,
      note: row.note,
      createdBy: row.createdBy,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt
    }
  }
})

