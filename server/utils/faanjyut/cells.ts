/**
 * 泛粵字表格級寫入純邏輯（FaanjyutV1Design §12 `POST /api/faanjyut/cells/batch`、§13.1 P4）。
 *
 * 批次語義（§11）：逐格獨立成功/失敗，批次不做事務回滾；每格的
 * Entry + CellState + EditHistory 在同一 transaction 內提交（§13.1：全平台首個事務先例）。
 * 本模塊不 import mongoose，透過 CellsDb 抽象訪問數據庫--
 * 真實實現見 mongo-db.ts 的 adaptMongooseCellsDb（綁定 session 的事務）；
 * 單元測試用內存 fake（見 __tests__/cells.test.ts）。
 */
import { canEditColumn, type MatrixColumnDoc, type MatrixUser } from './matrix'
import { entryId, cellStateId, externalEtymonId } from './stable-id'
import { DIALECT_REGION_CODES } from '../../../shared/dialects'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'

/** §12：單次批次 edits 上限（1–100） */
export const CELL_BATCH_MAX_EDITS = 100

export const WRITE_DISABLED_MESSAGE = '泛粵字表寫入功能未開啟'
export const COLUMN_NOT_FOUND_MESSAGE = '此方言列不存在或不可編輯'
export const NO_PERMISSION_MESSAGE = '你沒有權限編輯此方言列'
export const CELL_CONFLICT_MESSAGE = '此格正在被他人編輯，請刷新後重試'
export const LEXEME_NOT_FOUND_MESSAGE = '詞條不存在'
export const CELL_WRITE_FAILED_MESSAGE = '該格寫入失敗'

export type CellOp = 'set' | 'clear' | 'absent'

export interface CellEdit {
  lexemeId: string
  /** 域內列鍵（dialectId 定格）；域外列不攜帶，改用 columnId */
  dialectId?: string
  /** 域外列鍵（columnId 定格）；域內列可省略，服務端以 dialectId 優先 */
  columnId?: string
  op: CellOp
  /** set 必填（trim 後非空）；clear/absent 禁止攜帶 */
  raw?: string
  /** 樂觀鎖協議預留（§11 last-write-wins）：v1 服務端忽略 */
  baseVersion?: number
}

/** 用戶形狀：與 event.context.auth 一致，兼容 canEditColumn 的 MatrixUser */
export type CellsUser = MatrixUser & { id: string }

/** 列文檔最小結構（兼容 mongoose lean 與測試 fake） */
export interface CellsColumnDoc extends MatrixColumnDoc {
  dialectId?: string
  sourceSheet?: string
  sourceColumn?: string | null
  sourceColumnIndex?: number
  sourceColumnLetter?: string
  regionCode?: string
  sourceRole: string
  status: string
}

/** 詞條文檔最小結構 */
export interface CellsLexemeDoc {
  id: string
  meta?: {
    sourceKey?: string
    representativeChar?: { raw?: string; display?: string }
    sourceWorkbook?: string
    sourceSheet?: string
    sourceRow?: number
  }
}

/** Entry 文檔最小結構（寫側需要 _id 與應用層 id） */
export interface CellsEntryDoc {
  _id: unknown
  id: string
  phonetic?: { original?: unknown } | null
  [key: string]: unknown
}

/** ExternalEtymon 文檔最小結構（域外列寫入用） */
export interface CellsExternalEtymonDoc {
  _id: unknown
  id: string
  lexemeId: string
  languageCode: string
  scriptForm: string
  raw?: string
  meta?: Record<string, unknown>
  [key: string]: unknown
}

export interface EditHistoryInput {
  entryId: string
  userId: string
  beforeSnapshot: Record<string, unknown>
  afterSnapshot: Record<string, unknown>
  changedFields: string[]
  action: 'create' | 'update' | 'delete'
}

/** CellState upsert 參數（真實實現轉成 $set/$unset/$inc/$setOnInsert，見 mongo-db.ts） */
export interface CellStateUpsertArgs {
  lexemeId: string
  columnId: string
  userId: string
  /** set：寫入的原文；clear/absent：不傳 -> 卸載 raw */
  raw?: string
  /** set：關聯 Entry 的應用層 id；clear/absent：null -> 清 projection.entryId */
  projectionEntryId: string | null
  /** 域外列 set：關聯 ExternalEtymon 的 id 列表；clear/absent：null -> 清 projection.externalEtymonIds */
  projectionExternalEtymonIds?: string[] | null
  flags: {
    explicitlyAbsent?: boolean
    explicitlyCleared?: boolean
    modifiedPendingReview?: boolean
  }
}

