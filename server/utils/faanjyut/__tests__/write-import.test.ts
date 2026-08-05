/**
 * write-import 單元測試（契約 §7/§9）：
 * 寫入順序、importBatchId 注入路徑、createdAt/updatedAt 注入、
 * 批次狀態流轉（running → completed / failed）、失敗即中止。
 */
import { describe, expect, it } from 'vitest'
import { validateExportPackage } from '../import-contract'
import {
  COLLECTION_BATCH_ID_PATH,
  ROLLBACK_ORDER,
  WRITE_ORDER,
  runWriteImport,
  type WriteDb
} from '../write-import'
import { buildFixtureDir } from './fixtures'

interface FakeWriteDb extends WriteDb {
  inserted: Record<string, Array<Record<string, unknown>>>
  batchDoc: Record<string, unknown> | null
  batchUpdates: Array<Record<string, unknown>>
}

function fakeWriteDb(options: { failOnCollection?: string } = {}): FakeWriteDb {
  const inserted: Record<string, Array<Record<string, unknown>>> = {}
  const batchUpdates: Array<Record<string, unknown>> = []
  return {
    inserted,
    batchDoc: null,
    batchUpdates,
    async insertBatch(collection, docs) {
      if (options.failOnCollection === collection) {
        throw new Error(`模擬寫入失敗：${collection}`)
      }
      inserted[collection] = [...(inserted[collection] ?? []), ...docs]
      return docs.length
    },
    async createImportBatch(doc) {
      this.batchDoc = doc
    },
    async updateImportBatch(_batchId, set) {
      batchUpdates.push(set)
    }
  }
}

function getPath(doc: Record<string, unknown>, path: string): unknown {
  let node: unknown = doc
  for (const part of path.split('.')) {
    node = (node as Record<string, unknown>)?.[part]
  }
  return node
}

describe('faanjyut/write-import 寫入階段', () => {
  it('按契約 §9 順序寫入：columns → lexemes → entries/external → cell_states → links/comments', async () => {
    const dir = buildFixtureDir()
    const validated = await validateExportPackage(dir, 'local')
    const db = fakeWriteDb()
    await runWriteImport(db, dir, validated, {
      batchId: 'fjb_test1',
      mode: 'initial',
      environment: 'local',
      precheckRunId: 'fjdr_test'
    })
    expect(Object.keys(db.inserted)).toEqual(WRITE_ORDER.map((w) => w.collection))
  })

  it('每條文檔注入 importBatchId（契約 §7 各路徑）與 createdAt/updatedAt', async () => {
    const dir = buildFixtureDir()
    const validated = await validateExportPackage(dir, 'local')
    const db = fakeWriteDb()
    await runWriteImport(db, dir, validated, {
      batchId: 'fjb_test2',
      mode: 'initial',
      environment: 'local',
      precheckRunId: 'fjdr_test'
    })
    for (const [collection, docs] of Object.entries(db.inserted)) {
      expect(docs.length).toBeGreaterThan(0)
      for (const doc of docs) {
        expect(getPath(doc, COLLECTION_BATCH_ID_PATH[collection])).toBe('fjb_test2')
        expect(doc.createdAt).toBeInstanceOf(Date)
        expect(doc.updatedAt).toBeInstanceOf(Date)
      }
    }
  })

  it('寫入計數 = 契約 valid 計數；批次 running → completed（含 counts）', async () => {
    const dir = buildFixtureDir()
    const validated = await validateExportPackage(dir, 'local')
    const db = fakeWriteDb()
    const result = await runWriteImport(db, dir, validated, {
      batchId: 'fjb_test3',
      mode: 'initial',
      environment: 'local',
      precheckRunId: 'fjdr_test',
      bulkSize: 1 // 強制多批，驗證有界 bulkWrite 聚批正確
    })
    expect(result.status).toBe('completed')
    expect(db.batchDoc?.status).toBe('running')
    expect(db.batchDoc?.batchId).toBe('fjb_test3')
    for (const { collection, ndjsonFile } of WRITE_ORDER) {
      const expected = validated.counts[ndjsonFile]?.valid ?? 0
      expect(result.counts[collection]).toBe(expected)
      expect(db.inserted[collection]?.length).toBe(expected)
    }
    const completedUpdate = db.batchUpdates.find((u) => u.status === 'completed')
    expect(completedUpdate).toBeTruthy()
    expect((completedUpdate as Record<string, Record<string, number>>)['counts.written']).toEqual(result.counts)
  })

  it('寫入失敗：批次標 failed（含 error），後續 collection 不再寫，異常重拋', async () => {
    const dir = buildFixtureDir()
    const validated = await validateExportPackage(dir, 'local')
    const db = fakeWriteDb({ failOnCollection: 'entries' })
    await expect(runWriteImport(db, dir, validated, {
      batchId: 'fjb_test4',
      mode: 'initial',
      environment: 'local',
      precheckRunId: 'fjdr_test'
    })).rejects.toThrow('模擬寫入失敗')
    // entries 之前已寫 columns/lexemes；之後的 external_etymons/cell_states/links/comments 不得寫
    expect(Object.keys(db.inserted)).toEqual(['faanjyut_columns', 'lexemes'])
    const failedUpdate = db.batchUpdates.find((u) => u.status === 'failed')
    expect(failedUpdate).toBeTruthy()
    expect(String(failedUpdate?.error)).toContain('模擬寫入失敗')
    expect(db.batchUpdates.some((u) => u.status === 'completed')).toBe(false)
  })

  it('回滾順序常量 = 寫入順序反向', () => {
    expect(ROLLBACK_ORDER).toEqual(WRITE_ORDER.map((w) => w.collection).reverse())
  })
})
