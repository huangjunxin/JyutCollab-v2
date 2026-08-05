/**
 * 7 類 NDJSON 導入 DTO 的 strict Zod 校驗（見 ImportDataContract.md §5、§6）。
 *
 * 前 3 類（Lexeme/Entry/ExternalEtymon）直接復用 shared/faanjyut-import-dto.ts 的 DTO
 * （不改 shared 層契約語義）；後 4 類（Column/CellState/Comment/Link）在 server 側按
 * 契約 §6 + 封存 NewTablesDesign.md §3.2–3.5 補齊。
 *
 * unknown 欄位一律拒絕（CONTRACT_UNKNOWN_FIELD）；`_id/__v/createdAt/updatedAt/importBatchId`
 * 禁止出現在輸入（由 Node 真實寫入時注入）。域內/域外列身份約束（§6.1：域內列必須有
 * dialectId、域外列必須有 languageCode）以 superRefine 施加。
 */
import { z } from 'zod'
import {
  FaanJyutLexemeDtoSchema,
  FaanJyutEntryDtoSchema,
  FaanJyutExternalEtymonDtoSchema
} from '../../../shared/faanjyut-import-dto'
import { DIALECT_IDS } from '../../../shared/dialects'
import { FAANJYUT_LANGUAGE_CODES } from '../../../shared/faanjyut-languages'
import { FAANJYUT_SOURCE_BOOK } from '../../../shared/faanjyut'

const forbiddenInjectedKeys = ['_id', '__v', 'createdAt', 'updatedAt', 'importBatchId'] as const

/** 攔截 Node 注入欄位（頂層）：出現即整條失敗 */
function rejectInjectedKeys<T extends z.ZodObject<z.ZodRawShape>>(schema: T): T {
  return schema.check((ctx) => {
    for (const key of forbiddenInjectedKeys) {
      if (key in ctx.value) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value,
          path: [key],
          message: `ETL 輸入不得包含 ${key}（由 Node 寫入時注入）`
        })
      }
    }
  }) as T
}

const sourceBookSchema = z.literal(FAANJYUT_SOURCE_BOOK)

// ---- §6.1 Column ----
const columnSourceRoleSchema = z.enum(['domestic', 'external', 'boundary', 'meta', 'check', 'skipped'])
const columnProjectionTargetSchema = z.enum(['entry', 'externalEtymon', 'lexemeMeta', 'link', 'comment', 'none', 'custom'])
const columnStatusSchema = z.enum(['active', 'inactive', 'draft', 'suspected_missing'])

export const FaanJyutColumnDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  sourceBook: sourceBookSchema,
  sourceSheet: z.string().min(1),
  sourceColumn: z.string().nullable(),
  sourceColumnIndex: z.number().int().min(1),
  sourceColumnLetter: z.string().optional(),
  sourceRole: columnSourceRoleSchema,
  projectionTarget: columnProjectionTargetSchema,
  label: z.string().min(1),
  shortLabel: z.string().optional(),
  fullName: z.string().optional(),
  fullNameNote: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  dialectId: z.enum(DIALECT_IDS).optional(),
  languageCode: z.enum(FAANJYUT_LANGUAGE_CODES).optional(),
  regionCode: z.string().optional(),
  order: z.strictObject({
    originalOrder: z.number().int().min(1),
    regionOrder: z.number().int().optional()
  }),
  style: z.strictObject({
    color: z.string().optional(),
    defaultTextColor: z.string().optional()
  }),
  sourceMeta: z.strictObject({
    mark: z.string().optional(),
    rawMark: z.unknown().optional(),
    headerRows: z.record(z.string(), z.unknown()).optional(),
    note: z.string().optional(),
    skippedReason: z.string().optional()
  }),
  permissions: z.strictObject({
    editableRoles: z.array(z.string()).optional(),
    reviewerRoles: z.array(z.string()).optional(),
    editableUserIds: z.array(z.string()).optional(),
    reviewerUserIds: z.array(z.string()).optional()
  }).optional(),
  status: columnStatusSchema,
  createdBy: z.literal('system:faanjyut_import')
})).superRefine((col, ctx) => {
  // 契約 §6.1：域內列必須有 dialectId，域外列必須有 languageCode
  if (col.sourceRole === 'domestic' && col.dialectId === undefined) {
    ctx.addIssue({ code: 'custom', path: ['dialectId'], message: `域內列（sourceRole=domestic）必須有 dialectId（sourceColumnIndex=${col.sourceColumnIndex}）` })
  }
  if (col.sourceRole === 'external' && col.languageCode === undefined) {
    ctx.addIssue({ code: 'custom', path: ['languageCode'], message: `域外列（sourceRole=external）必須有 languageCode（sourceColumnIndex=${col.sourceColumnIndex}）` })
  }
})

// ---- §6.2 CellState ----
const cellWorkflowSchema = z.enum(['unreviewed', 'pending_review', 'checked', 'changes_requested', 'needs_recheck', 'locked'])

