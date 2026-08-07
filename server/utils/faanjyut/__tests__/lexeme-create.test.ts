/**
 * lexeme-create 新建詞條測試（FaanjyutV1Design §8、§12 `POST /api/faanjyut/lexemes`、§13 P5）：
 * 沿用 cells.test.ts 的內存 fake 基建——LexemeCreateDb 注入、不連真庫、不測 handler。
 * 覆蓋：四件套落庫 + JC- 序號遞增 + matrixOrder Date.now() + sourceBook、Zod 拒（釋義空/空陣列/
 * 重複方言/超 30 格）、無權限列 403、列不存在 400、事務回滾、撞 sourceKey unique → 409 語義。
 */
import { describe, expect, it } from 'vitest'
import {
  CreateLexemeBodySchema,
  DUPLICATE_DIALECT_MESSAGE,
  LEXEME_ID_PREFIX,
  LEXEME_ID_RANDOM_LENGTH,
  SOURCE_KEY_CONFLICT_MESSAGE,
  LexemeCreateError,
  buildLexemeDoc,
  createLexeme,
  httpErrorForCreateLexeme,
  type CreateLexemeInput,
  type LexemeCreateDb,
  type LexemeCreateTx
} from '../lexeme-create'
import {
  COLUMN_NOT_FOUND_MESSAGE,
  NO_PERMISSION_MESSAGE,
  type CellsColumnDoc,
  type CellsUser
} from '../cells'
import { cellStateId, entryId } from '../stable-id'

const COL_GZ = 'fjcol_gz'
const COL_TS = 'fjcol_ts'

const columnGz: CellsColumnDoc = {
  id: COL_GZ,
  sourceRole: 'domestic',
  status: 'active',
  dialectId: 'guangzhou',
  label: '廣州',
  sourceSheet: '主表-睇真尐註解',
  sourceColumn: '穗',
  sourceColumnIndex: 37,
  sourceColumnLetter: 'AK',
  regionCode: 'GZ'
}

const columnTs: CellsColumnDoc = {
  id: COL_TS,
  sourceRole: 'domestic',
  status: 'active',
  dialectId: 'taishan',
  label: '台山',
  sourceSheet: '主表-睇真尐註解',
  sourceColumn: '台',
  sourceColumnIndex: 17,
  sourceColumnLetter: 'Q',
  regionCode: 'TS'
}

