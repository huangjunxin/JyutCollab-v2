/**
 * 泛粵矩陣格編輯狀態機（FaanjyutV1Design §6.4 編輯微交互 / §13.1 P4 復用清單）。
 *
 * 抄 entries 表格編輯骨架的單格互斥模型（editingCell/editValue），但保存走真實請求：
 * 每格自動提交單格 batch（POST /api/faanjyut/cells/batch）+ 格狀態機（pending/succeeded/failed）；
 * 明確不搬 entries 的 _isDirty / 保存全部 / baseline 回滾 / localStorage 草稿 / 失敗 alert()。
 *
 * 組件劃分：本 composable 持有全部編輯狀態（index.vue 掛載），MatrixTable 只做渲染決策
 * （editingCell 命中 → CellEditor，否則四態 Cell + pending/error 疊加），鍵盤/鼠標事件回調
 * 均落在本 composable。
 */
import { computed, ref } from 'vue'
import type { Ref } from 'vue'
import type {
  FaanjyutCellEdit,
  FaanjyutCellOp,
  FaanjyutCellWriteData,
  FaanjyutMatrixCell,
  FaanjyutMatrixColumn,
  FaanjyutMatrixData
} from './useFaanjyutMatrix'
import { patchFaanjyutMatrixCachedCell } from '~/utils/faanjyutMatrixCache'

export type FaanjyutCellRef = { lexemeId: string; columnId: string }

/** toast 注入（測試傳 stub；頁面不傳 → Nuxt UI useToast） */
export interface FaanjyutCellEditToast {
  add: (toast: unknown) => unknown
}

export interface FaanjyutCellEditOptions {
  matrixData: Ref<FaanjyutMatrixData | null>
  /** 寫入函數（useFaanjyutMatrix().writeCells）；測試可注入 stub */
  writeCells: (edits: FaanjyutCellEdit[]) => Promise<FaanjyutCellWriteData>
  toast?: FaanjyutCellEditToast
  onCellSaved?: () => void
}

export interface FaanjyutCellEditController {
  editingCell: Ref<FaanjyutCellRef | null>
  editValue: Ref<string>
  focusedCell: Ref<FaanjyutCellRef | null>
  /** 本次進入編輯是否由鍵盤激活（游標置末）；鼠標點擊 false（游標停在點擊處） */
  cursorToEnd: Ref<boolean>
  /** 退出編輯後是否把焦點交還矩陣容器（Enter/Esc 保存或取消後可繼續方向鍵；blur 保存不搶焦點） */
  lastExitWantsFocus: Ref<boolean>
  setEditValue(value: string): void
  isEditingCell(lexemeId: string, columnId: string): boolean
  isFocusedCell(lexemeId: string, columnId: string): boolean
  pendingFor(lexemeId: string, columnId: string): boolean
  errorFor(lexemeId: string, columnId: string): string | undefined
  /** 鼠標點擊格：首次聚焦，再次點擊同一格進入編輯 */
  handleCellClick(lexemeId: string, columnId: string): void
  /** 編輯框鍵盤事件（Enter 保存 / Tab 保存並移格 / Esc 取消） */
  handleEditorKeydown(event: KeyboardEvent, lexemeId: string, columnId: string): void
  /** 編輯框失焦 → 200ms 防抖保存（§13.1 抄 entries） */
  handleEditorBlur(lexemeId: string, columnId: string): void
  /** 矩陣容器鍵盤事件（未編輯時方向鍵移格 / Enter 或直接打字進入編輯） */
  handleTableKeydown(event: KeyboardEvent): void
  cancelEdit(): void
  /** 數據重載（翻頁/篩選/定位）時清空全部編輯態 */
  resetAll(): void
}

/* ------------------------------------------------------------------ */
/* 純函數（獨立導出，供測試覆蓋）                                        */
/* ------------------------------------------------------------------ */

/** 格鍵：pending/error/failedValue 共用 key */
export function cellKey(lexemeId: string, columnId: string): string {
  return `${lexemeId}:${columnId}`
}

