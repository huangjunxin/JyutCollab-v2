import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'

const LoginSchema = z.object({
  email: z.string().trim().min(1, '請輸入郵箱').email('郵箱格式不正確').max(254, '郵箱過長'),
  password: z.string().min(1, '請輸入密碼').max(128, '密碼過長')
})

const LOGIN_FIELD_LABELS: Record<string, string> = {
  email: '郵箱',
  password: '密碼'
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    const validated = LoginSchema.safeParse(body)
    if (!validated.success) {
      const errorText = formatZodErrorToMessage(validated.error, LOGIN_FIELD_LABELS)
      return {
        success: false,
        error: errorText
      }
    }

    const result = await loginUser(validated.data)

    if (result.error) {
      return {
        success: false,
        error: result.error
      }
    }

    await setUserSession(event, {
      user: result.user!,
      loggedInAt: Date.now()
    })

    return {
      success: true,
      data: { user: result.user }
    }
  } catch (error) {
    console.error('[登錄] 伺服器錯誤:', error)
    return {
      success: false,
      error: '登錄失敗，請稍後重試'
    }
  }
})
