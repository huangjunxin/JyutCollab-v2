#!/usr/bin/env tsx
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'
import { recoverImportBatch } from '../server/utils/faanjyut/recovery'
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
    if (!match || process.env[match[1]] !== undefined) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

interface CliArgs {
  batchId: string | null
  confirmWrite: string | null
  confirmNoActiveWriter: string | null
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { batchId: null, confirmWrite: null, confirmNoActiveWriter: null, help: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case '--help': case '-h': args.help = true; break
      case '--batch-id': args.batchId = next() ?? null; break
      case '--confirm-write': args.confirmWrite = next() ?? null; break
      case '--confirm-no-active-writer': args.confirmNoActiveWriter = next() ?? null; break
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
    '用法：npm run recover:faanjyut -- [options]',
    '',
    '  --batch-id <fjb_...>             要恢復的 running 批次',
    '  --confirm-write <db>            必須等於實際連接的 db 名',
    '  --confirm-no-active-writer <id> 必須等於 batchId；操作前確認導入進程已停止',
    '  --help',
    '',
    '恢復成功後，再執行 rollback:faanjyut 清除該批次的殘留數據。',
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
  if (!args.batchId.startsWith('fjb_')) {
    console.error('錯誤：--batch-id 必須使用 fjb_ 前綴')
    return 1
  }
  if (!args.confirmWrite) {
    console.error('錯誤：缺少 --confirm-write <精確 db 名>')
    return 1
  }
  if (!args.confirmNoActiveWriter) {
    console.error('錯誤：缺少 --confirm-no-active-writer <batchId>')
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
      console.error(`錯誤：--confirm-write '${args.confirmWrite}' 與實際連接的 db '${dbName}' 不一致`)
      return 1
    }
    const result = await recoverImportBatch(adaptMongooseWriteDb(mongoose.connection), {
      batchId: args.batchId,
      confirmedBatchId: args.confirmNoActiveWriter
    })
    console.log(`批次已標記為 interrupted：batchId=${result.batchId} interruptedAt=${result.interruptedAt}`)
    console.log(`下一步：npm run rollback:faanjyut -- --batch-id ${result.batchId} --confirm-write ${dbName}`)
    return 0
  } finally {
    await mongoose.disconnect()
  }
}

main()
  .then((exitCode) => process.exit(exitCode))
  .catch((error: unknown) => {
    console.error('恢復失敗:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
