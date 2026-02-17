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

    // 若前端傳入的是 { value, label } 物件，正規化為 dialect 字串
    const rawDialect = body?.dialect
    if (rawDialect && typeof rawDialect === 'object' && 'value' in rawDialect) {
      body.dialect = rawDialect.value
    }

    // Validate input
    const validated = RegisterSchema.safeParse(body)
    if (!validated.success) {
      const first = validated.error.errors[0]
      const message = first?.message || '輸入數據無效'
      const path = first?.path?.join('.')
      console.warn('[註冊] 驗證失敗:', { path, message, dialect: body?.dialect, dialectType: typeof body?.dialect })
      return {
        success: false,
        error: path ? `${path === 'dialect' ? '方言點' : path}：${message}` : message
      }
    }

    const result = await registerUser(validated.data)

    if (result.error) {
      console.warn('[註冊] 註冊邏輯失敗:', result.error, { email: validated.data.email, dialect: validated.data.dialect })
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
    console.error('[註冊] 伺服器錯誤:', error)
    return {
      success: false,
      error: '註冊失敗，請稍後重試'
    }
  }
})