/** 單格事務內的操作面（真實實現綁定 session，測試為內存 fake） */
export interface CellsTx {
  findEntry(lexemeId: string, dialectId: string): Promise<CellsEntryDoc | null>
  createEntry(doc: Record<string, unknown>): Promise<CellsEntryDoc>
  updateEntry(entry: CellsEntryDoc, changes: { phoneticOriginal: string; updatedBy: string }): Promise<CellsEntryDoc>
  deleteEntry(entry: CellsEntryDoc): Promise<void>
  upsertCellState(args: CellStateUpsertArgs): Promise<void>
  createEditHistory(doc: EditHistoryInput): Promise<void>
  findExternalEtymon(lexemeId: string, languageCode: string): Promise<CellsExternalEtymonDoc | null>
  createExternalEtymon(doc: Record<string, unknown>): Promise<CellsExternalEtymonDoc>
  updateExternalEtymon(etymon: CellsExternalEtymonDoc, changes: { raw: string; updatedBy: string }): Promise<CellsExternalEtymonDoc>
  deleteExternalEtymon(etymon: CellsExternalEtymonDoc): Promise<void>
}

/** 批次級 DB 訪問面 */
export interface CellsDb {
  findColumnsByDialectIds(dialectIds: string[]): Promise<CellsColumnDoc[]>
  findColumnsByIds(ids: string[]): Promise<CellsColumnDoc[]>
  findLexemes(lexemeIds: string[]): Promise<CellsLexemeDoc[]>
  withTransaction<T>(fn: (tx: CellsTx) => Promise<T>): Promise<T>
}

export interface CellResult {
  lexemeId: string
  dialectId?: string
  columnId?: string
  ok: boolean
  entryId?: string
  error?: string
}

export interface CellBatchResult {
  results: CellResult[]
  succeeded: number
  failed: number
}

/** runtime flag 關閉判定（§9：所有泛粵寫 API 檢查私有 flag，關閉 -> 503；可單測） */
export function checkWriteFlag(config: { faanjyutWriteEnabled?: unknown }): string | null {
  return config.faanjyutWriteEnabled === true ? null : WRITE_DISABLED_MESSAGE
}

/** 快照序列化：全量字段（_id 等轉為可存 Mixed 的普通值） */
function plain(doc: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc))
}

/** EditHistory.entryId 統一取 entry._id.toString()（§13.1 既有問題 1） */
function entryDocId(doc: CellsEntryDoc): string {
  return String(doc._id)
}

function cellError(edit: CellEdit, message: string): CellResult {
  return { lexemeId: edit.lexemeId, dialectId: edit.dialectId, columnId: edit.columnId, ok: false, error: message }
}

/**
 * set-新建 Entry 的字段形狀（抄 shared/faanjyut-import-dto.ts §5.2 七鍵 meta 形狀，
 * 去掉導入專用 literal 約束：status/createdBy 用運行期值、editedAfterImport=true）。
 */
export function buildNewEntryDoc(args: {
  lexeme: CellsLexemeDoc
  column: CellsColumnDoc
  dialectId: string
  raw: string
  userId: string
  sourceKey: string
}): Record<string, unknown> {
  const { lexeme, column, dialectId, raw, userId, sourceKey } = args
  const meta = lexeme.meta ?? {}
  const representativeChar = meta.representativeChar?.display ?? meta.representativeChar?.raw ?? ''
  const sourceRow = meta.sourceRow
  const sourceCell =
    sourceRow != null && column.sourceColumnLetter
      ? `${column.sourceSheet ?? ''}!${column.sourceColumnLetter}${sourceRow}`
      : undefined
  return {
    id: entryId(sourceKey, dialectId),
    lexemeId: lexeme.id,
    sourceBook: 'faanjyut',
    dialect: {
      name: dialectId,
      regionCode: column.regionCode ?? DIALECT_REGION_CODES[dialectId as keyof typeof DIALECT_REGION_CODES] ?? ''
    },
    headword: { display: representativeChar, normalized: representativeChar, isPlaceholder: !representativeChar },
    phonetic: { original: raw },
    entryType: 'character',
    senses: [],
    theme: {},
    meta: {
      sourceWorkbook: meta.sourceWorkbook,
      sourceSheet: column.sourceSheet,
      sourceRow,
      sourceColumn: column.sourceColumn ?? null,
      sourceColumnIndex: column.sourceColumnIndex,
      sourceCell,
      sourceKey,
      importReviewStatus: 'unreviewed_import',
      editedAfterImport: true
    },
    status: 'draft',
    createdBy: userId,
    updatedBy: userId
  }
}

