/**
 * 泛粵字表新建詞條純邏輯（FaanjyutV1Design §8、§12 `POST /api/faanjyut/lexemes`、§13 P5）。
 *
 * 新建詞條 = Lexeme + 每個 initial cell 的 Entry + CellState + EditHistory 在**同一 transaction**
 * 內提交（§8：Lexeme 與 initial cells 的創建使用 transaction）。JC- sourceKey 由新 counters
 * collection（faanjyut_counters，`{_id:'lexeme_sourceKey', seq}`）在事務內原子遞增生成——
 * 原子且人類可讀；`meta.sourceKey` 唯一索引（Lexeme.ts）兜底，撞 E11000 → 409 重試語義。
 *
 * 本模塊不 import mongoose：經 LexemeCreateDb / LexemeCreateTx 抽象訪問數據庫——
 * 真實實現見 mongo-db.ts 的 adaptMongooseLexemeCreateDb（session 綁定事務）；
 * 單元測試用內存 fake（見 __tests__/lexeme-create.test.ts）。
 */
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'
import { canEditColumn } from './matrix'
import {
  buildNewEntryDoc,
  COLUMN_NOT_FOUND_MESSAGE,
  NO_PERMISSION_MESSAGE,
  type CellsColumnDoc,
  type CellsTx,
  type CellsUser
} from './cells'

export const SOURCE_KEY_PREFIX = 'JC-'
export const SOURCE_KEY_SEQ_DIGITS = 8
export const LEXEME_ID_PREFIX = 'fjl_'
export const LEXEME_ID_RANDOM_LENGTH = 20
export const INITIAL_CELLS_MIN = 1
export const INITIAL_CELLS_MAX = 30

export const LEXEME_CREATE_FAILED_MESSAGE = '詞條建立失敗'
export const SOURCE_KEY_CONFLICT_MESSAGE = '詞條編號衝突，請重試'
export const DEFINITION_REQUIRED_MESSAGE = '釋義為必填'
export const INITIAL_CELLS_REQUIRED_MESSAGE = '至少需要一個初始方音格'
export const INITIAL_CELLS_TOO_MANY_MESSAGE = `初始方音格最多 ${INITIAL_CELLS_MAX} 個`
export const DUPLICATE_DIALECT_MESSAGE = '初始方音格不得重複同一方言'

/** 請求形狀（handler 以 zod 校驗後傳入；純函數再作防禦性校驗） */
export interface CreateLexemeInput {
  definitionRaw: string
  compositePronunciation?: string
  representativeChar?: string
  note?: string
  initialCells: Array<{ dialectId: string; raw: string; op?: 'set' | 'absent' }>
}

export interface CreateLexemeResult {
  lexemeId: string
  sourceKey: string
  entries: Array<{ dialectId: string; entryId: string }>
}

/** 帶 HTTP 狀態的領域錯誤（列不存在/無權 → 4xx；撞唯一索引 → 409 由 httpErrorForCreateLexeme 映射） */
export class LexemeCreateError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'LexemeCreateError'
  }
}

/**
 * 新建詞條事務內的操作面（CellsTx 全量 + P5 新增兩方法；真實實現 session 綁定）。
 * 不直接擴展 CellsTx 本身——避免 cells.test.ts 的內存 fake 被迫實現用不到的寫法。
 */
export interface LexemeCreateTx extends CellsTx {
  /** 新建 Lexeme（session 綁定 save）；返回應用層 id */
  createLexeme(doc: Record<string, unknown>): Promise<{ id: string }>
  /** 事務內原子遞增 lexeme_sourceKey 計數器（$inc + upsert，returnDocument after），返回遞增後序號 */
  nextSourceKeySeq(): Promise<number>
}

/** 新建詞條批次級 DB 訪問面（事務外等值查詢） */
export interface LexemeCreateDb {
  findColumnsByDialectIds(dialectIds: string[]): Promise<CellsColumnDoc[]>
  withTransaction<T>(fn: (tx: LexemeCreateTx) => Promise<T>): Promise<T>
}

/** 請求 Zod schema（handler 與單測共用；zod v4 `.trim()` 先 trim 再 min）
 *  審計 M56：初始格支持 op='absent'——raw 為 '_' 時前端以 op='absent' 提交，
 *  服務端只寫 CellState（explicitlyAbsent，與矩陣編輯「_」語義一致），不建 Entry。 */
