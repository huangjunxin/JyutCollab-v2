import { z } from 'zod'
import { DIALECT_IDS } from '../../../shared/dialects'

const VALID_DIALECTS: string[] = [...DIALECT_IDS]

const dialectString = z.string().trim().refine(val => VALID_DIALECTS.includes(val), {
  message: '請選擇有效的方言點'
})

const RegisterSchema = z.object({
  email: z.string().trim().min(1, '請輸入郵箱').email('郵箱格式不正確').max(254, '郵箱過長'),
  username: z.string().trim().min(2, '用戶名至少2個字符').max(50, '用戶名最多50個字符'),
  password: z.string().min(6, '密碼至少6個字符').max(128, '密碼最多128個字符'),
  displayName: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  nativeDialect: z.string().trim().max(50).optional(),
  dialects: z.array(dialectString).min(1, '請至少選擇一個方言點')
})

/** 驗證錯誤欄位對應前端顯示名稱（香港繁體） */
const FIELD_LABELS: Record<string, string> = {
  username: '用戶名',
  email: '郵箱',
  password: '密碼',
  displayName: '顯示名稱',
  location: '所在地',
  nativeDialect: '母語方言',
  dialects: '可編輯的方言點'
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)

    // 正規化：若前端傳 dialects 陣列則直接使用；若傳單一 dialect（或 { value, label }）則轉成陣列
    if (!body.dialects || !Array.isArray(body.dialects)) {
      let single: string | undefined
      const raw = body?.dialect
      if (raw && typeof raw === 'string') single = raw
      else if (raw && typeof raw === 'object' && raw !== null && 'value' in raw) single = (raw as { value: string }).value
      if (single) body.dialects = [single]
    }

    // Validate input
    const validated = RegisterSchema.safeParse(body)
    if (!validated.success) {
      const issues = validated.error?.issues ?? (validated.error as any)?.errors ?? []
      const first = issues[0]
      const message = first?.message || '輸入數據無效'
      const path = Array.isArray(first?.path) ? first.path.join('.') : undefined
      const pathLabel = path ? (FIELD_LABELS[path] ?? path) : ''
      const errorText = pathLabel ? `${pathLabel}：${message}` : message
      console.warn('[註冊] 驗證失敗:', { path, message, dialects: body?.dialects })
      return {
        success: false,
        error: errorText
      }
    }

    const result = await registerUser(validated.data)

    if (result.error) {
      console.warn('[註冊] 註冊邏輯失敗:', result.error, { email: validated.data.email, dialects: validated.data.dialects })
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