/**
 * set-新建 ExternalEtymon 的字段形狀（域外列寫入用）。
 * segmentIndex 固定為 1（每個 lexeme+languageCode 僅一條 etymon）。
 */
export function buildNewExternalEtymonDoc(args: {
  lexeme: CellsLexemeDoc
  column: CellsColumnDoc
  raw: string
  userId: string
  sourceKey: string
}): Record<string, unknown> {
  const { lexeme, column, raw, userId, sourceKey } = args
  const meta = lexeme.meta ?? {}
  const representativeChar = meta.representativeChar?.display ?? meta.representativeChar?.raw ?? ''
  const sourceRow = meta.sourceRow
  const sourceCell =
    sourceRow != null && column.sourceColumnLetter
      ? `${column.sourceSheet ?? ''}!${column.sourceColumnLetter}${sourceRow}`
      : undefined
  return {
    id: externalEtymonId(sourceKey, column.languageCode!, 1),
    lexemeId: lexeme.id,
    languageCode: column.languageCode!,
    scriptForm: raw,
    raw,
    meta: {
      sourceBook: FAANJYUT_SOURCE_BOOK,
      sourceWorkbook: meta.sourceWorkbook,
      sourceSheet: column.sourceSheet,
      sourceRow,
      sourceColumn: column.sourceColumn ?? null,
      sourceColumnIndex: column.sourceColumnIndex,
      sourceCell,
      segmentIndex: 1,
      editedAfterImport: true
    },
    createdBy: userId
  }
}

/** op=set：有 Entry 改 phonetic.original，無 Entry 按穩定 ID 新建；兩路都 upsert CellState */
async function applySet(
  tx: CellsTx,
  edit: CellEdit,
  args: { column: CellsColumnDoc; lexeme: CellsLexemeDoc; user: CellsUser }
): Promise<CellResult> {
  const raw = (edit.raw ?? '').trim()
  const { column, lexeme, user } = args

  const existing = await tx.findEntry(edit.lexemeId, edit.dialectId!)
  let entryIdValue: string
  if (existing) {
    const before = plain(existing)
    const updated = await tx.updateEntry(existing, { phoneticOriginal: raw, updatedBy: user.id })
    await tx.createEditHistory({
      entryId: entryDocId(updated),
      userId: user.id,
      beforeSnapshot: before,
      afterSnapshot: plain(updated),
      changedFields: ['phonetic.original'],
      action: 'update'
    })
    entryIdValue = updated.id
  } else {
    const sourceKey = lexeme.meta?.sourceKey
    if (!sourceKey) {
      throw new Error(`${LEXEME_NOT_FOUND_MESSAGE}（缺少 sourceKey，無法生成穩定 ID）`)
    }
    const created = await tx.createEntry(
      buildNewEntryDoc({ lexeme, column, dialectId: edit.dialectId!, raw, userId: user.id, sourceKey })
    )
    await tx.createEditHistory({
      entryId: entryDocId(created),
      userId: user.id,
      beforeSnapshot: {},
      afterSnapshot: plain(created),
      changedFields: ['headword', 'dialect', 'phonetic.original'],
      action: 'create'
    })
    entryIdValue = created.id
  }

  await tx.upsertCellState({
    lexemeId: edit.lexemeId,
    columnId: column.id,
    userId: user.id,
    raw,
    projectionEntryId: entryIdValue,
    flags: { modifiedPendingReview: true }
  })

  return { lexemeId: edit.lexemeId, dialectId: edit.dialectId, columnId: edit.columnId, ok: true, entryId: entryIdValue }
}

