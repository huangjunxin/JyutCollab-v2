/**
 * 泛粵導入契約校驗器（ImportDataContract.md §3、§8；ImplementationPlan P1）。
 *
 * 職責：讀取 ETL 導出目錄，校驗
 *  - manifest（schemaVersion / baselineLevel 環境門檻 / 計數 / 文件行數與 SHA-256）
 *  - 7 類 NDJSON（strict Zod → Mongoose validate + 前後字段丟失對比）
 *  - 穩定 ID（契約 §4 重算對拍）、ID/鍵唯一性、外鍵與投影一致性
 *  - 8 份 ETL 報告（統一信封 + summary 與 manifest/NDJSON 實數對賬）
 *
 * 純 Node fs 實現，不依賴 MongoDB（DB 側的衝突檢查與零寫入證明在 dry-run.ts）。
 * 任何 blocker > 0 → 進程退出碼 2（由 CLI 層執行）。
 */
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { join } from 'node:path'
import { z } from 'zod'
import {
  lexemeId,
  entryId,
  externalEtymonId,
  columnId,
  cellStateId,
  commentId,
  linkId
} from './stable-id'
import { NDJSON_SCHEMAS } from './ndjson-schemas'
import { modelForCollection, FAANJYUT_IMPORT_COLLECTIONS } from './import-models'

// ---------------------------------------------------------------------------
// 類型
// ---------------------------------------------------------------------------

export type Environment = 'local' | 'staging' | 'production'

export type FindingSeverity = 'blocker' | 'warning' | 'info'

export interface Finding {
  code: string
  severity: FindingSeverity
  objectType?: string
  file?: string
  line?: number
  objectId?: string
  sourceKey?: string
  sourceCell?: string
  message: string
  details?: Record<string, unknown>
}

export interface FileCounts {
  input: number
  valid: number
  invalid: number
}

export interface Manifest {
  schemaVersion: number
  baselineLevel: string
  sourceBook: string
  sourceWorkbook: string
  sourceSheet: string
  sourceFileSha256: string
  sourceExportedAt: string | null
  inputFiles: {
    workbook: { name: string; sha256: string } | null
    filterRules: { name: string; sha256: string } | null
    commentsExport: unknown
  }
  generatedAt: string
  generator: {
    name: string
    gitCommit: string | null
    gitDirty: boolean
    gitDiffSha256?: string
  }
  counts: Record<string, number>
  files: Record<string, { records: number; sha256: string }>
}

export interface ConflictFacts {
  /** 全部合法 Lexeme 的 sourceKey（含重複鍵，僅一次） */
  lexemeSourceKeys: string[]
  /** 全部合法 Lexeme 的 id */
  lexemeIds: string[]
  /** Entry 的 (lexemeId, dialectName) 對 */
  entryCells: Array<{ lexemeId: string; dialectName: string }>
  /** Column 的物理位置（sourceSheet + sourceColumnIndex） */
  columnPositions: Array<{ sourceSheet: string; sourceColumnIndex: number }>
  /** 域內/域外 active 列的映射鍵（dialectId 或 languageCode） */
  columnActiveMappings: Array<{ sourceRole: 'domestic' | 'external'; key: string }>
  /** 各 collection 全部合法 id */
  allIds: Record<string, string[]>
}

export interface ValidatedExport {
  manifest: Manifest
  manifestSha256: string
  counts: Record<string, FileCounts>
  blockers: Finding[]
  warnings: Finding[]
  conflictFacts: ConflictFacts
}

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

/** 7 類 NDJSON 文件（契約 §2 required） */
export const NDJSON_FILES = [
  'lexemes.ndjson',
  'entries.ndjson',
  'external_etymons.ndjson',
  'columns.ndjson',
  'cell_states.ndjson',
  'comments.ndjson',
  'links.ndjson'
] as const

/** 8 份 required 報告（契約 §2、§3.1） */
export const ETL_REPORT_FILES = [
  'import_report.json',
  'dialect_mapping_report.json',
  'external_mapping_report.json',
  'duplicate_keys_report.json',
  'entry_conflicts_report.json',
  'unresolved_links_report.json',
  'comments_report.json',
  'skipped_records_report.json'
] as const

export const REPORT_TYPE_BY_FILE: Record<string, string> = {
  'import_report.json': 'import',
  'dialect_mapping_report.json': 'dialect_mapping',
  'external_mapping_report.json': 'external_mapping',
  'duplicate_keys_report.json': 'duplicate_keys',
  'entry_conflicts_report.json': 'entry_conflicts',
  'unresolved_links_report.json': 'unresolved_links',
  'comments_report.json': 'comments',
  'skipped_records_report.json': 'skipped_records'
}

/** 契約 §3.1 各報告 summary 必需字段 */
const REPORT_SUMMARY_REQUIRED: Record<string, string[]> = {
  import: ['sourceRows', 'validRows', 'skippedRows', 'outputCounts', 'placeholderCounts'],
  dialect_mapping: ['domesticColumns', 'mappedColumns', 'unmappedColumns', 'duplicateTargets'],
  external_mapping: ['externalColumns', 'mappedColumns', 'unmappedColumns'],
  duplicate_keys: ['duplicateGroups', 'extraRecords'],
  entry_conflicts: ['conflictGroups', 'extraRecords'],
  unresolved_links: ['total', 'resolved', 'unresolved', 'byRawSource'],
  comments: ['xlsxLegacy', 'google', 'merged', 'deduplicated', 'threadedPlaceholders', 'sanitized', 'dropped'],
  skipped_records: ['total', 'byReason']
}

/** 契約 §3.1 各報告 records 每項必需字段 */
const REPORT_RECORD_REQUIRED: Record<string, string[]> = {
  import: ['code', 'severity', 'message'],
  dialect_mapping: ['sourceColumnIndex', 'sourceColumn', 'dialectId', 'status'],
  external_mapping: ['sourceColumnIndex', 'sourceColumn', 'languageCode', 'status'],
  duplicate_keys: ['sourceKey', 'sourceRows'],
  entry_conflicts: ['headword', 'dialectId', 'sourceKeys', 'lexemeIds'],
  unresolved_links: ['fromSourceKey', 'rawSource', 'rawValue', 'status'],
  comments: ['code', 'sourceCell', 'severity'],
  skipped_records: ['sourceRow', 'sourceKey', 'reason']
}

