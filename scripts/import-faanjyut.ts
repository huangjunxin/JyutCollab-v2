#!/usr/bin/env tsx
/**
 * 泛粵字表導入 seed（P1 實現，見 ImportDataContract.md §8 dry-run）。
 *
 * P1 只實現 dry-run：
 *  - 連接 MongoDB（autoIndex:false / autoCreate:false），全程只讀
 *  - 完整契約校驗（manifest/7 類 NDJSON/報告/穩定 ID/引用完整/Mongoose 前後字段）
 *  - databaseProof（前後 collection 計數 + command 監控零寫入）
 *  - 索引計劃（existing/expected/create/drop）
 *  - 產出 schema_dry_run_report.json / report.md / index-plan.json 到 --report-dir
 *
 * 真實寫入（--mode initial|final_cutover / --confirm-write）屬 P2，保持退出碼 3。
 *
 * 退出碼（契約 §8）：0 通過 / 1 運行錯誤 / 2 blocker > 0 / 3 未實現（P2 寫入）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { validateExportPackage, type Environment } from '../server/utils/faanjyut/import-contract'
import { runDryRunDbPhase } from '../server/utils/faanjyut/dry-run'
import { buildSchemaDryRunReport, exitCodeForDryRun, writeDryRunReports } from '../server/utils/faanjyut/report'
import { adaptMongooseDb } from '../server/utils/faanjyut/mongo-db'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')

function loadDotEnv() {
  const envPath = resolve(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]]) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

interface CliArgs {
  input: string | null
  dryRun: boolean
  mode: string | null
  environment: string
  confirmWrite: string | null
  reportDir: string
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    input: null,
    dryRun: false,
    mode: null,
    environment: 'staging',
    confirmWrite: null,
    reportDir: resolve(root, '.artifacts/faanjyut/dry-run'),
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

function usage(): string {
  return [
    '用法：npm run seed:faanjyut -- [options]',
    '',
    '  --input <dir>          ETL 導出目錄（含 import_manifest.json + 7 類 NDJSON + reports/）',
    '  --dry-run              dry-run 模式（P1 唯一實現；默認）',
    '  --mode <dry-run|initial|final_cutover>  寫入模式屬 P2（--mode initial 等將以退出碼 3 結束）',
    '  --environment <local|staging|production>  默認 staging',
    '  --confirm-write <db>   僅寫入模式使用（P2）；dry-run 不接受',
    '  --report-dir <dir>     產物目錄，默認 .artifacts/faanjyut/dry-run',
    '  --help',
    '',
    '示例（契約 §8）：',
    '  npm run seed:faanjyut -- --input ../FaanJyutZibiu2Database/out/faanjyut-mongodb \\',
    '    --dry-run --environment staging --report-dir .artifacts/faanjyut/dry-run',
    ''
  ].join('\n')
}

function main(): void {
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

  // 寫入模式（P2）：顯式 --mode initial/final_cutover 或 --confirm-write → 退出碼 3
  const writeRequested = (args.mode === 'initial' || args.mode === 'final_cutover' || args.confirmWrite !== null)
  if (writeRequested) {
    console.error('尚未實現：寫入模式（--mode initial/final_cutover）按 ImportDataContract.md §9 屬 P2；本期只做 dry-run。')
    process.exit(3)
  }
  if (args.mode !== null && args.mode !== 'dry-run') {
    console.error(`錯誤：未知 --mode '${args.mode}'（P1 支持 dry-run；initial/final_cutover 屬 P2）`)
    process.exit(1)
  }

  const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI（dry-run 需只讀連接以產出 databaseProof）')
    process.exit(1)
  }

  const runId = `fjdr_${nanoid(16)}`
  const startedAt = new Date().toISOString()
  const environment = args.environment as Environment

  runDryRun(args.input, environment, args.reportDir, runId, startedAt, mongoUri)
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

main()