/** op=set（域外列）：有 ExternalEtymon 改 raw+scriptForm，無則按穩定 ID 新建；兩路都 upsert CellState */
async function applySetExternal(
  tx: CellsTx,
  edit: CellEdit,
  args: { column: CellsColumnDoc; lexeme: CellsLexemeDoc; user: CellsUser }
): Promise<CellResult> {
  const raw = (edit.raw ?? '').trim()
  const { column, lexeme, user } = args

  const existing = await tx.findExternalEtymon(edit.lexemeId, column.languageCode!)
  let etymonId: string
  if (existing) {
    const before = plain(existing)
    const updated = await tx.updateExternalEtymon(existing, { raw, updatedBy: user.id })
    await tx.createEditHistory({
      entryId: entryDocId(updated as unknown as CellsEntryDoc),
      userId: user.id,
      beforeSnapshot: before,
      afterSnapshot: plain(updated),
      changedFields: ['raw', 'scriptForm'],
      action: 'update'
    })
    etymonId = updated.id
  } else {
    const sourceKey = lexeme.meta?.sourceKey
    if (!sourceKey) {
      throw new Error(`${LEXEME_NOT_FOUND_MESSAGE}（缺少 sourceKey，無法生成穩定 ID）`)
    }
    const created = await tx.createExternalEtymon(
      buildNewExternalEtymonDoc({ lexeme, column, raw, userId: user.id, sourceKey })
    )
    await tx.createEditHistory({
      entryId: entryDocId(created as unknown as CellsEntryDoc),
      userId: user.id,
      beforeSnapshot: {},
      afterSnapshot: plain(created),
      changedFields: ['raw', 'scriptForm', 'languageCode'],
      action: 'create'
    })
    etymonId = created.id
  }

  await tx.upsertCellState({
    lexemeId: edit.lexemeId,
    columnId: column.id,
    userId: user.id,
    raw,
    projectionEntryId: null,
    projectionExternalEtymonIds: [etymonId],
    flags: { modifiedPendingReview: true }
  })

  return { lexemeId: edit.lexemeId, columnId: edit.columnId, ok: true, entryId: etymonId }
}

/**
 * op=clear / op=absent（§6.4 最新口徑）：僅對空格語義；若格有 Entry，
 * 先按 clear 的 Entry 處理（deleteOne + EditHistory delete）再標格旗標。
 */
async function applyClearAbsent(
  tx: CellsTx,
  edit: CellEdit,
  column: CellsColumnDoc,
  user: CellsUser,
  flags: { explicitlyCleared?: boolean; explicitlyAbsent?: boolean }
): Promise<CellResult> {
  const existing = await tx.findEntry(edit.lexemeId, edit.dialectId!)
  if (existing) {
    const before = plain(existing)
    await tx.deleteEntry(existing)
    await tx.createEditHistory({
      entryId: entryDocId(existing),
      userId: user.id,
      beforeSnapshot: before,
      afterSnapshot: {},
      changedFields: [],
      action: 'delete'
    })
  }

  await tx.upsertCellState({
    lexemeId: edit.lexemeId,
    columnId: column.id,
    userId: user.id,
    projectionEntryId: null,
    flags
  })

  return { lexemeId: edit.lexemeId, dialectId: edit.dialectId, columnId: edit.columnId, ok: true }
}

/** op=clear / op=absent（域外列）：若格有 ExternalEtymon 則刪除 + EditHistory delete，再標格旗標 */
async function applyClearAbsentExternal(
  tx: CellsTx,
  edit: CellEdit,
  column: CellsColumnDoc,
  user: CellsUser,
  flags: { explicitlyCleared?: boolean; explicitlyAbsent?: boolean }
): Promise<CellResult> {
  const existing = await tx.findExternalEtymon(edit.lexemeId, column.languageCode!)
  if (existing) {
    const before = plain(existing)
    await tx.deleteExternalEtymon(existing)
    await tx.createEditHistory({
      entryId: entryDocId(existing as unknown as CellsEntryDoc),
      userId: user.id,
      beforeSnapshot: before,
      afterSnapshot: {},
      changedFields: [],
      action: 'delete'
    })
  }

  await tx.upsertCellState({
    lexemeId: edit.lexemeId,
    columnId: column.id,
    userId: user.id,
    projectionEntryId: null,
    projectionExternalEtymonIds: null,
    flags
  })

  return { lexemeId: edit.lexemeId, columnId: edit.columnId, ok: true }
}

