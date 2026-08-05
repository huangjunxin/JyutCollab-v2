/**
 * dry-run 報告（ImportDataContract.md §8.1、ImplementationPlan P1 任務 6）。
 * 輸出 `schema_dry_run_report.json` + `report.md` + `index-plan.json`。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Environment, Finding, FileCounts, ValidatedExport } from './import-contract'
import type { IndexPlan, IndexPlanItem } from './index-plan'
import type { DatabaseProof } from './dry-run'
import { WRITE_ORDER } from './write-import'
import type { RollbackResult } from './rollback'

export interface SchemaDryRunReport {
  schemaVersion: 1
  runId: string
  environment: Environment
  startedAt: string
  completedAt: string
  passed: boolean
  source: {
    sourceWorkbook: string
    sourceFileSha256: string
    manifestSha256: string
  }
  counts: {
    input: Record<string, number>
    valid: Record<string, number>
    invalid: Record<string, number>
  }
  blockers: Finding[]
  warnings: Finding[]
  indexes: {
    existing: IndexPlanItem[]
    expected: IndexPlanItem[]
    create: IndexPlanItem[]
    drop: IndexPlanItem[]
    summary: IndexPlan['summary']
  }
  databaseProof: DatabaseProof | null
}

export interface BuildReportInput {
  runId: string
  environment: Environment
  startedAt: string
  validated: ValidatedExport
  indexPlan: IndexPlan
  databaseProof: DatabaseProof | null
  dbPhaseBlockers: Finding[]
  dbPhaseWarnings: Finding[]
}

export function buildSchemaDryRunReport(input: BuildReportInput): SchemaDryRunReport {
  const blockers = [...input.validated.blockers, ...input.dbPhaseBlockers]
  const warnings = [...input.validated.warnings, ...input.dbPhaseWarnings]
  const countsOf = (get: (c: FileCounts) => number): Record<string, number> =>
    Object.fromEntries(Object.entries(input.validated.counts).map(([file, c]) => [file, get(c)]))

  return {
    schemaVersion: 1,
    runId: input.runId,
    environment: input.environment,
    startedAt: input.startedAt,
    completedAt: new Date().toISOString(),
    passed: blockers.length === 0,
    source: {
      sourceWorkbook: input.validated.manifest.sourceWorkbook,
      sourceFileSha256: input.validated.manifest.sourceFileSha256,
      manifestSha256: input.validated.manifestSha256
    },
    counts: {
      input: countsOf((c) => c.input),
      valid: countsOf((c) => c.valid),
      invalid: countsOf((c) => c.invalid)
    },
    blockers,
    warnings,
    indexes: {
      existing: input.indexPlan.existing,
      expected: input.indexPlan.expected,
      create: input.indexPlan.create,
      drop: input.indexPlan.drop,
      summary: input.indexPlan.summary
    },
    databaseProof: input.databaseProof
  }
}

/** 退出碼：blocker > 0 → 2；否則 0（運行錯誤 → 1 由 CLI 層處理） */
export function exitCodeForDryRun(report: SchemaDryRunReport): 0 | 1 | 2 {
  return report.blockers.length > 0 ? 2 : 0
}

function keyText(item: IndexPlanItem): string {
  const key = Object.entries(item.key).map(([p, d]) => `${p}:${d}`).join(', ')
  const opts = [
    item.options.unique ? 'unique' : '',
    item.options.sparse ? 'sparse' : '',
    item.options.partialFilterExpression ? `partial(${JSON.stringify(item.options.partialFilterExpression)})` : ''
  ].filter(Boolean).join(' ')
  return `${item.collection} {${key}} ${opts}${item.name ? ` (name=${item.name})` : ''}${item.reason === 'plan_b_residue' ? ' [方案B殘留]' : ''}`
}

