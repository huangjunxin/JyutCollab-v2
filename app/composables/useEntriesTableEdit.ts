import type { ComputedRef } from 'vue'
import { getThemeNameById } from '~/composables/useThemeData'
import { STATUS_LABELS, MAX_TEXTAREA_HEIGHT_PX } from '~/utils/entriesTableConstants'
import type { Entry } from '~/types'
import type { EditableColumnDef } from '~/composables/useEntriesTableColumns'

export interface UseEntriesTableEditReturn {
  getCellDisplay: (entry: Entry, col: EditableColumnDef) => string
  getCellClass: (entry: Entry, field: string) => string[]
  getColumnOptions: (col: EditableColumnDef) => Array<{ value: string; label: string }>
  resizeTextarea: (el: EventTarget | null) => void
}

export function useEntriesTableEdit(
  editableColumns: ComputedRef<EditableColumnDef[]>,
  dialectCodeToName: Record<string, string>
): UseEntriesTableEditReturn {
  function getColumnOptions(col: EditableColumnDef): Array<{ value: string; label: string }> {
    const raw = col.getOptions ? col.getOptions() : col.options || []
    return raw.map((o: { value: string | number; label: string }) => ({
      value: String(o.value),
      label: o.label
    }))
  }

  function getCellDisplay(entry: Entry, col: EditableColumnDef): string {
    const value = col.get(entry) as string | number | undefined
    if (col.key === 'headword') {
      const main = entry.headword?.display || entry.text || value
      return String(main ?? '-')
    }
    if (col.key === 'phonetic') {
      const arr = entry.phonetic?.jyutping
      if (Array.isArray(arr) && arr.length > 0) {
        const hasSpaceInside = arr.some(s => (s || '').includes(' '))
        if (!hasSpaceInside) return arr.join(' ')
        return arr[0] || '-'
      }
      return entry.phoneticNotation || (value as string) || '-'
    }
    if (col.type === 'theme') {
      if (!value) return '選擇分類'
      return getThemeNameById(value as number) || '選擇分類'
    }
    if (col.type === 'select') {
      if (col.key === 'dialect') return dialectCodeToName[String(value)] || (value as string) || '-'
      if (col.key === 'status') return STATUS_LABELS[String(value)] || (value as string) || '-'
      const options = getColumnOptions(col)
      const opt = options?.find((o: { value: string }) => o.value === String(value))
      return opt?.label ?? String(value ?? '-')
    }
    return String(value ?? '-')
  }

  function getCellClass(entry: Entry, field: string) {
    const classes: string[] = []
    if (field === 'status') {
      const statusColors: Record<string, string> = {
        draft: 'text-gray-500',
        pending_review: 'text-yellow-600',
        approved: 'text-green-600',
        rejected: 'text-red-600'
      }
      classes.push(statusColors[entry.status || ''] || '')
    }
    return classes
  }

  function resizeTextarea(el: EventTarget | null) {
    const ta = el instanceof HTMLTextAreaElement ? el : null
    if (!ta) return
    ta.style.height = 'auto'
    const h = ta.scrollHeight
    ta.style.height = `${h}px`
    ta.style.overflowY = h > MAX_TEXTAREA_HEIGHT_PX ? 'auto' : 'hidden'
  }

  return {
    getCellDisplay,
    getCellClass,
    getColumnOptions,
    resizeTextarea
  }
}