/** 穩定 blocker/warning code 全集（契約 §8.1 列出的是子集；新增為兼容變更） */
export const FINDING_CODES = {
  manifestMismatch: 'MANIFEST_MISMATCH',
  invalidBaselineLevel: 'INVALID_BASELINE_LEVEL',
  dirtyGeneratorInProduction: 'DIRTY_GENERATOR_IN_PRODUCTION',
  contractUnknownField: 'CONTRACT_UNKNOWN_FIELD',
  contractInvalidField: 'CONTRACT_INVALID_FIELD',
  mongooseDroppedField: 'MONGOOSE_DROPPED_FIELD',
  mongooseValidationError: 'MONGOOSE_VALIDATION_ERROR',
  duplicateId: 'DUPLICATE_ID',
  duplicateSourceKey: 'DUPLICATE_SOURCE_KEY',
  duplicateCell: 'DUPLICATE_CELL',
  missingReference: 'MISSING_REFERENCE',
  invalidDialectId: 'INVALID_DIALECT_ID',
  invalidLanguageCode: 'INVALID_LANGUAGE_CODE',
  targetIdConflict: 'TARGET_ID_CONFLICT',
  targetSourceKeyConflict: 'TARGET_SOURCE_KEY_CONFLICT',
  blockingIndex: 'BLOCKING_INDEX',
  missingRequiredArtifact: 'MISSING_REQUIRED_ARTIFACT',
  unsanitizedComment: 'UNSANITIZED_COMMENT',
  testDataInProduction: 'TEST_DATA_IN_PRODUCTION',
  databaseMutated: 'DATABASE_MUTATED_DURING_DRY_RUN',
  writeCommandObserved: 'DATABASE_WRITE_COMMAND_OBSERVED',
  // 以下為契約 §8.1 清單之外的本期新增 code（新增屬兼容變更）
  stableIdMismatch: 'STABLE_ID_MISMATCH',
  projectionMismatch: 'PROJECTION_MISMATCH',
  columnMappingAmbiguous: 'COLUMN_MAPPING_AMBIGUOUS',
  emptyHeaderColumn: 'EMPTY_HEADER_COLUMN',
  duplicateHeaderColumn: 'DUPLICATE_HEADER_COLUMN',
  missingCommentBody: 'MISSING_COMMENT_BODY',
  importBatchIdInInput: 'IMPORT_BATCH_ID_IN_INPUT',
  invalidReportFile: 'INVALID_REPORT_FILE',
  invariantViolation: 'INVARIANT_VIOLATION'
} as const

const FILE_TO_COLLECTION: Record<string, string> = {
  'lexemes.ndjson': 'lexemes',
  'entries.ndjson': 'entries',
  'external_etymons.ndjson': 'external_etymons',
  'columns.ndjson': 'faanjyut_columns',
  'cell_states.ndjson': 'faanjyut_cell_states',
  'comments.ndjson': 'faanjyut_comments',
  'links.ndjson': 'faanjyut_links'
}

const FILE_TO_COUNT_KEY: Record<string, string> = {
  'lexemes.ndjson': 'lexemes',
  'entries.ndjson': 'entries',
  'external_etymons.ndjson': 'externalEtymons',
  'columns.ndjson': 'columns',
  'cell_states.ndjson': 'cellStates',
  'comments.ndjson': 'comments',
  'links.ndjson': 'links'
}

// ---------------------------------------------------------------------------
// 文件工具
// ---------------------------------------------------------------------------

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve())
    stream.on('error', reject)
  })
  return hash.digest('hex')
}

/** 逐行處理 NDJSON（跳過空行），回調可為 async；返回非空行數 */
export async function processNdjsonLines(
  filePath: string,
  onLine: (line: string, lineNumber: number) => Promise<void> | void
): Promise<number> {
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity })
  let count = 0
  for await (const rawLine of rl) {
    if (rawLine.trim() === '') continue
    count += 1
    await onLine(rawLine, count)
  }
  return count
}

function isSignificant(value: unknown): boolean {
  if (value === undefined || value === null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  if (typeof value === 'string') return value.length > 0
  return true
}

function objectPaths(obj: unknown, prefix = ''): Set<string> {
  const paths = new Set<string>()
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      if (path) paths.add(path)
      for (const el of value) walk(el, path)
      return
    }
    if (value !== null && typeof value === 'object') {
      if (path) paths.add(path)
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, path ? `${path}.${key}` : key)
      }
      return
    }
    if (path) paths.add(path)
  }
  walk(obj, prefix)
  return paths
}

/**
 * Mongoose 對空對象/空數組子文檔（如 `theme: {}`、`status.flags: {}`）在 toObject
 * 時會整體省略——這不是字段丟失。因此只統計「非空」輸入路徑：
 * 空對象/空數組/空字符串/null 不參與丟失判定，避免誤報。
 */
function significantInputPaths(obj: Record<string, unknown>): Set<string> {
  const significant = new Set<string>()
  const walk = (value: unknown, path: string) => {
    if (!isSignificant(value)) return
    if (Array.isArray(value)) {
      if (path) significant.add(path)
      for (const el of value) walk(el, path)
      return
    }
    if (value !== null && typeof value === 'object') {
      if (path) significant.add(path)
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, path ? `${path}.${key}` : key)
      }
      return
    }
    if (path) significant.add(path)
  }
  walk(obj, '')
  return significant
}

function missingPaths(input: Record<string, unknown>, output: Record<string, unknown>): string[] {
  const inPaths = significantInputPaths(input)
  const outPaths = objectPaths(output)
  return [...inPaths].filter((p) => !outPaths.has(p)).sort()
}

// ---------------------------------------------------------------------------
// manifest 校驗
// ---------------------------------------------------------------------------

const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  baselineLevel: z.enum(['diagnostic', 'regression', 'cutover', 'fixture']),
  sourceBook: z.literal('faanjyut'),
  sourceWorkbook: z.string().min(1),
  sourceSheet: z.string().min(1),
  sourceFileSha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourceExportedAt: z.string().nullable(),
  inputFiles: z.object({
    workbook: z.object({ name: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).nullable(),
    filterRules: z.object({ name: z.string(), sha256: z.string().regex(/^[0-9a-f]{64}$/) }).nullable(),
    commentsExport: z.unknown().nullable()
  }),
  generatedAt: z.string(),
  generator: z.object({
    name: z.string().min(1),
    gitCommit: z.string().nullable(),
    gitDirty: z.boolean(),
    gitDiffSha256: z.string().optional()
  }),
  counts: z.record(z.string(), z.number().int().min(0)),
  files: z.record(z.string(), z.object({ records: z.number().int().min(0), sha256: z.string().regex(/^[0-9a-f]{64}$/) }))
})

export async function readManifest(inputDir: string): Promise<{ manifest: Manifest | null; manifestSha256: string; error: Finding | null }> {
  const path = join(inputDir, 'import_manifest.json')
  if (!existsSync(path)) {
    return {
      manifest: null,
      manifestSha256: '',
      error: {
        code: FINDING_CODES.missingRequiredArtifact,
        severity: 'blocker',
        file: 'import_manifest.json',
        message: '缺少 required 文件 import_manifest.json'
      }
    }
  }
  const manifestSha256 = await sha256File(path)
  const raw = await readFile(path, 'utf8')
  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(raw)
  } catch {
    return {
      manifest: null,
      manifestSha256,
      error: {
        code: FINDING_CODES.invalidReportFile,
        severity: 'blocker',
        file: 'import_manifest.json',
        message: 'manifest JSON 解析失敗'
      }
    }
  }
  const parsed = ManifestSchema.safeParse(parsedJson)
  if (!parsed.success) {
    return {
      manifest: null,
      manifestSha256,
      error: {
        code: FINDING_CODES.invalidReportFile,
        severity: 'blocker',
        file: 'import_manifest.json',
        message: `manifest 不符合契約結構：${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).slice(0, 5).join('；')}`
      }
    }
  }
  return { manifest: parsed.data, manifestSha256, error: null }
}