const InitialCellSchema = z.object({
  dialectId: z.string().trim().min(1, '方言為必填'),
  raw: z.string().trim().min(1, '方音為必填'),
  op: z.enum(['set', 'absent']).default('set')
})

export const CreateLexemeBodySchema = z.object({
  definitionRaw: z.string().trim().min(1, DEFINITION_REQUIRED_MESSAGE),
  compositePronunciation: z.string().trim().optional(),
  representativeChar: z.string().trim().optional(),
  note: z.string().trim().optional(),
  initialCells: z.array(InitialCellSchema).min(INITIAL_CELLS_MIN).max(INITIAL_CELLS_MAX)
}).superRefine((body, ctx) => {
  const seen = new Set<string>()
  body.initialCells.forEach((cell, index) => {
    if (seen.has(cell.dialectId)) {
      ctx.addIssue({ code: 'custom', path: ['initialCells', index, 'dialectId'], message: DUPLICATE_DIALECT_MESSAGE })
    }
    seen.add(cell.dialectId)
  })
})

export type CreateLexemeBody = z.infer<typeof CreateLexemeBodySchema>

/** 快照序列化（同 cells.ts plain：_id 等轉為可存 Mixed 的普通值） */
function plain(doc: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(doc))
}

/**
 * Lexeme 文檔構建：meta 七鍵中 sourceBook/sourceKey 填實、其餘六個溯源鍵填空/null
 * （新建詞條無導入溯源，§8）；compositePronunciation/representativeChar 填了則 raw/display 同值。
 * `meta.matrixOrder` 必須顯式賦值（缺字段在 Mongo 升序排列時排最前，§13.1 P5）。
 */
export function buildLexemeDoc(args: {
  id: string
  sourceKey: string
  definitionRaw: string
  compositePronunciation?: string
  representativeChar?: string
  note?: string
  matrixOrder: number
  userId: string
}): Record<string, unknown> {
  const { id, sourceKey, definitionRaw, matrixOrder, userId } = args
  const compositePronunciation = (args.compositePronunciation ?? '').trim()
  const representativeChar = (args.representativeChar ?? '').trim()
  const note = (args.note ?? '').trim()
  const meta: Record<string, unknown> = {
    sourceBook: FAANJYUT_SOURCE_BOOK,
    sourceKey,
    sourceWorkbook: null,
    sourceSheet: null,
    sourceRow: null,
    sourceColumn: null,
    sourceColumnIndex: null,
    sourceCell: null,
    definitionRaw,
    matrixOrder,
    editedAfterImport: true,
    createdBy: userId,
    updatedBy: userId
  }
  if (compositePronunciation) {
    meta.compositePronunciation = { raw: compositePronunciation, display: compositePronunciation }
  }
  if (representativeChar) {
    meta.representativeChar = { raw: representativeChar, display: representativeChar }
  }
  return {
    id,
    meta,
    status: { publicationStatus: 'draft' },
    notes: note || undefined
  }
}

/**
 * 新建詞條入口：列批查 + 逐列權限校驗（只用 canEditColumn，不用 canContributeToDialect——
 * 後者有 reviewer 旁路，比 §4 寬；與 P4 cells 同原則）→ 單一事務：
 * 計數器取 JC- 序號 → Lexeme 落庫 → 逐格 Entry + CellState + EditHistory（復用 P4 buildNewEntryDoc）。
 */
