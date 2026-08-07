/**
 * 原表批注作者脱敏（2026-08-07 拍板，審計 M45）：
 * 保留首尾字，中間用星號模糊化；只有兩字時只保留首字加星號。
 * 規則按 Unicode 碼點處理（Array.from），兼容中文/西文/混合字符串。
 *
 * 例子：
 *   「張三」   → 「張*」
 *   「歐陽修」 → 「歐*修」
 *   「Anony」 → 「A***y」
 *   「王」     → 「王」（單字無法模糊化，規則未覆蓋，原樣返回）
 *   null/空   → null / ''
 */
export function maskName(name: string | null | undefined): string | null {
  if (name === null || name === undefined) return null
  const chars = Array.from(name.trim())
  if (chars.length === 0) return ''
  if (chars.length === 1) return chars[0]
  if (chars.length === 2) return `${chars[0]}*`
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`
}
