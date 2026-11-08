/**
 * cells 格級寫入測試（FaanjyutV1Design §12、§14.4 編輯與歷史）：
 * 沿用 write-import 的 DB 抽象測試基建--CellsDb 用內存 fake 注入，
 * 不連真庫、不測 handler（handler 的 flag 判定以 checkWriteFlag 純函數覆蓋）。
 * 覆蓋：set 改值/新建、clear/absent 空格與有值、越權部分成功、域外列 admin 編輯、
 * 併發同空格（唯一鍵 11000 -> 409 語義、終態單 Entry）、事務回滾、flag 關閉。
 */
import { describe, expect, it } from 'vitest'
import {
  CELL_CONFLICT_MESSAGE,
  COLUMN_NOT_FOUND_MESSAGE,
  LEXEME_NOT_FOUND_MESSAGE,
  NO_PERMISSION_MESSAGE,
  WRITE_DISABLED_MESSAGE,
  buildNewEntryDoc,
  buildNewExternalEtymonDoc,
  checkWriteFlag,
  runCellBatch,
  type CellEdit,
  type CellsColumnDoc,
  type CellsDb,
  type CellsLexemeDoc,
  type CellsTx,
  type CellsUser
} from '../cells'
import { cellStateId, entryId, externalEtymonId } from '../stable-id'

const KEY = '>416461483360343'
const LEXEME_ID = 'fjl_lexeme1'
const COL_GZ = 'fjcol_gz'
const COL_TS = 'fjcol_ts'
const COL_OCH = 'fjcol_och'

const lexeme: CellsLexemeDoc = {
  id: LEXEME_ID,
  meta: {
    sourceBook: 'faanjyut',
    sourceWorkbook: '泛粵字表 21.202608051509.xlsx',
    sourceSheet: '主表-睇真尐註解',
    sourceRow: 7,
    sourceKey: KEY,
    representativeChar: { raw: '粵', display: '粵' }
  }
}

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

/** 域外列測試用：無 dialectId 的 external 列 */
const columnOch: CellsColumnDoc = {
  id: COL_OCH,
  sourceRole: 'external',
  status: 'active',
  languageCode: 'och',
  label: '上古漢'
}

const userGz: CellsUser = { id: 'user_1', role: 'contributor', dialectPermissions: [{ dialectName: 'guangzhou' }] }
const userNoGz: CellsUser = { id: 'user_2', role: 'contributor', dialectPermissions: [{ dialectName: 'taishan' }] }
const admin: CellsUser = { id: 'admin_1', role: 'admin', dialectPermissions: [] }

function editSet(dialectId: string, raw: string): CellEdit {
  return { lexemeId: LEXEME_ID, dialectId, op: 'set', raw, baseVersion: 0 }
}
function editClear(dialectId: string): CellEdit {
  return { lexemeId: LEXEME_ID, dialectId, op: 'clear', baseVersion: 0 }
}
function editAbsent(dialectId: string): CellEdit {
  return { lexemeId: LEXEME_ID, dialectId, op: 'absent', baseVersion: 0 }
}

// ---- 內存 fake：模擬 Mongo unique 鍵（entries.id / cellStates {lexemeId,columnId}）與單格事務 ----

class FakeCellsDb implements CellsDb {
  entries: Array<Record<string, unknown>> = []
  cellStates: Array<Record<string, unknown>> = []
  histories: Array<Record<string, unknown>> = []
  columns: CellsColumnDoc[] = []
  lexemes: CellsLexemeDoc[] = []
  externalEtymons: Array<Record<string, unknown>> = []
  /** createEditHistory 拋錯（事務回滾測試） */
  failHistoryCreate = false
  /** findEntry 柵欄（併發測試：兩個並發事務都先看到空格） */
  gateFindEntry: Promise<void> | null = null
  private seq = 0

  async findColumnsByDialectIds(dialectIds: string[]): Promise<CellsColumnDoc[]> {
    return this.columns.filter((c) => c.dialectId && dialectIds.includes(c.dialectId))
  }

  async findColumnsByIds(ids: string[]): Promise<CellsColumnDoc[]> {
    return this.columns.filter((c) => ids.includes(c.id))
  }

  async findLexemes(lexemeIds: string[]): Promise<CellsLexemeDoc[]> {
    return this.lexemes.filter((l) => lexemeIds.includes(l.id))
  }

