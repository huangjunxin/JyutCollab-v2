/**
 * 測試 fixture：小樣本 ETL 導出包（契約 §3 結構），供 import-contract / dry-run 測試。
 * 用小樣本自制（2 詞條 / 2 格 / 3 列 …），不複製真實 8 萬行數據。
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import {
  lexemeId,
  entryId,
  externalEtymonId,
  columnId,
  cellStateId,
  commentId,
  linkId
} from '../stable-id'

export const SHEET = '主表-睇真尐註解'
export const WORKBOOK = '泛粵字表 21.202607292320.xlsx'
export const SOURCE_SHA = 'e7615fb6f56d7ab7af317ef7b39f01d8bdf9a01b3e19c0f7b4cf9c34aee087e0'

export const KEY_1 = '>416461483360343'
export const KEY_2 = '>541832300021785'

export const LEXEME_1 = lexemeId(KEY_1)
export const LEXEME_2 = lexemeId(KEY_2)
export const ENTRY_GZ = entryId(KEY_1, 'guangzhou')
export const ENTRY_TS = entryId(KEY_1, 'taishan')
export const ETYMON_OCH = externalEtymonId(KEY_1, 'och', 1)
export const COL_GZ = columnId(SHEET, 35, '穗')
export const COL_TS = columnId(SHEET, 17, '台')
export const COL_OCH = columnId(SHEET, 126, '上古漢')
export const CELL_GZ = cellStateId(LEXEME_1, COL_GZ)
export const CELL_OCH = cellStateId(LEXEME_1, COL_OCH)
export const COMMENT_1 = commentId(SHEET, `${SHEET}!AI1`, { ordinal: 1 })
export const LINK_1 = linkId(LEXEME_1, 'DR', 1)

const lexemes = [
  { id: LEXEME_1, meta: { sourceBook: 'faanjyut', sourceWorkbook: WORKBOOK, sourceSheet: SHEET, sourceRow: 7, matrixOrder: 7, sourceKey: KEY_1, editedAfterImport: false }, status: { publicationStatus: 'published', qualityStatus: 'unreviewed_import' } },
  { id: LEXEME_2, meta: { sourceBook: 'faanjyut', sourceWorkbook: WORKBOOK, sourceSheet: SHEET, sourceRow: 9, matrixOrder: 9, sourceKey: KEY_2, editedAfterImport: false }, status: { publicationStatus: 'published', qualityStatus: 'unreviewed_import' } }
]

const entries = [
  {
    id: ENTRY_GZ,
    lexemeId: LEXEME_1,
    sourceBook: 'faanjyut',
    dialect: { name: 'guangzhou', regionCode: 'GZ' },
    headword: { display: '粵', normalized: '粵', isPlaceholder: false },
    phonetic: { original: 'jyut6' },
    entryType: 'character',
    senses: [{ definition: '不言自明$' }],
    theme: {},
    meta: { sourceWorkbook: WORKBOOK, sourceSheet: SHEET, sourceRow: 7, sourceColumn: '穗', sourceColumnIndex: 35, sourceCell: `${SHEET}!AI7`, sourceKey: KEY_1, importReviewStatus: 'unreviewed_import', editedAfterImport: false },
    status: 'approved',
    createdBy: 'system:faanjyut_import'
  },
  {
    id: ENTRY_TS,
    lexemeId: LEXEME_1,
    sourceBook: 'faanjyut',
    dialect: { name: 'taishan', regionCode: 'TS' },
    headword: { display: '粵', normalized: '粵', isPlaceholder: false },
    phonetic: { original: 'juot9' },
    entryType: 'character',
    senses: [{ definition: '不言自明$' }],
    theme: {},
    meta: { sourceWorkbook: WORKBOOK, sourceSheet: SHEET, sourceRow: 7, sourceColumn: '台', sourceColumnIndex: 17, sourceCell: `${SHEET}!Q7`, sourceKey: KEY_1, importReviewStatus: 'unreviewed_import', editedAfterImport: false },
    status: 'approved',
    createdBy: 'system:faanjyut_import'
  }
]

const externalEtymons = [
  {
    id: ETYMON_OCH,
    lexemeId: LEXEME_1,
    languageCode: 'och',
    scriptForm: '[ɢ]ʷat',
    raw: '[ɢ]ʷat',
    sourceType: 'dictionary',
    // 2026-08-06：raw 無中文方括號語言點 → 省略 sourceDetail（DTO optional）
    meta: { sourceBook: 'faanjyut', sourceWorkbook: WORKBOOK, sourceSheet: SHEET, sourceColumn: '上古漢', sourceColumnIndex: 126, sourceRow: 7, sourceCell: `${SHEET}!DV7`, segmentIndex: 1, softDeleted: false, editedAfterImport: false },
    createdBy: 'system:faanjyut_import'
  }
]

const columns = [
  { id: COL_GZ, sourceBook: 'faanjyut', sourceSheet: SHEET, sourceColumn: '穗', sourceColumnIndex: 35, sourceRole: 'domestic', projectionTarget: 'entry', label: '穗', order: { originalOrder: 35 }, style: { color: 'F1C232' }, sourceMeta: {}, status: 'active', createdBy: 'system:faanjyut_import', dialectId: 'guangzhou' },
  { id: COL_TS, sourceBook: 'faanjyut', sourceSheet: SHEET, sourceColumn: '台', sourceColumnIndex: 17, sourceRole: 'domestic', projectionTarget: 'entry', label: '台', order: { originalOrder: 17 }, style: { color: 'F1C232' }, sourceMeta: {}, status: 'active', createdBy: 'system:faanjyut_import', dialectId: 'taishan' },
  { id: COL_OCH, sourceBook: 'faanjyut', sourceSheet: SHEET, sourceColumn: '上古漢', sourceColumnIndex: 126, sourceRole: 'external', projectionTarget: 'externalEtymon', label: '上古漢', order: { originalOrder: 126 }, style: { color: 'F1C232' }, sourceMeta: {}, status: 'active', createdBy: 'system:faanjyut_import', languageCode: 'och' }
]

const cellStates = [
  { id: CELL_GZ, lexemeId: LEXEME_1, columnId: COL_GZ, status: { workflow: 'unreviewed', flags: {} }, projection: { entryId: ENTRY_GZ }, source: { sourceRow: 7, sourceColumn: '穗', sourceCell: `${SHEET}!AI7` }, editedAfterImport: false, version: 0, createdBy: 'system:faanjyut_import', raw: 'jyut6' },
  { id: CELL_OCH, lexemeId: LEXEME_1, columnId: COL_OCH, status: { workflow: 'unreviewed', flags: {} }, projection: { externalEtymonIds: [ETYMON_OCH] }, source: { sourceRow: 7, sourceColumn: '上古漢', sourceCell: `${SHEET}!DV7` }, editedAfterImport: false, version: 0, createdBy: 'system:faanjyut_import', raw: '[ɢ]ʷat' }
]

const comments = [
  { id: COMMENT_1, targetType: 'column', targetId: COL_GZ, source: 'imported_excel_comment', content: '測試批注', isResolved: false, legacyMeta: { sourceCell: `${SHEET}!AI1`, ordinal: 1, sanitized: true, sourceColumn: '穗' } }
]

const links = [
  { id: LINK_1, fromLexemeId: LEXEME_1, targetRaw: KEY_2, type: 'related', rawSource: 'DR', rawValue: KEY_2, status: 'active', source: { sourceRow: 7, sourceColumn: '導向' }, createdBy: 'system:faanjyut_import', toLexemeId: LEXEME_2, targetKey: KEY_2 }
]

export const FIXTURE_RECORDS: Record<string, Array<Record<string, unknown>>> = {
  'lexemes.ndjson': lexemes,
  'entries.ndjson': entries,
  'external_etymons.ndjson': externalEtymons,
  'columns.ndjson': columns,
  'cell_states.ndjson': cellStates,
  'comments.ndjson': comments,
  'links.ndjson': links
}

export interface FixtureManifestOverrides {
  baselineLevel?: string
  sourceExportedAt?: string | null
  gitDirty?: boolean
  counts?: Record<string, number>
  files?: Record<string, { records: number; sha256: string }>
}

export interface FixtureOptions {
  /** 生成時直接改寫（返回 false 則跳過該文件） */
  mutate?: (fileName: string, records: Array<Record<string, unknown>>) => Array<Record<string, unknown>> | false
  manifest?: FixtureManifestOverrides
  /** 缺省 manifest 文件（測試缺失 required 文件） */
  omitManifest?: boolean
  /** 缺省某 NDJSON 文件 */
  omitFiles?: string[]
  /** 缺省 reports 目錄 */
  omitReports?: boolean
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function recordsCount(fileName: string): number {
  return FIXTURE_RECORDS[fileName].length
}

