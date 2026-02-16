import { ref, watch } from 'vue'
import type { Entry } from '~/types'

const STORAGE_KEY = 'jyutcollab-entries-draft'
const DEBOUNCE_MS = 500

let debounceTimer: NodeJS.Timeout | null = null

/**
 * 保存词条草稿到本地存储
 */
export function saveEntriesToLocalStorage(entries: Entry[]) {
  // 只保存新建或已修改的条目
  const draftEntries = entries.filter(
    (e) => (e as any)._isNew || e._isDirty
  )

  if (draftEntries.length === 0) {
    // 如果没有草稿，清除本地存储
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
    return
  }

  // 深拷贝以避免保存 Vue reactive proxy
  const entriesToSave = draftEntries.map((entry) => {
    const { _isNew, _isDirty, _tempId, ...entryData } = entry as any
    return {
      ...entryData,
      _isNew,
      _isDirty,
      _tempId
    }
  })

  // 使用 debounce 避免频繁写入
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entriesToSave))
      }
    } catch (error) {
      console.error('Failed to save entries to localStorage:', error)
      // localStorage 可能已满，尝试清理旧数据
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
 * 从本地存储恢复词条草稿
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
 * 清除本地存储的词条草稿
 */
export function clearEntriesLocalStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * 清除特定条目的本地存储（保存成功后调用）
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
