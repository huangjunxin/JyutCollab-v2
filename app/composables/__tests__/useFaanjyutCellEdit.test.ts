import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type {
  FaanjyutCellEdit,
  FaanjyutCellWriteData,
  FaanjyutMatrixCell,
  FaanjyutMatrixColumn,
  FaanjyutMatrixData
} from '../useFaanjyutMatrix'
import {
  buildUndoEdit,
  cellKey,
  firstEditableColumn,
  isNoopEdit,
  nearestEditableColumn,
  opFromEditValue,
  scanEditableColumn,
  useFaanjyutCellEdit
} from '../useFaanjyutCellEdit'

/* ---------------- 工具 ---------------- */

function makeColumns(): FaanjyutMatrixColumn[] {
  return [
    { id: 'col-guangzhou', label: '廣州', sourceRole: 'domestic', dialectId: 'guangzhou', canEdit: true },
    { id: 'col-hongkong', label: '香港', sourceRole: 'domestic', dialectId: 'hongkong', canEdit: true },
    { id: 'col-jiangmen', label: '江門', sourceRole: 'domestic', dialectId: 'jiangmen', canEdit: false },
    { id: 'col-external', label: '域外', sourceRole: 'external', canEdit: false }
  ]
}

function makeRow(id: string, cells: Record<string, FaanjyutMatrixCell> = {}): any {
  return { id, sourceKey: `key-${id}`, cells }
}

function makeMatrixData(overrides: Partial<FaanjyutMatrixData> = {}): FaanjyutMatrixData {
  return {
    columns: makeColumns(),
    rows: [
      makeRow('lex-1', { 'col-guangzhou': { state: 'normal', raw: 'mai1' } }),
      makeRow('lex-2')
    ],
    pagination: { page: 1, perPage: 50, total: 2, totalPages: 1 },
    writeEnabled: true,
    ...overrides
  }
}

const okResult = (edits: FaanjyutCellEdit[]): FaanjyutCellWriteData => ({
  results: edits.map((e) => ({ lexemeId: e.lexemeId, dialectId: 'x', ok: true })),
  succeeded: edits.length,
  failed: 0
})

/** 等待非同步保存鏈（saveEdit → runWrite → writeCells mock）settle */
async function flushAsync(rounds = 10) {
  for (let i = 0; i < rounds; i++) await Promise.resolve()
}

function makeHarness(opts: {
  matrixData?: FaanjyutMatrixData
  writeCells?: (edits: FaanjyutCellEdit[]) => Promise<FaanjyutCellWriteData>
} = {}) {
  const matrixData = ref<FaanjyutMatrixData | null>(opts.matrixData ?? makeMatrixData())
  const writeCells = vi.fn(opts.writeCells ?? (async (edits: FaanjyutCellEdit[]) => okResult(edits)))
  const toastAdd = vi.fn()
  const ctrl = useFaanjyutCellEdit({ matrixData, writeCells, toast: { add: toastAdd } })
  return { matrixData, writeCells, toastAdd, ctrl }
}

const enterEvent = (key = 'Enter') =>
  ({ key, isComposing: false, preventDefault: vi.fn(), stopPropagation: vi.fn() }) as unknown as KeyboardEvent

const charEvent = (key: string) =>
  ({ key, length: 1, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, preventDefault: vi.fn() }) as unknown as KeyboardEvent

function lastToast(toastAdd: ReturnType<typeof vi.fn>) {
  return toastAdd.mock.calls[toastAdd.mock.calls.length - 1][0] as {
    title: string
    description: string
    actions?: Array<{ label: string; onClick: () => unknown }>
  }
}

/* ---------------- 純函數：值 → op / 撤銷 / 移格 ---------------- */

describe('opFromEditValue（§6.4 值 → op 映射）', () => {
  it('trims; empty maps to clear, `_` maps to absent, otherwise set with trimmed raw; absent/clear carry no raw', () => {
    expect(opFromEditValue('')).toEqual({ op: 'clear' })
    expect(opFromEditValue('   ')).toEqual({ op: 'clear' })
    expect(opFromEditValue('_')).toEqual({ op: 'absent' })
    expect(opFromEditValue(' _ ')).toEqual({ op: 'absent' })
    expect(opFromEditValue('mai1')).toEqual({ op: 'set', raw: 'mai1' })
    expect(opFromEditValue(' mou5 hai6 ')).toEqual({ op: 'set', raw: 'mou5 hai6' })
  })
})

