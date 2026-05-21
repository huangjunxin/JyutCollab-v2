import { z } from 'zod'
import { DIALECT_IDS, getDialectLabel } from '../../../shared/dialects'
import { AISuggestion } from '../../utils/AISuggestion'
import { connectDB } from '../../utils/db'
import { formatZodErrorToMessage } from '../../utils/validation'

const RegisterSchema = z.enum(['口語', '書面', '粗俗', '文雅', '中性'])

const RequestSchema = z.object({
  expression: z.string().trim().min(1, '請輸入表達').max(200, '表達過長'),
  region: z.enum(DIALECT_IDS as unknown as [string, ...string[]]).default('hongkong'),
  definition: z.string().trim().max(1000, '釋義過長').optional(),
  usageNotes: z.string().trim().max(1000, '用法説明過長').optional(),
  context: z.string().trim().max(500, '語境過長').optional(),
  referenceExpressions: z.array(z.object({
    text: z.string(),
    definition: z.string().optional(),
    usage_notes: z.string().optional(),
    region: z.string(),
    register: RegisterSchema.optional()
  })).optional(),
  entryId: z.string().optional(),
  clientEntryKey: z.string().optional(),
  field: z.string().optional(),
  originalContent: z.unknown().optional()
})

export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const body = await readBody(event)
    const validated = RequestSchema.safeParse(body)

    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({
        statusCode: 400,
        message
      })
    }

    const result = await generateRegisterSuggestion(
      validated.data.expression,
      getDialectLabel(validated.data.region),
      validated.data.definition,
      validated.data.usageNotes,
      validated.data.context,
      validated.data.referenceExpressions
    )

    await connectDB()

    const suggestion = await AISuggestion.create({
      entryId: validated.data.entryId,
      clientEntryKey: validated.data.clientEntryKey,
      suggestedTo: event.context.auth.id,
      suggestionType: 'register',
      field: validated.data.field || 'meta.register',
      originalContent: validated.data.originalContent,
      suggestedContent: result,
      confidenceScore: result.confidence ?? 0.5,
      userAction: 'pending',
      metadata: {
        expression: validated.data.expression,
        region: validated.data.region,
        definition: validated.data.definition,
        usageNotes: validated.data.usageNotes,
        context: validated.data.context,
        register: result.register
      }
    })

    return {
      success: true,
      data: {
        ...result,
        suggestionId: suggestion._id.toString()
      }
    }
  } catch (error: any) {
    console.error('[AI Register] Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error?.message || '生成語域建議失敗'
    })
  }
})
