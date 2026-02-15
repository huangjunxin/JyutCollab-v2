import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email('郵箱格式不正確'),
  password: z.string().min(1, '請輸入密碼')
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validated = LoginSchema.safeParse(body)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || '輸入數據無效'
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
    console.error('Login error:', error)
    return {
      success: false,
      error: '登錄失敗'
    }
  }
})
