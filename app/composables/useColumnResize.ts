import { ref, onUnmounted } from 'vue'

const STORAGE_KEY = 'jyutcollab-column-widths'
const MIN_COL_WIDTH = 50

function loadFromStorage(defaults: Record<string, number>): Record<string, number> {
  if (typeof localStorage === 'undefined') return { ...defaults }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { ...defaults }
    const parsed = JSON.parse(stored) as Record<string, number>
    // Merge: stored values override defaults, but keep any new columns from defaults
    return { ...defaults, ...parsed }
  } catch {
    return { ...defaults }
  }
}

function saveToStorage(widths: Record<string, number>) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths))
  } catch {}
}

export function useColumnResize(defaultWidths: Record<string, number>) {
  const columnWidths = ref<Record<string, number>>(loadFromStorage(defaultWidths))

  const resizingCol = ref<{
    key: string
    startX: number
    startWidth: number
  } | null>(null)

  function onMouseMove(event: MouseEvent) {
    if (!resizingCol.value) return
    const delta = event.clientX - resizingCol.value.startX
    const newWidth = Math.max(MIN_COL_WIDTH, resizingCol.value.startWidth + delta)
    columnWidths.value = { ...columnWidths.value, [resizingCol.value.key]: newWidth }
  }

  function onMouseUp() {
    if (!resizingCol.value) return
    saveToStorage(columnWidths.value)
    resizingCol.value = null
    document.body.classList.remove('select-none', 'cursor-col-resize')
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  function startResize(event: MouseEvent, key: string, currentWidth: number) {
    event.preventDefault()
    resizingCol.value = {
      key,
      startX: event.clientX,
      startWidth: currentWidth
    }
    document.body.classList.add('select-none', 'cursor-col-resize')
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function autoFit(tableEl: HTMLTableElement | null, colKeys: string[]) {
    if (!tableEl) return

    // Temporarily switch to auto layout so the browser computes natural content widths
    const prevLayout = tableEl.style.tableLayout
    tableEl.style.tableLayout = 'auto'

    // Also temporarily clear col widths so auto-layout can breathe
    const cols = tableEl.querySelectorAll<HTMLElement>('colgroup col')
    const prevColWidths: string[] = []
    cols.forEach((col, i) => {
      prevColWidths[i] = col.style.width
      col.style.width = ''
    })

    // Force a reflow so the browser calculates natural sizes
    void tableEl.offsetWidth

    const newWidths = { ...columnWidths.value }
    colKeys.forEach((key, colIdx) => {
      // +2 because: col 0 = checkbox, col 1+ = editable columns
      const cellIndex = colIdx + 2
      const cells = tableEl.querySelectorAll<HTMLElement>(
        `thead th:nth-child(${cellIndex}), tbody td:nth-child(${cellIndex})`
      )
      let maxWidth = MIN_COL_WIDTH
      cells.forEach(cell => {
        if (cell.scrollWidth > maxWidth) maxWidth = cell.scrollWidth
      })
      newWidths[key] = Math.max(MIN_COL_WIDTH, maxWidth)
    })

    // Restore original layout
    cols.forEach((col, i) => {
      col.style.width = prevColWidths[i] ?? ''
    })
    tableEl.style.tableLayout = prevLayout

    columnWidths.value = newWidths
    saveToStorage(newWidths)
  }

  function resetWidths() {
    columnWidths.value = { ...defaultWidths }
    saveToStorage(defaultWidths)
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.classList.remove('select-none', 'cursor-col-resize')
  })

  return {
    columnWidths,
    resizingCol,
    startResize,
    autoFit,
    resetWidths
  }
}
