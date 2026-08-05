/**
 * dry-run DB 階段（ImportDataContract.md §8、ImplementationPlan P1 任務 4/5/7）。
 *
 * 通過 DryRunDb 抽象訪問數據庫（真實實現見 mongo-db.ts；單元測試用 fake），
 * 全程只讀：
 *  - 前後 collection 名單 + 計數快照（databaseProof）
 *  - 真實索引清單 → 索引計劃（existing/expected/create/drop）
 *  - 目標對象衝突（TARGET_ID_CONFLICT / TARGET_SOURCE_KEY_CONFLICT / BLOCKING_INDEX）
 *  - command 監控：allowlist 之外的任何命令 → DATABASE_WRITE_COMMAND_OBSERVED
 */
import { FINDING_CODES, type Environment, type Finding, type ValidatedExport } from './import-contract'
import { FAANJYUT_INDEXED_COLLECTIONS } from './import-models'
import {
  computeIndexPlan,
  expectedIndexPlan,
  canonicalKey,
  type ExistingIndex,
  type IndexPlan
} from './index-plan'

export interface DryRunIndexDescription {
  name: string
  key: Record<string, number | string>
  unique?: boolean
  sparse?: boolean
  partialFilterExpression?: Record<string, unknown>
  [key: string]: unknown
}

/** dry-run 所需的只讀 DB 接口（真實/測試可注入） */
export interface DryRunDb {
  listCollectionNames(): Promise<string[]>
  estimatedCount(name: string): Promise<number>
  indexes(name: string): Promise<DryRunIndexDescription[]>
  /** 受限查詢：返回匹配文檔（實現方應限制數量） */
  find(name: string, filter: Record<string, unknown>, projection: Record<string, number>): Promise<Array<Record<string, unknown>>>
  /** 訂閱 command 監控；返回退訂函數 */
  onCommandStarted(cb: (event: { commandName: string; ns?: string }) => void): () => void
}

export interface DatabaseProof {
  collectionNamesBefore: string[]
  collectionNamesAfter: string[]
  collectionsBefore: Record<string, number>
  collectionsAfter: Record<string, number>
  writeCommandsObserved: string[]
  unchanged: boolean
}

export interface DryRunDbResult {
  databaseProof: DatabaseProof
  blockers: Finding[]
  warnings: Finding[]
  indexPlan: IndexPlan
}

/** 只讀命令 allowlist（dry-run 全程只允許這些命令；出現其他命令即記錄為寫命令觀察） */
const READ_COMMAND_ALLOWLIST = new Set([
  'hello',
  'isMaster',
  'ismaster',
  'ping',
  'buildInfo',
  'connectionStatus',
  'getParameter',
  'whatsmyuri',
  'saslStart',
  'saslContinue',
  'saslDone',
  'saslResponse',
  'startSessions',
  'endSessions',
  'listCollections',
  'listIndexes',
  'listDatabases',
  'find',
  'getMore',
  'killCursors',
  'aggregate',
  'count',
  'explain',
  'serverStatus',
  'hostInfo',
  'collStats',
  'dbStats',
  'currentOp'
])

const QUERY_CHUNK = 1000
const CONFLICT_REPORT_LIMIT = 10