/** 環境門檻（契約 §3）：production 只接受 cutover + sourceExportedAt 非空 + gitDirty=false；staging 不接受 diagnostic */
export function validateBaselineGates(manifest: Manifest, environment: Environment): Finding[] {
  const findings: Finding[] = []
  if (environment === 'production') {
    if (manifest.baselineLevel !== 'cutover') {
      findings.push({
        code: FINDING_CODES.invalidBaselineLevel,
        severity: 'blocker',
        message: `production dry-run 只接受 baselineLevel='cutover'，實際為 '${manifest.baselineLevel}'`
      })
    }
    if (!manifest.sourceExportedAt) {
      findings.push({
        code: FINDING_CODES.invalidBaselineLevel,
        severity: 'blocker',
        message: 'production dry-run 要求 sourceExportedAt 非空'
      })
    }
    if (manifest.generator.gitDirty === true) {
      findings.push({
        code: FINDING_CODES.dirtyGeneratorInProduction,
        severity: 'blocker',
        message: 'production dry-run 要求 generator.gitDirty=false（ETL worktree 不潔）',
        details: { gitDiffSha256: manifest.generator.gitDiffSha256 }
      })
    }
  } else if (environment === 'staging') {
    if (manifest.baselineLevel === 'diagnostic') {
      findings.push({
        code: FINDING_CODES.invalidBaselineLevel,
        severity: 'blocker',
        message: "staging 不接受 baselineLevel='diagnostic'（舊診斷表不作為執行基線）"
      })
    }
    if (!manifest.sourceExportedAt) {
      findings.push({
        code: FINDING_CODES.invalidBaselineLevel,
        severity: 'warning',
        message: 'staging 全量退出驗收要求 sourceExportedAt 非空；當前為 null'
      })
    }
  }
  return findings
}

// ---------------------------------------------------------------------------
// 8 份 ETL 報告校驗（契約 §3.1）
// ---------------------------------------------------------------------------

function readReportSummary(inputDir: string, fileName: string): Record<string, unknown> | null {
  const path = join(inputDir, 'reports', fileName)
  if (!existsSync(path)) return null
  try {
    const report = JSON.parse(readFileSync(path, 'utf8')) as { summary?: Record<string, unknown> }
    return report.summary ?? null
  } catch {
    return null
  }
}

export function validateEtlReports(
  inputDir: string,
  manifest: Manifest,
  duplicatesDetected: number
): { blockers: Finding[]; warnings: Finding[] } {
  const blockers: Finding[] = []
  const warnings: Finding[] = []
  const reportsDir = join(inputDir, 'reports')

  if (!existsSync(reportsDir)) {
    blockers.push({
      code: FINDING_CODES.missingRequiredArtifact,
      severity: 'blocker',
      file: 'reports/',
      message: '缺少 required 目錄 reports/'
    })
    return { blockers, warnings }
  }

  for (const fileName of ETL_REPORT_FILES) {
    const path = join(reportsDir, fileName)
    if (!existsSync(path)) {
      blockers.push({ code: FINDING_CODES.missingRequiredArtifact, severity: 'blocker', file: `reports/${fileName}`, message: `缺少 required 報告 ${fileName}` })
      continue
    }
    let report: unknown
    try {
      report = JSON.parse(readFileSync(path, 'utf8'))
    } catch {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: `報告 JSON 解析失敗：${fileName}` })
      continue
    }
    const envelope = report as Record<string, unknown>
    const reportType = REPORT_TYPE_BY_FILE[fileName]

    if (envelope.schemaVersion !== 1) {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: `報告 schemaVersion 應為 1，實際 ${String(envelope.schemaVersion)}` })
    }
    if (envelope.reportType !== reportType) {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: `報告 reportType 應為 '${reportType}'，實際 '${String(envelope.reportType)}'` })
    }
    if (envelope.sourceFileSha256 !== manifest.sourceFileSha256) {
      blockers.push({
        code: FINDING_CODES.manifestMismatch,
        severity: 'blocker',
        file: `reports/${fileName}`,
        message: '報告 sourceFileSha256 與 manifest 不一致'
      })
    }
    if (typeof envelope.generatedAt !== 'string' || !envelope.generatedAt) {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: '報告缺少 generatedAt' })
    }

    const summary = envelope.summary as Record<string, unknown> | undefined
    if (!summary || typeof summary !== 'object') {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: '報告缺少 summary' })
      continue
    }
    for (const field of REPORT_SUMMARY_REQUIRED[reportType]) {
      if (!(field in summary)) {
        blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: `summary 缺少必需字段 ${field}` })
      }
    }

    const records = envelope.records as Array<Record<string, unknown>> | undefined
    if (!Array.isArray(records)) {
      blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: '報告缺少 records 數組' })
      continue
    }
    for (const [i, record] of records.entries()) {
      for (const field of REPORT_RECORD_REQUIRED[reportType]) {
        if (!(field in record)) {
          blockers.push({ code: FINDING_CODES.invalidReportFile, severity: 'blocker', file: `reports/${fileName}`, message: `records[${i}] 缺少必需字段 ${field}` })
          break
        }
      }
    }
  }

  // ---- summary 與 manifest/NDJSON 實數對賬 ----
  const numeric = (v: unknown): number | null => (typeof v === 'number' ? v : null)

  const checkCount = (label: string, actual: unknown, expected: number, file: string) => {
    const a = numeric(actual)
    if (a === null || a !== expected) {
      blockers.push({ code: FINDING_CODES.manifestMismatch, severity: 'blocker', file, message: `${label} 不一致：報告=${String(actual)} manifest=${expected}` })
    }
  }

  const importReport = readReportSummary(inputDir, 'import_report.json')
  if (importReport) {
    checkCount('sourceRows', importReport.sourceRows, manifest.counts.sourceRows, 'reports/import_report.json')
    checkCount('validRows', importReport.validRows, manifest.counts.validRows, 'reports/import_report.json')
    checkCount('skippedRows', importReport.skippedRows, manifest.counts.skippedRows, 'reports/import_report.json')
    const outputCounts = importReport.outputCounts as Record<string, unknown> | undefined
    if (outputCounts && typeof outputCounts === 'object') {
      for (const key of ['lexemes', 'entries', 'externalEtymons', 'columns', 'cellStates', 'comments', 'links']) {
        if (key in outputCounts && (outputCounts[key] as number) !== manifest.counts[key]) {
          blockers.push({
            code: FINDING_CODES.manifestMismatch,
            severity: 'blocker',
            file: 'reports/import_report.json',
            message: `outputCounts.${key} 不一致：報告=${String(outputCounts[key])} manifest=${manifest.counts[key]}`
          })
        }
      }
    }
  }

  const duplicateKeys = readReportSummary(inputDir, 'duplicate_keys_report.json')
  if (duplicateKeys) {
    const groups = numeric(duplicateKeys.duplicateGroups)
    if (groups !== null && groups !== duplicatesDetected) {
      blockers.push({
        code: FINDING_CODES.manifestMismatch,
        severity: 'blocker',
        file: 'reports/duplicate_keys_report.json',
        message: `duplicateGroups=${groups} 與 NDJSON 實測重複 sourceKey 數 ${duplicatesDetected} 不一致`
      })
    }
  }

  const skipped = readReportSummary(inputDir, 'skipped_records_report.json')
  if (skipped) {
    checkCount('skipped_records.total', skipped.total, manifest.counts.skippedRows, 'reports/skipped_records_report.json')
  }

  const unresolved = readReportSummary(inputDir, 'unresolved_links_report.json')
  if (unresolved) {
    checkCount('unresolved_links.total', unresolved.total, manifest.counts.links, 'reports/unresolved_links_report.json')
    const t = numeric(unresolved.total)
    const r = numeric(unresolved.resolved)
    const u = numeric(unresolved.unresolved)
    if (t !== null && r !== null && u !== null && r + u !== t) {
      warnings.push({
        code: FINDING_CODES.manifestMismatch,
        severity: 'warning',
        file: 'reports/unresolved_links_report.json',
        message: `resolved+unresolved(${r}+${u}) !== total(${t})`
      })
    }
  }

  const comments = readReportSummary(inputDir, 'comments_report.json')
  if (comments) {
    checkCount('comments.merged', comments.merged, manifest.counts.comments, 'reports/comments_report.json')
  }

  const dialectMapping = readReportSummary(inputDir, 'dialect_mapping_report.json')
  if (dialectMapping) {
    const d = numeric(dialectMapping.domesticColumns)
    const m = numeric(dialectMapping.mappedColumns)
    const um = numeric(dialectMapping.unmappedColumns)
    if (d !== null && m !== null && um !== null && d !== m + um) {
      warnings.push({
        code: FINDING_CODES.manifestMismatch,
        severity: 'warning',
        file: 'reports/dialect_mapping_report.json',
        message: `domesticColumns(${d}) !== mappedColumns+unmappedColumns(${m}+${um})`
      })
    }
  }

  const externalMapping = readReportSummary(inputDir, 'external_mapping_report.json')
  if (externalMapping) {
    const e = numeric(externalMapping.externalColumns)
    const m = numeric(externalMapping.mappedColumns)
    const um = numeric(externalMapping.unmappedColumns)
    if (e !== null && m !== null && um !== null && e !== m + um) {
      warnings.push({
        code: FINDING_CODES.manifestMismatch,
        severity: 'warning',
        file: 'reports/external_mapping_report.json',
        message: `externalColumns(${e}) !== mappedColumns+unmappedColumns(${m}+${um})`
      })
    }
  }

  return { blockers, warnings }
}

