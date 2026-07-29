#!/usr/bin/env tsx
/**
 * 泛粵字表索引遷移（P1 實現，見 ImportDataContract.md §10）。
 * 職責：對比真實 DB 索引與預期索引，輸出 existing/expected/create/drop 清單；
 * 包括 headword.search 方案 B 的殘留索引顯式刪除（不在應用啟動時自動執行）。
 *
 * 當前為 P0 骨架：載入 .env、以 autoIndex:false / autoCreate:false 連接 MongoDB
 * 驗證環境可用，然後以退出碼 3（NOT_IMPLEMENTED）結束。
 * 本骨架不讀取、不創建、不刪除任何索引。
 *
 * 退出碼約定：0 通過 / 1 運行錯誤 / 3 = 功能尚未實現（本期預期行為，不代表遷移成功）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mongoose from 'mongoose'

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

loadDotEnv()

const mongoUri = process.env.FAANJYUT_MONGODB_URI || process.env.MONGODB_URI
if (!mongoUri) {
  console.error('錯誤：未設置 FAANJYUT_MONGODB_URI 或 MONGODB_URI')
  process.exit(1)
}

async function main() {
  await mongoose.connect(mongoUri, {
    autoIndex: false,
    autoCreate: false,
    dbName: process.env.FAANJYUT_DB_NAME || undefined
  })
  console.log(`已連接 MongoDB（db: ${mongoose.connection.name}，autoIndex:false autoCreate:false）`)
  console.error('尚未實現：migrate:faanjyut-indexes 按 ImportDataContract.md §10 於 P1 實現；本骨架未讀取或改動任何索引。')
  await mongoose.disconnect()
  process.exit(3)
}

main().catch((error) => {
  console.error('運行錯誤:', error)
  process.exit(1)
})