describe('isNoopEdit（值未變不發請求）', () => {
  it('recognizes identical state+value as no-op, anything else as a real write', () => {
    const normalMai1: FaanjyutMatrixCell = { state: 'normal', raw: 'mai1' }
    expect(isNoopEdit(normalMai1, { op: 'set', raw: 'mai1' })).toBe(true)
    expect(isNoopEdit(normalMai1, { op: 'set', raw: 'mou5' })).toBe(false)
    expect(isNoopEdit({ state: 'absent' }, { op: 'absent', raw: '_' })).toBe(true)
    expect(isNoopEdit({ state: 'absent' }, { op: 'set', raw: 'mou5' })).toBe(false)
    expect(isNoopEdit({ state: 'cleared', raw: 'mi3' }, { op: 'clear' })).toBe(true)
    // 點開「從未填寫」空格再離開（編輯框空 → clear）不應寫出 cleared 態（2026-08-06 用戶反饋）
    expect(isNoopEdit(undefined, { op: 'clear' })).toBe(true)
    expect(isNoopEdit({ state: 'null' }, { op: 'clear' })).toBe(true)
    expect(isNoopEdit(undefined, { op: 'set', raw: 'mou5' })).toBe(false)
    expect(isNoopEdit(normalMai1, { op: 'clear' })).toBe(false)
  })
})

describe('buildUndoEdit（§6.4 撤銷反向 op）', () => {
  it('restores normal by set(raw), absent by absent, cleared by clear', () => {
    expect(buildUndoEdit({ state: 'normal', raw: 'mai1' })).toEqual({
      edit: { op: 'set', raw: 'mai1' },
      description: 'mai1'
    })
    expect(buildUndoEdit({ state: 'absent', raw: '_' })).toEqual({
      edit: { op: 'absent' },
      description: '_（確定沒有）'
    })
    expect(buildUndoEdit({ state: 'cleared', raw: 'mi3' })).toEqual({
      edit: { op: 'clear' },
      description: '已清空'
    })
  })

  it('null/undefined prev degrades to clear op（v1 簡化：不刪 CellState，撤銷後為 cleared 家族）', () => {
    const expected = { edit: { op: 'clear' }, description: '空白（從未填寫）' }
    expect(buildUndoEdit(undefined)).toEqual(expected)
    expect(buildUndoEdit({ state: 'null' })).toEqual(expected)
  })
})

describe('移格列掃描（跳過 canEdit=false 的列）', () => {
  const cols = makeColumns()

  it('scanEditableColumn scans forward/backward without wrapping', () => {
    const editable = (c: FaanjyutMatrixColumn) => c.canEdit
    expect(scanEditableColumn(cols, 0, 1, editable)).toBe(1)
    expect(scanEditableColumn(cols, 1, 1, editable)).toBe(-1)
    expect(scanEditableColumn(cols, 3, -1, editable)).toBe(1)
    expect(scanEditableColumn(cols, 0, -1, editable)).toBe(-1)
  })

  it('firstEditableColumn picks the leading/trailing editable column', () => {
    const editable = (c: FaanjyutMatrixColumn) => c.canEdit
    expect(firstEditableColumn(cols, 1, editable)).toBe(0)
    expect(firstEditableColumn(cols, -1, editable)).toBe(1)
  })

  it('nearestEditableColumn snaps to closest editable column', () => {
    const editable = (c: FaanjyutMatrixColumn) => c.canEdit
    expect(nearestEditableColumn(cols, 1, editable)).toBe(1)
    expect(nearestEditableColumn(cols, 2, editable)).toBe(1)
    expect(nearestEditableColumn(cols, 3, editable)).toBe(1)
  })
})

/* ---------------- 狀態機 ---------------- */

