import type { Entry } from '~/types'

/**
 * 取得詞條的唯一標識：已保存用 id，新建用 _tempId。
 */
export function getEntryKey(entry: Entry | Record<string, unknown>): string | number {
  const e = entry as { id?: string; _tempId?: string }
  return e?.id ?? e?._tempId ?? ''
}

/**
 * 取得詞條標識的字串形式，供 template 與 Map/Set 鍵使用。
 */
export function getEntryIdString(entry: Entry | Record<string, unknown>): string {
  return String(getEntryKey(entry))
}
