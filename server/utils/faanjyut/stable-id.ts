/**
 * 泛粵字表穩定 ID（ImportDataContract.md §4）。
 *
 * 兩倉庫共用公式：
 *   stableId(prefix, parts...) = prefix + sha256(parts 以 U+001F 連接).hex[0:24]
 *
 * 輸入字符串按 UTF-8 編碼，只做 trim()，不做繁簡或大小寫轉換；
 * 整數 part 先轉無前導零的十進制字符串；null/undefined 轉空字符串。
 *
 * Python（FaanJyutZibiu2Database/faanjyut_contract.py）與本實現共用契約 §4 測試向量；
 * P1 另以真實導出 NDJSON 的 id 對拍驗證（見 tests/stable-id.test.ts）。
 */
import { createHash } from 'node:crypto'

/** 契約 §4：parts 連接符 U+001F */
const ID_SEPARATOR = '\x1f'

export type StableIdPrefix =
  | 'fjl_'
  | 'fj_'
  | 'fje_'
  | 'fjcol_'
  | 'fjcell_'
  | 'fjcom_'
  | 'fjlink_'

export const STABLE_ID_PREFIXES: Record<string, StableIdPrefix> = {
  lexeme: 'fjl_',
  entry: 'fj_',
  externalEtymon: 'fje_',
  column: 'fjcol_',
  cellState: 'fjcell_',
  comment: 'fjcom_',
  link: 'fjlink_'
}

/** 契約 §4 測試向量（與 ETL 共用，勿改） */
export const STABLE_ID_TEST_VECTORS = [
  { prefix: 'fjl_', parts: ['faanjyut', '>416461483360343'], expected: 'fjl_20527ec801886102efff50bb' },
  { prefix: 'fj_', parts: ['faanjyut', '>416461483360343', 'guangzhou'], expected: 'fj_20255cd0e675c51e962089d7' },
  { prefix: 'fje_', parts: ['faanjyut', '>416461483360343', 'och', '1'], expected: 'fje_813a5eacb69a4ac425169c1f' },
  { prefix: 'fjcol_', parts: ['faanjyut', '主表-睇真尐註解', '35', '穗'], expected: 'fjcol_b17ac300d7c63ccef665209e' }
] as const

/** 穩定 ID 正則：prefix + 24 位十六進制 */
export function stableIdRegex(prefix: string): RegExp {
  return new RegExp(`^${prefix}[0-9a-f]{24}$`)
}

export function isStableId(id: string, prefix: string): boolean {
  return stableIdRegex(prefix).test(id)
}

/** 契約 §4 核心：prefix + sha256(parts 以 U+001F 連接).hex[0:24] */
export function stableId(prefix: StableIdPrefix | string, ...parts: Array<string | number | null | undefined>): string {
  const normalized = parts.map((part) => {
    if (part === null || part === undefined) return ''
    return String(part).trim()
  })
  const digest = createHash('sha256').update(normalized.join(ID_SEPARATOR), 'utf8').digest('hex')
  return prefix + digest.slice(0, 24)
}

/**
 * 契約 §4 Comment 最後一個 part：帶標籤的 commentIdentity。
 * 有 commentId 時為 comment:+commentId；否則有 threadId 時為 thread:+threadId:+ordinal；
 * 兩者都沒有時為 ordinal:+ordinal。不得直接拼接無標籤的可選值。
 */
export function commentIdentity(
  commentId?: string | null,
  threadId?: string | null,
  ordinal: number = 1
): string {
  if (commentId) return `comment:${commentId.trim()}`
  if (threadId) return `thread:${threadId.trim()}:${ordinal}`
  return `ordinal:${ordinal}`
}

// ---- 各對象 ID 生成（與 ETL PanJ2MongoDB.py 逐項對齊） ----

/** Lexeme：`sourceBook, sourceKey` */
export function lexemeId(sourceKey: string): string {
  return stableId(STABLE_ID_PREFIXES.lexeme, 'faanjyut', sourceKey)
}

/** Entry：`sourceBook, sourceKey, dialectId` */
export function entryId(sourceKey: string, dialectId: string): string {
  return stableId(STABLE_ID_PREFIXES.entry, 'faanjyut', sourceKey, dialectId)
}

/** ExternalEtymon：`sourceBook, sourceKey, languageCode, segmentIndex` */
export function externalEtymonId(sourceKey: string, languageCode: string, segmentIndex: number): string {
  return stableId(STABLE_ID_PREFIXES.externalEtymon, 'faanjyut', sourceKey, languageCode, segmentIndex)
}

/** Column：`sourceBook, sourceSheet, sourceColumnIndex, sourceColumn-or-empty-string`；null sourceColumn 轉空字符串 */
export function columnId(sourceSheet: string, sourceColumnIndex: number, sourceColumn: string | null | undefined): string {
  return stableId(STABLE_ID_PREFIXES.column, 'faanjyut', sourceSheet, sourceColumnIndex, sourceColumn ?? '')
}

/** CellState：`lexemeId, columnId` */
export function cellStateId(lexemeId: string, columnId: string): string {
  return stableId(STABLE_ID_PREFIXES.cellState, lexemeId, columnId)
}

/**
 * Comment：`sourceBook, sourceSheet, sourceCell, commentIdentity`。
 * 注意 contract 的 cell part 是含 worksheet 語境的 A1 坐標（如 `主表-睇真尐註解!P1`），
 * 即 legacyMeta.sourceCell 原值。
 */
export function commentId(
  sourceSheet: string,
  sourceCell: string,
  opts: { originalCommentId?: string | null; threadId?: string | null; ordinal?: number }
): string {
  return stableId(
    STABLE_ID_PREFIXES.comment,
    'faanjyut',
    sourceSheet,
    sourceCell,
    commentIdentity(opts.originalCommentId, opts.threadId, opts.ordinal ?? 1)
  )
}

/**
 * Link：`fromLexemeId, rawSource, ordinal`。
 * ordinal 是同一 (fromLexemeId, rawSource) 在文件內的 1-based 計數，ETL 逐條遞增生成；
 * 校驗時按文件順序重算（見 import-contract.ts）。
 */
export function linkId(fromLexemeId: string, rawSource: string, ordinal: number): string {
  return stableId(STABLE_ID_PREFIXES.link, fromLexemeId, rawSource, ordinal)
}