// ---------------------------------------------------------------------------
// Zod 錯誤分類
// ---------------------------------------------------------------------------

function classifyZodIssues(issues: z.ZodIssue[], file: string, line: number, objectType: string): Finding[] {
  return issues.map((issue) => {
    const pathStr = issue.path.join('.')
    const parts = issue.path.map(String)
    if (parts.some((p) => /importBatchId/i.test(p))) {
      return {
        code: FINDING_CODES.importBatchIdInInput,
        severity: 'blocker' as const,
        objectType,
        file,
        line,
        message: `輸入不得含 importBatchId（路徑 ${pathStr}）；由 Node 寫入時注入`
      }
    }
    if (issue.code === 'unrecognized_keys') {
      const keys = (issue as z.ZodIssue & { keys?: string[] }).keys ?? []
      if (keys.some((k) => /importBatchId/i.test(k))) {
        return {
          code: FINDING_CODES.importBatchIdInInput,
          severity: 'blocker' as const,
          objectType,
          file,
          line,
          message: `輸入不得含 importBatchId（路徑 ${pathStr}）；由 Node 寫入時注入`
        }
      }
      return {
        code: FINDING_CODES.contractUnknownField,
        severity: 'blocker' as const,
        objectType,
        file,
        line,
        message: `未知欄位 ${keys.join(', ')}（路徑 ${pathStr || '<top>'}）`,
        details: { unknownKeys: keys }
      }
    }
    if (parts.includes('dialectId') || parts.includes('dialect')) {
      return {
        code: FINDING_CODES.invalidDialectId,
        severity: 'blocker' as const,
        objectType,
        file,
        line,
        message: `非法 DialectId：${issue.message}`
      }
    }
    if (parts.includes('languageCode')) {
      return {
        code: FINDING_CODES.invalidLanguageCode,
        severity: 'blocker' as const,
        objectType,
        file,
        line,
        message: `非法 languageCode：${issue.message}`
      }
    }
    return {
      code: FINDING_CODES.contractInvalidField,
      severity: 'blocker' as const,
      objectType,
      file,
      line,
      message: `${pathStr || '<top>'}: ${issue.message}`
    }
  })
}

// ---------------------------------------------------------------------------
// Mongoose 前後字段丟失對比（契約 §8：Mongoose validate 前後字段丟失）
// ---------------------------------------------------------------------------

interface MongooseDoc {
  toObject?: () => Record<string, unknown>
  validate?: () => Promise<unknown>
}

async function mongooseCheckChunk(
  collection: string,
  records: Array<{ raw: Record<string, unknown>; line: number }>,
  blockers: Finding[],
  warnings: Finding[]
): Promise<void> {
  const model = modelForCollection(collection)
  if (!model) return
  const file = FAANJYUT_IMPORT_COLLECTIONS.find((c) => c.collection === collection)?.ndjsonFile
  const docs = records.map(({ raw }) => new model(raw) as unknown as MongooseDoc)
  const results = await Promise.all(
    docs.map((doc) => (doc.validate ? doc.validate().then(() => null).catch((e: Error) => e) : null))
  )
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]
    const result = results[i]
    if (result) {
      blockers.push({
        code: FINDING_CODES.mongooseValidationError,
        severity: 'blocker',
        objectType: collection,
        file,
        line: record.line,
        message: `Mongoose validate 失敗：${String(result instanceof Error ? result.message : result).slice(0, 300)}`
      })
    }
    const dropped = missingPaths(record.raw, docToObject(docs[i]))
    if (dropped.length > 0) {
      blockers.push({
        code: FINDING_CODES.mongooseDroppedField,
        severity: 'blocker',
        objectType: collection,
        file,
        line: record.line,
        message: `Mongoose 丟失字段：${dropped.join(', ')}`,
        details: { droppedPaths: dropped }
      })
    }
  }
}

