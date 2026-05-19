import { z } from 'zod'
import { DIALECT_IDS, getDialectLabel } from '../../../shared/dialects'
import { AISuggestion } from '../../utils/AISuggestion'
import { connectDB } from '../../utils/db'
import { formatZodErrorToMessage } from '../../utils/validation'

const RequestSchema = z.object({
  expression: z.string().trim().min(1, '請輸入表達').max(200, '表達過長'),
  definition: z.string().trim().min(1, '請輸入釋義').max(1000, '釋義過長'),
  region: z.enum(DIALECT_IDS as unknown as [string, ...string[]]).default('hongkong'),
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

    const result = await generateExamples(
      validated.data.expression,
      validated.data.definition,
      getDialectLabel(validated.data.region)
    )

    await connectDB()

    const suggestion = await AISuggestion.create({
      entryId: validated.data.entryId,
      clientEntryKey: validated.data.clientEntryKey,
      suggestedTo: event.context.auth.id,
      actionBy: event.context.auth.id,
      suggestionType: 'example',
      field: validated.data.field || 'senses.0.examples',
      originalContent: validated.data.originalContent,
      suggestedContent: result,
      acceptedContent: result,
      confidenceScore: 0.5,
      userAction: 'accepted',
      acceptedAt: new Date(),
      metadata: {
        expression: validated.data.expression,
        region: validated.data.region,
        definition: validated.data.definition,
        count: result.length
      }
    })

    return {
      success: true,
      data: {
        examples: result,
        suggestionId: suggestion._id.toString()
      }
    }
  } catch (error: any) {
    console.error('Generate examples error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '生成例句失敗'
    })
  }
})
