import { z } from 'zod'
import { ExternalEtymon } from '../../../utils/ExternalEtymon'

const ParamsSchema = z.object({
  lexemeId: z.string().min(1)
})

export default defineEventHandler(async (event) => {
  await connectDB()

  const lexemeIdRaw = getRouterParam(event, 'lexemeId')
  const parsed = ParamsSchema.safeParse({ lexemeId: lexemeIdRaw })
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '缺少 lexemeId' })
  }

  const { lexemeId } = parsed.data
  if (lexemeId.startsWith('__unassigned__:')) {
    throw createError({ statusCode: 400, message: '未綁定詞語，暫不支援域外方音' })
  }

  const rows = await ExternalEtymon.find({ lexemeId })
    .sort({ createdAt: -1 })
    .lean()

  return {
    success: true,
    data: rows.map((r: any) => ({
      id: r.id || r._id?.toString?.(),
      lexemeId: r.lexemeId,
      languageCode: r.languageCode,
      dialectName: r.dialectName,
      scriptForm: r.scriptForm,
      phonetic: r.phonetic,
      gloss: r.gloss,
      sourceType: r.sourceType,
      sourceDetail: r.sourceDetail,
      note: r.note,
      createdBy: r.createdBy,
      createdAt: r.createdAt?.toISOString?.() ?? r.createdAt,
      updatedAt: r.updatedAt?.toISOString?.() ?? r.updatedAt
    }))
  }
})