export async function runDryRunDbPhase(db: DryRunDb, validated: ValidatedExport, _environment: Environment): Promise<DryRunDbResult> {
  const blockers: Finding[] = []
  const warnings: Finding[] = []
  const observed: Array<{ commandName: string; ns?: string }> = []
  const unsubscribe = db.onCommandStarted((e) => observed.push(e))

  try {
    const collectionNamesBefore = (await db.listCollectionNames()).sort()
    const collectionsBefore = await countAll(db, collectionNamesBefore)

    // ---- 索引計劃（真實 DB 索引 vs Mongoose 期望；含 P2 輔助 collection） ----
    const existingByCollection: Record<string, ExistingIndex[]> = {}
    for (const { collection } of FAANJYUT_INDEXED_COLLECTIONS) {
      if (!collectionNamesBefore.includes(collection)) continue
      const idxs = await db.indexes(collection)
      existingByCollection[collection] = idxs.map((i) => ({
        collection,
        name: i.name,
        key: i.key,
        options: {
          unique: i.unique,
          sparse: i.sparse,
          partialFilterExpression: i.partialFilterExpression
        }
      }))
    }
    const expectedByCollection = expectedIndexPlan(FAANJYUT_INDEXED_COLLECTIONS)
    const indexPlan = computeIndexPlan(existingByCollection, expectedByCollection)

    // 殘留 unique 索引會阻礙導入（ImplementationPlan P1 任務 5）
    for (const item of indexPlan.drop) {
      if (item.options.unique) {
        blockers.push({
          code: FINDING_CODES.blockingIndex,
          severity: 'blocker',
          objectType: item.collection,
          message: `殘留 unique 索引 ${item.name ?? canonicalKey(item.key)}（${canonicalKey(item.key)}）不在期望集合，導入前需審閱清除`,
          details: { collection: item.collection, indexName: item.name, key: canonicalKey(item.key) }
        })
      }
    }

    // ---- 目標對象衝突 ----
    blockers.push(...(await checkTargetConflicts(db, validated, collectionNamesBefore)))

    // ---- 後快照 ----
    const collectionNamesAfter = (await db.listCollectionNames()).sort()
    const collectionsAfter = await countAll(db, collectionNamesAfter)

    // ---- command 監控 ----
    const writeCommands = observed
      .filter((e) => !READ_COMMAND_ALLOWLIST.has(e.commandName))
      .map((e) => (e.ns ? `${e.commandName}@${e.ns}` : e.commandName))
    if (writeCommands.length > 0) {
      blockers.push({
        code: FINDING_CODES.writeCommandObserved,
        severity: 'blocker',
        message: `dry-run 觀察到寫命令：${writeCommands.slice(0, 20).join(', ')}`,
        details: { commands: writeCommands }
      })
    }

    const namesEqual = JSON.stringify(collectionNamesBefore) === JSON.stringify(collectionNamesAfter)
    const countsEqual = countsEqualDeep(collectionsBefore, collectionsAfter)
    const unchanged = namesEqual && countsEqual
    if (!unchanged) {
      blockers.push({
        code: FINDING_CODES.databaseMutated,
        severity: 'blocker',
        message: 'dry-run 前後 collection 名單或計數不一致（資料庫被改動）',
        details: {
          namesChanged: !namesEqual,
          countsChanged: !countsEqual,
          collectionsBefore,
          collectionsAfter
        }
      })
    }

    return {
      databaseProof: {
        collectionNamesBefore,
        collectionNamesAfter,
        collectionsBefore,
        collectionsAfter,
        writeCommandsObserved: writeCommands,
        unchanged
      },
      blockers,
      warnings,
      indexPlan
    }
  } finally {
    unsubscribe()
  }
}

async function countAll(db: DryRunDb, names: string[]): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const name of names) {
    try {
      result[name] = await db.estimatedCount(name)
    } catch {
      result[name] = -1 // 讀取失敗（如瞬時刪除），計數未知
    }
  }
  return result
}

function countsEqualDeep(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false
  }
  return true
}

// ---------------------------------------------------------------------------
// 目標對象衝突（契約 §8：按對象判斷）
// ---------------------------------------------------------------------------