export const FaanJyutCellStateDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  lexemeId: z.string().min(1),
  columnId: z.string().min(1),
  raw: z.string().optional(),
  rawOriginal: z.string().optional(),
  normalized: z.string().optional(),
  status: z.strictObject({
    workflow: cellWorkflowSchema,
    flags: z.strictObject({
      modifiedPendingReview: z.boolean().optional(),
      hasQuestion: z.boolean().optional(),
      parseWarning: z.boolean().optional(),
      pendingDelete: z.boolean().optional(),
      hasOldNote: z.boolean().optional(),
      deleted: z.boolean().optional(),
      explicitlyAbsent: z.boolean().optional(),
      explicitlyCleared: z.boolean().optional()
    }).optional()
  }),
  review: z.strictObject({
    submittedBy: z.string().optional(),
    submittedAt: z.string().optional(),
    reviewedBy: z.string().optional(),
    reviewedAt: z.string().optional(),
    lastAction: z.string().optional(),
    reason: z.string().optional()
  }).optional(),
  parse: z.strictObject({
    parsed: z.unknown().optional(),
    warnings: z.array(z.string()).optional(),
    styleResult: z.unknown().optional()
  }).optional(),
  projection: z.strictObject({
    entryId: z.string().optional(),
    externalEtymonIds: z.array(z.string()).optional(),
    lastProjectedAt: z.string().optional()
  }).optional(),
  source: z.strictObject({
    sourceRow: z.number().int().min(1).optional(),
    sourceColumn: z.string().optional(),
    sourceCell: z.string().optional()
  }),
  // 導入初值（契約 §6.2）
  editedAfterImport: z.literal(false),
  version: z.literal(0),
  createdBy: z.literal('system:faanjyut_import')
}))

// ---- §6.3 Comment ----
const commentTargetTypeSchema = z.enum(['lexeme', 'cell', 'externalEtymon', 'sense', 'column'])
const commentSourceSchema = z.enum(['imported_excel_comment', 'imported_google_comment', 'user_comment'])

export const FaanJyutCommentDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  targetType: commentTargetTypeSchema,
  targetId: z.string().min(1),
  source: commentSourceSchema,
  authorId: z.string().optional(),
  authorDisplay: z.string().optional(),
  content: z.string(),
  replyTo: z.string().optional(),
  isResolved: z.literal(false),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional(),
  legacyMeta: z.strictObject({
    sourceRow: z.number().int().min(1).optional(),
    sourceColumn: z.string().optional(),
    sourceCell: z.string().optional(),
    originalAuthor: z.string().optional(),
    originalTimestamp: z.string().optional(),
    threadId: z.string().optional(),
    originalCommentId: z.string().optional(),
    replyToOriginalCommentId: z.string().optional(),
    ordinal: z.number().int().min(1).optional(),
    sanitized: z.boolean().optional(),
    threadedPlaceholder: z.boolean().optional()
  }).optional(),
  mentions: z.strictObject({
    userIds: z.array(z.string()).optional(),
    lexemeIds: z.array(z.string()).optional(),
    sourceKeys: z.array(z.string()).optional()
  }).optional()
}))

// ---- §6.4 Link ----
const linkTypeSchema = z.enum(['related', 'twin_potential', 'redirect_hint', 'merge_hint', 'manual', 'unknown'])
const linkRawSourceSchema = z.enum(['DR', 'DQ', 'representativeChar', 'comment', 'manual'])
const linkStatusSchema = z.enum(['active', 'unresolved', 'broken', 'archived'])

export const FaanJyutLinkDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  fromLexemeId: z.string().min(1),
  toLexemeId: z.string().optional(),
  targetKey: z.string().optional(),
  targetRaw: z.string().optional(),
  type: linkTypeSchema,
  rawSource: linkRawSourceSchema,
  rawLabel: z.string().optional(),
  rawValue: z.string().optional(),
  status: linkStatusSchema,
  confidence: z.number().optional(),
  source: z.strictObject({
    sourceRow: z.number().int().min(1).optional(),
    sourceColumn: z.string().optional()
  }).optional(),
  createdBy: z.literal('system:faanjyut_import')
}))

/** 7 類文件的 DTO schema 表（檔案名 → schema） */
export const NDJSON_SCHEMAS: Record<string, z.ZodType> = {
  'lexemes.ndjson': FaanJyutLexemeDtoSchema,
  'entries.ndjson': FaanJyutEntryDtoSchema,
  'external_etymons.ndjson': FaanJyutExternalEtymonDtoSchema,
  'columns.ndjson': FaanJyutColumnDtoSchema,
  'cell_states.ndjson': FaanJyutCellStateDtoSchema,
  'comments.ndjson': FaanJyutCommentDtoSchema,
  'links.ndjson': FaanJyutLinkDtoSchema
}

export type FaanJyutColumnDto = z.infer<typeof FaanJyutColumnDtoSchema>
export type FaanJyutCellStateDto = z.infer<typeof FaanJyutCellStateDtoSchema>
export type FaanJyutCommentDto = z.infer<typeof FaanJyutCommentDtoSchema>
export type FaanJyutLinkDto = z.infer<typeof FaanJyutLinkDtoSchema>