const userGz: CellsUser = { id: 'user_1', role: 'contributor', dialectPermissions: [{ dialectName: 'guangzhou' }] }
const userNoGz: CellsUser = { id: 'user_2', role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
const admin: CellsUser = { id: 'admin_1', role: 'admin', dialectPermissions: [] }

function input(over: Partial<CreateLexemeInput> = {}): CreateLexemeInput {
  return {
    definitionRaw: '佢',
    compositePronunciation: 'keoi5',
    representativeChar: '佢',
    note: '備註',
    initialCells: [{ dialectId: 'guangzhou', raw: 'keoi5' }],
    ...over
  }
}

// ---- 內存 fake：模擬 Mongo unique 鍵（lexemes.id / {meta.sourceBook,meta.sourceKey}、entries.id、
//      cellStates {lexemeId,columnId}）與單一事務（任一操作拋錯 → buffer 丟棄、全部回滾） ----

class FakeLexemeCreateDb implements LexemeCreateDb {
  columns: CellsColumnDoc[] = []
  lexemes: Array<Record<string, unknown>> = []
  entries: Array<Record<string, unknown>> = []
  cellStates: Array<Record<string, unknown>> = []
  histories: Array<Record<string, unknown>> = []
  /** createEditHistory 拋錯（事務回滾測試） */
  failHistoryCreate = false
  /** JC- 計數器起點（測試序號遞增 / 撞號） */
  counterSeq = 0
  private seq = 0

  async findColumnsByDialectIds(dialectIds: string[]): Promise<CellsColumnDoc[]> {
    return this.columns.filter((c) => c.dialectId && dialectIds.includes(c.dialectId))
  }

  async withTransaction<T>(fn: (tx: LexemeCreateTx) => Promise<T>): Promise<T> {
    const buffer = {
      createdLexemes: [] as Array<Record<string, unknown>>,
      createdEntries: [] as Array<Record<string, unknown>>,
      cellUpserts: [] as Array<{ kind: 'insert' | 'update'; doc: Record<string, unknown> }>,
      histories: [] as Array<Record<string, unknown>>
    }

    const tx: LexemeCreateTx = {
      findEntry: async () => null,
      createEntry: async (doc) => {
        const entry = { ...this.clone(doc), _id: `fake_oid_${(this.seq += 1)}` }
        buffer.createdEntries.push(entry)
        return this.clone(entry) as any
      },
      updateEntry: async (entry) => entry,
      deleteEntry: async () => {},
      upsertCellState: async (args) => {
        const existing = this.cellStates.find((cs) => cs.lexemeId === args.lexemeId && cs.columnId === args.columnId)
        const base = existing
          ? this.clone(existing)
          : {
              _id: `fake_cell_${(this.seq += 1)}`,
              id: cellStateId(args.lexemeId, args.columnId),
              lexemeId: args.lexemeId,
              columnId: args.columnId,
              status: { workflow: 'unreviewed', flags: {} },
              version: 0,
              editedAfterImport: false,
              createdBy: args.userId
            }
        const flags = { ...(base.status?.flags ?? {}) }
        flags.modifiedPendingReview = args.flags.modifiedPendingReview ?? false
        flags.explicitlyAbsent = args.flags.explicitlyAbsent ?? false
        flags.explicitlyCleared = args.flags.explicitlyCleared ?? false
        const doc: Record<string, unknown> = {
          ...base,
          status: { workflow: 'unreviewed', flags },
          editedAfterImport: true,
          version: Number(base.version) + 1,
          updatedBy: args.userId
        }
        if (args.raw !== undefined) doc.raw = args.raw
        if (args.projectionEntryId != null) {
          doc.projection = { ...(doc.projection ?? {}), entryId: args.projectionEntryId }
        }
        buffer.cellUpserts.push({ kind: existing ? 'update' : 'insert', doc })
      },
      createEditHistory: async (doc) => {
        if (this.failHistoryCreate) throw new Error('模擬 EditHistory 寫入失敗')
        buffer.histories.push(doc)
      },
      createLexeme: async (doc) => {
        const lexeme = { ...this.clone(doc), _id: `fake_lex_${(this.seq += 1)}` }
        buffer.createdLexemes.push(lexeme)
        return { id: lexeme.id as string }
      },
      nextSourceKeySeq: async () => (this.counterSeq += 1)
    }

    const result = await fn(tx)

    // 提交階段：按 unique 鍵檢查；任一衝突拋 11000 → 整個 buffer 丟棄（事務回滾）
    for (const lex of buffer.createdLexemes) {
      const key = (lex.meta as any)?.sourceKey
      if (this.lexemes.some((l) => l.id === lex.id || (l.meta as any)?.sourceKey === key)) throw this.dupError()
      this.lexemes.push(this.clone(lex))
    }
    for (const entry of buffer.createdEntries) {
      if (this.entries.some((e) => e.id === entry.id)) throw this.dupError()
      this.entries.push(this.clone(entry))
    }
    for (const { kind, doc } of buffer.cellUpserts) {
      const exists = this.cellStates.some((cs) => cs.lexemeId === doc.lexemeId && cs.columnId === doc.columnId)
      if (kind === 'insert' && exists) throw this.dupError()
      if (kind === 'insert') {
        this.cellStates.push(this.clone(doc))
      } else {
        const index = this.cellStates.findIndex((cs) => cs.lexemeId === doc.lexemeId && cs.columnId === doc.columnId)
        if (index >= 0) this.cellStates[index] = this.clone(doc)
      }
    }
    for (const history of buffer.histories) {
      this.histories.push(this.clone(history))
    }
    return result
  }

  private dupError(): Error & { code: number } {
    const error = new Error('E11000 duplicate key error') as Error & { code: number }
    error.code = 11000
    error.name = 'MongoServerError'
    return error
  }

  private clone<T>(doc: T): T {
    return JSON.parse(JSON.stringify(doc))
  }
}

function makeDb(over: { columns?: CellsColumnDoc[] } = {}): FakeLexemeCreateDb {
  const db = new FakeLexemeCreateDb()
  db.columns = over.columns ?? [columnGz, columnTs]
  return db
}

describe('faanjyut/lexeme-create 建立成功', () => {
  it('四件套落庫：Lexeme（JC- 鍵/草案/sourceBook）+ Entry + CellState + EditHistory，matrixOrder = Date.now()（審計 M38）', async () => {
    const db = makeDb()
    const result = await createLexeme(db, input({
      definitionRaw: '  佢  ',
      compositePronunciation: ' keoi5 ',
      representativeChar: ' 佢 ',
      initialCells: [
        { dialectId: 'guangzhou', raw: ' keoi5 ' },
        { dialectId: 'taishan', raw: 'kui5' }
      ]
    }), admin)

    expect(result.sourceKey).toBe('JC-00000001')
    expect(result.lexemeId).toMatch(new RegExp(`^${LEXEME_ID_PREFIX}[A-Za-z0-9_-]{${LEXEME_ID_RANDOM_LENGTH}}$`))
    expect(result.entries).toEqual([
      { dialectId: 'guangzhou', entryId: entryId('JC-00000001', 'guangzhou') },
      { dialectId: 'taishan', entryId: entryId('JC-00000001', 'taishan') }
    ])

    // Lexeme
    expect(db.lexemes).toHaveLength(1)
    const lexeme = db.lexemes[0] as any
    expect(lexeme.id).toBe(result.lexemeId)
    expect(lexeme.meta).toMatchObject({
      sourceBook: 'faanjyut',
      sourceKey: 'JC-00000001',
      definitionRaw: '佢',
      matrixOrder: expect.any(Number),
      editedAfterImport: true,
      createdBy: 'admin_1',
      updatedBy: 'admin_1',
      // 新建詞條無導入溯源：七鍵中除 sourceBook/sourceKey 外全空
      sourceWorkbook: null,
      sourceSheet: null,
      sourceRow: null,
      sourceColumn: null,
      sourceColumnIndex: null,
      sourceCell: null
    })
    expect(lexeme.meta.compositePronunciation).toEqual({ raw: 'keoi5', display: 'keoi5' })
    expect(lexeme.meta.representativeChar).toEqual({ raw: '佢', display: '佢' })
    expect(lexeme.status).toEqual({ publicationStatus: 'draft' })
    expect(lexeme.notes).toBe('備註')

    // Entry（穩定 ID / 代表字 / draft / editedAfterImport / 七鍵 meta 走 buildNewEntryDoc）
    expect(db.entries).toHaveLength(2)
    const entry = db.entries[0] as any
    expect(entry.id).toBe(entryId('JC-00000001', 'guangzhou'))
    expect(entry.lexemeId).toBe(result.lexemeId)
    expect(entry.sourceBook).toBe('faanjyut')
    expect(entry.dialect).toEqual({ name: 'guangzhou', regionCode: 'GZ' })
    expect(entry.headword).toMatchObject({ display: '佢', normalized: '佢', isPlaceholder: false })
    expect(entry.phonetic).toEqual({ original: 'keoi5' })
    expect(entry.status).toBe('draft')
    expect(entry.createdBy).toBe('admin_1')
    expect(entry.meta).toMatchObject({
      sourceSheet: '主表-睇真尐註解',
      sourceColumn: '穗',
      sourceColumnIndex: 37,
      sourceKey: 'JC-00000001',
      editedAfterImport: true
    })

    // CellState（set 語義）
    expect(db.cellStates).toHaveLength(2)
    const cell = db.cellStates[0] as any
    expect(cell.id).toBe(cellStateId(result.lexemeId, COL_GZ))
    expect(cell.lexemeId).toBe(result.lexemeId)
    expect(cell.columnId).toBe(COL_GZ)
    expect(cell.raw).toBe('keoi5')
    expect(cell.version).toBe(1)
    expect(cell.editedAfterImport).toBe(true)
    expect(cell.status).toMatchObject({ workflow: 'unreviewed', flags: { modifiedPendingReview: true } })
    expect((cell.projection as any).entryId).toBe(entry.id)

    // EditHistory（_id 字符串 + create 快照）
    expect(db.histories).toHaveLength(2)
    expect(db.histories[0]).toMatchObject({
      entryId: String(entry._id),
      userId: 'admin_1',
      action: 'create',
      changedFields: ['headword', 'dialect', 'phonetic.original']
    })
    expect(db.histories[0].beforeSnapshot).toEqual({})
    expect((db.histories[0].afterSnapshot as any).id).toBe(entry.id)
  })

  it('JC- 序號遞增：連續兩次建立 → JC-00000001 / JC-00000002；matrixOrder = Date.now()（審計 M38，排在導入行之後且無並發同值問題）', async () => {
    const db = makeDb()
    const first = await createLexeme(db, input(), userGz)
    const second = await createLexeme(db, input({ initialCells: [{ dialectId: 'taishan', raw: 'kui5' }] }), admin)

    expect(first.sourceKey).toBe('JC-00000001')
    expect(second.sourceKey).toBe('JC-00000002')
    // Date.now() 遠大於導入行 matrixOrder（1..N），且兩次之間單調不減
    const order1 = (db.lexemes[0] as any).meta.matrixOrder as number
    const order2 = (db.lexemes[1] as any).meta.matrixOrder as number
    expect(order1).toBeGreaterThan(1e12)
    expect(order2).toBeGreaterThanOrEqual(order1)
    expect(db.entries).toHaveLength(2)
    expect(db.cellStates).toHaveLength(2)
    expect(db.histories).toHaveLength(2)
  })

  it('可空字段留空：meta 不帶 compositePronunciation/representativeChar，notes 為 undefined', async () => {
    const db = makeDb()
    const result = await createLexeme(db, input({
      compositePronunciation: '  ',
      representativeChar: undefined,
      note: undefined
    }), userGz)

    const lexeme = db.lexemes[0] as any
    expect(lexeme.meta.compositePronunciation).toBeUndefined()
    expect(lexeme.meta.representativeChar).toBeUndefined()
    expect(lexeme.notes).toBeUndefined()
    // 無代表字 → Entry headword 佔位
    const entry = db.entries[0] as any
    expect(entry.headword).toMatchObject({ display: '', isPlaceholder: true })
    expect(result.entries[0].entryId).toBe(entryId('JC-00000001', 'guangzhou'))
  })
})

describe('faanjyut/lexeme-create Zod 拒', () => {
  it('definitionRaw 空（含全空白）→ 拒', () => {
    const base = { definitionRaw: 'x', initialCells: [{ dialectId: 'guangzhou', raw: 'x' }] }
    expect(CreateLexemeBodySchema.safeParse({ ...base, definitionRaw: '' }).success).toBe(false)
    expect(CreateLexemeBodySchema.safeParse({ ...base, definitionRaw: '   ' }).success).toBe(false)
    expect(CreateLexemeBodySchema.safeParse({ ...base, definitionRaw: undefined }).success).toBe(false)
  })

  it('initialCells 空陣列 → 拒', () => {
    expect(CreateLexemeBodySchema.safeParse({ definitionRaw: 'x', initialCells: [] }).success).toBe(false)
  })

  it('重複 dialectId → 拒', () => {
    const result = CreateLexemeBodySchema.safeParse({
      definitionRaw: 'x',
      initialCells: [{ dialectId: 'guangzhou', raw: 'a' }, { dialectId: 'guangzhou', raw: 'b' }]
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.message === DUPLICATE_DIALECT_MESSAGE)).toBe(true)
    }
  })

  it('initialCells 超過 30 格 → 拒', () => {
    const cells = Array.from({ length: 31 }, (_, i) => ({ dialectId: `d${i}`, raw: 'x' }))
    expect(CreateLexemeBodySchema.safeParse({ definitionRaw: 'x', initialCells: cells }).success).toBe(false)
    // 30 格合法
    const ok = Array.from({ length: 30 }, (_, i) => ({ dialectId: `d${i}`, raw: 'x' }))
    expect(CreateLexemeBodySchema.safeParse({ definitionRaw: 'x', initialCells: ok }).success).toBe(true)
  })

  it('正常請求通過 zod 且字段已 trim', () => {
    const result = CreateLexemeBodySchema.safeParse({
      definitionRaw: ' 釋義 ',
      compositePronunciation: ' keoi5 ',
      representativeChar: ' 佢 ',
      note: ' 注 ',
      initialCells: [{ dialectId: 'guangzhou', raw: ' keoi5 ' }]
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.definitionRaw).toBe('釋義')
      expect(result.data.compositePronunciation).toBe('keoi5')
      expect(result.data.initialCells[0].raw).toBe('keoi5')
    }
  })
})