async function checkTargetConflicts(db: DryRunDb, validated: ValidatedExport, existingCollections: string[]): Promise<Finding[]> {
  const findings: Finding[] = []
  const facts = validated.conflictFacts

  const reportConflict = (
    code: string,
    objectType: string,
    message: string,
    examples: Array<string | Record<string, unknown>>,
    total: number
  ) => {
    findings.push({
      code,
      severity: 'blocker',
      objectType,
      message: `${message}（${total} 條）`,
      details: { total, examples: examples.slice(0, CONFLICT_REPORT_LIMIT) }
    })
  }

  // ---- lexemes：meta.sourceBook+meta.sourceKey（TARGET_SOURCE_KEY_CONFLICT）與 id（TARGET_ID_CONFLICT） ----
  if (existingCollections.includes('lexemes')) {
    const sourceKeyHits: string[] = []
    for (const chunk of chunked(facts.lexemeSourceKeys, QUERY_CHUNK)) {
      if (chunk.length === 0) continue
      const docs = await db.find('lexemes', { 'meta.sourceBook': 'faanjyut', 'meta.sourceKey': { $in: chunk } }, { 'meta.sourceKey': 1 })
      sourceKeyHits.push(...docs.map((d) => String((d.meta as Record<string, unknown> | undefined)?.sourceKey ?? '')))
    }
    if (sourceKeyHits.length > 0) {
      reportConflict(FINDING_CODES.targetSourceKeyConflict, 'lexemes', '目標 DB 已存在同 sourceBook+sourceKey 的 Lexeme', sourceKeyHits, sourceKeyHits.length)
    }
    const idHits = await findExistingIds(db, 'lexemes', facts.lexemeIds)
    if (idHits.length > 0) {
      reportConflict(FINDING_CODES.targetIdConflict, 'lexemes', '目標 DB 已存在同 id 的 Lexeme', idHits, idHits.length)
    }
  }

  // ---- entries：lexemeId+dialect.name（契約 §8） ----
  if (existingCollections.includes('entries')) {
    const importedCells = new Set(facts.entryCells.map((c) => `${c.lexemeId}|${c.dialectName}`))
    const hits: Array<{ lexemeId: string; dialectName: string }> = []
    for (const chunk of chunked(facts.lexemeIds, QUERY_CHUNK)) {
      if (chunk.length === 0) continue
      const docs = await db.find('entries', { sourceBook: 'faanjyut', lexemeId: { $in: chunk } }, { lexemeId: 1, 'dialect.name': 1 })
      for (const d of docs) {
        const lexemeIdV = String(d.lexemeId ?? '')
        const dialectName = String((d.dialect as Record<string, unknown> | undefined)?.name ?? '')
        if (importedCells.has(`${lexemeIdV}|${dialectName}`)) {
          hits.push({ lexemeId: lexemeIdV, dialectName })
        }
      }
    }
    if (hits.length > 0) {
      reportConflict(FINDING_CODES.targetSourceKeyConflict, 'entries', '目標 DB 已存在同 lexemeId+dialect.name 的 Entry', hits.map((h) => `${h.lexemeId}|${h.dialectName}`), hits.length)
    }
    const idHits = await findExistingIds(db, 'entries', facts.allIds.entries ?? [])
    if (idHits.length > 0) {
      reportConflict(FINDING_CODES.targetIdConflict, 'entries', '目標 DB 已存在同 id 的 Entry', idHits, idHits.length)
    }
  }

  // ---- external_etymons / cell_states / comments / links：id ----
  for (const [collection, ids] of [
    ['external_etymons', facts.allIds.external_etymons],
    ['faanjyut_columns', facts.allIds.faanjyut_columns],
    ['faanjyut_cell_states', facts.allIds.faanjyut_cell_states],
    ['faanjyut_comments', facts.allIds.faanjyut_comments],
    ['faanjyut_links', facts.allIds.faanjyut_links]
  ] as Array<[string, string[]]>) {
    if (!existingCollections.includes(collection)) continue
    const idHits = await findExistingIds(db, collection, ids)
    if (idHits.length > 0) {
      reportConflict(FINDING_CODES.targetIdConflict, collection, `目標 DB 已存在同 id 的 ${collection}`, idHits, idHits.length)
    }
  }

  // ---- columns：物理列位置 + active 映射（契約 §6.1、§8） ----
  if (existingCollections.includes('faanjyut_columns')) {
    const importedPositions = new Set(facts.columnPositions.map((p) => `${p.sourceSheet}|${p.sourceColumnIndex}`))
    const indexes = facts.columnPositions.map((p) => p.sourceColumnIndex)
    const positionHits: string[] = []
    const mappingHits: string[] = []
    for (const chunk of chunked(indexes, QUERY_CHUNK)) {
      if (chunk.length === 0) continue
      const docs = await db.find('faanjyut_columns', { sourceBook: 'faanjyut', sourceColumnIndex: { $in: chunk } }, { sourceSheet: 1, sourceColumnIndex: 1, sourceRole: 1, status: 1, dialectId: 1, languageCode: 1 })
      for (const d of docs) {
        const key = `${String(d.sourceSheet ?? '')}|${String(d.sourceColumnIndex ?? '')}`
        if (importedPositions.has(key)) {
          positionHits.push(key)
        }
        if (d.status === 'active') {
          if (d.sourceRole === 'domestic' && typeof d.dialectId === 'string' && facts.columnActiveMappings.some((m) => m.sourceRole === 'domestic' && m.key === d.dialectId)) {
            mappingHits.push(`domestic:${d.dialectId}`)
          }
          if (d.sourceRole === 'external' && typeof d.languageCode === 'string' && facts.columnActiveMappings.some((m) => m.sourceRole === 'external' && m.key === d.languageCode)) {
            mappingHits.push(`external:${d.languageCode}`)
          }
        }
      }
    }
    if (positionHits.length > 0) {
      reportConflict(FINDING_CODES.targetIdConflict, 'faanjyut_columns', '目標 DB 已存在同物理列位置（sourceSheet+sourceColumnIndex）的 Column', positionHits, positionHits.length)
    }
    if (mappingHits.length > 0) {
      reportConflict(FINDING_CODES.targetSourceKeyConflict, 'faanjyut_columns', '目標 DB active 列已占用將導入的 dialectId/languageCode 映射', mappingHits, mappingHits.length)
    }
  }

  return findings
}

async function findExistingIds(db: DryRunDb, collection: string, ids: string[]): Promise<string[]> {
  const hits: string[] = []
  for (const chunk of chunked(ids, QUERY_CHUNK)) {
    if (chunk.length === 0) continue
    const docs = await db.find(collection, { id: { $in: chunk } }, { id: 1 })
    hits.push(...docs.map((d) => String(d.id ?? '')))
  }
  return hits
}

function chunked<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size))
  }
  return result
}