  async withTransaction<T>(fn: (tx: CellsTx) => Promise<T>): Promise<T> {
    const buffer = {
      createdEntries: [] as Array<Record<string, unknown>>,
      updatedEntries: [] as Array<{ _id: unknown; doc: Record<string, unknown> }>,
      deletedEntryIds: [] as unknown[],
      cellUpserts: [] as Array<{ kind: 'insert' | 'update'; doc: Record<string, unknown> }>,
      histories: [] as Array<Record<string, unknown>>,
      createdExternalEtymons: [] as Array<Record<string, unknown>>,
      updatedExternalEtymons: [] as Array<{ _id: unknown; doc: Record<string, unknown> }>,
      deletedExternalEtymonIds: [] as unknown[]
    }

    const tx: CellsTx = {
      findEntry: async (lexemeId, dialectId) => {
        if (this.gateFindEntry) await this.gateFindEntry
        const found = this.entries.find(
          (e) => e.lexemeId === lexemeId && (e.dialect as { name?: string })?.name === dialectId
        )
        return found ? (this.clone(found) as any) : null
      },
      createEntry: async (doc) => {
        const entry = {
          ...this.clone(doc),
          _id: `fake_oid_${(this.seq += 1)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        buffer.createdEntries.push(entry)
        return this.clone(entry) as any
      },
      updateEntry: async (entry, changes) => {
        const updated = {
          ...this.clone(entry),
          phonetic: { ...((entry.phonetic as Record<string, unknown>) ?? {}), original: changes.phoneticOriginal },
          updatedBy: changes.updatedBy,
          updatedAt: new Date()
        }
        buffer.updatedEntries.push({ _id: entry._id, doc: updated })
        return this.clone(updated) as any
      },
      deleteEntry: async (entry) => {
        buffer.deletedEntryIds.push(entry._id)
      },
      upsertCellState: async (args) => {
        const existing = this.cellStates.find((cs) => cs.lexemeId === args.lexemeId && cs.columnId === args.columnId)
        if (Number(existing?.version ?? 0) !== args.baseVersion) {
          throw Object.assign(new Error('CELL_VERSION_CONFLICT'), { code: 'VERSION_CONFLICT' })
        }
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
              createdBy: args.userId,
              createdAt: new Date(),
              updatedAt: new Date()
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
          updatedBy: args.userId,
          updatedAt: new Date()
        }
        if (args.raw !== undefined) doc.raw = args.raw
        else delete doc.raw
        if (args.projectionEntryId != null) {
          doc.projection = { ...(doc.projection ?? {}), entryId: args.projectionEntryId }
        } else if (doc.projection) {
          delete (doc.projection as Record<string, unknown>).entryId
        }
        if (args.projectionExternalEtymonIds != null) {
          doc.projection = { ...(doc.projection ?? {}), externalEtymonIds: args.projectionExternalEtymonIds }
        } else if (args.projectionExternalEtymonIds === null && doc.projection) {
          delete (doc.projection as Record<string, unknown>).externalEtymonIds
        }
        buffer.cellUpserts.push({ kind: existing ? 'update' : 'insert', doc })
      },
      createEditHistory: async (doc) => {
        if (this.failHistoryCreate) throw new Error('模擬 EditHistory 寫入失敗')
        buffer.histories.push(doc)
      },
      findExternalEtymon: async (lexemeId, languageCode) => {
        const found = this.externalEtymons.find(
          (e) => e.lexemeId === lexemeId && e.languageCode === languageCode && (e.meta as Record<string, unknown>)?.sourceBook === 'faanjyut'
        )
        return found ? (this.clone(found) as any) : null
      },
      createExternalEtymon: async (doc) => {
        const etymon = {
          ...this.clone(doc),
          _id: `fake_oid_${(this.seq += 1)}`
        }
        buffer.createdExternalEtymons.push(etymon)
        return this.clone(etymon) as any
      },
      updateExternalEtymon: async (etymon, changes) => {
        const updated = this.clone(etymon)
        updated.raw = changes.raw
        updated.scriptForm = changes.raw
        if (!updated.meta) updated.meta = {}
        ;(updated.meta as Record<string, unknown>).editedAfterImport = true
        buffer.updatedExternalEtymons.push({ _id: etymon._id, doc: updated })
        return this.clone(updated) as any
      },
      deleteExternalEtymon: async (etymon) => {
        buffer.deletedExternalEtymonIds.push(etymon._id)
      }
    }

    const result = await fn(tx)

    // 提交階段：按 unique 鍵檢查；任一衝突拋 11000 -> 整格回滾（buffer 丟棄）
    for (const entry of buffer.createdEntries) {
      if (this.entries.some((e) => e.id === entry.id)) throw this.dupError()
      this.entries.push(this.clone(entry))
    }
    for (const { _id, doc } of buffer.updatedEntries) {
      const index = this.entries.findIndex((e) => e._id === _id)
      if (index >= 0) this.entries[index] = this.clone(doc)
    }
    for (const id of buffer.deletedEntryIds) {
      const index = this.entries.findIndex((e) => e._id === id)
      if (index >= 0) this.entries.splice(index, 1)
    }
    for (const etymon of buffer.createdExternalEtymons) {
      this.externalEtymons.push(this.clone(etymon))
    }
    for (const { _id, doc } of buffer.updatedExternalEtymons) {
      const index = this.externalEtymons.findIndex((e) => e._id === _id)
      if (index >= 0) this.externalEtymons[index] = this.clone(doc)
    }
    for (const id of buffer.deletedExternalEtymonIds) {
      const index = this.externalEtymons.findIndex((e) => e._id === id)
      if (index >= 0) this.externalEtymons.splice(index, 1)
    }
    for (const { kind, doc } of buffer.cellUpserts) {
      const exists = this.cellStates.some(
        (cs) => cs.lexemeId === doc.lexemeId && cs.columnId === doc.columnId
      )
      if (kind === 'insert' && exists) throw this.dupError()
      if (kind === 'insert') {
        this.cellStates.push(this.clone(doc))
      } else {
        const index = this.cellStates.findIndex(
          (cs) => cs.lexemeId === doc.lexemeId && cs.columnId === doc.columnId
        )
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

function makeDb(over: { columns?: CellsColumnDoc[]; withLexeme?: boolean } = {}): FakeCellsDb {
  const db = new FakeCellsDb()
  db.columns = over.columns ?? [columnGz, columnTs]
  if (over.withLexeme !== false) db.lexemes = [lexeme]
  return db
}

describe('faanjyut/cells runCellBatch set', () => {
  it('set 改值（有 Entry）：phonetic.original 更新 + update 歷史（_id 字符串）+ 格 raw/version/flags 更新', async () => {
    const db = makeDb()
    db.entries.push({
      _id: 'fake_oid_seed1',
      id: entryId(KEY, 'guangzhou'),
      lexemeId: LEXEME_ID,
      sourceBook: 'faanjyut',
      dialect: { name: 'guangzhou', regionCode: 'GZ' },
      headword: { display: '粵', normalized: '粵', isPlaceholder: false },
      phonetic: { original: 'jyut6' },
      status: 'approved',
      createdBy: 'system:faanjyut_import'
    })
    db.cellStates.push({
      id: cellStateId(LEXEME_ID, COL_GZ),
      lexemeId: LEXEME_ID,
      columnId: COL_GZ,
      status: { workflow: 'unreviewed', flags: {} },
      raw: 'jyut6',
      editedAfterImport: false,
      version: 0,
      createdBy: 'system:faanjyut_import'
    })

    const result = await runCellBatch(db, { edits: [editSet('guangzhou', ' jyut6? ')], user: userGz })

    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.results[0]).toMatchObject({ lexemeId: LEXEME_ID, dialectId: 'guangzhou', ok: true, entryId: entryId(KEY, 'guangzhou') })

    expect(db.entries).toHaveLength(1)
    expect((db.entries[0].phonetic as any).original).toBe('jyut6?') // trim 後寫入

    const cell = db.cellStates[0]
    expect(cell.raw).toBe('jyut6?')
    expect(cell.version).toBe(1)
    expect(cell.editedAfterImport).toBe(true)
    expect(cell.status).toMatchObject({
      workflow: 'unreviewed',
      flags: { modifiedPendingReview: true, explicitlyAbsent: false, explicitlyCleared: false }
    })
    expect((cell.projection as any).entryId).toBe(entryId(KEY, 'guangzhou'))

    expect(db.histories).toHaveLength(1)
    expect(db.histories[0]).toMatchObject({
      entryId: 'fake_oid_seed1', // 一律 _id.toString()
      userId: 'user_1',
      action: 'update',
      changedFields: ['phonetic.original']
    })
    expect((db.histories[0].beforeSnapshot as any).phonetic.original).toBe('jyut6')
    expect((db.histories[0].afterSnapshot as any).phonetic.original).toBe('jyut6?')
  })

  it('set 新建（空格）：Entry（穩定 ID/代表字/draft/editedAfterImport）+ create 歷史 + 格 projection 三件套同事務提交', async () => {
    const db = makeDb()
    const result = await runCellBatch(db, { edits: [editSet('guangzhou', 'jyut6')], user: userGz })

    expect(result.succeeded).toBe(1)
    expect(db.entries).toHaveLength(1)
    expect(db.cellStates).toHaveLength(1)
    expect(db.histories).toHaveLength(1)

    const entry = db.entries[0]
    expect(entry.id).toBe(entryId(KEY, 'guangzhou'))
    expect(entry.lexemeId).toBe(LEXEME_ID)
    expect(entry.sourceBook).toBe('faanjyut')
    expect(entry.dialect).toEqual({ name: 'guangzhou', regionCode: 'GZ' })
    expect(entry.headword).toMatchObject({ display: '粵', normalized: '粵' })
    expect((entry.phonetic as any).original).toBe('jyut6')
    expect(entry.status).toBe('draft')
    expect(entry.createdBy).toBe('user_1')
    expect(entry.updatedBy).toBe('user_1')
    expect(entry.meta).toMatchObject({
      sourceWorkbook: '泛粵字表 21.202608051509.xlsx',
      sourceSheet: '主表-睇真尐註解',
      sourceRow: 7,
      sourceColumn: '穗',
      sourceColumnIndex: 37,
      sourceCell: '主表-睇真尐註解!AK7',
      sourceKey: KEY,
      importReviewStatus: 'unreviewed_import',
      editedAfterImport: true
    })

    const cell = db.cellStates[0]
    expect(cell.id).toBe(cellStateId(LEXEME_ID, COL_GZ))
    expect(cell.raw).toBe('jyut6')
    expect(cell.editedAfterImport).toBe(true)
    expect(cell.version).toBe(1)
    expect((cell.projection as any).entryId).toBe(entry.id)
    expect((cell.status as any).flags.modifiedPendingReview).toBe(true)

    const history = db.histories[0]
    expect(history).toMatchObject({
      entryId: String(entry._id),
      userId: 'user_1',
      action: 'create',
      changedFields: ['headword', 'dialect', 'phonetic.original']
    })
    expect(history.beforeSnapshot).toEqual({})
    expect((history.afterSnapshot as any).id).toBe(entry.id)
  })
})

describe('faanjyut/cells runCellBatch clear/absent', () => {
  it('clear 有 Entry：刪 Entry + delete 歷史（after {}）+ 格 explicitlyCleared、清 projection.entryId/raw', async () => {
    const db = makeDb()
    db.entries.push({
      _id: 'fake_oid_seed1',
      id: entryId(KEY, 'guangzhou'),
      lexemeId: LEXEME_ID,
      sourceBook: 'faanjyut',
      dialect: { name: 'guangzhou', regionCode: 'GZ' },
      headword: { display: '粵', normalized: '粵', isPlaceholder: false },
      phonetic: { original: 'jyut6' },
      status: 'approved',
      createdBy: 'system:faanjyut_import'
    })
    db.cellStates.push({
      id: cellStateId(LEXEME_ID, COL_GZ),
      lexemeId: LEXEME_ID,
      columnId: COL_GZ,
      status: { workflow: 'unreviewed', flags: {} },
      raw: 'jyut6',
      projection: { entryId: entryId(KEY, 'guangzhou') },
      editedAfterImport: false,
      version: 0,
      createdBy: 'system:faanjyut_import'
    })

    const result = await runCellBatch(db, { edits: [editClear('guangzhou')], user: userGz })

    expect(result.results[0]).toMatchObject({ lexemeId: LEXEME_ID, dialectId: 'guangzhou', ok: true })
    expect(db.entries).toHaveLength(0)
    expect(db.histories).toHaveLength(1)
    expect(db.histories[0]).toMatchObject({
      entryId: 'fake_oid_seed1',
      userId: 'user_1',
      action: 'delete',
      changedFields: []
    })
    expect(db.histories[0].afterSnapshot).toEqual({})
    expect((db.histories[0].beforeSnapshot as any).id).toBe(entryId(KEY, 'guangzhou'))

    const cell = db.cellStates[0]
    expect(cell.raw).toBeUndefined()
    expect((cell.projection as any)?.entryId).toBeUndefined()
    expect(cell.status).toMatchObject({
      workflow: 'unreviewed',
      flags: { explicitlyCleared: true, explicitlyAbsent: false }
    })
    expect(cell.version).toBe(1)
    expect(cell.editedAfterImport).toBe(true)
  })

  it('clear 空格：僅 upsert 格（冪等，無 Entry 無歷史）', async () => {
    const db = makeDb()
    const result = await runCellBatch(db, { edits: [editClear('guangzhou')], user: userGz })

    expect(result.results[0].ok).toBe(true)
    expect(db.entries).toHaveLength(0)
    expect(db.histories).toHaveLength(0)
    expect(db.cellStates).toHaveLength(1)
    expect((db.cellStates[0].status as any).flags.explicitlyCleared).toBe(true)
  })

  it('absent 空格：僅 upsert 格 explicitlyAbsent（explicitlyCleared 為 false）', async () => {
    const db = makeDb()
    const result = await runCellBatch(db, { edits: [editAbsent('guangzhou')], user: userGz })

    expect(result.results[0].ok).toBe(true)
    expect(db.entries).toHaveLength(0)
    expect(db.histories).toHaveLength(0)
    expect(db.cellStates).toHaveLength(1)
    expect(db.cellStates[0].status).toMatchObject({
      workflow: 'unreviewed',
      flags: { explicitlyAbsent: true, explicitlyCleared: false }
    })
  })

  it('absent 有 Entry：刪 Entry + delete 歷史 + 格 explicitlyAbsent（§6.4 最新口徑）', async () => {
    const db = makeDb()
    db.entries.push({
      _id: 'fake_oid_seed1',
      id: entryId(KEY, 'guangzhou'),
      lexemeId: LEXEME_ID,
      sourceBook: 'faanjyut',
      dialect: { name: 'guangzhou', regionCode: 'GZ' },
      headword: { display: '粵', normalized: '粵', isPlaceholder: false },
      phonetic: { original: 'jyut6' },
      status: 'approved',
      createdBy: 'system:faanjyut_import'
    })

    const result = await runCellBatch(db, { edits: [editAbsent('guangzhou')], user: userGz })

    expect(result.results[0].ok).toBe(true)
    expect(db.entries).toHaveLength(0)
    expect(db.histories).toHaveLength(1)
    expect(db.histories[0].action).toBe('delete')
    expect(db.cellStates).toHaveLength(1)
    expect(db.cellStates[0].status).toMatchObject({
      workflow: 'unreviewed',
      flags: { explicitlyAbsent: true, explicitlyCleared: false }
    })
    expect((db.cellStates[0].projection as any)?.entryId).toBeUndefined()
  })
})

describe('faanjyut/cells runCellBatch 權限與列解析', () => {
  it('越權寫：該格失敗（無此方言權限），批次其他格照常成功 -> 部分成功', async () => {
    const db = makeDb() // guangzhou + taishan 兩列
    const edits = [editSet('guangzhou', 'jyut6'), editSet('taishan', 'juot9')]
    const result = await runCellBatch(db, { edits, user: userNoGz }) // 僅 taishan 權限

    expect(result.succeeded).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.results[0]).toMatchObject({ dialectId: 'guangzhou', ok: false, error: NO_PERMISSION_MESSAGE })
    expect(result.results[1]).toMatchObject({ dialectId: 'taishan', ok: true })
    // 僅 taishan Entry 落庫
    expect(db.entries).toHaveLength(1)
    expect(db.entries[0].id).toBe(entryId(KEY, 'taishan'))
    expect(db.cellStates).toHaveLength(1)
    expect(db.cellStates[0].columnId).toBe(COL_TS)
  })

  it('admin set 域外列（新建）：ExternalEtymon + create 歷史 + 格 projection.externalEtymonIds', async () => {
    const db = makeDb({ columns: [columnGz, columnOch] })
    const edit: CellEdit = { lexemeId: LEXEME_ID, columnId: COL_OCH, baseVersion: 0, op: 'set', raw: 'prProto-OCH' }
    const result = await runCellBatch(db, { edits: [edit], user: admin })

    expect(result.succeeded).toBe(1)
    expect(result.results[0]).toMatchObject({ lexemeId: LEXEME_ID, columnId: COL_OCH, ok: true })

    expect(db.externalEtymons).toHaveLength(1)
    const etymon = db.externalEtymons[0] as any
    expect(etymon.id).toBe(externalEtymonId(KEY, 'och', 1))
    expect(etymon.raw).toBe('prProto-OCH')
    expect(etymon.scriptForm).toBe('prProto-OCH')
    expect(etymon.languageCode).toBe('och')
    expect(etymon.lexemeId).toBe(LEXEME_ID)
    expect(etymon.meta).toMatchObject({ sourceBook: 'faanjyut', editedAfterImport: true })

    expect(db.cellStates).toHaveLength(1)
    const cell = db.cellStates[0] as any
    expect(cell.columnId).toBe(COL_OCH)
    expect(cell.raw).toBe('prProto-OCH')
    expect(cell.projection.externalEtymonIds).toEqual([etymon.id])

    expect(db.histories).toHaveLength(1)
    expect(db.histories[0]).toMatchObject({
      entryId: String(etymon._id),
      userId: 'admin_1',
      action: 'create',
      changedFields: ['raw', 'scriptForm', 'languageCode']
    })
  })

  it('admin set 域外列（已有 etymon）：更新 raw+scriptForm + update 歷史', async () => {
    const db = makeDb({ columns: [columnGz, columnOch] })
    const existingId = externalEtymonId(KEY, 'och', 1)
    db.externalEtymons.push({
      _id: 'fake_oid_ext1',
      id: existingId,
      lexemeId: LEXEME_ID,
      languageCode: 'och',
      scriptForm: 'oldProto',
      raw: 'oldProto',
      meta: { sourceBook: 'faanjyut', editedAfterImport: false }
    })

    const edit: CellEdit = { lexemeId: LEXEME_ID, columnId: COL_OCH, baseVersion: 0, op: 'set', raw: 'newProto' }
    const result = await runCellBatch(db, { edits: [edit], user: admin })

    expect(result.succeeded).toBe(1)
    expect(db.externalEtymons).toHaveLength(1)
    const etymon = db.externalEtymons[0] as any
    expect(etymon.raw).toBe('newProto')
    expect(etymon.scriptForm).toBe('newProto')
    expect(etymon.meta.editedAfterImport).toBe(true)

    expect(db.histories).toHaveLength(1)
    expect(db.histories[0]).toMatchObject({
      entryId: 'fake_oid_ext1',
      userId: 'admin_1',
      action: 'update',
      changedFields: ['raw', 'scriptForm']
    })
    expect((db.histories[0].beforeSnapshot as any).raw).toBe('oldProto')
    expect((db.histories[0].afterSnapshot as any).raw).toBe('newProto')
  })

  it('admin clear 域外列：刪 ExternalEtymon + delete 歷史 + 清 projection.externalEtymonIds', async () => {
    const db = makeDb({ columns: [columnGz, columnOch] })
    const existingId = externalEtymonId(KEY, 'och', 1)
    db.externalEtymons.push({
      _id: 'fake_oid_ext1',
      id: existingId,
      lexemeId: LEXEME_ID,
      languageCode: 'och',
      scriptForm: 'oldProto',
      raw: 'oldProto',
      meta: { sourceBook: 'faanjyut', editedAfterImport: false }
    })
    db.cellStates.push({
      _id: 'fake_cell_ext1',
      id: cellStateId(LEXEME_ID, COL_OCH),
      lexemeId: LEXEME_ID,
      columnId: COL_OCH,
      status: { workflow: 'unreviewed', flags: {} },
      raw: 'oldProto',
      projection: { externalEtymonIds: [existingId] },
      editedAfterImport: false,
      version: 0,
      createdBy: 'system:faanjyut_import'
    })

    const edit: CellEdit = { lexemeId: LEXEME_ID, columnId: COL_OCH, baseVersion: 0, op: 'clear' }
    const result = await runCellBatch(db, { edits: [edit], user: admin })

    expect(result.succeeded).toBe(1)
    expect(db.externalEtymons).toHaveLength(0)
    expect(db.histories).toHaveLength(1)
    expect(db.histories[0]).toMatchObject({
      entryId: 'fake_oid_ext1',
      userId: 'admin_1',
      action: 'delete'
    })
    expect((db.histories[0].beforeSnapshot as any).id).toBe(existingId)
    expect(db.histories[0].afterSnapshot).toEqual({})

    const cell = db.cellStates[0] as any
    expect(cell.raw).toBeUndefined()
    expect(cell.projection?.externalEtymonIds).toBeUndefined()
    expect(cell.status.flags.explicitlyCleared).toBe(true)
  })

  it('admin absent 域外列（有 etymon）：刪 ExternalEtymon + 格 explicitlyAbsent', async () => {
    const db = makeDb({ columns: [columnGz, columnOch] })
    const existingId = externalEtymonId(KEY, 'och', 1)
    db.externalEtymons.push({
      _id: 'fake_oid_ext1',
      id: existingId,
      lexemeId: LEXEME_ID,
      languageCode: 'och',
      scriptForm: 'oldProto',
      raw: 'oldProto',
      meta: { sourceBook: 'faanjyut', editedAfterImport: false }
    })

    const edit: CellEdit = { lexemeId: LEXEME_ID, columnId: COL_OCH, baseVersion: 0, op: 'absent' }
    const result = await runCellBatch(db, { edits: [edit], user: admin })

    expect(result.succeeded).toBe(1)
    expect(db.externalEtymons).toHaveLength(0)
    expect(db.histories).toHaveLength(1)
    expect(db.histories[0].action).toBe('delete')
    expect(db.cellStates[0].status).toMatchObject({
      workflow: 'unreviewed',
      flags: { explicitlyAbsent: true, explicitlyCleared: false }
    })
    expect((db.cellStates[0].projection as any)?.externalEtymonIds).toBeUndefined()
  })

  it('admin absent 域外列（空格）：僅 upsert 格 explicitlyAbsent', async () => {
    const db = makeDb({ columns: [columnGz, columnOch] })
    const edit: CellEdit = { lexemeId: LEXEME_ID, columnId: COL_OCH, baseVersion: 0, op: 'absent' }
    const result = await runCellBatch(db, { edits: [edit], user: admin })

    expect(result.succeeded).toBe(1)
    expect(db.externalEtymons).toHaveLength(0)
    expect(db.histories).toHaveLength(0)
    expect(db.cellStates).toHaveLength(1)
    expect(db.cellStates[0].status).toMatchObject({
      workflow: 'unreviewed',
      flags: { explicitlyAbsent: true }
    })
  })

  it('未知方言列拒絕：dialectId 查不到列 -> 此方言列不存在或不可編輯', async () => {
    const db = makeDb()
    const result = await runCellBatch(db, { edits: [editSet('nonexistent_dialect', 'x')], user: userGz })

    expect(result.results[0]).toMatchObject({ ok: false, error: COLUMN_NOT_FOUND_MESSAGE })
    expect(db.entries).toHaveLength(0)
  })

  it('詞條不存在：lexemeId 未命中 -> 該格失敗，不觸庫', async () => {
    const db = makeDb({ withLexeme: false })
    const result = await runCellBatch(db, { edits: [editSet('guangzhou', 'jyut6')], user: userGz })

    expect(result.results[0]).toMatchObject({ ok: false, error: LEXEME_NOT_FOUND_MESSAGE })
    expect(db.entries).toHaveLength(0)
    expect(db.cellStates).toHaveLength(0)
  })

  it('admin 可編輯任意域內 active 列（含無 dialectPermissions）', async () => {
    const db = makeDb()
    const result = await runCellBatch(db, { edits: [editSet('taishan', 'juot9')], user: admin })

    expect(result.results[0]).toMatchObject({ ok: true })
    expect(db.entries).toHaveLength(1)
  })
})

describe('faanjyut/cells 併發與事務', () => {
  it('併發同空格：兩個並發 set 同一格，一個成功、一個 409 語義，最終只有 1 個 Entry', async () => {
    const db = makeDb()
    let release: () => void = () => {}
    db.gateFindEntry = new Promise<void>((resolve) => { release = resolve })
    const edit = editSet('guangzhou', 'jyut6')

    const pending = Promise.all([
      runCellBatch(db, { edits: [edit], user: userGz }),
      runCellBatch(db, { edits: [edit], user: userGz })
    ])
    // 等兩個事務都停在 findEntry（均先看到空格）
    await Promise.resolve()
    await Promise.resolve()
    release()

    const [batchA, batchB] = await pending
    const outcomes = [batchA.results[0], batchB.results[0]]
    expect(outcomes.filter((r) => r.ok)).toHaveLength(1)
    expect(outcomes.filter((r) => !r.ok)).toHaveLength(1)
    const conflicted = outcomes.find((r) => !r.ok)!
    expect(conflicted.error).toBe(CELL_CONFLICT_MESSAGE)

    expect(db.entries).toHaveLength(1)
    expect(db.cellStates).toHaveLength(1)
    expect(db.histories).toHaveLength(1)
  })

  it('舊 baseVersion 寫入現有格：返回 VERSION_CONFLICT，Entry/CellState/History 均不變', async () => {
    const db = makeDb()
    db.entries.push({
      _id: 'fake_oid_versioned',
      id: entryId(KEY, 'guangzhou'),
      lexemeId: LEXEME_ID,
      sourceBook: 'faanjyut',
      dialect: { name: 'guangzhou' },
      phonetic: { original: 'jyut6' },
      createdBy: 'system:faanjyut_import'
    })
    db.cellStates.push({
      id: cellStateId(LEXEME_ID, COL_GZ),
      lexemeId: LEXEME_ID,
      columnId: COL_GZ,
      status: { workflow: 'unreviewed', flags: {} },
      raw: 'jyut6',
      editedAfterImport: false,
      version: 2,
      createdBy: 'system:faanjyut_import'
    })

    const result = await runCellBatch(db, {
      edits: [{ ...editSet('guangzhou', 'jyut5'), baseVersion: 1 }],
      user: userGz
    })
    expect(result.results[0]).toMatchObject({
      ok: false,
      code: 'VERSION_CONFLICT',
      error: CELL_CONFLICT_MESSAGE
    })
    expect((db.entries[0].phonetic as any).original).toBe('jyut6')
    expect(db.cellStates[0].version).toBe(2)
    expect(db.cellStates[0].raw).toBe('jyut6')
    expect(db.histories).toHaveLength(0)
  })

  it('事務回滾：模擬 EditHistory.create 拋錯 -> 該格失敗且 Entry/CellState 不落庫', async () => {
    const db = makeDb()
    db.failHistoryCreate = true
    const result = await runCellBatch(db, { edits: [editSet('guangzhou', 'jyut6')], user: userGz })

    expect(result.results[0].ok).toBe(false)
    expect(result.results[0].error).toContain('模擬 EditHistory 寫入失敗')
    expect(db.entries).toHaveLength(0)
    expect(db.cellStates).toHaveLength(0)
    expect(db.histories).toHaveLength(0)
  })
})

describe('faanjyut/cells flag 判定與新 Entry/Etymon 構建', () => {
  it('checkWriteFlag：flag 非 true（缺省/false）-> 503 文案；true -> 放行', () => {
    expect(checkWriteFlag({})).toBe(WRITE_DISABLED_MESSAGE)
    expect(checkWriteFlag({ faanjyutWriteEnabled: false })).toBe(WRITE_DISABLED_MESSAGE)
    expect(checkWriteFlag({ faanjyutWriteEnabled: undefined })).toBe(WRITE_DISABLED_MESSAGE)
    expect(checkWriteFlag({ faanjyutWriteEnabled: true })).toBeNull()
  })

  it('buildNewEntryDoc：穩定 ID、代表字、draft、七鍵 meta、regionCode 回退', () => {
    const doc = buildNewEntryDoc({ lexeme, column: columnGz, dialectId: 'guangzhou', raw: 'jyut6', userId: 'user_1', sourceKey: KEY })
    expect(doc.id).toBe(entryId(KEY, 'guangzhou'))
    expect(doc.dialect).toEqual({ name: 'guangzhou', regionCode: 'GZ' })
    expect(doc.headword).toMatchObject({ display: '粵', normalized: '粵', isPlaceholder: false })
    expect(doc.status).toBe('draft')
    expect(doc.createdBy).toBe('user_1')
    expect(doc.meta).toMatchObject({
      sourceWorkbook: '泛粵字表 21.202608051509.xlsx',
      sourceSheet: '主表-睇真尐註解',
      sourceRow: 7,
      sourceColumn: '穗',
      sourceColumnIndex: 37,
      sourceCell: '主表-睇真尐註解!AK7',
      sourceKey: KEY,
      editedAfterImport: true
    })

    // 無代表字/無 sourceRow：display 回退空（isPlaceholder true）；regionCode 走 DIALECT_REGION_CODES；sourceCell 缺省
    const bareLexeme: CellsLexemeDoc = { id: 'fjl_x', meta: { sourceKey: '>K2' } }
    const bareColumn: CellsColumnDoc = { ...columnGz, regionCode: undefined }
    const doc2 = buildNewEntryDoc({ lexeme: bareLexeme, column: bareColumn, dialectId: 'guangzhou', raw: 'x', userId: 'user_1', sourceKey: '>K2' })
    expect(doc2.headword).toMatchObject({ display: '', isPlaceholder: true })
    expect((doc2.meta as any).sourceCell).toBeUndefined()
    expect((doc2.dialect as any).regionCode).toBe('GZ') // DIALECT_REGION_CODES 回退
  })

  it('buildNewExternalEtymonDoc：穩定 ID、scriptForm=raw、meta.sourceBook/editedAfterImport', () => {
    const doc = buildNewExternalEtymonDoc({ lexeme, column: columnOch, raw: 'prProto', userId: 'user_1', sourceKey: KEY })
    expect(doc.id).toBe(externalEtymonId(KEY, 'och', 1))
    expect(doc.lexemeId).toBe(LEXEME_ID)
    expect(doc.languageCode).toBe('och')
    expect(doc.scriptForm).toBe('prProto')
    expect(doc.raw).toBe('prProto')
    expect(doc.meta).toMatchObject({
      sourceBook: 'faanjyut',
      segmentIndex: 1,
      editedAfterImport: true
    })
    expect(doc.createdBy).toBe('user_1')
  })
})