/**
 * 值 → op 映射（§6.4）：trim 後為空 → clear；=== '_' → absent；否則 set。
 * set/absent 的 raw 取 trim 後值（避免方音數據帶首尾空白）。
 * clear/absent 不帶 raw（服務端 CellEditSchema 明確禁止 clear/absent 攜帶 raw）。
 */
export function opFromEditValue(raw: string): { op: FaanjyutCellOp; raw?: string } {
  const trimmed = raw.trim()
  if (trimmed === '') return { op: 'clear' }
  if (trimmed === '_') return { op: 'absent' }
  return { op: 'set', raw: trimmed }
}

/** 值未變時不發請求、不記 EditHistory（no-op 編輯） */
export function isNoopEdit(prev: FaanjyutMatrixCell | undefined, edit: { op: FaanjyutCellOp; raw?: string }): boolean {
  const state = prev?.state ?? 'null'
  if (edit.op === 'set') return state === 'normal' && prev!.raw === edit.raw
  if (edit.op === 'absent') return state === 'absent'
  // clear 對「從未填寫（null）」也是 no-op：點開空格再離開（編輯框為空 → clear）不應
  // 無中生有地寫出 cleared 態（用戶實測反饋：黃底橫線「已清空」很突兀，見 §6.4）
  if (edit.op === 'clear') return state === 'cleared' || state === 'null'
  return false
}

/**
 * 撤銷反向 op 計算（§6.4「撤銷 = 恢復到編輯前的態」）。
 *
 * 決定（2026-08-05 §6.4）：編輯前是 null（無 CellState）的格，撤銷回 null 技術上需要
 * 刪 CellState，v1 不為此擴 API——撤銷發 clear，撤銷後顯示為 cleared（「曾有內容被清空」
 * 家族，可接受）；其餘按前一態精確恢復：normal(raw)→set(raw)、absent→absent、cleared→clear。
 * description 為 toast 的舊值描述。
 */
export function buildUndoEdit(prev: FaanjyutMatrixCell | undefined): { edit: { op: FaanjyutCellOp; raw?: string }; description: string } {
  const state = prev?.state ?? 'null'
  switch (state) {
    case 'normal':
      return { edit: { op: 'set', raw: prev!.raw ?? '' }, description: prev!.raw ?? '（空）' }
    case 'absent':
      return { edit: { op: 'absent' }, description: '_（確定沒有）' }
    case 'cleared':
      return { edit: { op: 'clear' }, description: '已清空' }
    default:
      // null：見上方決定註釋
      return { edit: { op: 'clear' }, description: '空白（從未填寫）' }
  }
}

/**
 * 從 fromIndex+direction 開始在行內掃描下一個可編輯列，不回繞（找不到返回 -1）。
 * Tab/方向鍵移格需跳過 canEdit=false 的列（entries 無此概念，P4 新寫）。
 */
export function scanEditableColumn(
  columns: Array<Pick<FaanjyutMatrixColumn, 'id' | 'canEdit'>>,
  fromIndex: number,
  direction: 1 | -1,
  editable: (col: FaanjyutMatrixColumn) => boolean
): number {
  const n = columns.length
  for (let i = fromIndex + direction; i >= 0 && i < n; i += direction) {
    if (editable(columns[i])) return i
  }
  return -1
}

/** 行內第一個（direction=1 正向）/ 最後一個（-1 反向）可編輯列；無則 -1。換行落點用。 */
export function firstEditableColumn(
  columns: Array<Pick<FaanjyutMatrixColumn, 'id' | 'canEdit'>>,
  direction: 1 | -1,
  editable: (col: FaanjyutMatrixColumn) => boolean
): number {
  if (direction > 0) {
    for (let i = 0; i < columns.length; i++) if (editable(columns[i])) return i
  } else {
    for (let i = columns.length - 1; i >= 0; i--) if (editable(columns[i])) return i
  }
  return -1
}

/** 垂直移格：目標行內距 fromIndex 最近的（同列優先、向兩側擴散）可編輯列；無則 -1。 */
export function nearestEditableColumn(
  columns: Array<Pick<FaanjyutMatrixColumn, 'id' | 'canEdit'>>,
  fromIndex: number,
  editable: (col: FaanjyutMatrixColumn) => boolean
): number {
  const n = columns.length
  for (let d = 0; d < n; d++) {
    if (fromIndex - d >= 0 && editable(columns[fromIndex - d])) return fromIndex - d
    if (fromIndex + d < n && editable(columns[fromIndex + d])) return fromIndex + d
  }
  return -1
}