export async function createLexeme(
  db: LexemeCreateDb,
  input: CreateLexemeInput,
  user: CellsUser
): Promise<CreateLexemeResult> {
  const definitionRaw = input.definitionRaw.trim()
  if (!definitionRaw) throw new LexemeCreateError(400, DEFINITION_REQUIRED_MESSAGE)
  if (input.initialCells.length < INITIAL_CELLS_MIN) throw new LexemeCreateError(400, INITIAL_CELLS_REQUIRED_MESSAGE)
  if (input.initialCells.length > INITIAL_CELLS_MAX) throw new LexemeCreateError(400, INITIAL_CELLS_TOO_MANY_MESSAGE)
  const seenDialects = new Set<string>()
  for (const cell of input.initialCells) {
    if (seenDialects.has(cell.dialectId)) throw new LexemeCreateError(400, DUPLICATE_DIALECT_MESSAGE)
    seenDialects.add(cell.dialectId)
  }

  const dialectIds = input.initialCells.map((cell) => cell.dialectId)
  // 審計 M38：matrixOrder 改為 Date.now()（對齊契約 §1「平台新建對象使用 Date.now()」）——
  // 原 max+1 在事務外讀取，並發新建會得到相同 matrixOrder；Date.now() 天然排在導入行之後
  // （導入行 1..N），同毫秒並發僅排序並列（id 次排序），無唯一性要求。
  const columnDocs = await db.findColumnsByDialectIds(dialectIds)
  const columnByDialect = new Map<string, CellsColumnDoc>()
  for (const column of columnDocs) {
    if (column.dialectId) columnByDialect.set(column.dialectId, column)
  }

  // 權限校驗在事務外（列不存在/無權 → 400/403，不觸發任何寫入）
  for (const cell of input.initialCells) {
    const column = columnByDialect.get(cell.dialectId)
    if (!column || column.sourceRole !== 'domestic' || column.status !== 'active') {
      throw new LexemeCreateError(400, COLUMN_NOT_FOUND_MESSAGE)
    }
    if (!canEditColumn(column, user)) {
      throw new LexemeCreateError(403, NO_PERMISSION_MESSAGE)
    }
  }

  return db.withTransaction(async (tx) => {
    const seq = await tx.nextSourceKeySeq()
    const sourceKey = SOURCE_KEY_PREFIX + String(seq).padStart(SOURCE_KEY_SEQ_DIGITS, '0')
    const matrixOrder = Date.now()
    const lexemeId = LEXEME_ID_PREFIX + nanoid(LEXEME_ID_RANDOM_LENGTH)

    await tx.createLexeme(buildLexemeDoc({
      id: lexemeId,
      sourceKey,
      definitionRaw,
      compositePronunciation: input.compositePronunciation,
      representativeChar: input.representativeChar,
      note: input.note,
      matrixOrder,
      userId: user.id
    }))

    // 給 buildNewEntryDoc 的最小詞條視圖（代表字已填則 Entry headword 有值；無導入溯源）。
    // 注意須與 buildLexemeDoc 同形：representativeChar 為 {raw, display} 對象，buildNewEntryDoc
    // 讀 meta.representativeChar.display ?? raw 取代表字。
    const representativeChar = input.representativeChar?.trim()
    const lexemeRef = {
      id: lexemeId,
      meta: {
        sourceBook: FAANJYUT_SOURCE_BOOK,
        sourceKey,
        representativeChar: representativeChar
          ? { raw: representativeChar, display: representativeChar }
          : undefined
      }
    }

    const entries: Array<{ dialectId: string; entryId: string }> = []
    for (const cell of input.initialCells) {
      const column = columnByDialect.get(cell.dialectId)!
      const raw = cell.raw.trim()
      // 審計 M56：op='absent'（raw 為 '_'）→ 只寫 CellState explicitAbsent，不建 Entry/歷史
      if (cell.op === 'absent') {
        await tx.upsertCellState({
          lexemeId,
          columnId: column.id,
          userId: user.id,
          projectionEntryId: null,
          flags: { modifiedPendingReview: true, explicitlyAbsent: true }
        })
        continue
      }
      const created = await tx.createEntry(
        buildNewEntryDoc({ lexeme: lexemeRef, column, dialectId: cell.dialectId, raw, userId: user.id, sourceKey })
      )
      await tx.createEditHistory({
        entryId: String(created._id),
        userId: user.id,
        beforeSnapshot: {},
        afterSnapshot: plain(created),
        changedFields: ['headword', 'dialect', 'phonetic.original'],
        action: 'create'
      })
      await tx.upsertCellState({
        lexemeId,
        columnId: column.id,
        userId: user.id,
        raw,
        projectionEntryId: created.id,
        flags: { modifiedPendingReview: true }
      })
      entries.push({ dialectId: cell.dialectId, entryId: created.id })
    }

    return { lexemeId, sourceKey, entries }
  })
}

/**
 * 把 createLexeme 拋出的異常映射為 {statusCode, message}（handler 轉 createError）。
 * LexemeCreateError（400/403）原樣；撞唯一索引（E11000）→ 409 重試語義；
 * 未知異常返回 null → handler 落 500。
 */
export function httpErrorForCreateLexeme(error: unknown): { statusCode: number; message: string } | null {
  if (error instanceof LexemeCreateError) {
    return { statusCode: error.statusCode, message: error.message }
  }
  if ((error as { code?: unknown } | null)?.code === 11000) {
    return { statusCode: 409, message: SOURCE_KEY_CONFLICT_MESSAGE }
  }
  return null
}
