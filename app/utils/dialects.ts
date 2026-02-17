/**
 * 前端方言選項與顯示：從 shared 統一引入。
 */
import {
  DIALECT_OPTIONS,
  DIALECT_IDS,
  DIALECT_LABELS,
  getDialectLabel as _getDialectLabel,
  getDialectColor as _getDialectColor
} from '~shared/dialects'

export const DIALECT_OPTIONS_FOR_SELECT = DIALECT_OPTIONS
export const DIALECT_CODE_TO_NAME = DIALECT_LABELS as Record<string, string>

const VALID_DIALECT_SET = new Set(DIALECT_IDS)

/** 將可能為舊自由文字的母語方言正規化為選項中的 value，無效則回傳 '' */
export function normalizeNativeDialect(value: string | undefined | null): string {
  if (value == null || value === '') return ''
  return VALID_DIALECT_SET.has(value as any) ? value : ''
}

export function getDialectLabel(id: string): string {
  return _getDialectLabel(id)
}

export function getDialectColor(id: string): string {
  return _getDialectColor(id)
}

/** 篩選用：帶「全部方言」的選項列表，allValue 為「全部」的 value */
export function dialectOptionsWithAll(allValue: string): { value: string; label: string }[] {
  return [
    { value: allValue, label: '全部方言' },
    ...DIALECT_OPTIONS
  ]
}

/** Combobox/USelectMenu 不允許 option value 為空字串，用此常數表示「不填」 */
export const NATIVE_DIALECT_NONE = '__none__'

/** 可選填的方言選項（如母語方言）：首項為「不填」，其餘與 DIALECT_OPTIONS 相同。原生 <select> 用。 */
export const DIALECT_OPTIONS_OPTIONAL: { value: string; label: string }[] = [
  { value: '', label: '不填' },
  ...DIALECT_OPTIONS
]

/** 供 USelectMenu/Combobox 使用，首項用 NATIVE_DIALECT_NONE 代替空字串，避免 ComboboxItem 報錯 */
export const DIALECT_OPTIONS_OPTIONAL_FOR_COMBO: { value: string; label: string }[] = [
  { value: NATIVE_DIALECT_NONE, label: '不填' },
  ...DIALECT_OPTIONS
]