function docToObject(doc: MongooseDoc): Record<string, unknown> {
  return (doc.toObject ? doc.toObject() : {}) as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// 逐類記錄核心（引用完整性/衝突檢查所需的最小投影）
// ---------------------------------------------------------------------------

interface LexemeCore { line: number; id: string; sourceKey: string; sourceWorkbook: string; sourceRow: number; matrixOrder: number }
interface EntryCore { line: number; id: string; lexemeId: string; dialectName: string; sourceKey: string; sourceColumnIndex: number; sourceCell: string; isPlaceholder: boolean; parseWarnings?: string[] }
interface ExternalCore { line: number; id: string; lexemeId: string; languageCode: string; sourceKey: string; sourceColumnIndex: number; segmentIndex: number }
interface ColumnCore { line: number; id: string; sourceSheet: string; sourceColumnIndex: number; sourceColumn: string | null; sourceRole: string; dialectId?: string; languageCode?: string; status: string }
interface CellStateCore { line: number; id: string; lexemeId: string; columnId: string; projectionEntryId?: string; projectionExternalEtymonIds?: string[] }
interface CommentCore { line: number; id: string; targetType: string; targetId: string; replyTo?: string; content: string; source: string; legacyMeta?: Record<string, unknown>; threadedPlaceholder?: boolean }
interface LinkCore { line: number; id: string; fromLexemeId: string; toLexemeId?: string; targetKey?: string; rawSource: string; status: string }

interface IntegrityContext {
  manifest: Manifest
  environment: Environment
  blockers: Finding[]
  warnings: Finding[]
  duplicatesDetected: number
  lexemeById: Map<string, LexemeCore>
  sourceKeySeen: Map<string, { line: number; id: string }>
  entryById: Map<string, EntryCore>
  entryCellSeen: Map<string, { line: number; id: string }>
  cellStateCellSeen: Map<string, { line: number; id: string }>
  externalById: Map<string, ExternalCore>
  columnById: Map<string, ColumnCore>
  columnByIndex: Map<string, ColumnCore>
  cellById: Map<string, CellStateCore>
  commentById: Map<string, CommentCore>
  linkById: Map<string, LinkCore>
  activeDomesticByDialect: Map<string, ColumnCore[]>
  activeExternalByLanguage: Map<string, ColumnCore[]>
  headerSeen: Map<string, { line: number; id: string }>
  positionSeen: Map<string, { line: number; id: string }>
  linkOrdinalBySource: Map<string, number>
}

function collectRecordCore(ctx: IntegrityContext, record: Record<string, unknown>, fileName: string, lineNumber: number): void {
  const b = ctx.blockers
  const w = ctx.warnings
  const id = record.id as string

  const addDuplicate = (code: string, first: { line: number; id: string }, objectType: string) => {
    b.push({
      code,
      severity: 'blocker',
      objectType,
      file: fileName,
      line: lineNumber,
      objectId: id,
      message: `重複 ${code === FINDING_CODES.duplicateSourceKey ? 'sourceKey' : code === FINDING_CODES.duplicateCell ? '鍵' : 'ID'}：首次出現於第 ${first.line} 行`,
      details: { firstLine: first.line }
    })
  }

  switch (fileName) {
    case 'lexemes.ndjson': {
      const meta = record.meta as Record<string, unknown>
      const sourceKey = meta.sourceKey as string
      const expected = lexemeId(sourceKey)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'lexemes', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      const seen = ctx.sourceKeySeen.get(sourceKey)
      if (seen) {
        ctx.duplicatesDetected += 1
        addDuplicate(FINDING_CODES.duplicateSourceKey, seen, 'lexemes')
      } else {
        ctx.sourceKeySeen.set(sourceKey, { line: lineNumber, id })
      }
      if (ctx.lexemeById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.lexemeById.get(id)!, 'lexemes')
      } else {
        ctx.lexemeById.set(id, {
          line: lineNumber,
          id,
          sourceKey,
          sourceWorkbook: meta.sourceWorkbook as string,
          sourceRow: meta.sourceRow as number,
          matrixOrder: meta.matrixOrder as number
        })
      }
      if (ctx.environment === 'production' && sourceKey.startsWith('TEST-')) {
        b.push({ code: FINDING_CODES.testDataInProduction, severity: 'blocker', objectType: 'lexemes', file: fileName, line: lineNumber, objectId: id, sourceKey, message: `production 禁止 TEST- 前綴 sourceKey` })
      }
      if ((meta.matrixOrder as number) !== (meta.sourceRow as number)) {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'lexemes', file: fileName, line: lineNumber, objectId: id, sourceKey, message: `matrixOrder(${String(meta.matrixOrder)}) !== sourceRow(${String(meta.sourceRow)})` })
      }
      if (meta.sourceWorkbook !== ctx.manifest.sourceWorkbook) {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'lexemes', file: fileName, line: lineNumber, objectId: id, sourceKey, message: `Lexeme sourceWorkbook '${String(meta.sourceWorkbook)}' 與 manifest '${ctx.manifest.sourceWorkbook}' 不一致` })
      }
      return
    }
    case 'entries.ndjson': {
      const meta = record.meta as Record<string, unknown>
      const dialect = record.dialect as Record<string, unknown>
      const sourceKey = meta.sourceKey as string
      const dialectName = dialect.name as string
      const expected = entryId(sourceKey, dialectName)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'entries', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      const cellKey = `${record.lexemeId as string}|${dialectName}`
      const seenCell = ctx.entryCellSeen.get(cellKey)
      if (seenCell) {
        addDuplicate(FINDING_CODES.duplicateCell, seenCell, 'entries')
      } else {
        ctx.entryCellSeen.set(cellKey, { line: lineNumber, id })
      }
      if (ctx.entryById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.entryById.get(id)!, 'entries')
      } else {
        ctx.entryById.set(id, {
          line: lineNumber,
          id,
          lexemeId: record.lexemeId as string,
          dialectName,
          sourceKey,
          sourceColumnIndex: meta.sourceColumnIndex as number,
          sourceCell: meta.sourceCell as string,
          isPlaceholder: (record.headword as Record<string, unknown>).isPlaceholder as boolean,
          parseWarnings: (meta.parseWarnings as string[] | undefined) ?? []
        })
      }
      if (ctx.environment === 'production' && sourceKey.startsWith('TEST-')) {
        b.push({ code: FINDING_CODES.testDataInProduction, severity: 'blocker', objectType: 'entries', file: fileName, line: lineNumber, objectId: id, sourceKey, message: `production 禁止 TEST- 前綴 sourceKey` })
      }
      return
    }
    case 'external_etymons.ndjson': {
      const meta = record.meta as Record<string, unknown>
      // 契約 §4：ExternalEtymon ID 用其所屬 Lexeme 的 sourceKey（ETL 輸出 external meta 不含 sourceKey）
      const lexemeSourceKey = ctx.lexemeById.get(record.lexemeId as string)?.sourceKey ?? ''
      const expected = externalEtymonId(lexemeSourceKey, record.languageCode as string, meta.segmentIndex as number)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'external_etymons', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      if (ctx.externalById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.externalById.get(id)!, 'external_etymons')
      } else {
        ctx.externalById.set(id, {
          line: lineNumber,
          id,
          lexemeId: record.lexemeId as string,
          languageCode: record.languageCode as string,
          sourceKey: lexemeSourceKey,
          sourceColumnIndex: meta.sourceColumnIndex as number,
          segmentIndex: meta.segmentIndex as number
        })
      }
      return
    }
    case 'columns.ndjson': {
      const sourceSheet = record.sourceSheet as string
      const sourceColumnIndex = record.sourceColumnIndex as number
      const sourceColumn = record.sourceColumn as string | null
      const expected = columnId(sourceSheet, sourceColumnIndex, sourceColumn)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'faanjyut_columns', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      const positionKey = `${sourceSheet}|${sourceColumnIndex}`
      const seenPos = ctx.positionSeen.get(positionKey)
      if (seenPos) {
        addDuplicate(FINDING_CODES.duplicateCell, seenPos, 'faanjyut_columns')
      } else {
        ctx.positionSeen.set(positionKey, { line: lineNumber, id })
      }
      if (ctx.columnById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.columnById.get(id)!, 'faanjyut_columns')
      } else {
        ctx.columnById.set(id, {
          line: lineNumber,
          id,
          sourceSheet,
          sourceColumnIndex,
          sourceColumn,
          sourceRole: record.sourceRole as string,
          dialectId: record.dialectId as string | undefined,
          languageCode: record.languageCode as string | undefined,
          status: record.status as string
        })
        ctx.columnByIndex.set(positionKey, ctx.columnById.get(id)!)
      }
      if (sourceColumn === null) {
        w.push({ code: FINDING_CODES.emptyHeaderColumn, severity: 'warning', objectType: 'faanjyut_columns', file: fileName, line: lineNumber, objectId: id, message: `第 ${sourceColumnIndex} 列表頭為空（sourceColumn=null）` })
      } else {
        const headerKey = `${sourceSheet}|${sourceColumn}`
        if (ctx.headerSeen.has(headerKey)) {
          w.push({ code: FINDING_CODES.duplicateHeaderColumn, severity: 'warning', objectType: 'faanjyut_columns', file: fileName, line: lineNumber, objectId: id, message: `同名表頭 '${sourceColumn}' 重複（第 ${sourceColumnIndex} 列）` })
        } else {
          ctx.headerSeen.set(headerKey, { line: lineNumber, id })
        }
      }
      if (record.status === 'active') {
        if (record.sourceRole === 'domestic' && record.dialectId) {
          ctx.activeDomesticByDialect.set(record.dialectId as string, [...(ctx.activeDomesticByDialect.get(record.dialectId as string) ?? []), ctx.columnById.get(id)!])
        }
        if (record.sourceRole === 'external' && record.languageCode) {
          ctx.activeExternalByLanguage.set(record.languageCode as string, [...(ctx.activeExternalByLanguage.get(record.languageCode as string) ?? []), ctx.columnById.get(id)!])
        }
      }
      return
    }
    case 'cell_states.ndjson': {
      const lexemeIdV = record.lexemeId as string
      const columnIdV = record.columnId as string
      const expected = cellStateId(lexemeIdV, columnIdV)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'faanjyut_cell_states', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      const cellKey = `${lexemeIdV}|${columnIdV}`
      const seenCell = ctx.cellStateCellSeen.get(cellKey)
      if (seenCell) {
        addDuplicate(FINDING_CODES.duplicateCell, seenCell, 'faanjyut_cell_states')
      } else {
        ctx.cellStateCellSeen.set(cellKey, { line: lineNumber, id })
      }
      if (ctx.cellById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.cellById.get(id)!, 'faanjyut_cell_states')
      } else {
        const projection = record.projection as Record<string, unknown> | undefined
        ctx.cellById.set(id, {
          line: lineNumber,
          id,
          lexemeId: lexemeIdV,
          columnId: columnIdV,
          projectionEntryId: projection?.entryId as string | undefined,
          projectionExternalEtymonIds: projection?.externalEtymonIds as string[] | undefined
        })
      }
      return
    }
    case 'comments.ndjson': {
      const legacyMeta = record.legacyMeta as Record<string, unknown> | undefined
      const expected = commentId(
        ctx.manifest.sourceSheet,
        legacyMeta?.sourceCell as string,
        {
          originalCommentId: legacyMeta?.originalCommentId as string | undefined,
          threadId: legacyMeta?.threadId as string | undefined,
          ordinal: (legacyMeta?.ordinal as number | undefined) ?? 1
        }
      )
      if (!legacyMeta || !legacyMeta.sourceCell) {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'faanjyut_comments', file: fileName, line: lineNumber, objectId: id, message: '缺少 legacyMeta.sourceCell，無法重算穩定 ID' })
      } else if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'faanjyut_comments', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}` })
      }
      if (ctx.commentById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.commentById.get(id)!, 'faanjyut_comments')
      } else {
        ctx.commentById.set(id, {
          line: lineNumber,
          id,
          targetType: record.targetType as string,
          targetId: record.targetId as string,
          replyTo: record.replyTo as string | undefined,
          content: record.content as string,
          source: record.source as string,
          legacyMeta,
          threadedPlaceholder: legacyMeta?.threadedPlaceholder as boolean | undefined
        })
      }
      return
    }
    case 'links.ndjson': {
      const fromLexemeId = record.fromLexemeId as string
      const rawSource = record.rawSource as string
      const pairKey = `${fromLexemeId}|${rawSource}`
      const ordinal = (ctx.linkOrdinalBySource.get(pairKey) ?? 0) + 1
      ctx.linkOrdinalBySource.set(pairKey, ordinal)
      const expected = linkId(fromLexemeId, rawSource, ordinal)
      if (id !== expected) {
        b.push({ code: FINDING_CODES.stableIdMismatch, severity: 'blocker', objectType: 'faanjyut_links', file: fileName, line: lineNumber, objectId: id, message: `穩定 ID 與契約 §4 重算不符：期望 ${expected}（ordinal=${ordinal}）` })
      }
      if (ctx.linkById.has(id)) {
        addDuplicate(FINDING_CODES.duplicateId, ctx.linkById.get(id)!, 'faanjyut_links')
      } else {
        ctx.linkById.set(id, {
          line: lineNumber,
          id,
          fromLexemeId,
          toLexemeId: record.toLexemeId as string | undefined,
          targetKey: record.targetKey as string | undefined,
          rawSource,
          status: record.status as string
        })
      }
      return
    }
  }
}

// ---------------------------------------------------------------------------
// 跨文件引用完整與不變量檢查
// ---------------------------------------------------------------------------

function runIntegrityChecks(ctx: IntegrityContext): void {
  const { blockers: b, warnings: w } = ctx
  const manifest = ctx.manifest

  // ---- entries → lexemes / columns ----
  for (const entry of ctx.entryById.values()) {
    const lexeme = ctx.lexemeById.get(entry.lexemeId)
    if (!lexeme) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'entries', file: 'entries.ndjson', line: entry.line, objectId: entry.id, sourceKey: entry.sourceKey, message: `Entry 引用不存在的 lexemeId '${entry.lexemeId}'` })
      continue
    }
    if (lexeme.sourceKey !== entry.sourceKey) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'entries', file: 'entries.ndjson', line: entry.line, objectId: entry.id, sourceKey: entry.sourceKey, message: `Entry sourceKey '${entry.sourceKey}' 與 Lexeme '${lexeme.sourceKey}' 不一致` })
    }
    const column = ctx.columnByIndex.get(`${manifest.sourceSheet}|${entry.sourceColumnIndex}`)
    if (!column) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'entries', file: 'entries.ndjson', line: entry.line, objectId: entry.id, sourceKey: entry.sourceKey, message: `Entry 引用不存在的源列 index ${entry.sourceColumnIndex}` })
    } else if (column.dialectId !== entry.dialectName) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'entries', file: 'entries.ndjson', line: entry.line, objectId: entry.id, sourceKey: entry.sourceKey, message: `Entry dialect '${entry.dialectName}' 與列 ${column.sourceColumnIndex}('${column.sourceColumn}') 的 dialectId '${String(column.dialectId)}' 不一致` })
    }
    if (entry.isPlaceholder && !(entry.parseWarnings ?? []).some((p) => /placeholder|missing_headword/i.test(p))) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'entries', file: 'entries.ndjson', line: entry.line, objectId: entry.id, sourceKey: entry.sourceKey, message: '占位字頭（isPlaceholder=true）缺少 placeholder/missing_headword parseWarnings' })
    }
  }

  // ---- external_etymons → lexemes / columns ----
  for (const ext of ctx.externalById.values()) {
    if (!ctx.lexemeById.has(ext.lexemeId)) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'external_etymons', file: 'external_etymons.ndjson', line: ext.line, objectId: ext.id, sourceKey: ext.sourceKey, message: `ExternalEtymon 引用不存在的 lexemeId '${ext.lexemeId}'` })
    }
    const column = ctx.columnByIndex.get(`${manifest.sourceSheet}|${ext.sourceColumnIndex}`)
    if (!column) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'external_etymons', file: 'external_etymons.ndjson', line: ext.line, objectId: ext.id, sourceKey: ext.sourceKey, message: `ExternalEtymon 引用不存在的源列 index ${ext.sourceColumnIndex}` })
    } else if (column.languageCode !== ext.languageCode) {
      w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'external_etymons', file: 'external_etymons.ndjson', line: ext.line, objectId: ext.id, sourceKey: ext.sourceKey, message: `ExternalEtymon languageCode '${ext.languageCode}' 與列 ${column.sourceColumnIndex}('${column.sourceColumn}') 的 languageCode '${String(column.languageCode)}' 不一致` })
    }
  }

  // ---- cell_states → lexemes / columns / projection ----
  for (const cell of ctx.cellById.values()) {
    if (!ctx.lexemeById.has(cell.lexemeId)) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `CellState 引用不存在的 lexemeId '${cell.lexemeId}'` })
    }
    const column = ctx.columnById.get(cell.columnId)
    if (!column) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `CellState 引用不存在的 columnId '${cell.columnId}'` })
    }
    if (cell.projectionEntryId) {
      const entry = ctx.entryById.get(cell.projectionEntryId)
      if (!entry) {
        b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `projection.entryId '${cell.projectionEntryId}' 不存在` })
      } else if (entry.lexemeId !== cell.lexemeId) {
        b.push({ code: FINDING_CODES.projectionMismatch, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `projection.entryId '${entry.id}' 的 lexemeId '${entry.lexemeId}' 與 CellState 的 '${cell.lexemeId}' 不一致` })
      } else if (column && entry.sourceColumnIndex !== column.sourceColumnIndex) {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `projection.entryId 的列 index ${entry.sourceColumnIndex} 與 cell.columnId('${column.sourceColumnIndex}') 不一致` })
      }
    }
    for (const etymonId of cell.projectionExternalEtymonIds ?? []) {
      const ext = ctx.externalById.get(etymonId)
      if (!ext) {
        b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `projection.externalEtymonIds 含不存在的 id '${etymonId}'` })
      } else if (ext.lexemeId !== cell.lexemeId) {
        b.push({ code: FINDING_CODES.projectionMismatch, severity: 'blocker', objectType: 'faanjyut_cell_states', file: 'cell_states.ndjson', line: cell.line, objectId: cell.id, message: `projection.externalEtymonIds 含 id '${ext.id}'，其 lexemeId '${ext.lexemeId}' 與 CellState 的 '${cell.lexemeId}' 不一致` })
      }
    }
  }

  // ---- comments → targets / replyTo / 脫敏 ----
  const resolveTarget = (targetType: string, targetId: string, line: number): boolean => {
    switch (targetType) {
      case 'column': return ctx.columnById.has(targetId)
      case 'lexeme': return ctx.lexemeById.has(targetId)
      case 'cell': return ctx.cellById.has(targetId)
      case 'externalEtymon': return ctx.externalById.has(targetId)
      case 'sense':
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'faanjyut_comments', file: 'comments.ndjson', line, message: `sense 目標無導入 collection 可校驗（targetId='${targetId}'）` })
        return true
      default:
        return false
    }
  }
  for (const comment of ctx.commentById.values()) {
    if (!resolveTarget(comment.targetType, comment.targetId, comment.line)) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_comments', file: 'comments.ndjson', line: comment.line, objectId: comment.id, message: `Comment 目標 ${comment.targetType}='${comment.targetId}' 不存在` })
    }
    if (comment.replyTo && !ctx.commentById.has(comment.replyTo)) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_comments', file: 'comments.ndjson', line: comment.line, objectId: comment.id, message: `replyTo '${comment.replyTo}' 不存在` })
    }
    if (comment.source === 'imported_excel_comment' && comment.legacyMeta?.sanitized !== true) {
      b.push({ code: FINDING_CODES.unsanitizedComment, severity: 'blocker', objectType: 'faanjyut_comments', file: 'comments.ndjson', line: comment.line, objectId: comment.id, message: 'imported_excel_comment 未標記 sanitized=true' })
    }
    if (/\[Threaded comment\]/.test(comment.content)) {
      b.push({ code: FINDING_CODES.unsanitizedComment, severity: 'blocker', objectType: 'faanjyut_comments', file: 'comments.ndjson', line: comment.line, objectId: comment.id, message: 'content 仍含 [Threaded comment] 樣板文本，未脫敏' })
    }
    if (comment.threadedPlaceholder === true && !comment.content.trim()) {
      b.push({ code: FINDING_CODES.missingCommentBody, severity: 'blocker', objectType: 'faanjyut_comments', file: 'comments.ndjson', line: comment.line, objectId: comment.id, message: 'threadedPlaceholder=true 但無真實正文' })
    }
  }

  // ---- links → lexemes / target 一致 ----
  for (const link of ctx.linkById.values()) {
    if (!ctx.lexemeById.has(link.fromLexemeId)) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_links', file: 'links.ndjson', line: link.line, objectId: link.id, message: `Link 引用不存在的 fromLexemeId '${link.fromLexemeId}'` })
    }
    if (link.status === 'active' && !link.toLexemeId) {
      b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_links', file: 'links.ndjson', line: link.line, objectId: link.id, message: `status='active' 但缺少 toLexemeId` })
    }
    if (link.toLexemeId) {
      const target = ctx.lexemeById.get(link.toLexemeId)
      if (!target) {
        b.push({ code: FINDING_CODES.missingReference, severity: 'blocker', objectType: 'faanjyut_links', file: 'links.ndjson', line: link.line, objectId: link.id, message: `toLexemeId '${link.toLexemeId}' 不存在` })
      } else if (link.targetKey && link.targetKey !== target.sourceKey) {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'faanjyut_links', file: 'links.ndjson', line: link.line, objectId: link.id, message: `targetKey '${link.targetKey}' 與目標 Lexeme sourceKey '${target.sourceKey}' 不一致` })
      }
      if (link.status !== 'active') {
        w.push({ code: FINDING_CODES.invariantViolation, severity: 'warning', objectType: 'faanjyut_links', file: 'links.ndjson', line: link.line, objectId: link.id, message: `status='${link.status}' 卻有 toLexemeId` })
      }
    }
  }

  // ---- columns active 映射唯一性（契約 §6.1：無法唯一映射才是 blocker） ----
  for (const [dialectId, cols] of ctx.activeDomesticByDialect) {
    if (cols.length > 1) {
      b.push({
        code: FINDING_CODES.columnMappingAmbiguous,
        severity: 'blocker',
        objectType: 'faanjyut_columns',
        file: 'columns.ndjson',
        message: `active 域內列 dialectId '${dialectId}' 映射到 ${cols.length} 條列（index ${cols.map((c) => c.sourceColumnIndex).join(', ')}），矩陣無法唯一解析`,
        details: { dialectId, sourceColumnIndexes: cols.map((c) => c.sourceColumnIndex) }
      })
    }
  }
  for (const [languageCode, cols] of ctx.activeExternalByLanguage) {
    if (cols.length > 1) {
      b.push({
        code: FINDING_CODES.columnMappingAmbiguous,
        severity: 'blocker',
        objectType: 'faanjyut_columns',
        file: 'columns.ndjson',
        message: `active 域外列 languageCode '${languageCode}' 映射到 ${cols.length} 條列（index ${cols.map((c) => c.sourceColumnIndex).join(', ')}）`,
        details: { languageCode, sourceColumnIndexes: cols.map((c) => c.sourceColumnIndex) }
      })
    }
  }
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

export async function validateExportPackage(inputDir: string, environment: Environment): Promise<ValidatedExport> {
  const blockers: Finding[] = []
  const warnings: Finding[] = []
  const counts: Record<string, FileCounts> = {}

  const { manifest, manifestSha256, error: manifestError } = await readManifest(inputDir)
  if (!manifest || manifestError) {
    if (manifestError) blockers.push(manifestError)
    return {
      manifest: null as unknown as Manifest,
      manifestSha256,
      counts,
      blockers,
      warnings,
      conflictFacts: emptyConflictFacts()
    }
  }
  for (const gate of validateBaselineGates(manifest, environment)) {
    if (gate.severity === 'blocker') blockers.push(gate)
    else warnings.push(gate)
  }

  for (const fileName of NDJSON_FILES) {
    if (!existsSync(join(inputDir, fileName))) {
      blockers.push({ code: FINDING_CODES.missingRequiredArtifact, severity: 'blocker', file: fileName, message: `缺少 required 文件 ${fileName}` })
    }
  }

  const ctx: IntegrityContext = {
    manifest,
    environment,
    blockers,
    warnings,
    duplicatesDetected: 0,
    lexemeById: new Map(),
    sourceKeySeen: new Map(),
    entryById: new Map(),
    entryCellSeen: new Map(),
    cellStateCellSeen: new Map(),
    externalById: new Map(),
    columnById: new Map(),
    columnByIndex: new Map(),
    cellById: new Map(),
    commentById: new Map(),
    linkById: new Map(),
    activeDomesticByDialect: new Map(),
    activeExternalByLanguage: new Map(),
    headerSeen: new Map(),
    positionSeen: new Map(),
    linkOrdinalBySource: new Map()
  }

  const CHUNK_SIZE = 500

  for (const fileName of NDJSON_FILES) {
    const filePath = join(inputDir, fileName)
    if (!existsSync(filePath)) {
      counts[fileName] = { input: 0, valid: 0, invalid: 0 }
      continue
    }
    const objectType = FILE_TO_COLLECTION[fileName]
    const schema = NDJSON_SCHEMAS[fileName]
    counts[fileName] = { input: 0, valid: 0, invalid: 0 }

    // 行數 / SHA-256 與 manifest 對賬（契約 §3：Node 必須復算）
    const [sha256, lineCount] = await Promise.all([sha256File(filePath), countNdjsonLines(filePath)])
    const fileMeta = manifest.files[fileName]
    if (!fileMeta) {
      blockers.push({ code: FINDING_CODES.manifestMismatch, severity: 'blocker', file: fileName, message: `manifest.files 缺少 ${fileName}` })
    } else {
      if (fileMeta.records !== lineCount) {
        blockers.push({ code: FINDING_CODES.manifestMismatch, severity: 'blocker', file: fileName, message: `行數不一致：manifest=${fileMeta.records} 實測=${lineCount}` })
      }
      if (fileMeta.sha256 !== sha256) {
        blockers.push({ code: FINDING_CODES.manifestMismatch, severity: 'blocker', file: fileName, message: 'SHA-256 與 manifest 不一致' })
      }
    }
    const countKey = FILE_TO_COUNT_KEY[fileName]
    if (manifest.counts[countKey] !== lineCount) {
      blockers.push({ code: FINDING_CODES.manifestMismatch, severity: 'blocker', file: fileName, message: `counts.${countKey}=${manifest.counts[countKey]} 與實測 ${lineCount} 不一致` })
    }
    counts[fileName].input = lineCount

    let chunk: Array<{ raw: Record<string, unknown>; line: number }> = []
    const flushChunk = async () => {
      if (chunk.length > 0) {
        await mongooseCheckChunk(objectType, chunk, blockers, warnings)
        chunk = []
      }
    }

    await processNdjsonLines(filePath, async (line, lineNumber) => {
      let raw: unknown
      try {
        raw = JSON.parse(line)
      } catch {
        counts[fileName].invalid += 1
        blockers.push({
          code: FINDING_CODES.contractInvalidField,
          severity: 'blocker',
          objectType,
          file: fileName,
          line: lineNumber,
          message: 'JSON 解析失敗'
        })
        return
      }
      const parsed = schema.safeParse(raw)
      if (!parsed.success) {
        counts[fileName].invalid += 1
        blockers.push(...classifyZodIssues(parsed.error.issues, fileName, lineNumber, objectType))
        return
      }
      counts[fileName].valid += 1
      const record = parsed.data as Record<string, unknown>
      collectRecordCore(ctx, record, fileName, lineNumber)
      chunk.push({ raw: record, line: lineNumber })
      if (chunk.length >= CHUNK_SIZE) {
        await flushChunk()
      }
    })
    await flushChunk()
  }

  // 跨文件引用完整與不變量
  runIntegrityChecks(ctx)

  // 8 份 ETL 報告（信封 + summary 對賬）
  const reportFindings = validateEtlReports(inputDir, manifest, ctx.duplicatesDetected)
  blockers.push(...reportFindings.blockers)
  warnings.push(...reportFindings.warnings)

  return {
    manifest,
    manifestSha256,
    counts,
    blockers,
    warnings,
    conflictFacts: buildConflictFacts(ctx)
  }
}

async function countNdjsonLines(filePath: string): Promise<number> {
  let count = 0
  await processNdjsonLines(filePath, () => { count += 1 })
  return count
}

function buildConflictFacts(ctx: IntegrityContext): ConflictFacts {
  return {
    lexemeSourceKeys: [...ctx.sourceKeySeen.keys()],
    lexemeIds: [...ctx.lexemeById.keys()],
    entryCells: [...ctx.entryById.values()].map((e) => ({ lexemeId: e.lexemeId, dialectName: e.dialectName })),
    columnPositions: [...ctx.positionSeen.keys()].map((key) => {
      const [sourceSheet, sourceColumnIndex] = key.split('|')
      return { sourceSheet, sourceColumnIndex: Number(sourceColumnIndex) }
    }),
    columnActiveMappings: [
      ...[...ctx.activeDomesticByDialect.entries()].flatMap(([key, cols]) => cols.map(() => ({ sourceRole: 'domestic' as const, key }))),
      ...[...ctx.activeExternalByLanguage.entries()].flatMap(([key, cols]) => cols.map(() => ({ sourceRole: 'external' as const, key })))
    ],
    allIds: {
      lexemes: [...ctx.lexemeById.keys()],
      entries: [...ctx.entryById.keys()],
      external_etymons: [...ctx.externalById.keys()],
      faanjyut_columns: [...ctx.columnById.keys()],
      faanjyut_cell_states: [...ctx.cellById.keys()],
      faanjyut_comments: [...ctx.commentById.keys()],
      faanjyut_links: [...ctx.linkById.keys()]
    }
  }
}

function emptyConflictFacts(): ConflictFacts {
  return { lexemeSourceKeys: [], lexemeIds: [], entryCells: [], columnPositions: [], columnActiveMappings: [], allIds: {} }
}
