import type { ZodError } from 'zod'

/**
 * 從 Zod 驗證錯誤中取出第一條錯誤訊息，並可依欄位標籤轉成前端可顯示的文案。
 * 使用 .issues（Zod v3），相容舊版 .errors。
 * @param error Zod 的 validated.error
 * @param fieldLabels 可選：欄位 path 對應的顯示名稱（如 username -> 用戶名）
 * @returns 單一錯誤字串，供 API 回傳給前端
 */
export function formatZodErrorToMessage(
  error: ZodError | undefined | null,
  fieldLabels?: Record<string, string>
): string {
  if (!error) return '輸入數據無效'
  const issues = error.issues ?? (error as any).errors ?? []
  const first = issues[0]
  if (!first) return '輸入數據無效'
  const message = (first as any).message ?? '輸入數據無效'
  const path = Array.isArray((first as any).path) ? (first as any).path as string[] : []
  const pathKey = path.join('.')
  const pathLabel = pathKey && fieldLabels?.[pathKey] ? fieldLabels[pathKey] : pathKey
  return pathLabel ? `${pathLabel}：${message}` : message
}
