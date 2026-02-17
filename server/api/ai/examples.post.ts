import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'

const RequestSchema = z.object({
  expression: z.string().trim().min(1, '請輸入表達').max(200, '表達過長'),
  definition: z.string().trim().min(1, '請輸入釋義').max(1000, '釋義過長'),
  region: z.enum(['guangzhou', 'hongkong', 'taishan', 'overseas']).default('hongkong')
})

const regionMap: Record<string, string> = {
  guangzhou: '廣州',
  hongkong: '香港',
  taishan: '台山',
  overseas: '海外'
}

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
      regionMap[validated.data.region]
    )

    return {
      success: true,
      data: result
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
