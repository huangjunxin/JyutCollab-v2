import { z } from 'zod'
import { AISuggestion } from '../../utils/AISuggestion'
import { connectDB } from '../../utils/db'
import { formatZodErrorToMessage } from '../../utils/validation'

const RequestSchema = z.object({
  expression: z.string().trim().min(1, '請輸入表達').max(200, '表達過長'),
  context: z.string().trim().max(500).optional(),
  referenceExpressions: z.array(z.object({
    text: z.string(),
    definition: z.string().optional(),
    usage_notes: z.string().optional(),
    region: z.string()
  })).optional(),
  entryId: z.string().optional(),
  clientEntryKey: z.string().optional(),
  field: z.string().optional(),
  originalContent: z.unknown().optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Check auth
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

    const result = await categorizeExpression(
      validated.data.expression,
      validated.data.context,
      validated.data.referenceExpressions
    )

    await connectDB()

    const suggestion = await AISuggestion.create({
      entryId: validated.data.entryId,
      clientEntryKey: validated.data.clientEntryKey,
      suggestedTo: event.context.auth.id,
      suggestionType: 'theme_classification',
      field: validated.data.field || 'theme',
      originalContent: validated.data.originalContent,
      suggestedContent: result,
      confidenceScore: result.confidence ?? 0.5,
      userAction: 'pending',
      metadata: {
        expression: validated.data.expression,
        context: validated.data.context,
        themeId: result.themeId
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
    console.error('Categorize error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '分類失敗'
    })
  }
})
