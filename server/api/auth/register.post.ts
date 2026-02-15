import { z } from 'zod'
import { DIALECT_IDS } from '../../../shared/dialects'

const VALID_DIALECTS: string[] = [...DIALECT_IDS]

const RegisterSchema = z.object({
  email: z.string().email('郵箱格式不正確'),
  username: z.string().min(2, '用户名至少2個字符').max(50, '用户名最多50個字符'),
  password: z.string().min(6, '密碼至少6個字符'),
  displayName: z.string().optional(),
  location: z.string().optional(),
  nativeDialect: z.string().optional(),
  dialect: z.string().refine(val => VALID_DIALECTS.includes(val), {
    message: '請選擇有效的方言點'
  })
})

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // Validate input
    const validated = RegisterSchema.safeParse(body)
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.errors[0]?.message || '輸入數據無效'
      }
    }

    const result = await registerUser(validated.data)

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
    console.error('Register error:', error)
    return {
      success: false,
      error: '註冊失敗'
    }
  }
})
