/**
 * matrix 純邏輯單元測試（FaanjyutV1Design.md §6/§12）：
 * 默認列集、30 列上限、canEdit、格四態推導、無 cell_state 的 domestic 格 Entry 回退、
 * 內存 pivot、cellFilter、性能預算守衛（50 行 × 30 列 < 500 KB）。不連真庫、不測 handler。
 */
import { describe, expect, it } from 'vitest'
import {
  MATRIX_MAX_COLUMNS,
  buildColumnSelection,
  canEditColumn,
  computeCellState,
  entryCellView,
  estimatePayloadBytes,
  listMatrixColumns,
  pivotMatrix,
  type MatrixCellDoc,
  type MatrixColumnDoc,
  type MatrixEntryDoc,
  type MatrixLexemeDoc,
  type MatrixUser
} from '../matrix'

let orderSeq = 0

function col(id: string, over: Partial<MatrixColumnDoc> = {}): MatrixColumnDoc {
  orderSeq += 1
  return {
    id,
    sourceRole: 'domestic',
    status: 'active',
    dialectId: id,
    label: id,
    order: { originalOrder: orderSeq },
    ...over
  }
}

function cell(lexemeId: string, columnId: string, over: Partial<MatrixCellDoc> = {}): MatrixCellDoc {
  return { lexemeId, columnId, ...over }
}

function lexeme(id: string, over: Partial<MatrixLexemeDoc> = {}): MatrixLexemeDoc {
  return { id, ...over }
}

/** 泛粵 entry 最小樣本（形態對齊 fixtures.ts 的 entries 樣例：dialect.name / phonetic.original / meta.sourceCell 等） */
function entry(lexemeId: string, dialectId: string, over: Partial<MatrixEntryDoc> = {}): MatrixEntryDoc {
  return {
    lexemeId,
    dialect: { name: dialectId },
    phonetic: { original: `raw-${dialectId}` },
    meta: { sourceCell: `主表!A7`, editedAfterImport: false },
    ...over
  }
}

const contributor: MatrixUser = { role: 'contributor', dialectPermissions: [] }
const admin: MatrixUser = { role: 'admin', dialectPermissions: [] }

describe('faanjyut/matrix buildColumnSelection', () => {
  it('默認列集：有權限用戶 = 本人可編輯列 + 廣州/香港（去重，按 originalOrder 排序）', () => {
    const columns = [
      col('ext_thai', { sourceRole: 'external', dialectId: undefined, languageCode: 'th', order: { originalOrder: 1 } }),
      col('taishan', { order: { originalOrder: 5 } }),
      col('guangzhou', { order: { originalOrder: 2 } }),
      col('hongkong', { order: { originalOrder: 3 } }),
      col('zhongshan', { order: { originalOrder: 4 } })
    ]
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
    const result = buildColumnSelection({ allColumns: columns, user })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.columns.map((c) => c.id)).toEqual(['guangzhou', 'hongkong', 'taishan'])
    expect(result.columns.find((c) => c.id === 'taishan')?.canEdit).toBe(true)
    expect(result.columns.find((c) => c.id === 'guangzhou')?.canEdit).toBe(false)
    expect(result.columns.find((c) => c.id === 'hongkong')?.canEdit).toBe(false)
  })

  it('默認列集：無權限用戶 = 僅廣州/香港', () => {
    const columns = [
      col('taishan', { order: { originalOrder: 3 } }),
      col('guangzhou', { order: { originalOrder: 1 } }),
      col('hongkong', { order: { originalOrder: 2 } })
    ]
    const result = buildColumnSelection({ allColumns: columns, user: contributor })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.columns.map((c) => c.id)).toEqual(['guangzhou', 'hongkong'])
    expect(result.columns.every((c) => !c.canEdit)).toBe(true)
  })

  it('默認列集超過 30 列時截斷為 30（admin 全部 domestic 可編輯）', () => {
    const columns = Array.from({ length: 40 }, (_, i) =>
      col(`d${i}`, { order: { originalOrder: i + 1 } })
    )
    const result = buildColumnSelection({ allColumns: columns, user: admin })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.columns).toHaveLength(MATRIX_MAX_COLUMNS)
    expect(result.columns.map((c) => c.id)).toEqual(
      Array.from({ length: MATRIX_MAX_COLUMNS }, (_, i) => `d${i}`)
    )
    expect(result.columns.every((c) => c.canEdit)).toBe(true)
  })

  it('指定列：requested 超過 30 列返回錯誤標記', () => {
    const columns = Array.from({ length: 35 }, (_, i) => col(`d${i}`))
    const requested = columns.map((c) => c.id)
    const result = buildColumnSelection({ allColumns: columns, requestedColumnIds: requested, user: admin })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain(String(MATRIX_MAX_COLUMNS))
  })

  it('指定列：未命中 id 靜默略過，結果按 originalOrder 排序並附 canEdit', () => {
    const columns = [
      col('taishan', { order: { originalOrder: 2 } }),
      col('guangzhou', { order: { originalOrder: 1 } })
    ]
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
    const result = buildColumnSelection({
      allColumns: columns,
      requestedColumnIds: ['taishan', 'missing_id', 'guangzhou', 'taishan'],
      user
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.columns.map((c) => c.id)).toEqual(['guangzhou', 'taishan'])
    expect(result.columns.find((c) => c.id === 'taishan')?.canEdit).toBe(true)
  })
})

