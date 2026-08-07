#!/usr/bin/env tsx
/**
 * 泛粵字表導入 seed（P1 dry-run + P2 寫入，見 ImportDataContract.md §8/§9）。
 *
 * dry-run（--dry-run，默認）：
 *  - 連接 MongoDB（autoIndex:false / autoCreate:false），全程只讀
 *  - 完整契約校驗（manifest/7 類 NDJSON/報告/穩定 ID/引用完整/Mongoose 前後字段）
 *  - databaseProof（前後 collection 計數 + command 監控零寫入）
 *  - 索引計劃（existing/expected/create/drop）
 *  - 產出 schema_dry_run_report.json / report.md / index-plan.json 到 --report-dir
 *
 * 寫入（--mode initial|final_cutover --confirm-write <精確 db 名>）：
 *  - 先跑 dry-run 全套預檢，blocker>0 整批中止（退出碼 2）
 *  - 生成 batchId='fjb_'+nanoid(16)，建 ImportBatch running，insert-only 按序寫入，
 *    失敗標 failed（須先 rollback:faanjyut 回滾再重試），成功標 completed
 *  - 產出 import_write_report.json / write-report.md
 *
 * 退出碼（契約 §8）：0 通過 / 1 運行錯誤（含寫入失敗）/ 2 blocker > 0。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { validateExportPackage, type Environment } from '../server/utils/faanjyut/import-contract'
import { runDryRunDbPhase } from '../server/utils/faanjyut/dry-run'
import {
  buildImportWriteReport,
  buildSchemaDryRunReport,
  exitCodeForDryRun,
  writeDryRunReports,
  writeImportWriteReports
} from '../server/utils/faanjyut/report'
import { runWriteImport, DEFAULT_BULK_SIZE } from '../server/utils/faanjyut/write-import'
import { adaptMongooseDb, adaptMongooseWriteDb } from '../server/utils/faanjyut/mongo-db'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')

function loadDotEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]] !== undefined) continue  // 显式空值（如测试传 ''）不被 .env 覆盖
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

interface CliArgs {
  input: string | null
  dryRun: boolean
  mode: string | null
  environment: string
  confirmWrite: string | null
  confirmSourceSha256: string | null
  confirmManifestSha256: string | null
  reportDir: string | null
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: null,
    dryRun: false,
    mode: null,
    environment: 'staging',
    confirmWrite: null,
    confirmSourceSha256: null,
    confirmManifestSha256: null,
    reportDir: null,
    help: false
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => {
      i += 1
      return argv[i]
    }
    switch (arg) {
      case '--help': case '-h': args.help = true; break
      case '--input': args.input = next() ?? null; break
      case '--dry-run': args.dryRun = true; break
      case '--mode': args.mode = next() ?? null; break
      case '--environment': args.environment = next() ?? 'staging'; break
      case '--confirm-write': args.confirmWrite = next() ?? null; break
      case '--confirm-source-sha256': args.confirmSourceSha256 = next() ?? null; break
      case '--confirm-manifest-sha256': args.confirmManifestSha256 = next() ?? null; break
      case '--report-dir': args.reportDir = next() ?? args.reportDir; break
      default:
        if (arg.startsWith('--')) {
          console.error(`未知參數：${arg}`)
          process.exit(1)
        }
    }
  }
  return args
}

/**
 * 哈希核驗門（Runbook §8，2026-08-07 補實現，審計 M48）：
 *  - --confirm-source-sha256：對比 import_manifest.json 的 sourceFileSha256（源表 Excel 哈希）
 *  - --confirm-manifest-sha256：對比 import_manifest.json 文件本身 SHA-256
 * 任一一項不匹配 → 打印明確錯誤並退出碼 2（數據完整性 blocker，不連接 DB）。
 */
function verifyConfirmHashes(input: string, confirmSourceSha256: string | null, confirmManifestSha256: string | null): void {
  const manifestPath = resolve(input, 'import_manifest.json')
  if (!existsSync(manifestPath)) {
    console.error(`錯誤：找不到 ${manifestPath}，無法執行哈希核驗`)
    process.exit(2)
  }
  const manifestRaw = readFileSync(manifestPath, 'utf8')
  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(manifestRaw) as Record<string, unknown>
  } catch {
    console.error(`錯誤：${manifestPath} 不是合法 JSON，無法執行哈希核驗`)
    process.exit(2)
  }

  if (confirmSourceSha256 !== null) {
    const actual = manifest.sourceFileSha256
    if (typeof actual !== 'string' || actual !== confirmSourceSha256) {
      console.error(
        `哈希核驗失敗（--confirm-source-sha256）：期望 ${confirmSourceSha256}，` +
        `manifest.sourceFileSha256 實際 ${typeof actual === 'string' ? actual : '（缺失）'}`
      )
      process.exit(2)
    }
    console.log(`✓ --confirm-source-sha256 核驗通過（${actual}）`)
  }

  if (confirmManifestSha256 !== null) {
    const actual = createHash('sha256').update(manifestRaw).digest('hex')
    if (actual !== confirmManifestSha256) {
      console.error(
        `哈希核驗失敗（--confirm-manifest-sha256）：期望 ${confirmManifestSha256}，` +
        `${manifestPath} 實際 ${actual}`
      )
      process.exit(2)
    }
    console.log(`✓ --confirm-manifest-sha256 核驗通過（${actual}）`)
  }
}

