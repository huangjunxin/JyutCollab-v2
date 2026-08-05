/**
 * 寫入階段（ImportDataContract.md §7、§9；ImplementationPlan P2）。
 *
 * 流程：預檢（dry-run 全套，blocker>0 整批中止）→ 建 ImportBatch running →
 * 按 columns → lexemes → entries/external_etymons → cell_states → links/comments 順序
 * 以有界 bulkWrite insert-only 寫入（每條注入 createdAt/updatedAt 與 §7 的 importBatchId 路徑）→
 * 全部成功標 completed；任何一步失敗標 failed 並向上拋（不得自動吞錯繼續，
 * 須先 rollback:faanjyut 按 batchId 回滾再重試）。
 *
 * 通過 WriteDb 抽象訪問數據庫（真實實現見 mongo-db.ts；單元測試用 fake）。
 */
import { createReadStream } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import type { Environment, ValidatedExport } from './import-contract'
import { NDJSON_SCHEMAS } from './ndjson-schemas'

/** 寫入階段所需的 DB 接口（真實/測試可注入） */
export interface WriteDb {
  /** insert-only 批量寫入；返回實際插入數 */
  insertBatch(collection: string, docs: Array<Record<string, unknown>>): Promise<number>
  createImportBatch(doc: Record<string, unknown>): Promise<void>
  updateImportBatch(batchId: string, set: Record<string, unknown>): Promise<void>
}

/** 契約 §7：各 collection 的 importBatchId 注入路徑（dot path） */
export const COLLECTION_BATCH_ID_PATH: Record<string, string> = {
  lexemes: 'meta.importBatchId',
  entries: 'meta.importBatchId',
  external_etymons: 'meta.importBatchId',
  faanjyut_columns: 'importBatchId',
  faanjyut_cell_states: 'source.importBatchId',
  faanjyut_comments: 'legacyMeta.importBatchId',
  faanjyut_links: 'source.importBatchId'
}

/** 契約 §9 寫入順序：columns → lexemes → entries/external → cell_states → links/comments */
export const WRITE_ORDER: Array<{ collection: string; ndjsonFile: string }> = [
  { collection: 'faanjyut_columns', ndjsonFile: 'columns.ndjson' },
  { collection: 'lexemes', ndjsonFile: 'lexemes.ndjson' },
  { collection: 'entries', ndjsonFile: 'entries.ndjson' },
  { collection: 'external_etymons', ndjsonFile: 'external_etymons.ndjson' },
  { collection: 'faanjyut_cell_states', ndjsonFile: 'cell_states.ndjson' },
  { collection: 'faanjyut_links', ndjsonFile: 'links.ndjson' },
  { collection: 'faanjyut_comments', ndjsonFile: 'comments.ndjson' }
]

/** 回滾順序 = 寫入順序的反向（契約 §9） */
export const ROLLBACK_ORDER: string[] = WRITE_ORDER.map((w) => w.collection).reverse()

export const DEFAULT_BULK_SIZE = 1000

export interface WriteImportOptions {
  batchId: string
  mode: 'initial' | 'final_cutover'
  environment: Environment
  precheckRunId: string
  /** 寫入產物目錄（schema_dry_run_report.json / import_write_report.json / index-plan.json），記入 ImportBatch.reportDir 供導入報告 API 讀取 */
  reportDir?: string
  bulkSize?: number
  onProgress?: (collection: string, written: number) => void
}

export interface WriteImportResult {
  batchId: string
  status: 'completed'
  counts: Record<string, number>
  bulkSize: number
  startedAt: string
  completedAt: string
}

/** 按 dot path 設置值（僅用於注入 importBatchId；path 均為固定常量） */
function setPath(doc: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.')
  let node = doc
  for (let i = 0; i < parts.length - 1; i += 1) {
    const next = node[parts[i]]
    if (typeof next !== 'object' || next === null) {
      node[parts[i]] = {}
    }
    node = node[parts[i]] as Record<string, unknown>
  }
  node[parts[parts.length - 1]] = value
}

/** 流式讀取 NDJSON，按 bulkSize 聚批回調（逐行 Zod 復驗；失敗即中止整批） */
async function streamNdjsonChunks(
  filePath: string,
  ndjsonFile: string,
  bulkSize: number,
  onChunk: (docs: Array<Record<string, unknown>>) => Promise<void>
): Promise<number> {
  const schema = NDJSON_SCHEMAS[ndjsonFile]
  if (!schema) throw new Error(`無 DTO schema 的 NDJSON 文件：${ndjsonFile}`)
  const rl = createInterface({ input: createReadStream(filePath, 'utf8'), crlfDelay: Infinity })
  let total = 0
  let lineNo = 0
  let chunk: Array<Record<string, unknown>> = []
  for await (const line of rl) {
    lineNo += 1
    const trimmed = line.trim()
    if (!trimmed) continue
    const parsed = schema.safeParse(JSON.parse(trimmed))
    if (!parsed.success) {
      throw new Error(`寫入復驗失敗 ${ndjsonFile}:${lineNo}：${parsed.error.issues[0]?.message ?? 'unknown'}`)
    }
    chunk.push(parsed.data as Record<string, unknown>)
    total += 1
    if (chunk.length >= bulkSize) {
      await onChunk(chunk)
      chunk = []
    }
  }
  if (chunk.length > 0) await onChunk(chunk)
  return total
}

/**
 * 執行寫入。前提：調用方已完成 dry-run 預檢且 blockers=0。
 * 失敗時 ImportBatch 標 failed 並重拋異常。
 */
export async function runWriteImport(
  db: WriteDb,
  inputDir: string,
  validated: ValidatedExport,
  options: WriteImportOptions
): Promise<WriteImportResult> {
  const bulkSize = options.bulkSize ?? DEFAULT_BULK_SIZE
  const startedAt = new Date()
  const counts: Record<string, number> = {}

  await db.createImportBatch({
    batchId: options.batchId,
    mode: options.mode,
    environment: options.environment,
    status: 'running',
    source: {
      sourceWorkbook: validated.manifest.sourceWorkbook,
      sourceFileSha256: validated.manifest.sourceFileSha256,
      manifestSha256: validated.manifestSha256
    },
    precheckRunId: options.precheckRunId,
    reportDir: options.reportDir,
    bulkSize,
    counts: { written: {} },
    startedAt
  })

  try {
    for (const { collection, ndjsonFile } of WRITE_ORDER) {
      const batchIdPath = COLLECTION_BATCH_ID_PATH[collection]
      const written = await streamNdjsonChunks(join(inputDir, ndjsonFile), ndjsonFile, bulkSize, async (docs) => {
        const now = new Date()
        for (const doc of docs) {
          doc.createdAt = now
          doc.updatedAt = now
          setPath(doc, batchIdPath, options.batchId)
        }
        await db.insertBatch(collection, docs)
      })
      counts[collection] = written
      options.onProgress?.(collection, written)
    }
  } catch (error) {
    await db.updateImportBatch(options.batchId, {
      status: 'failed',
      failedAt: new Date(),
      error: error instanceof Error ? error.message : String(error),
      'counts.written': counts
    })
    throw error
  }

  const completedAt = new Date()
  await db.updateImportBatch(options.batchId, {
    status: 'completed',
    completedAt,
    'counts.written': counts
  })

  return {
    batchId: options.batchId,
    status: 'completed',
    counts,
    bulkSize,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString()
  }
}