describe('faanjyut/matrix canEditColumn', () => {
  it('admin 對全部 domestic active 列可編輯', () => {
    expect(canEditColumn(col('zhongshan'), admin)).toBe(true)
  })

  it('有權限用戶：dialectId 命中 dialectPermissions 可編輯，否則不可', () => {
    const user: MatrixUser = { role: 'reviewer', dialectPermissions: [{ dialectName: 'taishan' }] }
    expect(canEditColumn(col('taishan'), user)).toBe(true)
    expect(canEditColumn(col('zhongshan'), user)).toBe(false)
  })

  it('external 列恒不可編輯（含 admin 與命中方言）', () => {
    const extCol = col('ext_thai', { sourceRole: 'external', dialectId: 'taishan', languageCode: 'th' })
    expect(canEditColumn(extCol, admin)).toBe(false)
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
    expect(canEditColumn(extCol, user)).toBe(false)
  })

  it('inactive 列不可編輯（含 admin 與有權限用戶）', () => {
    const inactive = col('taishan', { status: 'inactive' })
    expect(canEditColumn(inactive, admin)).toBe(false)
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
    expect(canEditColumn(inactive, user)).toBe(false)
  })

  it('domestic 列無 dialectId 時非 admin 不可編輯', () => {
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
    expect(canEditColumn(col('no_dialect', { dialectId: undefined }), user)).toBe(false)
  })
})

describe('faanjyut/matrix computeCellState 四態推導', () => {
  it('無文檔 → null', () => {
    expect(computeCellState(undefined)).toEqual({ state: 'null' })
    expect(computeCellState(null)).toEqual({ state: 'null' })
  })

  it('有值 → normal（含 raw/sourceCell/editedAfterImport/version）', () => {
    const view = computeCellState(cell('l1', 'c1', {
      raw: 'kaːu',
      status: { flags: {} },
      source: { sourceCell: '主表!A7' },
      editedAfterImport: false,
      version: 0
    }))
    expect(view).toEqual({
      state: 'normal',
      raw: 'kaːu',
      sourceCell: '主表!A7',
      editedAfterImport: false,
      version: 0
    })
  })

  it('flags.explicitlyAbsent → absent（UI 顯示 _）', () => {
    const view = computeCellState(cell('l1', 'c1', {
      status: { flags: { explicitlyAbsent: true } }
    }))
    expect(view.state).toBe('absent')
  })

  it('flags.explicitlyCleared → cleared', () => {
    const view = computeCellState(cell('l1', 'c1', {
      status: { flags: { explicitlyCleared: true } }
    }))
    expect(view.state).toBe('cleared')
  })

  it('absent 與 cleared 同時為真時 absent 優先', () => {
    const view = computeCellState(cell('l1', 'c1', {
      status: { flags: { explicitlyAbsent: true, explicitlyCleared: true } }
    }))
    expect(view.state).toBe('absent')
  })
})