function usage(): string {
  return [
    '用法：npm run seed:faanjyut -- [options]',
    '',
    '  --input <dir>          ETL 導出目錄（含 import_manifest.json + 7 類 NDJSON + reports/）',
    '  --dry-run              dry-run 模式（默認，全程只讀）',
    '  --mode <dry-run|initial|final_cutover>  寫入模式需搭配 --confirm-write',
    '  --environment <local|staging|production>  默認 staging',
    '  --confirm-write <db>   寫入模式必填：必須等於實際連接的 db 名（防誤寫）',
    '  --confirm-source-sha256 <hash>  核驗 manifest.sourceFileSha256 與此值一致（Runbook §8，不匹配退出碼 2）',
    '  --confirm-manifest-sha256 <hash>  核驗 import_manifest.json 文件本身 SHA-256 與此值一致（不匹配退出碼 2）',
    '  --report-dir <dir>     產物目錄，默認 .artifacts/faanjyut/dry-run',
    '  --help',
    '',
    '示例（契約 §8 dry-run）：',
    '  npm run seed:faanjyut -- --input ../FaanJyutZibiu2Database/out/faanjyut-mongodb \\',
    '    --dry-run --environment staging --report-dir .artifacts/faanjyut/dry-run',
    '',
    '示例（契約 §9 寫入）：',
    '  npm run seed:faanjyut -- --input ../FaanJyutZibiu2Database/out/faanjyut-mongodb \\',
    '    --mode initial --environment staging --confirm-write <db> \\',
    '    --report-dir .artifacts/faanjyut/write',
    ''
  ].join('\n')
}

function main(): void {
  loadDotEnv()  // 审计 H3：.env 与 shell 环境同等生效（防误连平台默认库）
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage())
    process.exit(0)
  }
  if (!args.input) {
    console.error('錯誤：缺少 --input <dir>')
    process.stderr.write(usage())
    process.exit(1)
  }
  if (!['local', 'staging', 'production'].includes(args.environment)) {
    console.error(`錯誤：--environment 只接受 local|staging|production，實際 '${args.environment}'`)
    process.exit(1)
  }
  if (args.mode !== null && !['dry-run', 'initial', 'final_cutover'].includes(args.mode)) {
    console.error(`錯誤：未知 --mode '${args.mode}'（支持 dry-run|initial|final_cutover）`)
    process.exit(1)
  }

  // 寫入模式判定：--mode initial/final_cutover 必須搭配 --confirm-write；dry-run 不接受 --confirm-write
  const writeMode = args.mode === 'initial' || args.mode === 'final_cutover'
  if (writeMode && args.confirmWrite === null) {
    console.error('錯誤：寫入模式（--mode initial/final_cutover）必須提供 --confirm-write <精確 db 名>')
    process.exit(1)
  }
  if (!writeMode && args.confirmWrite !== null) {
    console.error('錯誤：--confirm-write 僅寫入模式使用；dry-run 不接受')
    process.exit(1)
  }

  // 哈希核驗門（Runbook §8）：連接 DB 之前先做純文件校驗；不匹配 = 數據完整性 blocker → 退出碼 2
  if (args.confirmSourceSha256 !== null || args.confirmManifestSha256 !== null) {
    verifyConfirmHashes(args.input, args.confirmSourceSha256, args.confirmManifestSha256)
  }

  const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI')
    process.exit(1)
  }

  // 审计 L15：默认产物目录按模式分离（写模式 → write/，dry-run → dry-run/，防报告混放）
  const reportDir = args.reportDir ?? (writeMode
    ? resolve(root, '.artifacts/faanjyut/write')
    : resolve(root, '.artifacts/faanjyut/dry-run'))

  const runId = `fjdr_${nanoid(16)}`
  const startedAt = new Date().toISOString()
  const environment = args.environment as Environment

  const run = writeMode
    ? runWrite(args.input, args.mode as 'initial' | 'final_cutover', environment, args.confirmWrite as string, reportDir, runId, startedAt, mongoUri)
    : runDryRun(args.input, environment, reportDir, runId, startedAt, mongoUri)

  run
    .then((exitCode) => process.exit(exitCode))
    .catch((error: unknown) => {
      console.error('運行錯誤:', error)
      process.exit(1)
    })
}

