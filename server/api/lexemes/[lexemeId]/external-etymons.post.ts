import { z } from 'zod'
import { nanoid } from 'nanoid'
import { ExternalEtymon } from '../../../utils/ExternalEtymon'
import { Lexeme } from '../../../utils/Lexeme'
import { convertToHongKongTraditional } from '../../../utils/textConversion'

const ParamsSchema = z.object({
  lexemeId: z.string().min(1)
})

const BodySchema = z.object({
  languageCode: z.string().min(1, '請選擇語言').max(50),
  dialectName: z.string().max(100).optional(),
  scriptForm: z.string().min(1, '請輸入詞形').max(200),
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
    throw createError({ statusCode: 403, message: '你沒有權限新增域外方音' })
  }

  await connectDB()

  const lexemeIdRaw = getRouterParam(event, 'lexemeId')
  const parsedParams = ParamsSchema.safeParse({ lexemeId: lexemeIdRaw })
  if (!parsedParams.success) throw createError({ statusCode: 400, message: '缺少 lexemeId' })
  const { lexemeId } = parsedParams.data
  if (lexemeId.startsWith('__unassigned__:')) {
    throw createError({ statusCode: 400, message: '未綁定詞語，暫不支援域外方音' })
  }

  const body = await readBody(event)
  const parsedBody = BodySchema.safeParse(body)
  if (!parsedBody.success) {
    const msg = parsedBody.error.issues?.[0]?.message || '參數無效'
    throw createError({ statusCode: 400, message: msg })
  }

  // 確保 Lexeme 記錄存在（即使暫時不使用，也能保證 lexemeId 有對應實體）
  await Lexeme.updateOne({ id: lexemeId }, { $setOnInsert: { id: lexemeId } }, { upsert: true })

  const d = parsedBody.data
  const createdBy = event.context.auth.id

  const row = await ExternalEtymon.create({
    id: nanoid(12),
    lexemeId,
    languageCode: d.languageCode.trim(),
    dialectName: d.dialectName ? convertToHongKongTraditional(d.dialectName.trim()) : undefined,
    scriptForm: d.scriptForm.trim(),
    phonetic: d.phonetic?.trim(),
    gloss: d.gloss ? convertToHongKongTraditional(d.gloss.trim()) : undefined,
    sourceType: d.sourceType,
    sourceDetail: d.sourceDetail ? convertToHongKongTraditional(d.sourceDetail.trim()) : undefined,
    note: d.note ? convertToHongKongTraditional(d.note.trim()) : undefined,
    createdBy
  })

  return {
    success: true,
    data: {
      id: row.id,
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