describe('faanjyut/matrix pivotMatrix', () => {
  const columns = [{ id: 'c1' }, { id: 'c2' }]

  it('組裝行摘要 + cells: Record<columnId, CellView>，缺格為 null', () => {
    const lexemes = [
      lexeme('l1', {
        meta: {
          sourceKey: '>416461',
          matrixOrder: 7,
          representativeChar: { raw: '粵', display: '粵' },
          compositePronunciation: { raw: 'Jyut6', display: 'Jyut6', markers: { hasQuestion: false, hasBang: false } }
        },
        status: { publicationStatus: 'published' }
      }),
      lexeme('l2', { meta: { sourceKey: '>999', matrixOrder: 8 }, status: { publicationStatus: 'draft' } })
    ]
    const cells = [
      cell('l1', 'c1', { raw: 'kaːu', status: { flags: {} }, editedAfterImport: false, version: 0 }),
      cell('l2', 'c2', { status: { flags: { explicitlyAbsent: true } } })
    ]
    const rows = pivotMatrix({ lexemes, cells, columns })
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      id: 'l1',
      sourceKey: '>416461',
      matrixOrder: 7,
      publicationStatus: 'published',
      representativeChar: { raw: '粵', display: '粵' },
      compositePronunciation: { raw: 'Jyut6', display: 'Jyut6' }
    })
    expect(rows[0].cells.c1?.state).toBe('normal')
    expect(rows[0].cells.c2?.state).toBe('null')
    expect(rows[1].cells.c1?.state).toBe('null')
    expect(rows[1].cells.c2?.state).toBe('absent')
    // 不屬於所選列/頁內詞條的格不影響結果
    const withExtra = pivotMatrix({ lexemes, cells: [...cells, cell('lX', 'c1', { raw: 'x' })], columns })
    expect(withExtra).toEqual(rows)
  })

  it('cellFilter：只保留所選列中至少一格命中該態的行', () => {
    const lexemes = [lexeme('l1'), lexeme('l2'), lexeme('l3'), lexeme('l4')]
    const cells = [
      cell('l1', 'c1', { raw: 'a', status: { flags: {} } }), // l1: normal + null(c2)
      cell('l2', 'c1', { status: { flags: { explicitlyAbsent: true } } }), // l2: absent + null(c2)
      cell('l3', 'c1', { status: { flags: { explicitlyCleared: true } } }),
      cell('l3', 'c2', { raw: 'b', status: { flags: {} } }), // l3: cleared + normal
      cell('l4', 'c1', { raw: 'c', status: { flags: {} } }),
      cell('l4', 'c2', { raw: 'd', status: { flags: {} } }) // l4: 全 normal
    ]
    const ids = (filter?: 'null' | 'normal' | 'absent' | 'cleared') =>
      pivotMatrix({ lexemes, cells, columns, cellFilter: filter }).map((r) => r.id)
    expect(ids('null')).toEqual(['l1', 'l2'])
    expect(ids('normal')).toEqual(['l1', 'l3', 'l4'])
    expect(ids('absent')).toEqual(['l2'])
    expect(ids('cleared')).toEqual(['l3'])
    expect(ids(undefined)).toEqual(['l1', 'l2', 'l3', 'l4'])
  })
})

describe('faanjyut/matrix entryCellView（無 cell_state 的 domestic 格回退）', () => {
  it('entry 缺失 → null 態', () => {
    expect(entryCellView(undefined)).toEqual({ state: 'null' })
    expect(entryCellView(null)).toEqual({ state: 'null' })
  })

  it('有 entry → normal + raw=phonetic.original + sourceCell/editedAfterImport', () => {
    const view = entryCellView(entry('l1', 'guangzhou', {
      phonetic: { original: 'jyut6' },
      meta: { sourceCell: '主表!AI7', editedAfterImport: false }
    }))
    expect(view).toEqual({
      state: 'normal',
      raw: 'jyut6',
      sourceCell: '主表!AI7',
      editedAfterImport: false
    })
  })

  it('editedAfterImport 缺省 → false；phonetic.original 為數組時 join 顯示', () => {
    expect(entryCellView(entry('l1', 'taishan', { meta: { sourceCell: '主表!Q7' } }))).toMatchObject({
      state: 'normal',
      raw: 'raw-taishan',
      editedAfterImport: false
    })
    expect(entryCellView(entry('l1', 'guangzhou', { phonetic: { original: ['jyut6', 'jyut6a'] } }))?.raw)
      .toBe('jyut6 jyut6a')
  })
})