export function renderMarkdown(report: SchemaDryRunReport): string {
  const lines: string[] = []
  lines.push(`# 泛粵字表導入 dry-run 報告`)
  lines.push('')
  lines.push(`- runId: \`${report.runId}\``)
  lines.push(`- environment: \`${report.environment}\``)
  lines.push(`- startedAt: ${report.startedAt}`)
  lines.push(`- completedAt: ${report.completedAt}`)
  lines.push(`- **passed: ${report.passed}**（blockers=${report.blockers.length}, warnings=${report.warnings.length}）`)
  lines.push('')
  lines.push(`## 來源`)
  lines.push('')
  lines.push(`- sourceWorkbook: \`${report.source.sourceWorkbook}\``)
  lines.push(`- sourceFileSha256: \`${report.source.sourceFileSha256}\``)
  lines.push(`- manifestSha256: \`${report.source.manifestSha256}\``)
  lines.push('')
  lines.push(`## 計數（input / valid / invalid）`)
  lines.push('')
  lines.push('| 文件 | input | valid | invalid |')
  lines.push('|------|-------|-------|---------|')
  for (const [file, input] of Object.entries(report.counts.input)) {
    lines.push(`| ${file} | ${input} | ${report.counts.valid[file] ?? 0} | ${report.counts.invalid[file] ?? 0} |`)
  }
  lines.push('')
  lines.push(`## Blockers（${report.blockers.length}）`)
  lines.push('')
  if (report.blockers.length === 0) {
    lines.push('無。')
  } else {
    lines.push('| code | file:line | objectId | message |')
    lines.push('|------|-----------|----------|---------|')
    for (const f of report.blockers) {
      lines.push(`| ${f.code} | ${f.file ?? ''}${f.line ? `:${f.line}` : ''} | ${f.objectId ?? f.sourceKey ?? ''} | ${f.message.replace(/\|/g, '\\|')} |`)
    }
  }
  lines.push('')
  lines.push(`## Warnings（${report.warnings.length}）`)
  lines.push('')
  if (report.warnings.length === 0) {
    lines.push('無。')
  } else {
    for (const f of report.warnings.slice(0, 50)) {
      lines.push(`- \`${f.code}\` ${f.file ?? ''}${f.line ? `:${f.line}` : ''} — ${f.message}`)
    }
    if (report.warnings.length > 50) lines.push(`- …（共 ${report.warnings.length} 條，其餘見 JSON）`)
  }
  lines.push('')
  lines.push(`## 索引計劃（create=${report.indexes.summary.createCount} / drop=${report.indexes.summary.dropCount}，headword.search 方案B殘留=${report.indexes.summary.headwordSearchResidue}）`)
  lines.push('')
  lines.push(`### create`)
  lines.push('')
  if (report.indexes.create.length === 0) lines.push('無。')
  else report.indexes.create.forEach((i) => lines.push(`- ${keyText(i)}`))
  lines.push('')
  lines.push(`### drop`)
  lines.push('')
  if (report.indexes.drop.length === 0) lines.push('無。')
  else report.indexes.drop.forEach((i) => lines.push(`- ${keyText(i)}`))
  lines.push('')
  if (report.databaseProof) {
    lines.push(`## databaseProof`)
    lines.push('')
    lines.push(`- collections before: ${report.databaseProof.collectionNamesBefore.length}，after: ${report.databaseProof.collectionNamesAfter.length}`)
    lines.push(`- writeCommandsObserved: ${report.databaseProof.writeCommandsObserved.length > 0 ? `**${report.databaseProof.writeCommandsObserved.join(', ')}**` : '空（零寫入）'}`)
    lines.push(`- **unchanged: ${report.databaseProof.unchanged}**`)
    const before = JSON.stringify(report.databaseProof.collectionsBefore)
    const after = JSON.stringify(report.databaseProof.collectionsAfter)
    if (before !== after) {
      lines.push(`- collectionsBefore: ${before}`)
      lines.push(`- collectionsAfter: ${after}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/** 寫入 dry-run 產物目錄（schema_dry_run_report.json / report.md / index-plan.json） */
export function writeDryRunReports(reportDir: string, report: SchemaDryRunReport, indexPlan: IndexPlan): string[] {
  mkdirSync(reportDir, { recursive: true })
  const paths = [
    join(reportDir, 'schema_dry_run_report.json'),
    join(reportDir, 'report.md'),
    join(reportDir, 'index-plan.json')
  ]
  writeFileSync(paths[0], `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(paths[1], renderMarkdown(report), 'utf8')
  writeFileSync(paths[2], `${JSON.stringify(indexPlan, null, 2)}\n`, 'utf8')
  return paths
}

// ---------------------------------------------------------------------------
// P2 寫入/回滾報告（契約 §9：批大小記錄在報告中；回滾前後保存各 collection 計數）
// ---------------------------------------------------------------------------

export interface ImportWriteReport {
  schemaVersion: 1
  batchId: string
  mode: 'initial' | 'final_cutover'
  environment: Environment
  precheckRunId: string
  startedAt: string
  completedAt: string
  source: {
    sourceWorkbook: string
    sourceFileSha256: string
    manifestSha256: string
  }
  bulkSize: number
  /** written = 實際寫入；expected = 契約預檢 valid 計數 */
  counts: {
    written: Record<string, number>
    expected: Record<string, number>
  }
  /** 7 個 collection written 全部等於 expected */
  matched: boolean
}

export interface BuildWriteReportInput {
  batchId: string
  mode: 'initial' | 'final_cutover'
  environment: Environment
  precheckRunId: string
  startedAt: string
  completedAt: string
  validated: ValidatedExport
  bulkSize: number
  written: Record<string, number>
}

export function buildImportWriteReport(input: BuildWriteReportInput): ImportWriteReport {
  const expected: Record<string, number> = {}
  for (const { collection, ndjsonFile } of WRITE_ORDER) {
    expected[collection] = input.validated.counts[ndjsonFile]?.valid ?? 0
  }
  const matched = WRITE_ORDER.every(
    ({ collection }) => (input.written[collection] ?? 0) === expected[collection]
  )
  return {
    schemaVersion: 1,
    batchId: input.batchId,
    mode: input.mode,
    environment: input.environment,
    precheckRunId: input.precheckRunId,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    source: {
      sourceWorkbook: input.validated.manifest.sourceWorkbook,
      sourceFileSha256: input.validated.manifest.sourceFileSha256,
      manifestSha256: input.validated.manifestSha256
    },
    bulkSize: input.bulkSize,
    counts: { written: input.written, expected },
    matched
  }
}

export interface ImportRollbackReport {
  schemaVersion: 1
  batchId: string
  startedAt: string
  completedAt: string
  countsBefore: Record<string, number>
  deleted: Record<string, number>
  countsAfter: Record<string, number>
  /** 7 個 collection 按 batchId 計數全部歸零 */
  drained: boolean
}

export function buildImportRollbackReport(result: RollbackResult): ImportRollbackReport {
  const drained = Object.values(result.countsAfter).every((n) => n === 0)
  return {
    schemaVersion: 1,
    batchId: result.batchId,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    countsBefore: result.countsBefore,
    deleted: result.deleted,
    countsAfter: result.countsAfter,
    drained
  }
}

function countsLines(title: string, a: Record<string, number>, b: Record<string, number>, headerA: string, headerB: string): string[] {
  const lines = [`## ${title}`, '', '| collection | ' + headerA + ' | ' + headerB + ' |', '|------|------|------|']
  for (const key of Object.keys(a)) {
    lines.push(`| ${key} | ${a[key] ?? 0} | ${b[key] ?? 0} |`)
  }
  lines.push('')
  return lines
}

export function renderWriteMarkdown(report: ImportWriteReport): string {
  const lines: string[] = []
  lines.push('# 泛粵字表導入寫入報告')
  lines.push('')
  lines.push(`- batchId: \`${report.batchId}\``)
  lines.push(`- mode: \`${report.mode}\` / environment: \`${report.environment}\``)
  lines.push(`- precheckRunId: \`${report.precheckRunId}\``)
  lines.push(`- startedAt: ${report.startedAt}`)
  lines.push(`- completedAt: ${report.completedAt}`)
  lines.push(`- bulkSize: ${report.bulkSize}`)
  lines.push(`- **matched: ${report.matched}**（written 全部等於契約 valid 計數）`)
  lines.push('')
  lines.push(...countsLines('計數（written / expected）', report.counts.written, report.counts.expected, 'written', 'expected'))
  return lines.join('\n')
}

export function renderRollbackMarkdown(report: ImportRollbackReport): string {
  const lines: string[] = []
  lines.push('# 泛粵字表導入回滾報告')
  lines.push('')
  lines.push(`- batchId: \`${report.batchId}\``)
  lines.push(`- startedAt: ${report.startedAt}`)
  lines.push(`- completedAt: ${report.completedAt}`)
  lines.push(`- **drained: ${report.drained}**（按 batchId 計數全部歸零）`)
  lines.push('')
  lines.push(...countsLines('計數（before / after）', report.countsBefore, report.countsAfter, 'before', 'after'))
  lines.push('## 刪除數')
  lines.push('')
  for (const [key, n] of Object.entries(report.deleted)) lines.push(`- ${key}: ${n}`)
  lines.push('')
  return lines.join('\n')
}

/** 寫入寫入模式產物（import_write_report.json / write-report.md） */
export function writeImportWriteReports(reportDir: string, report: ImportWriteReport): string[] {
  mkdirSync(reportDir, { recursive: true })
  const paths = [join(reportDir, 'import_write_report.json'), join(reportDir, 'write-report.md')]
  writeFileSync(paths[0], `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(paths[1], renderWriteMarkdown(report), 'utf8')
  return paths
}

/** 寫入回滾產物（import_rollback_report.json / rollback-report.md） */
export function writeImportRollbackReports(reportDir: string, report: ImportRollbackReport): string[] {
  mkdirSync(reportDir, { recursive: true })
  const paths = [join(reportDir, 'import_rollback_report.json'), join(reportDir, 'rollback-report.md')]
  writeFileSync(paths[0], `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  writeFileSync(paths[1], renderRollbackMarkdown(report), 'utf8')
  return paths
}
