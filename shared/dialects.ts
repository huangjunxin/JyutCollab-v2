/**
 * 方言點常數（單一來源，hardcode，不寫入數據庫）
 * 香港繁體標籤。
 */

export const DIALECT_IDS = ['guangzhou', 'hongkong', 'taishan', 'overseas'] as const
export type DialectId = (typeof DIALECT_IDS)[number]

/** 方言代碼 → 顯示名稱（香港繁體） */
export const DIALECT_LABELS: Record<DialectId, string> = {
  guangzhou: '廣州',
  hongkong: '香港',
  taishan: '台山',
  overseas: '海外'
}

/** 用於下拉的選項：{ value, label } */
export const DIALECT_OPTIONS = DIALECT_IDS.map((id) => ({
  value: id,
  label: DIALECT_LABELS[id]
}))

/** 根據代碼取顯示名稱 */
export function getDialectLabel(id: string): string {
  return DIALECT_LABELS[id as DialectId] ?? id
}

/** 方言對應的 UBadge 顏色（用於審核頁等） */
export const DIALECT_COLORS: Record<DialectId, string> = {
  guangzhou: 'blue',
  hongkong: 'green',
  taishan: 'orange',
  overseas: 'purple'
}

export function getDialectColor(id: string): string {
  return DIALECT_COLORS[id as DialectId] ?? 'gray'
}