/* ------------------------------------------------------------------ */
/* 狀態機                                                            */
/* ------------------------------------------------------------------ */

const BLUR_SAVE_DELAY_MS = 200

export function useFaanjyutCellEdit(options: FaanjyutCellEditOptions): FaanjyutCellEditController {
  const { matrixData, writeCells } = options
  const toast = options.toast ?? useToast()

  const editingCell = ref<FaanjyutCellRef | null>(null)
  const editValue = ref('')
  const focusedCell = ref<FaanjyutCellRef | null>(null)
  const cursorToEnd = ref(false)
  const lastExitWantsFocus = ref(false)

  /** 保存中的格（key → true）：格內顯示輕量 spinner（§6.4） */
  const pendingCells = ref(new Set<string>())
  /** 失敗格（key → 錯誤文案）：格標紅 + tooltip，點擊重試（§6.4） */
  const errorCells = ref(new Map<string, string>())
  /** 失敗格保留的輸入內容（key → 曾輸入值），重新進入編輯時預填，內容不丟（§6.4） */
  const failedValues = ref(new Map<string, string>())

  let blurTimer: ReturnType<typeof setTimeout> | null = null

  const writeEnabled = computed(() => matrixData.value?.writeEnabled === true)

  const columns = computed(() => matrixData.value?.columns ?? [])
  const rows = computed(() => matrixData.value?.rows ?? [])

  function isEditableColumn(col: FaanjyutMatrixColumn | undefined): boolean {
    return !!col?.canEdit && writeEnabled.value
  }

  function getColumn(columnId: string): FaanjyutMatrixColumn | undefined {
    return columns.value.find((c) => c.id === columnId)
  }

  function getCell(lexemeId: string, columnId: string): FaanjyutMatrixCell | undefined {
    return rows.value.find((r) => r.id === lexemeId)?.cells[columnId]
  }

  function clearBlurTimer() {
    if (blurTimer) {
      clearTimeout(blurTimer)
      blurTimer = null
    }
  }

  /** 進入編輯前的初始值：失敗格優先取保留的失敗內容，否則取當前格顯示值 */
  function initialValueFor(lexemeId: string, columnId: string): string {
    const key = cellKey(lexemeId, columnId)
    const failed = failedValues.value.get(key)
    if (failed !== undefined) return failed
    const cell = getCell(lexemeId, columnId)
    switch (cell?.state) {
      case 'normal': return cell.raw ?? ''
      case 'absent': return '_'
      case 'cleared': return cell.raw ?? ''
      default: return ''
    }
  }

  /** 本地 patch（§13.1：保存成功後直接改 rows[i].cells[columnId]，不重拉矩陣） */
  function patchCellLocally(lexemeId: string, columnId: string, view: FaanjyutMatrixCell) {
    const row = rows.value.find((r) => r.id === lexemeId)
    if (!row) return
    row.cells[columnId] = view
  }

  /** op + 保存結果 → 本地四態視圖（Cell.vue 已有四態渲染，直接餵給它） */
  function viewForEdit(prev: FaanjyutMatrixCell | undefined, edit: { op: FaanjyutCellOp; raw?: string }): FaanjyutMatrixCell {
    const base = prev ?? {}
    if (edit.op === 'set') return { ...base, state: 'normal', raw: edit.raw ?? '' }
    // clear/absent：服務端 upsert 時卸載 raw（cells.ts applyClearAbsent raw 不傳 → mongo $unset），
    // 本地視圖同步為無 raw（Cell.vue 的 cleared 顯示佔位、absent 顯示 `_`）
    if (edit.op === 'absent') return { ...base, state: 'absent', raw: undefined }
    return { ...base, state: 'cleared', raw: undefined }
  }

  function markFailed(lexemeId: string, columnId: string, value: string, message: string) {
    const key = cellKey(lexemeId, columnId)
    errorCells.value.set(key, message)
    failedValues.value.set(key, value)
  }

  function markSuccess(lexemeId: string, columnId: string) {
    const key = cellKey(lexemeId, columnId)
    errorCells.value.delete(key)
    failedValues.value.delete(key)
  }

  function runWrite(lexemeId: string, columnId: string, edit: FaanjyutCellEdit): Promise<boolean> {
    const key = cellKey(lexemeId, columnId)
    pendingCells.value.add(key)
    return writeCells([edit])
      .then((data) => {
        const result = data.results.find((r) => r.lexemeId === lexemeId)
        if (result?.ok) {
          markSuccess(lexemeId, columnId)
          return true
        }
        throw new Error(result?.error || '儲存失敗')
      })
      .catch((error: any) => {
        throw new Error(error?.data?.message || error?.message || '儲存失敗')
      })
      .finally(() => {
        pendingCells.value.delete(key)
      })
  }

  /** 保存當前編輯格（發單格 batch）；值未變時靜默退出不發請求 */
  async function saveEdit() {
    if (!editingCell.value) return
    clearBlurTimer()
    const { lexemeId, columnId } = editingCell.value
    const value = editValue.value
    editingCell.value = null

    const prev = getCell(lexemeId, columnId)
    const op = opFromEditValue(value)
    if (isNoopEdit(prev, op)) return

    // 寫入以 dialectId 鍵定格（服務端 CellEditSchema）；可編輯列必有 dialectId
    const column = getColumn(columnId)
    if (!column) {
      markFailed(lexemeId, columnId, value, '此方言列不存在或不可編輯')
      return
    }
    const edit: FaanjyutCellEdit = column.dialectId
      ? { lexemeId, dialectId: column.dialectId, op: op.op, raw: op.raw }
      : { lexemeId, columnId: column.id, op: op.op, raw: op.raw }
    try {
      const ok = await runWrite(lexemeId, columnId, edit)
      if (ok) {
        const nextView = viewForEdit(prev, op)
        patchCellLocally(lexemeId, columnId, nextView)
        if (import.meta.client) patchFaanjyutMatrixCachedCell(lexemeId, columnId, nextView)
        options.onCellSaved?.()
        showUndoToast(lexemeId, columnId, prev)
      }
    } catch (error: any) {
      markFailed(lexemeId, columnId, value, error?.message || '儲存失敗')
    }
  }

  /** 保存成功 → 底部 undo toast（含舊值描述，5 秒內可撤銷；撤銷本身也是一次正常寫入） */
  function showUndoToast(lexemeId: string, columnId: string, prev: FaanjyutMatrixCell | undefined) {
    const undo = buildUndoEdit(prev)
    toast.add({
      title: '已儲存',
      description: `原值：${undo.description}`,
      duration: 5000,
      actions: [
        {
          label: '撤銷',
          onClick: () => {
            void runUndo(lexemeId, columnId, undo.edit)
          }
        }
      ]
    })
  }

  /** 撤銷：發反向 op 的 cells/batch（§6.4「撤銷本身也是一次正常寫入」）；失敗用 toast 提示 */
  async function runUndo(lexemeId: string, columnId: string, edit: { op: FaanjyutCellOp; raw?: string }) {
    // buildUndoEdit 只產出 {op, raw}，補上目標格身份（dialectId 或 columnId 鍵）再發送
    const column = getColumn(columnId)
    if (!column) {
      toast.add({ title: '撤銷失敗', description: '此方言列已不在當前視圖', color: 'error' })
      return
    }
    const fullEdit: FaanjyutCellEdit = column.dialectId
      ? { lexemeId, dialectId: column.dialectId, op: edit.op, raw: edit.raw }
      : { lexemeId, columnId: column.id, op: edit.op, raw: edit.raw }
    try {
      const ok = await runWrite(lexemeId, columnId, fullEdit)
      if (ok) {
        const nextView = viewForEdit(getCell(lexemeId, columnId), fullEdit)
        patchCellLocally(lexemeId, columnId, nextView)
        if (import.meta.client) patchFaanjyutMatrixCachedCell(lexemeId, columnId, nextView)
        options.onCellSaved?.()
        markSuccess(lexemeId, columnId)
      }
    } catch (error: any) {
      toast.add({ title: '撤銷失敗', description: error?.message || '未知錯誤', color: 'error' })
    }
  }

  /** 進入編輯前先保存上一格（§13.1）；saveEdit 冪等（editingCell 已為 null 時直接返回） */
  function flushCurrentEdit() {
    saveEdit()
  }

  function beginEdit(lexemeId: string, columnId: string, viaKeyboard: boolean) {
    if (!isEditableColumn(getColumn(columnId))) return
    lastExitWantsFocus.value = false
    flushCurrentEdit()
    focusedCell.value = { lexemeId, columnId }
    editingCell.value = { lexemeId, columnId }
    editValue.value = initialValueFor(lexemeId, columnId)
    cursorToEnd.value = viaKeyboard
  }

  /* ---------------- 公開操作 ---------------- */

  function setEditValue(value: string) {
    editValue.value = value
  }

  function isEditingCell(lexemeId: string, columnId: string): boolean {
    const e = editingCell.value
    return e != null && e.lexemeId === lexemeId && e.columnId === columnId
  }

  function isFocusedCell(lexemeId: string, columnId: string): boolean {
    const f = focusedCell.value
    return f != null && f.lexemeId === lexemeId && f.columnId === columnId
  }

  function pendingFor(lexemeId: string, columnId: string): boolean {
    return pendingCells.value.has(cellKey(lexemeId, columnId))
  }

  function errorFor(lexemeId: string, columnId: string): string | undefined {
    return errorCells.value.get(cellKey(lexemeId, columnId))
  }

  /** 鼠標點擊格（MatrixTable 的 Cell @edit）。
   *  兩段式：首次點擊僅聚焦（與方向鍵移格一致），再次點擊同一格才進入編輯。
   *  編輯中點擊其他格：先保存當前格再聚焦目標格。 */
  function handleCellClick(lexemeId: string, columnId: string) {
    if (editingCell.value) {
      flushCurrentEdit()
    }
    const f = focusedCell.value
    if (f && f.lexemeId === lexemeId && f.columnId === columnId) {
      beginEdit(lexemeId, columnId, false)
    } else {
      focusedCell.value = { lexemeId, columnId }
    }
  }

  function handleEditorKeydown(event: KeyboardEvent, lexemeId: string, columnId: string) {
    switch (event.key) {
      case 'Enter':
        // 中文輸入法組合中（選字上屏）的 Enter 交給 IME，不保存（§13.1）
        if (event.isComposing) return
        event.preventDefault()
        lastExitWantsFocus.value = true
        void saveEdit()
        break
      case 'Tab':
        event.preventDefault()
        {
          const moved = moveToNextCell(lexemeId, columnId, event.shiftKey ? -1 : 1)
          if (!moved) {
            // 已到最後一個可編輯格：保存並把焦點交還矩陣容器
            lastExitWantsFocus.value = true
            void saveEdit()
          }
        }
        break
      case 'Escape':
        event.preventDefault()
        cancelEdit()
        break
      default:
        break
    }
  }

  /** 保存當前格並移到下一可編輯格（Tab 方向）；返回是否成功打開下一格 */
  function moveToNextCell(lexemeId: string, columnId: string, direction: 1 | -1): boolean {
    const rowIndex = rows.value.findIndex((r) => r.id === lexemeId)
    if (rowIndex < 0) return false
    const colIndex = columns.value.findIndex((c) => c.id === columnId)
    if (colIndex < 0) return false

    // 當前行內先掃描（不回繞）
    const nextInRow = scanEditableColumn(columns.value, colIndex, direction, isEditableColumn)
    if (nextInRow >= 0) {
      beginEdit(lexemeId, columns.value[nextInRow].id, true)
      return true
    }
    // 行內無下一個 → 換行（跳過整行無可編輯列的讀寫情況）
    let r = rowIndex + direction
    while (r >= 0 && r < rows.value.length) {
      const fc = firstEditableColumn(columns.value, direction, isEditableColumn)
      if (fc >= 0) {
        beginEdit(rows.value[r].id, columns.value[fc].id, true)
        return true
      }
      r += direction
    }
    return false
  }

  function handleEditorBlur(lexemeId: string, columnId: string) {
    clearBlurTimer()
    blurTimer = setTimeout(() => {
      if (
        editingCell.value &&
        editingCell.value.lexemeId === lexemeId &&
        editingCell.value.columnId === columnId
      ) {
        lastExitWantsFocus.value = false
        void saveEdit()
      }
    }, BLUR_SAVE_DELAY_MS)
  }

  /** 矩陣容器鍵盤（未編輯時）：方向鍵移格（跳過唯讀列）、Enter/直接打字進入編輯 */
  function handleTableKeydown(event: KeyboardEvent) {
    if (editingCell.value) return
    const target = event.target as Node | null
    if (
      typeof HTMLElement !== 'undefined' &&
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
        || target.tagName === 'BUTTON' || target.tagName === 'A' || target.isContentEditable)
    ) {
      // 焦點在表內可交互元素（輸入框/連結等）時不攔截，讓其原生行為生效
      return
    }
    const cols = columns.value
    const allRows = rows.value
    if (allRows.length === 0 || cols.length === 0) return

    // 尚無焦點格時，用 Enter/方向鍵/Tab 從第一個可編輯格開始
    if (!focusedCell.value) {
      if (event.key === 'Enter' || event.key.startsWith('Arrow') || event.key === 'Tab') {
        const first = findFirstEditableCell()
        if (!first) return
        focusedCell.value = first
        event.preventDefault()
      } else {
        return
      }
    }

    const f = focusedCell.value
    const rowIndex = allRows.findIndex((r) => r.id === f.lexemeId)
    const colIndex = cols.findIndex((c) => c.id === f.columnId)
    if (rowIndex < 0 || colIndex < 0) return

    let nextRow = rowIndex
    let nextCol = colIndex

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault()
        const dr = event.key === 'ArrowUp' ? -1 : 1
        const rr = rowIndex + dr
        if (rr < 0 || rr >= allRows.length) return
        nextRow = rr
        nextCol = nearestEditableColumn(cols, colIndex, isEditableColumn)
        if (nextCol < 0) return
        break
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        event.preventDefault()
        const dir = event.key === 'ArrowLeft' ? -1 : 1
        const nc = scanEditableColumn(cols, colIndex, dir, isEditableColumn)
        if (nc < 0) return
        nextCol = nc
        break
      }
      case 'Tab':
        event.preventDefault()
        moveToNextCell(f.lexemeId, f.columnId, event.shiftKey ? -1 : 1)
        return
      case 'Enter':
        event.preventDefault()
        beginEdit(f.lexemeId, f.columnId, true)
        return
      case 'Escape':
        focusedCell.value = null
        return
      default:
        // 直接打字激活當前選中格進入編輯，並把該字符填入（§13.1）
        if (
          event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing
        ) {
          event.preventDefault()
          beginEdit(f.lexemeId, f.columnId, true)
          editValue.value = editValue.value + event.key
        }
        return
    }

    focusedCell.value = { lexemeId: allRows[nextRow].id, columnId: cols[nextCol].id }
  }

  function findFirstEditableCell(): FaanjyutCellRef | null {
    const fc = firstEditableColumn(columns.value, 1, isEditableColumn)
    if (fc < 0 || rows.value.length === 0) return null
    return { lexemeId: rows.value[0].id, columnId: columns.value[fc].id }
  }

  function cancelEdit() {
    clearBlurTimer()
    editingCell.value = null
    lastExitWantsFocus.value = true
  }

  function resetAll() {
    clearBlurTimer()
    editingCell.value = null
    focusedCell.value = null
    editValue.value = ''
    pendingCells.value.clear()
    errorCells.value.clear()
    failedValues.value.clear()
    lastExitWantsFocus.value = false
  }

  return {
    editingCell,
    editValue,
    focusedCell,
    cursorToEnd,
    lastExitWantsFocus,
    setEditValue,
    isEditingCell,
    isFocusedCell,
    pendingFor,
    errorFor,
    handleCellClick,
    handleEditorKeydown,
    handleEditorBlur,
    handleTableKeydown,
    cancelEdit,
    resetAll
  }
}
