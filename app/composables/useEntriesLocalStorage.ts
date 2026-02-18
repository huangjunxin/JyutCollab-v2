import type { Entry } from '~/types'

const STORAGE_KEY = 'jyutcollab-entries-draft'
const DEBOUNCE_MS = 500

let debounceTimer: NodeJS.Timeout | null = null

/**
 * 保存詞條草稿到本地儲存
 */
export function saveEntriesToLocalStorage(entries: Entry[]) {
  // 只保存新建或已修改的條目
  const draftEntries = entries.filter(
    (e) => (e as any)._isNew || e._isDirty
  )

  // 深拷貝以避免保存 Vue reactive proxy
  const entriesToSave = draftEntries.map((entry) => {
    const { _isNew, _isDirty, _tempId, ...entryData } = entry as any
    return {
      ...entryData,
      _isNew,
      _isDirty,
      _tempId
    }
  })

  // 使用 debounce 避免頻繁寫入
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    try {
      if (typeof window !== 'undefined') {
        // 重要：唔好直接覆寫成「當前頁面」嘅草稿集合，否則切換分頁/排序/取消編輯時會誤刪其他詞條草稿
        const stored = localStorage.getItem(STORAGE_KEY)
        const parsed: any[] = stored ? JSON.parse(stored) : []
        const byKey = new Map<string, any>()

        if (Array.isArray(parsed)) {
          parsed.forEach((e) => {
            const k = String(e?.id ?? e?._tempId ?? '')
            if (k) byKey.set(k, e)
          })
        }

        entriesToSave.forEach((e) => {
          const k = String((e as any)?.id ?? (e as any)?._tempId ?? '')
          if (k) byKey.set(k, e)
        })

        const merged = Array.from(byKey.values())
        if (merged.length === 0) localStorage.removeItem(STORAGE_KEY)
        else localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      }
    } catch (error) {
      console.error('Failed to save entries to localStorage:', error)
      // localStorage 可能已滿，嘗試清理舊資料
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesToSave))
        }
      } catch (e) {
        console.error('Failed to save entries after cleanup:', e)
      }
    }
  }, DEBOUNCE_MS)
}

/**
 * 從本地儲存恢復詞條草稿
 */
export function restoreEntriesFromLocalStorage(): Entry[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    return parsed.map((entry: any) => ({
      ...entry,
      _isNew: entry._isNew ?? false,
      _isDirty: entry._isDirty ?? false
    })) as Entry[]
  } catch (error) {
    console.error('Failed to restore entries from localStorage:', error)
    return []
  }
}

/**
 * 清除本地儲存嘅詞條草稿
 */
export function clearEntriesLocalStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * 清除特定詞條嘅本地儲存（保存成功後調用）
 */
export function removeEntryFromLocalStorage(entryId: string | number) {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return

    const filtered = parsed.filter(
      (e: any) => String(e.id) !== String(entryId) && String(e._tempId) !== String(entryId)
    )

    if (filtered.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    }
  } catch (error) {
    console.error('Failed to remove entry from localStorage:', error)
  }
}
