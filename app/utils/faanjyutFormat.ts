/**
 * 泛粵字表前端共用格式化工具（純函數，供詳情頁與導入報告頁使用）。
 * 顯示層標籤繁中化在頁面內處理；本檔只做時間/數字/哈希/路徑取值等機械轉換。
 */

/** ISO 時間 → 「YYYY-MM-DD HH:mm:ss」本機時間（導入報告預覽稿形態） */
export function formatFaanJyutDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

/** 千分位數字（如 8126 → 「8,126」）；非有限數字回傳原字串 */
export function formatFaanJyutNumber(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—'
  return n.toLocaleString('en-US')
}

/** SHA-256 截斷顯示：「頭12位…尾5位」（title 完整值，由組件掛載） */
export function truncateFaanJyutHash(hash: string | null | undefined, head = 12, tail = 5): string {
  if (!hash) return '—'
  if (hash.length <= head + tail + 1) return hash
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`
}

/** 編輯歷史 action 的繁中標籤 */
export function faanJyutActionLabel(action: string | null | undefined): string {
  switch (action) {
    case 'create': return '創建'
    case 'update': return '更新'
    case 'delete': return '刪除'
    case 'status_change': return '狀態變更'
    default: return action ?? '—'
  }
}

/** 批註 targetType 的繁中標籤 */
export function faanJyutTargetTypeLabel(targetType: string | null | undefined): string {
  switch (targetType) {
    case 'lexeme': return '詞條'
    case 'cell': return '格'
    case 'externalEtymon': return '域外材料'
    default: return targetType ?? '詞條'
  }
}

/** 按「a.b.c」路徑從快照取舊/新值（before→after diff 用）；取不到回傳 undefined */
export function resolveFaanJyutFieldPath(
  snapshot: Record<string, unknown> | null | undefined,
  path: string
): unknown {
  if (!snapshot || !path) return undefined
  let current: unknown = snapshot
  for (const segment of path.split('.')) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/** 任意值 → 顯示字串（null/undefined/空串 → '—'） */
export function faanJyutDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  const text = String(value)
  return text.length === 0 ? '—' : text
}
