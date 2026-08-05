import { describe, it, expect } from 'vitest'
import { runDryRunDbPhase, type DryRunDb } from '../dry-run'
import { buildSchemaDryRunReport, exitCodeForDryRun } from '../report'
import { validateExportPackage, FINDING_CODES, type ValidatedExport } from '../import-contract'
import { buildFixtureDir, LEXEME_1, KEY_1 } from './fixtures'
import type { IndexPlan } from '../index-plan'

/** 可控 fake DB：記錄 command，前後計數可切換，可返回衝突文檔 */
function fakeDb(options: {
  collectionsBefore?: string[]
  collectionsAfter?: string[]
  counts?: Record<string, number>
  injectedWriteCommands?: Array<{ commandName: string; ns?: string }>
  existingDocs?: Record<string, Array<Record<string, unknown>>>
} = {}): { db: DryRunDb; commands: Array<{ commandName: string; ns?: string }> } {
  const {
    collectionsBefore = ['lexemes', 'entries'],
    collectionsAfter,
    counts = { lexemes: 5, entries: 10 },
    injectedWriteCommands = [],
    existingDocs = {}
  } = options
  const commands: Array<{ commandName: string; ns?: string }> = []
  const injected = [...injectedWriteCommands]
  const listeners: Array<(e: { commandName: string; ns?: string }) => void> = []

  const db: DryRunDb = {
    async listCollectionNames() {
      commands.push({ commandName: 'listCollections' })
      // 首次調用為 before，第二次為 after
      const first = commands.filter((c) => c.commandName === 'listCollections').length === 1
      return first ? collectionsBefore : (collectionsAfter ?? collectionsBefore)
    },
    async estimatedCount(name) {
      commands.push({ commandName: 'aggregate', ns: `db.${name}` })
      return counts[name] ?? 0
    },
    async indexes(name) {
      commands.push({ commandName: 'listIndexes', ns: `db.${name}` })
      return existingDocs[name] !== undefined ? [] : []
    },
    async find(name, filter, projection) {
      void filter; void projection
      commands.push({ commandName: 'find', ns: `db.${name}` })
      return existingDocs[name] ?? []
    },
    onCommandStarted(cb) {
      listeners.push(cb)
      // 模擬 runDryRunDbPhase 執行期間出現寫命令
      for (const e of injected) cb(e)
      return () => {
        const i = listeners.indexOf(cb)
        if (i >= 0) listeners.splice(i, 1)
      }
    }
  }
  void injected
  return { db, commands }
}

async function buildValidated(): Promise<ValidatedExport> {
  const dir = buildFixtureDir()
  return validateExportPackage(dir, 'local')
}

const emptyIndexPlan: IndexPlan = { existing: [], expected: [], create: [], drop: [], summary: { createCount: 0, dropCount: 0, headwordSearchResidue: 0 } }