describe('useFaanjyutCellEdit 編輯狀態機（§6.4）', () => {
  it('click enters edit prefilling the current display value', () => {
    const { ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-guangzhou' })
    expect(ctrl.editValue.value).toBe('mai1')
    expect(ctrl.isEditingCell('lex-1', 'col-guangzhou')).toBe(true)
    expect(ctrl.cursorToEnd.value).toBe(false)
  })

  it('click on a non-editable column does not enter edit; writeEnabled=false keeps page read-only', () => {
    const { ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-jiangmen')
    expect(ctrl.editingCell.value).toBeNull()

    const ro = makeHarness({ matrixData: makeMatrixData({ writeEnabled: false }) })
    ro.ctrl.handleCellClick('lex-1', 'col-guangzhou')
    expect(ro.ctrl.editingCell.value).toBeNull()
  })

  it('Enter saves a set op, patches the cell locally and shows an undo toast', async () => {
    const { matrixData, writeCells, toastAdd, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    await flushAsync()

    expect(writeCells).toHaveBeenCalledTimes(1)
    expect(writeCells.mock.calls[0][0]).toEqual([
      { lexemeId: 'lex-1', dialectId: 'guangzhou', op: 'set', raw: 'mou5' }
    ])
    // 本地 patch：不重拉矩陣（§13.1）
    expect(matrixData.value!.rows[0].cells['col-guangzhou']).toEqual({ state: 'normal', raw: 'mou5' })
    expect(ctrl.editingCell.value).toBeNull()
    expect(ctrl.pendingFor('lex-1', 'col-guangzhou')).toBe(false)

    const toast = lastToast(toastAdd)
    expect(toast.title).toBe('已儲存')
    expect(toast.description).toBe('原值：mai1')
    expect(toast.actions?.[0].label).toBe('撤銷')
  })

  it('`_` maps to absent, empty input maps to clear; both patch the four-state view', async () => {
    // absent
    const a = makeHarness()
    a.ctrl.handleCellClick('lex-1', 'col-guangzhou')
    a.ctrl.setEditValue('_')
    a.ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    await flushAsync()
    expect(a.writeCells.mock.calls[0][0][0]).toMatchObject({ op: 'absent' })
    expect(a.matrixData.value!.rows[0].cells['col-guangzhou'].state).toBe('absent')

    // clear（服務端卸載 raw → 本地視圖同步無 raw，顯示佔位）
    const c = makeHarness()
    c.ctrl.handleCellClick('lex-1', 'col-guangzhou')
    c.ctrl.setEditValue('')
    c.ctrl.handleEditorBlur('lex-1', 'col-guangzhou')
    await new Promise((r) => setTimeout(r, 250))
    await flushAsync()
    expect(c.writeCells.mock.calls[0][0][0]).toMatchObject({ op: 'clear' })
    expect(c.matrixData.value!.rows[0].cells['col-guangzhou']).toEqual({ state: 'cleared' })
  })

  it('unchanged value exits edit silently without any write or toast', async () => {
    const { writeCells, toastAdd, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mai1')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    await flushAsync()
    expect(writeCells).not.toHaveBeenCalled()
    expect(toastAdd).not.toHaveBeenCalled()
    expect(ctrl.editingCell.value).toBeNull()
  })

  it('shows a pending spinner while the write is in flight', async () => {
    let resolveWrite!: (v: FaanjyutCellWriteData) => void
    const { ctrl } = makeHarness({
      writeCells: () => new Promise<FaanjyutCellWriteData>((res) => { resolveWrite = res })
    })
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    await flushAsync()
    expect(ctrl.pendingFor('lex-1', 'col-guangzhou')).toBe(true)
    resolveWrite(okResult([{ lexemeId: 'lex-1', columnId: 'col-guangzhou', op: 'set', raw: 'mou5' }]))
    await flushAsync()
    expect(ctrl.pendingFor('lex-1', 'col-guangzhou')).toBe(false)
  })

  it('failed save keeps content and marks the cell red with error; click retry prefills and clears on success', async () => {
    let fail = true
    const { writeCells, ctrl } = makeHarness({
      writeCells: async (edits) => {
        if (fail) throw new Error('你沒有權限編輯此方言列')
        return okResult(edits)
      }
    })
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorBlur('lex-1', 'col-guangzhou')
    await new Promise((r) => setTimeout(r, 250))
    await flushAsync()

    expect(ctrl.errorFor('lex-1', 'col-guangzhou')).toBe('你沒有權限編輯此方言列')
    // 內容不丟：重新點擊失敗格預填失敗內容
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    expect(ctrl.editValue.value).toBe('mou5')

    // 重試成功 → 錯誤清除、本地 patch
    fail = false
    ctrl.handleEditorBlur('lex-1', 'col-guangzhou')
    await new Promise((r) => setTimeout(r, 250))
    await flushAsync()
    expect(ctrl.errorFor('lex-1', 'col-guangzhou')).toBeUndefined()
    expect(writeCells).toHaveBeenCalledTimes(2)
  })

  it('undo toast action sends the reverse op and patches back to the previous state', async () => {
    const { matrixData, writeCells, toastAdd, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    await flushAsync()

    lastToast(toastAdd).actions![0].onClick()
    await flushAsync()

    expect(writeCells).toHaveBeenCalledTimes(2)
    expect(writeCells.mock.calls[1][0]).toEqual([
      { lexemeId: 'lex-1', dialectId: 'guangzhou', op: 'set', raw: 'mai1' }
    ])
    expect(matrixData.value!.rows[0].cells['col-guangzhou']).toEqual({ state: 'normal', raw: 'mai1' })
  })

  it('undo of a set on a previously-null cell degrades to clear（v1 簡化，§6.4）', async () => {
    const { matrixData, writeCells, toastAdd, ctrl } = makeHarness()
    // lex-2 的 col-guangzhou 從未有數據（null）
    ctrl.handleCellClick('lex-2', 'col-guangzhou')
    expect(ctrl.editValue.value).toBe('')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-2', 'col-guangzhou')
    await flushAsync()

    lastToast(toastAdd).actions![0].onClick()
    await flushAsync()

    expect(writeCells.mock.calls[1][0]).toEqual([
      { lexemeId: 'lex-2', dialectId: 'guangzhou', op: 'clear' }
    ])
    expect(matrixData.value!.rows[1].cells['col-guangzhou'].state).toBe('cleared')
  })

  it('Tab moves to the next editable column skipping read-only ones, and wraps to the next row', () => {
    const { ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.handleEditorKeydown({ ...enterEvent('Tab'), shiftKey: false } as unknown as KeyboardEvent, 'lex-1', 'col-guangzhou')
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-hongkong' })
    // col-jiangmen / col-external 均唯讀 → 跳過並換行到 lex-2 的第一個可編輯列
    ctrl.handleEditorKeydown({ ...enterEvent('Tab'), shiftKey: false } as unknown as KeyboardEvent, 'lex-1', 'col-hongkong')
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-2', columnId: 'col-guangzhou' })
  })

  it('Enter on an IME composing event is not intercepted (composition stays intact)', () => {
    const { writeCells, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou')
    ctrl.handleEditorKeydown({ key: 'Enter', isComposing: true, preventDefault: vi.fn() } as unknown as KeyboardEvent, 'lex-1', 'col-guangzhou')
    expect(writeCells).not.toHaveBeenCalled()
    expect(ctrl.editingCell.value).not.toBeNull()
  })

  it('Esc cancels editing without writing', () => {
    const { writeCells, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent('Escape'), 'lex-1', 'col-guangzhou')
    expect(ctrl.editingCell.value).toBeNull()
    expect(writeCells).not.toHaveBeenCalled()
  })

  it('blur saves with a 200ms debounce; clicking another editable cell flushes the previous one first', async () => {
    const { writeCells, ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    // 200ms 內點擊下一格 → 上一格先 flush（立即保存）再進入新格
    ctrl.handleCellClick('lex-1', 'col-hongkong')
    await flushAsync()
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-hongkong' })
    expect(writeCells).toHaveBeenCalledTimes(1)
    expect(writeCells.mock.calls[0][0][0]).toMatchObject({
      lexemeId: 'lex-1',
      dialectId: 'guangzhou',
      op: 'set',
      raw: 'mou5'
    })
  })

  it('arrow keys move the focused cell across rows skipping read-only columns; Enter/typing activate edit', () => {
    const { ctrl } = makeHarness()
    // 首次按鍵：焦點落到第一個可編輯格並向右移一格（col-hongkong，跳過後面的唯讀列）
    ctrl.handleTableKeydown(charEvent('ArrowRight'))
    expect(ctrl.focusedCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-hongkong' })
    // 向右到行尾（無更多可編輯列）→ 保持不動
    ctrl.handleTableKeydown(charEvent('ArrowRight'))
    expect(ctrl.focusedCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-hongkong' })
    // 向下到下一行同列
    ctrl.handleTableKeydown(charEvent('ArrowDown'))
    expect(ctrl.focusedCell.value).toEqual({ lexemeId: 'lex-2', columnId: 'col-hongkong' })
    // Enter 進入編輯
    ctrl.handleTableKeydown(enterEvent())
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-2', columnId: 'col-hongkong' })
  })

  it('typing a character on the focused cell enters edit with the character appended', () => {
    const { ctrl } = makeHarness()
    ctrl.focusedCell.value = { lexemeId: 'lex-1', columnId: 'col-guangzhou' }
    ctrl.handleTableKeydown(charEvent('a'))
    expect(ctrl.editingCell.value).toEqual({ lexemeId: 'lex-1', columnId: 'col-guangzhou' })
    expect(ctrl.editValue.value).toBe('mai1a')
    expect(ctrl.cursorToEnd.value).toBe(true)
  })

  it('resetAll clears all transient edit state (page/filter/locate reload)', () => {
    const { ctrl } = makeHarness()
    ctrl.handleCellClick('lex-1', 'col-guangzhou')
    ctrl.setEditValue('mou5')
    ctrl.handleEditorKeydown(enterEvent(), 'lex-1', 'col-guangzhou')
    // 不等保存完成即 reset（模擬翻頁）
    ctrl.resetAll()
    expect(ctrl.editingCell.value).toBeNull()
    expect(ctrl.focusedCell.value).toBeNull()
    expect(ctrl.editValue.value).toBe('')
    expect(ctrl.errorFor('lex-1', 'col-guangzhou')).toBeUndefined()
    expect(ctrl.pendingFor('lex-1', 'col-guangzhou')).toBe(false)
  })

  it('cellKey is stable and unique across lexeme/column pairs', () => {
    expect(cellKey('lex-1', 'col-a')).toBe('lex-1:col-a')
    expect(cellKey('lex-1', 'col-a')).not.toBe(cellKey('lex-1', 'col-b'))
  })
})
