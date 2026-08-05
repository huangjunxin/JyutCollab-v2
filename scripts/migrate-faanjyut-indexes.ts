#!/usr/bin/env tsx
/**
 * 泛粵字表索引遷移（P1 實現，見 ImportDataContract.md §10）。
 *
 * 職責：對比真實 DB 索引與 7 個導入 collection 的 Mongoose 期望索引，
 * 輸出 existing/expected/create/drop 四清單（含 headword.search 方案 B 殘留索引
 * 顯式列入 drop）。只讀，不 create/drop 任何索引。
 *
 * 寫模式（--apply / --confirm-write）按 ImplementationPlan Phase 2 屬 P2（人工審閱後在 staging 應用），
 * 保持退出碼 3。
 *
 * 退出碼：0 通過（計劃已產出，不要求無差異）/ 1 運行錯誤 / 3 未實現（apply 屬 P2）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { FAANJYUT_IMPORT_COLLECTIONS } from '../server/utils/faanjyut/import-models'
import {
  computeIndexPlan,
  expectedIndexPlan,
  type IndexPlanItem,
  type ExistingIndex
} from '../server/utils/faanjyut/index-plan'
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
  dryRun: boolean
  apply: boolean
  confirmWrite: string | null
  reportDir: string
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    dryRun: false,
    apply: false,
    confirmWrite: null,
    reportDir: resolve(root, '.artifacts/faanjyut/index-plan'),
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
      case '--dry-run': args.dryRun = true; break
      case '--apply': args.apply = true; break
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
    '用法：npm run migrate:faanjyut-indexes -- [options]',
    '',
    '  --dry-run              只讀輸出 existing/expected/create/drop 計劃（P1；默認）',
    '  --apply                應用索引計劃（P2：人工審閱後在 staging 應用），本期退出碼 3',
    '  --confirm-write <db>   apply 模式要求（P2）',
    '  --report-dir <dir>     產物目錄，默認 .artifacts/faanjyut/index-plan',
    '  --help',
    '',
    '示例：',
    '  npm run migrate:faanjyut-indexes -- --dry-run --report-dir .artifacts/faanjyut/index-plan',
    ''
  ].join('\n')
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

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage())
    process.exit(0)
  }
  if (args.apply || args.confirmWrite !== null) {
    console.error('尚未實現：apply 索引計劃（--apply）按 ImplementationPlan Phase 2 屬 P2；本期只做 dry-run 計劃。')
    process.exit(3)
  }

  const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI（dry-run 需只讀連接讀取真實索引）')
    process.exit(1)
  }

  runIndexPlan(args.reportDir, mongoUri)
    .then((exitCode) => process.exit(exitCode))
    .catch((error: unknown) => {
      console.error('運行錯誤:', error)
      process.exit(1)
    })
}

async function runIndexPlan(reportDir: string, mongoUri: string): Promise<number> {
  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  console.log(`已連接 MongoDB（db: ${mongoose.connection.name}，autoIndex:false autoCreate:false）`)

  try {
    const db = adaptMongooseDb(mongoose.connection)
    const collectionNames = await db.listCollectionNames()

    const existingByCollection: Record<string, ExistingIndex[]> = {}
    for (const { collection } of FAANJYUT_IMPORT_COLLECTIONS) {
      if (!collectionNames.includes(collection)) {
        console.log(`[info] collection 不存在（索引將隨 P2 導入創建）：${collection}`)
        continue
      }
      const idxs = await db.indexes(collection)
      existingByCollection[collection] = idxs.map((i) => ({
        collection,
        name: i.name,
        key: i.key,
        options: { unique: i.unique, sparse: i.sparse, partialFilterExpression: i.partialFilterExpression }
      }))
    }

    const expectedByCollection = expectedIndexPlan(FAANJYUT_IMPORT_COLLECTIONS)
    const plan = computeIndexPlan(existingByCollection, expectedByCollection)

    const output = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      dbName: mongoose.connection.name,
      collections: [...new Set([...Object.keys(existingByCollection), ...Object.keys(expectedByCollection)])].sort(),
      summary: plan.summary,
      existing: plan.existing.map((i) => ({ collection: i.collection, name: i.name, key: i.key, options: i.options })),
      expected: plan.expected.map((i) => ({ collection: i.collection, key: i.key, options: i.options })),
      create: plan.create.map((i) => ({ collection: i.collection, key: i.key, options: i.options })),
      drop: plan.drop.map((i) => ({ collection: i.collection, name: i.name, key: i.key, options: i.options, reason: i.reason }))
    }

    mkdirSync(reportDir, { recursive: true })
    const jsonPath = resolve(reportDir, 'index-plan.json')
    writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')

    console.log('')
    console.log(`索引計劃（create=${plan.summary.createCount} / drop=${plan.summary.dropCount}，headword.search 方案B殘留=${plan.summary.headwordSearchResidue}）`)
    console.log('')
    if (plan.create.length > 0) {
      console.log('--- create ---')
      for (const item of plan.create) console.log(`  + ${keyText(item)}`)
    }
    if (plan.drop.length > 0) {
      console.log('--- drop ---')
      for (const item of plan.drop) console.log(`  - ${keyText(item)}`)
    }
    if (plan.create.length === 0 && plan.drop.length === 0) {
      console.log('（無差異：現有索引已符合期望）')
    }
    console.log('')
    console.log(`計劃已寫入：${jsonPath}`)
    console.log('人工審閱後再以 --apply（P2）應用；importer 不會自動 syncIndexes（契約 §10）。')
    return 0
  } finally {
    await mongoose.disconnect()
  }
}

main()
