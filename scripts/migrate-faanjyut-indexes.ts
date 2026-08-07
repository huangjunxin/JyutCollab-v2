#!/usr/bin/env tsx
/**
 * 泛粵字表索引遷移（P1 計劃 + P2 apply，見 ImportDataContract.md §10）。
 *
 * 職責：對比真實 DB 索引與 7 個導入 collection 的 Mongoose 期望索引，
 * 輸出 existing/expected/create/drop 四清單（含 headword.search 方案 B 殘留索引
 * 顯式列入 drop）。
 *
 * --apply（P2）：人工審閱計劃後應用 create/drop；防誤寫要求 --confirm-write
 * 等於實際連接的 db 名；`headword.search` 殘留索引按方案 B 清除（production 僅 P6）。
 *
 * 退出碼：0 通過 / 1 運行錯誤（含 --confirm-write 不符）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { FAANJYUT_INDEXED_COLLECTIONS } from '../server/utils/faanjyut/import-models'
import {
  computeIndexPlan,
  expectedIndexPlan,
  type IndexPlan,
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
    if (!match || process.env[match[1]] !== undefined) continue  // 显式空值（如测试传 ''）不被 .env 覆盖
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
    '  --dry-run              只讀輸出 existing/expected/create/drop 計劃（默認）',
    '  --apply                應用索引計劃（人工審閱後執行 create/drop）',
    '  --confirm-write <db>   apply 模式必填：必須等於實際連接的 db 名（防誤寫）',
    '  --report-dir <dir>     產物目錄，默認 .artifacts/faanjyut/index-plan',
    '  --help',
    '',
    '示例：',
    '  npm run migrate:faanjyut-indexes -- --dry-run --report-dir .artifacts/faanjyut/index-plan',
    '  npm run migrate:faanjyut-indexes -- --apply --confirm-write <db>',
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
  loadDotEnv()  // 审计 H3：.env 与 shell 环境同等生效（防误连平台默认库）
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    process.stdout.write(usage())
    process.exit(0)
  }
  if (args.apply && !args.confirmWrite) {
    console.error('錯誤：--apply 必須提供 --confirm-write <精確 db 名>（防誤寫）')
    process.exit(1)
  }
  if (!args.apply && args.confirmWrite !== null) {
    console.error('錯誤：--confirm-write 僅 --apply 模式使用')
    process.exit(1)
  }

  const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
  if (!mongoUri) {
    console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI（dry-run 需只讀連接讀取真實索引）')
    process.exit(1)
  }

  runIndexPlan(args.reportDir, mongoUri, args.apply ? args.confirmWrite : null)
    .then((exitCode) => process.exit(exitCode))
    .catch((error: unknown) => {
      console.error('運行錯誤:', error)
      process.exit(1)
    })
}

async function runIndexPlan(reportDir: string, mongoUri: string, confirmWrite: string | null): Promise<number> {
  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  const dbName = mongoose.connection.name
  console.log(`已連接 MongoDB（db: ${dbName}，autoIndex:false autoCreate:false）`)

  try {
    if (confirmWrite !== null && confirmWrite !== dbName) {
      console.error(`錯誤：--confirm-write '${confirmWrite}' 與實際連接的 db '${dbName}' 不一致，拒絕 apply（防誤寫）`)
      return 1
    }
    const db = adaptMongooseDb(mongoose.connection)
    const collectionNames = await db.listCollectionNames()

    const existingByCollection: Record<string, ExistingIndex[]> = {}
    for (const { collection } of FAANJYUT_INDEXED_COLLECTIONS) {
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

    const expectedByCollection = expectedIndexPlan(FAANJYUT_INDEXED_COLLECTIONS)
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

    if (confirmWrite === null) {
      console.log('人工審閱後再以 --apply --confirm-write <db> 應用；importer 不會自動 syncIndexes（契約 §10）。')
      return 0
    }

    // --apply：應用 create → drop（create 先於 drop，避免瞬時無索引窗口擴大）
    const applied = await applyIndexPlan(plan)
    const appliedPath = resolve(reportDir, 'index-plan-applied.json')
    writeFileSync(appliedPath, `${JSON.stringify(applied, null, 2)}\n`, 'utf8')
    console.log(`已應用：created=${applied.created.length} dropped=${applied.dropped.length}（記錄: ${appliedPath}）`)
    return 0
  } finally {
    await mongoose.disconnect()
  }
}

async function applyIndexPlan(plan: IndexPlan): Promise<{ created: IndexPlanItem[]; dropped: IndexPlanItem[] }> {
  const db = mongoose.connection.db
  if (!db) throw new Error('MongoDB 未連接')
  const created: IndexPlanItem[] = []
  const dropped: IndexPlanItem[] = []

  for (const item of plan.create) {
    const options: Record<string, unknown> = {}
    if (item.options.unique) options.unique = true
    if (item.options.sparse) options.sparse = true
    if (item.options.partialFilterExpression) options.partialFilterExpression = item.options.partialFilterExpression
    await db.collection(item.collection).createIndex(item.key as Record<string, number>, options)
    created.push(item)
    console.log(`  [created] ${keyText(item)}`)
  }
  for (const item of plan.drop) {
    if (!item.name) {
      console.log(`  [skip-drop] 無索引名，跳過：${keyText(item)}`)
      continue
    }
    await db.collection(item.collection).dropIndex(item.name)
    dropped.push(item)
    console.log(`  [dropped] ${keyText(item)}`)
  }
  return { created, dropped }
}

main()