/** 生成一個合法的 ETL 導出包目錄，返回目錄路徑 */
export function buildFixtureDir(options: FixtureOptions = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'faanjyut-fixture-'))
  const { mutate, manifest: manifestOverrides = {}, omitManifest = false, omitFiles = [], omitReports = false } = options

  const files: Record<string, { records: number; sha256: string }> = {}
  for (const [fileName, baseRecords] of Object.entries(FIXTURE_RECORDS)) {
    if (omitFiles.includes(fileName)) continue
    let records = baseRecords
    if (mutate) {
      const result = mutate(fileName, records)
      if (result === false) continue
      records = result
    }
    const json = records.map((r) => JSON.stringify(r)).join('\n') + '\n'
    writeFileSync(join(dir, fileName), json, 'utf8')
    files[fileName] = { records: records.length, sha256: sha256(json) }
  }

  const counts: Record<string, number> = {
    sourceRows: 2,
    validRows: 2,
    skippedRows: 0,
    lexemes: recordsCount('lexemes.ndjson'),
    entries: recordsCount('entries.ndjson'),
    externalEtymons: recordsCount('external_etymons.ndjson'),
    columns: recordsCount('columns.ndjson'),
    cellStates: recordsCount('cell_states.ndjson'),
    comments: recordsCount('comments.ndjson'),
    links: recordsCount('links.ndjson')
  }

  if (!omitManifest) {
    const manifest = {
      schemaVersion: 1,
      baselineLevel: manifestOverrides.baselineLevel ?? 'regression',
      sourceBook: 'faanjyut',
      sourceWorkbook: WORKBOOK,
      sourceSheet: SHEET,
      sourceFileSha256: SOURCE_SHA,
      sourceExportedAt: 'sourceExportedAt' in manifestOverrides ? manifestOverrides.sourceExportedAt : null,
      inputFiles: {
        workbook: { name: WORKBOOK, sha256: SOURCE_SHA },
        filterRules: { name: '备注过滤规则.yaml', sha256: '8723b231c623bfbc58cdcbd8113610a8eeba360c6fdbf7121705c1f6191818ac' },
        commentsExport: null
      },
      generatedAt: '2026-07-29T16:38:46.049148+00:00',
      generator: {
        name: 'PanJ2MongoDB.py',
        gitCommit: 'b6ebea452164d6126ce7e669278c7acb2193c95d',
        gitDirty: manifestOverrides.gitDirty ?? false
      },
      counts: manifestOverrides.counts ?? counts,
      files: manifestOverrides.files ?? files
    }
    writeFileSync(join(dir, 'import_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  }

  if (!omitReports) {
    const reportsDir = join(dir, 'reports')
    mkdirSync(reportsDir, { recursive: true })

    const envelope = (reportType: string, summary: Record<string, unknown>, recordsArr: unknown[] = []) => ({
      schemaVersion: 1,
      reportType,
      generatedAt: '2026-07-29T16:38:46.049148+00:00',
      sourceFileSha256: SOURCE_SHA,
      summary,
      records: recordsArr
    })

    const reports: Record<string, unknown> = {
      'import_report.json': envelope('import', {
        sourceRows: counts.sourceRows,
        validRows: counts.validRows,
        skippedRows: counts.skippedRows,
        outputCounts: { lexemes: counts.lexemes, entries: counts.entries, externalEtymons: counts.externalEtymons, columns: counts.columns, cellStates: counts.cellStates, comments: counts.comments, links: counts.links },
        placeholderCounts: {}
      }),
      'dialect_mapping_report.json': envelope('dialect_mapping', { domesticColumns: 2, mappedColumns: 2, unmappedColumns: 0, duplicateTargets: [] }),
      'external_mapping_report.json': envelope('external_mapping', { externalColumns: 1, mappedColumns: 1, unmappedColumns: 0 }),
      'duplicate_keys_report.json': envelope('duplicate_keys', { duplicateGroups: 0, extraRecords: 0 }),
      'entry_conflicts_report.json': envelope('entry_conflicts', { conflictGroups: 0, extraRecords: 0 }),
      'unresolved_links_report.json': envelope('unresolved_links', { total: 1, resolved: 1, unresolved: 0, byRawSource: { DR: 1 } }),
      'comments_report.json': envelope('comments', { xlsxLegacy: 1, google: 0, merged: 1, deduplicated: 0, threadedPlaceholders: 0, sanitized: 1, dropped: 0 }),
      'skipped_records_report.json': envelope('skipped_records', { total: 0, byReason: {} })
    }
    for (const [name, report] of Object.entries(reports)) {
      writeFileSync(join(reportsDir, name), `${JSON.stringify(report)}\n`, 'utf8')
    }
  }

  return dir
}