async function runDryRun(
  input: string,
  environment: Environment,
  reportDir: string,
  runId: string,
  startedAt: string,
  mongoUri: string
): Promise<number> {
  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  console.log(`已連接 MongoDB（db: ${mongoose.connection.name}，autoIndex:false autoCreate:false）`)

  try {
    console.log(`校驗導出目錄：${input}（environment=${environment}，runId=${runId}）`)

    // 1) 純文件契約校驗
    const validated = await validateExportPackage(input, environment)
    console.log(`契約校驗完成：blockers=${validated.blockers.length} warnings=${validated.warnings.length}`)

    // 2) DB 只讀階段（索引計劃 + 衝突檢查 + databaseProof）
    const dbResult = await runDryRunDbPhase(adaptMongooseDb(mongoose.connection), validated, environment)
    console.log(`DB 階段完成：create=${dbResult.indexPlan.summary.createCount} drop=${dbResult.indexPlan.summary.dropCount} writeCommands=${dbResult.databaseProof.writeCommandsObserved.length}`)

    // 3) 報告組裝 + 落盤
    const report = buildSchemaDryRunReport({
      runId,
      environment,
      startedAt,
      validated,
      indexPlan: dbResult.indexPlan,
      databaseProof: dbResult.databaseProof,
      dbPhaseBlockers: dbResult.blockers,
      dbPhaseWarnings: dbResult.warnings
    })
    const paths = writeDryRunReports(reportDir, report, dbResult.indexPlan)

    const exitCode = exitCodeForDryRun(report)
    console.log(`報告已寫入:`)
    for (const p of paths) console.log(`  ${p}`)
    console.log(`結果：passed=${report.passed} blockers=${report.blockers.length} → 退出碼 ${exitCode}`)
    return exitCode
  } finally {
    await mongoose.disconnect()
  }
}

/**
 * 寫入模式（契約 §9）：dry-run 全套預檢 → blocker>0 整批中止（退出碼 2）→
 * batchId 批次寫入（失敗標 failed 拋錯，退出碼 1；成功標 completed，退出碼 0）。
 */
async function runWrite(
  input: string,
  mode: 'initial' | 'final_cutover',
  environment: Environment,
  confirmWrite: string,
  reportDir: string,
  runId: string,
  startedAt: string,
  mongoUri: string
): Promise<number> {
  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  const dbName = mongoose.connection.name
  console.log(`已連接 MongoDB（db: ${dbName}，autoIndex:false autoCreate:false）`)

  try {
    if (confirmWrite !== dbName) {
      console.error(`錯誤：--confirm-write '${confirmWrite}' 與實際連接的 db '${dbName}' 不一致，拒絕寫入（防誤寫）`)
      return 1
    }

    // 1) 預檢 = dry-run 全套（契約校驗 + DB 只讀階段）
    console.log(`預檢導出目錄：${input}（environment=${environment}，precheckRunId=${runId}）`)
    const validated = await validateExportPackage(input, environment)
    const dbResult = await runDryRunDbPhase(adaptMongooseDb(mongoose.connection), validated, environment)
    const precheck = buildSchemaDryRunReport({
      runId,
      environment,
      startedAt,
      validated,
      indexPlan: dbResult.indexPlan,
      databaseProof: dbResult.databaseProof,
      dbPhaseBlockers: dbResult.blockers,
      dbPhaseWarnings: dbResult.warnings
    })
    console.log(`預檢完成：blockers=${precheck.blockers.length} warnings=${precheck.warnings.length}`)
    if (!precheck.passed) {
      const paths = writeDryRunReports(reportDir, precheck, dbResult.indexPlan)
      console.error('預檢存在 blocker，整批中止（契約 §9：insert-only，任何目標衝突寫前中止）')
      for (const p of paths) console.error(`  預檢報告: ${p}`)
      return 2
    }

    // 2) 批次寫入
    const batchId = `fjb_${nanoid(16)}`
    console.log(`預檢通過，開始寫入：batchId=${batchId} mode=${mode} bulkSize=${DEFAULT_BULK_SIZE}`)
    const result = await runWriteImport(adaptMongooseWriteDb(mongoose.connection), input, validated, {
      batchId,
      mode,
      environment,
      precheckRunId: runId,
      reportDir,
      onProgress: (collection, written) => console.log(`  寫入 ${collection}: ${written}`)
    })

    // 3) 報告
    const report = buildImportWriteReport({
      batchId,
      mode,
      environment,
      precheckRunId: runId,
      startedAt: result.startedAt,
      completedAt: result.completedAt,
      validated,
      bulkSize: result.bulkSize,
      written: result.counts
    })
    const paths = writeImportWriteReports(reportDir, report)
    console.log(`報告已寫入:`)
    for (const p of paths) console.log(`  ${p}`)
    console.log(`結果：batchId=${batchId} matched=${report.matched} → 退出碼 ${report.matched ? 0 : 1}`)
    return report.matched ? 0 : 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
