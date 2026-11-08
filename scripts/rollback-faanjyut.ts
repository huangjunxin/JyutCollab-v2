#!/usr/bin/env tsx
/**
 * 泛粵字表按 batchId 回滾（P2 實現，見 ImportDataContract.md §9）。
 *
 * 按寫入順序的反向刪除帶 batchId 的業務文檔；ImportBatch 本身保留並標 rolled_back
 * （含前後各 collection 計數）。批次僅 completed/failed/interrupted 可回滾。
 * 防誤寫：--confirm-write 必須等於實際連接的 db 名。
 *
 * 退出碼：0 回滾完成 / 1 運行錯誤（含批次不存在、狀態不允許、db 名不符）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { runRollback } from '../server/utils/faanjyut/rollback'
import { buildImportRollbackReport, writeImportRollbackReports } from '../server/utils/faanjyut/report'
import { adaptMongooseWriteDb } from '../server/utils/faanjyut/mongo-db'

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
  batchId: string | null
  confirmWrite: string | null
  reportDir: string
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    batchId: null,
    confirmWrite: null,
    reportDir: resolve(root, '.artifacts/faanjyut/rollback'),
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
      case '--batch-id': args.batchId = next() ?? null; break
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
    '用法：npm run rollback:faanjyut -- [options]',
    '',
    '  --batch-id <fjb_...>   要回滾的導入批次（僅 completed/failed/interrupted 可回滾）',
    '  --confirm-write <db>   必填：必須等於實際連接的 db 名（防誤寫）',
    '  --report-dir <dir>     產物目錄，默認 .artifacts/faanjyut/rollback',
    '  --help',
    '',
    '示例：',
    '  npm run rollback:faanjyut -- --batch-id fjb_xxx --confirm-write <db> \\',
    '    --report-dir .artifacts/faanjyut/rollback',
    ''
  ].join('\n')
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage())
    return 0
  }
  if (!args.batchId) {
    console.error('錯誤：缺少 --batch-id <fjb_...>')
    process.stderr.write(usage())
    return 1
  }
  // 审计 L14：批次 ID 必须是 fjb_ 前缀（防手误传任意字符串）
  if (!args.batchId.startsWith('fjb_')) {
    console.error(`錯誤：--batch-id 應為 fjb_ 前綴的批次 ID，實際 '${args.batchId}'`)
    process.stderr.write(usage())
    return 1
  }
  if (!args.confirmWrite) {
    console.error('錯誤：缺少 --confirm-write <精確 db 名>（防誤寫）')
    return 1
  }

  loadDotEnv()
  const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI')
    return 1
  }

  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  const dbName = mongoose.connection.name
  console.log(`已連接 MongoDB（db: ${dbName}，autoIndex:false autoCreate:false）`)

  try {
    if (args.confirmWrite !== dbName) {
      console.error(`錯誤：--confirm-write '${args.confirmWrite}' 與實際連接的 db '${dbName}' 不一致，拒絕回滾（防誤寫）`)
      return 1
    }

    console.log(`回滾批次：${args.batchId}`)
    const result = await runRollback(adaptMongooseWriteDb(mongoose.connection), args.batchId)
    for (const [collection, n] of Object.entries(result.deleted)) {
      console.log(`  刪除 ${collection}: ${n}（before=${result.countsBefore[collection]} after=${result.countsAfter[collection]}）`)
    }

    const report = buildImportRollbackReport(result)
    const paths = writeImportRollbackReports(args.reportDir, report)
    console.log(`報告已寫入:`)
    for (const p of paths) console.log(`  ${p}`)
    console.log(`結果：batchId=${result.batchId} drained=${report.drained} → 退出碼 ${report.drained ? 0 : 1}`)
    return report.drained ? 0 : 1
  } finally {
    await mongoose.disconnect()
  }
}

main()
  .then((exitCode) => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error('運行錯誤:', error)
    process.exit(1)
  })