describe('faanjyut/lexeme-create 權限與列解析', () => {
  it('無權限列 → 403，不觸庫', async () => {
    const db = makeDb()
    await expect(createLexeme(db, input(), userNoGz)).rejects.toMatchObject({
      statusCode: 403,
      message: NO_PERMISSION_MESSAGE
    })
    expect(db.lexemes).toHaveLength(0)
    expect(db.entries).toHaveLength(0)
  })

  it('列不存在（未知方言）→ 400，不觸庫', async () => {
    const db = makeDb()
    await expect(
      createLexeme(db, input({ initialCells: [{ dialectId: 'nonexistent', raw: 'x' }] }), admin)
    ).rejects.toMatchObject({ statusCode: 400, message: COLUMN_NOT_FOUND_MESSAGE })
    expect(db.lexemes).toHaveLength(0)
  })

  it('admin 可在任意域內 active 列建立', async () => {
    const db = makeDb()
    const result = await createLexeme(db, input({ initialCells: [{ dialectId: 'taishan', raw: 'kui5' }] }), admin)
    expect(result.sourceKey).toBe('JC-00000001')
    expect(db.lexemes).toHaveLength(1)
    expect(db.entries[0]).toMatchObject({ lexemeId: result.lexemeId })
  })
})

describe('faanjyut/lexeme-create 事務與唯一鍵', () => {
  it('事務回滾：createEditHistory 拋錯 → Lexeme/Entry/CellState 全不落庫', async () => {
    const db = makeDb()
    db.failHistoryCreate = true
    await expect(createLexeme(db, input(), userGz)).rejects.toThrow('模擬 EditHistory 寫入失敗')
    expect(db.lexemes).toHaveLength(0)
    expect(db.entries).toHaveLength(0)
    expect(db.cellStates).toHaveLength(0)
    expect(db.histories).toHaveLength(0)
  })

  it('撞 sourceKey unique（既有 JC-00000001）→ 11000 拋出 → httpErrorForCreateLexeme 映射 409', async () => {
    const db = makeDb()
    db.counterSeq = 0
    db.lexemes.push({ id: 'fjl_existing', meta: { sourceBook: 'faanjyut', sourceKey: 'JC-00000001' } })

    await expect(createLexeme(db, input(), userGz)).rejects.toMatchObject({ code: 11000 })
    // 撞號時整個 buffer 丟棄，不產生第二條記錄
    expect(db.lexemes).toHaveLength(1)
    expect(db.entries).toHaveLength(0)
    expect(db.cellStates).toHaveLength(0)
  })

  it('httpErrorForCreateLexeme：LexemeCreateError 原樣、11000 → 409、未知錯誤 → null', () => {
    expect(httpErrorForCreateLexeme(new LexemeCreateError(403, NO_PERMISSION_MESSAGE)))
      .toEqual({ statusCode: 403, message: NO_PERMISSION_MESSAGE })
    expect(httpErrorForCreateLexeme({ code: 11000 })).toEqual({ statusCode: 409, message: SOURCE_KEY_CONFLICT_MESSAGE })
    expect(httpErrorForCreateLexeme(new Error('boom'))).toBeNull()
  })
})

describe('faanjyut/lexeme-create buildLexemeDoc', () => {
  it('matrixOrder 顯式賦值、可空字段按 trim 後非空才寫入', () => {
    const doc = buildLexemeDoc({
      id: 'fjl_x',
      sourceKey: 'JC-00000042',
      definitionRaw: 'x',
      matrixOrder: 5,
      userId: 'u1'
    })
    expect(doc.meta).toMatchObject({ matrixOrder: 5, sourceKey: 'JC-00000042' })
    expect((doc.meta as any).compositePronunciation).toBeUndefined()
    expect((doc.meta as any).representativeChar).toBeUndefined()
    expect(doc.status).toEqual({ publicationStatus: 'draft' })
  })
})