describe('faanjyut/matrix pivotMatrix entries 回退（domestic 格無 cell_state）', () => {
  const domesticCol = { id: 'c1', sourceRole: 'domestic', dialectId: 'guangzhou' }
  const externalCol = { id: 'ext1', sourceRole: 'external', dialectId: 'guangzhou' }

  it('domestic 格無 cell_state 有 entry → normal + raw 正確', () => {
    const rows = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [],
      columns: [domesticCol],
      entries: [entry('l1', 'guangzhou', {
        phonetic: { original: 'jyut6' },
        meta: { sourceCell: '主表!AI7', editedAfterImport: false }
      })]
    })
    expect(rows[0].cells.c1).toEqual({
      state: 'normal',
      raw: 'jyut6',
      sourceCell: '主表!AI7',
      editedAfterImport: false
    })
  })

  it('有 cell_state 時 entry 被忽略（cell_state 優先，含 normal/absent 態）', () => {
    // cell_state normal（P4 編輯後的 raw）優先於 entry 的導入值
    const rows = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [cell('l1', 'c1', { raw: 'edited-raw', status: { flags: {} }, editedAfterImport: true })],
      columns: [domesticCol],
      entries: [entry('l1', 'guangzhou', { phonetic: { original: 'import-raw' } })]
    })
    expect(rows[0].cells.c1).toMatchObject({
      state: 'normal',
      raw: 'edited-raw',
      editedAfterImport: true
    })

    // absent cell_state 同樣優先（entry 存在也不回退）
    const rows2 = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [cell('l1', 'c1', { status: { flags: { explicitlyAbsent: true } } })],
      columns: [domesticCol],
      entries: [entry('l1', 'guangzhou')]
    })
    expect(rows2[0].cells.c1?.state).toBe('absent')
  })

  it('審計 M26：normal 無 raw 的 cell_state（hasOldNote 批注格）→ domestic 回退 entry，與詳情頁一致', () => {
    // hasOldNote 格：cell_state 存在但無 raw → 回退 entry 值
    const rows = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [cell('l1', 'c1', { status: { flags: { hasOldNote: true } } })],
      columns: [domesticCol],
      entries: [entry('l1', 'guangzhou', { phonetic: { original: 'jyut6' } })]
    })
    expect(rows[0].cells.c1).toMatchObject({ state: 'normal', raw: 'jyut6' })

    // 無 entry 值時保持原 view（normal 無 raw，不無中生有）
    const rowsNoEntry = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [cell('l1', 'c1', { status: { flags: { hasOldNote: true } } })],
      columns: [domesticCol],
      entries: []
    })
    expect(rowsNoEntry[0].cells.c1).toMatchObject({ state: 'normal' })
    expect(rowsNoEntry[0].cells.c1?.raw).toBeUndefined()

    // external 列不回退（域外值一律在 cell_state）
    const rowsExternal = pivotMatrix({
      lexemes: [lexeme('l1')],
      cells: [cell('l1', 'ext1', { status: { flags: { hasOldNote: true } } })],
      columns: [externalCol],
      entries: [entry('l1', 'guangzhou', { phonetic: { original: 'jyut6' } })]
    })
    expect(rowsExternal[0].cells.ext1).toMatchObject({ state: 'normal' })
    expect(rowsExternal[0].cells.ext1?.raw).toBeUndefined()
  })

  it('domestic 無 cell_state 無 entry → null；external 無 cell_state → null（同名 entry 也不匹配）', () => {
    const rows = pivotMatrix({
      lexemes: [lexeme('l1'), lexeme('l2')],
      cells: [],
      columns: [domesticCol, externalCol],
      entries: [
        // ext1 是 dialectId=guangzhou 的 external 列，不得被同名 entry 誤填
        entry('l1', 'guangzhou', { phonetic: { original: 'jyut6' } })
      ]
    })
    expect(rows[0].cells.c1?.state).toBe('normal')
    expect(rows[0].cells.ext1?.state).toBe('null')
    expect(rows[1].cells.c1?.state).toBe('null')
    expect(rows[1].cells.ext1?.state).toBe('null')
  })

  it('cellFilter=normal 能命中 join 出來的 normal 格', () => {
    const rows = pivotMatrix({
      lexemes: [lexeme('l1'), lexeme('l2'), lexeme('l3')],
      cells: [cell('l3', 'c1', { status: { flags: { explicitlyAbsent: true } } })],
      columns: [domesticCol],
      entries: [entry('l1', 'guangzhou')], // l1: join normal；l2: null；l3: cell_state absent
      cellFilter: 'normal'
    })
    expect(rows.map((r) => r.id)).toEqual(['l1'])
  })
})