/**
 * 單格流水線（§13.1 需新寫清單）：
 * 列解析（active 域內/域外）-> 權限（只用 canEditColumn，不用 canContributeToDialect--
 * 後者有 reviewer 旁路，比 §4 寬）-> Lexeme 校驗 -> 單格事務。
 * 域內列走 Entry 路徑；域外列走 ExternalEtymon 路徑。
 * 撞 {lexemeId,columnId} unique（11000）-> 該格 409 語義；其他異常 -> 該格失敗，批次繼續。
 */
export async function processCellEdit(
  db: CellsDb,
  edit: CellEdit,
  ctx: {
    user: CellsUser
    columnByDialect: Map<string, CellsColumnDoc>
    columnById: Map<string, CellsColumnDoc>
    lexemeById: Map<string, CellsLexemeDoc>
  }
): Promise<CellResult> {
  const column = ctx.columnByDialect.get(edit.dialectId ?? '') ?? ctx.columnById.get(edit.columnId ?? '')
  if (!column || column.status !== 'active') {
    return cellError(edit, COLUMN_NOT_FOUND_MESSAGE)
  }
  if (!canEditColumn(column, ctx.user)) {
    return cellError(edit, NO_PERMISSION_MESSAGE)
  }
  const lexeme = ctx.lexemeById.get(edit.lexemeId)
  if (!lexeme) {
    return cellError(edit, LEXEME_NOT_FOUND_MESSAGE)
  }

  const isExternal = column.sourceRole === 'external'

  try {
    return await db.withTransaction(async (tx) => {
      if (edit.op === 'set') {
        return isExternal
          ? applySetExternal(tx, edit, { column, lexeme, user: ctx.user })
          : applySet(tx, edit, { column, lexeme, user: ctx.user })
      }
      return isExternal
        ? applyClearAbsentExternal(
            tx,
            edit,
            column,
            ctx.user,
            edit.op === 'clear' ? { explicitlyCleared: true } : { explicitlyAbsent: true }
          )
        : applyClearAbsent(
            tx,
            edit,
            column,
            ctx.user,
            edit.op === 'clear' ? { explicitlyCleared: true } : { explicitlyAbsent: true }
          )
    })
  } catch (error: any) {
    if (error?.code === 11000) {
      return cellError(edit, CELL_CONFLICT_MESSAGE)
    }
    const detail = typeof error?.message === 'string' && error.message ? error.message : ''
    return cellError(edit, detail ? `${CELL_WRITE_FAILED_MESSAGE}：${detail}` : CELL_WRITE_FAILED_MESSAGE)
  }
}

/**
 * 批次入口（§12）：dialectId/columnId/lexemeId 去重後各一次等值查詢（列/詞條），
 * 逐格 processCellEdit（每格獨立事務），返回部分成功信封。
 */
export async function runCellBatch(
  db: CellsDb,
  args: { edits: CellEdit[]; user: CellsUser }
): Promise<CellBatchResult> {
  const { edits, user } = args
  const dialectIds = [...new Set(edits.map((e) => e.dialectId).filter((d): d is string => !!d))]
  const columnIds = [...new Set(edits.map((e) => e.columnId).filter((c): c is string => !!c))]
  const lexemeIds = [...new Set(edits.map((e) => e.lexemeId))]
  const [columnDocsByDialect, columnDocsById, lexemeDocs] = await Promise.all([
    db.findColumnsByDialectIds(dialectIds),
    db.findColumnsByIds(columnIds),
    db.findLexemes(lexemeIds)
  ])
  const columnByDialect = new Map<string, CellsColumnDoc>()
  for (const column of columnDocsByDialect) {
    if (column.dialectId) columnByDialect.set(column.dialectId, column)
  }
  const columnById = new Map(columnDocsById.map((c) => [c.id, c]))
  const lexemeById = new Map(lexemeDocs.map((l) => [l.id, l]))

  const results = await Promise.all(
    edits.map((edit) => processCellEdit(db, edit, { user, columnByDialect, columnById, lexemeById }))
  )
  const succeeded = results.filter((r) => r.ok).length
  return { results, succeeded, failed: results.length - succeeded }
}
