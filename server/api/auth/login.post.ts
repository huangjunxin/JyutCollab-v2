import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'

const LoginSchema = z.object({
  email: z.string().trim().min(1, '請輸入郵箱').email('郵箱格式不正確').max(254, '郵箱過長'),
  password: z.string().min(1, '請輸入密碼').max(128, '密碼過長'),
  turnstileToken: z.string().optional()
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

    // Verify Turnstile
    const turnstileOk = await verifyTurnstile(validated.data.turnstileToken || '')
    if (!turnstileOk) {
      return { success: false, error: '安全驗證失敗，請重新整理頁面後重試' }
    }

    const result = await loginUser({ email: validated.data.email, password: validated.data.password })

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