describe('faanjyut/matrix estimatePayloadBytes 性能預算守衛', () => {
  it('50 行 × 30 列構造數據 < 500 KB（§6.6；含 raw 值的 join 回退形態）', () => {
    const columns = Array.from({ length: MATRIX_MAX_COLUMNS }, (_, i) => ({
      id: `fjcol_${String(i).padStart(24, '0')}`,
      label: `方言點${i}`,
      shortLabel: `點${i}`,
      dialectId: `dialect${i}`,
      sourceRole: 'domestic',
      canEdit: i % 3 === 0,
      style: { color: 'F1C232' }
    }))
    const rows = Array.from({ length: 50 }, (_, r) => {
      const cells: Record<string, unknown> = {}
      for (const c of columns) {
        cells[c.id] = {
          state: 'normal',
          raw: 'kʰɐu˧˥ tsɿ˧ 方言方音示例值',
          sourceCell: `主表-睇真尐註解!A${r + 7}`,
          editedAfterImport: false,
          version: 0
        }
      }
      return {
        id: `fjl_${String(r).padStart(24, '0')}`,
        sourceKey: `>${r}16461483360343`,
        representativeChar: { raw: '粵', display: '粵' },
        compositePronunciation: { raw: 'Jyut6', display: 'Jyut6', markers: { hasQuestion: false, hasBang: false } },
        matrixOrder: r + 7,
        publicationStatus: 'published',
        cells
      }
    })
    const data = {
      columns,
      rows,
      pagination: { page: 1, perPage: 50, total: 8152, totalPages: 164 },
      writeEnabled: false
    }
    const bytes = estimatePayloadBytes(data)
    expect(bytes).toBeGreaterThan(0)
    expect(bytes).toBeLessThan(500 * 1024)
  })
})

describe('faanjyut/matrix listMatrixColumns（列選擇器全量清單）', () => {
  it('返回全部列（不截斷），按 originalOrder 排序並附 canEdit', () => {
    const columns = Array.from({ length: 40 }, (_, i) =>
      col(`d${i}`, { order: { originalOrder: 40 - i } })
    )
    const user: MatrixUser = { role: 'contributor', dialectPermissions: [{ dialectName: 'd5' }] }
    const result = listMatrixColumns({ allColumns: columns, user })
    expect(result).toHaveLength(40)
    expect(result.map((c) => c.id)).toEqual([...Array(40)].map((_, i) => `d${39 - i}`))
    expect(result.find((c) => c.id === 'd5')?.canEdit).toBe(true)
    expect(result.find((c) => c.id === 'd6')?.canEdit).toBe(false)
  })

  it('域外列保留在清單中但 canEdit 恒為 false', () => {
    const columns = [
      col('ext_thai', { sourceRole: 'external', dialectId: undefined, languageCode: 'th', order: { originalOrder: 2 } }),
      col('guangzhou', { order: { originalOrder: 1 } })
    ]
    const result = listMatrixColumns({ allColumns: columns, user: admin })
    expect(result.map((c) => c.id)).toEqual(['guangzhou', 'ext_thai'])
    expect(result.find((c) => c.id === 'guangzhou')?.canEdit).toBe(true)
    expect(result.find((c) => c.id === 'ext_thai')?.canEdit).toBe(false)
  })
})
