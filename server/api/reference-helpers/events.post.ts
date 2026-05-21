import { z } from 'zod'
import { ReferenceHelperEvent } from '../../utils/ReferenceHelperEvent'
import { connectDB } from '../../utils/db'
import { formatZodErrorToMessage } from '../../utils/validation'

const EventSchema = z.object({
  entryId: z.string().optional(),
  clientEntryKey: z.string().optional(),
  lexemeId: z.string().optional(),
  helperType: z.enum([
    'jyutdict_pronunciation',
    'jyutjyu_template',
    'internal_dialect_template',
    'manual_reference_search',
    'morpheme_search',
    'morpheme_linked',
    'morpheme_unlinked',
    'external_etymon'
  ]),
  sourceProvider: z.enum(['jyutdict', 'jyutjyu', 'internal', 'manual', 'morpheme', 'external_etymon']).optional(),
  field: z.string().optional(),
  sourceEntryId: z.string().optional(),
  sourceLexemeId: z.string().optional(),
  query: z.string().optional(),
  resultCount: z.number().int().min(0).optional(),
  originalContent: z.unknown().optional(),
  suggestedContent: z.unknown().optional(),
  acceptedContent: z.unknown().optional(),
  finalContent: z.unknown().optional(),
  userAction: z.enum(['accepted', 'rejected', 'modified', 'pending']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
})

export default defineEventHandler(async (event) => {
  try {
    const auth = event.context.auth
    if (!auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    const body = await readBody(event)
    const validated = EventSchema.safeParse(body)

    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({
        statusCode: 400,
        message
      })
    }

    const data = validated.data
    const now = new Date()

    await connectDB()

    const referenceEvent = await ReferenceHelperEvent.create({
      ...data,
      shownTo: auth.id,
      actionBy: data.userAction && data.userAction !== 'pending' ? auth.id : undefined,
      acceptedAt: data.userAction === 'accepted' ? now : undefined,
      rejectedAt: data.userAction === 'rejected' ? now : undefined,
      modifiedAt: data.userAction === 'modified' ? now : undefined,
      userAction: data.userAction || 'pending'
    })

    return {
      success: true,
      data: {
        id: referenceEvent._id.toString(),
        userAction: referenceEvent.userAction
      }
    }
  } catch (error: any) {
    console.error('[Reference Helper Event] Error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: error?.message || '記錄參考資料輔助事件失敗'
    })
  }
})
