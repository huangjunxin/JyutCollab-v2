import { z } from 'zod'
import { nanoid } from 'nanoid'
import { Entry } from '../../../utils/Entry'
import { Lexeme } from '../../../utils/Lexeme'

const BodySchema = z.object({
  action: z.enum(['new', 'set']),
  lexemeId: z.string().optional()
})

export default defineEventHandler(async (event) => {
  if (!event.context.auth) {
    throw createError({ statusCode: 401, message: '請先登錄' })
  }
  const role = event.context.auth.role
  if (role !== 'reviewer' && role !== 'admin') {
    throw createError({ statusCode: 403, message: '你沒有權限管理詞語成員' })
  }

  await connectDB()

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: '缺少詞條ID' })
  }

  let existingEntry = await Entry.findOne({ id })
  if (!existingEntry && /^[a-f\d]{24}$/i.test(id)) {
    existingEntry = await Entry.findById(id)
  }
  if (!existingEntry) {
    throw createError({ statusCode: 404, message: '詞條不存在' })
  }

  const body = await readBody(event)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: '參數無效' })
  }

  const { action, lexemeId } = parsed.data

  let nextLexemeId: string
  if (action === 'new') {
    nextLexemeId = nanoid(10)
  } else {
    if (!lexemeId || lexemeId.startsWith('__unassigned__:')) {
      throw createError({ statusCode: 400, message: '無效的 lexemeId' })
    }
    nextLexemeId = lexemeId
  }

  existingEntry.lexemeId = nextLexemeId
  await existingEntry.save()

  // 確保 Lexeme 記錄存在
  await Lexeme.updateOne({ id: nextLexemeId }, { $setOnInsert: { id: nextLexemeId } }, { upsert: true })

  return {
    success: true,
    data: {
      id: existingEntry.id,
      lexemeId: existingEntry.lexemeId
    }
  }
})