describe('faanjyut/dry-run DB 階段（零寫入證明）', () => {
  it('只讀命令 + 前後計數一致 → 零 blocker、writeCommandsObserved 為空、unchanged=true', async () => {
    const { db } = fakeDb()
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    expect(result.blockers).toEqual([])
    expect(result.databaseProof.writeCommandsObserved).toEqual([])
    expect(result.databaseProof.unchanged).toBe(true)
    expect(result.databaseProof.collectionNamesBefore).toEqual(['entries', 'lexemes'])
    expect(result.databaseProof.collectionsBefore).toEqual({ entries: 10, lexemes: 5 })
    expect(result.databaseProof.collectionsAfter).toEqual({ entries: 10, lexemes: 5 })
  })

  it('觀察到寫命令 → DATABASE_WRITE_COMMAND_OBSERVED blocker（退出碼 2）', async () => {
    const { db } = fakeDb({ injectedWriteCommands: [{ commandName: 'insert', ns: 'db.lexemes' }, { commandName: 'createIndexes', ns: 'db.entries' }] })
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    const blocker = result.blockers.find((f) => f.code === FINDING_CODES.writeCommandObserved)
    expect(blocker).toBeTruthy()
    expect(result.databaseProof.writeCommandsObserved).toEqual(['insert@db.lexemes', 'createIndexes@db.entries'])
    const report = buildSchemaDryRunReport({
      runId: 'fjdr_test',
      environment: 'local',
      startedAt: new Date().toISOString(),
      validated,
      indexPlan: result.indexPlan,
      databaseProof: result.databaseProof,
      dbPhaseBlockers: result.blockers,
      dbPhaseWarnings: result.warnings
    })
    expect(exitCodeForDryRun(report)).toBe(2)
  })

  it('前後 collection 計數變化 → DATABASE_MUTATED_DURING_DRY_RUN blocker', async () => {
    const { db } = fakeDb({ counts: { lexemes: 5, entries: 10 }, collectionsAfter: ['lexemes', 'entries', 'faanjyut_columns'] })
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    expect(result.blockers.some((f) => f.code === FINDING_CODES.databaseMutated)).toBe(true)
    expect(result.databaseProof.unchanged).toBe(false)
  })

  it('目標衝突：lexemes sourceKey 已存在 → TARGET_SOURCE_KEY_CONFLICT', async () => {
    const { db } = fakeDb({
      existingDocs: {
        lexemes: [{ meta: { sourceKey: KEY_1 } }]
      }
    })
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    expect(result.blockers.some((f) => f.code === FINDING_CODES.targetSourceKeyConflict)).toBe(true)
  })

  it('目標衝突：lexemes id 已存在 → TARGET_ID_CONFLICT', async () => {
    const { db } = fakeDb({
      existingDocs: {
        lexemes: [{ id: LEXEME_1 }]
      }
    })
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    expect(result.blockers.some((f) => f.code === FINDING_CODES.targetIdConflict)).toBe(true)
  })

  it('殘留 unique 索引 → BLOCKING_INDEX blocker', async () => {
    const { db } = fakeDb({
      existingDocs: {
        // 讓 indexes() 返回殘留 unique 索引
      }
    })
    // 覆蓋 indexes 返回：用一個包裝 db
    const base = fakeDb()
    const uniqueResidue = { name: 'headword.search_1', key: { 'headword.search': 1 }, unique: true }
    const wrapped: DryRunDb = {
      ...base.db,
      async indexes(name) {
        if (name === 'entries') return [uniqueResidue]
        return []
      }
    }
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(wrapped, validated, 'local')
    expect(result.blockers.some((f) => f.code === FINDING_CODES.blockingIndex)).toBe(true)
    expect(result.indexPlan.drop.some((d) => d.reason === 'plan_b_residue')).toBe(true)
  })

  it('無衝突 + 無寫命令 → exitCodeForDryRun 0', async () => {
    const { db } = fakeDb()
    const validated = await buildValidated()
    const result = await runDryRunDbPhase(db, validated, 'local')
    const report = buildSchemaDryRunReport({
      runId: 'fjdr_test',
      environment: 'local',
      startedAt: new Date().toISOString(),
      validated,
      indexPlan: result.indexPlan,
      databaseProof: result.databaseProof,
      dbPhaseBlockers: result.blockers,
      dbPhaseWarnings: result.warnings
    })
    expect(report.passed).toBe(true)
    expect(exitCodeForDryRun(report)).toBe(0)
  })

  it('blockers 併入報告後 passed=false（校驗層 blocker）', async () => {
    // 用帶 blocker 的 validated（重複 sourceKey）
    const dir = buildFixtureDir({
      mutate: (fileName, records) => {
        if (fileName === 'lexemes.ndjson') {
          return [records[0], records[0], ...records.slice(1)]
        }
        return records
      }
    })
    const validated = await validateExportPackage(dir, 'local')
    expect(validated.blockers.length).toBeGreaterThan(0)
    const { db } = fakeDb()
    const result = await runDryRunDbPhase(db, validated, 'local')
    const report = buildSchemaDryRunReport({
      runId: 'fjdr_test',
      environment: 'local',
      startedAt: new Date().toISOString(),
      validated,
      indexPlan: result.indexPlan,
      databaseProof: result.databaseProof,
      dbPhaseBlockers: result.blockers,
      dbPhaseWarnings: result.warnings
    })
    expect(report.passed).toBe(false)
    expect(exitCodeForDryRun(report)).toBe(2)
  })

  it('空 indexPlan 傳入 report 可序列化（含 summary）', () => {
    const report = buildSchemaDryRunReport({
      runId: 'fjdr_test',
      environment: 'staging',
      startedAt: new Date().toISOString(),
      validated: {
        manifest: { sourceWorkbook: 'x.xlsx', sourceFileSha256: 'a'.repeat(64), sourceBook: 'faanjyut', baselineLevel: 'regression', sourceExportedAt: null, sourceSheet: 'S', schemaVersion: 1, inputFiles: { workbook: null, filterRules: null, commentsExport: null }, generatedAt: '', generator: { name: 't', gitCommit: null, gitDirty: false }, counts: {}, files: {} },
        manifestSha256: 'b'.repeat(64),
        counts: {},
        blockers: [],
        warnings: [],
        conflictFacts: { lexemeSourceKeys: [], lexemeIds: [], entryCells: [], columnPositions: [], columnActiveMappings: [], allIds: {} }
      } as unknown as ValidatedExport,
      indexPlan: emptyIndexPlan,
      databaseProof: {
        collectionNamesBefore: ['lexemes'],
        collectionNamesAfter: ['lexemes'],
        collectionsBefore: { lexemes: 1 },
        collectionsAfter: { lexemes: 1 },
        writeCommandsObserved: [],
        unchanged: true
      },
      dbPhaseBlockers: [],
      dbPhaseWarnings: []
    })
    expect(report.passed).toBe(true)
    expect(report.indexes.summary.createCount).toBe(0)
    expect(report.databaseProof?.unchanged).toBe(true)
    expect(JSON.parse(JSON.stringify(report)).schemaVersion).toBe(1)
  })
})
