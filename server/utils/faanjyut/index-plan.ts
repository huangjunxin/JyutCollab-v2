/**
 * 索引計劃（ImportDataContract.md §10、ImplementationPlan P1 任務 4）。
 *
 * 對比真實 DB 索引（existing）與 Mongoose schema 期望索引（expected），
 * 輸出 existing/expected/create/drop 四清單；含 headword.search 方案 B 殘留索引
 * 顯式列入 drop。`_id_` 為隱式索引，永不列入 drop/create。
 *
 * 本模塊為純函數，不依賴 MongoDB 連接，可單元測試。
 */
import type { FaanJyutImportCollection } from './import-models'

export type IndexDirection = 1 | -1 | 'text' | '2d' | '2dsphere' | 'hashed'

/** MongoDB key 規格：{ 路徑: 方向 }，如 { 'headword.display': 1 }；方向含 text/2dsphere 等字符串 */
export type IndexKeySpec = Record<string, IndexDirection | number | string>

export interface IndexOptions {
  unique?: boolean
  sparse?: boolean
  partialFilterExpression?: Record<string, unknown>
  expireAfterSeconds?: number
  [key: string]: unknown
}

export interface ExistingIndex {
  collection: string
  name: string
  key: IndexKeySpec
  options: IndexOptions
}

export interface ExpectedIndex {
  collection: string
  key: IndexKeySpec
  options: IndexOptions
}

export interface IndexPlanItem {
  collection: string
  name?: string
  key: IndexKeySpec
  options: IndexOptions
  /** 額外標註：plan_b_residue = headword.search 方案 B 殘留 */
  reason?: 'plan_b_residue'
}

export interface IndexPlan {
  existing: IndexPlanItem[]
  expected: IndexPlanItem[]
  create: IndexPlanItem[]
  drop: IndexPlanItem[]
  summary: { createCount: number; dropCount: number; headwordSearchResidue: number }
}

/** 規範化 key 為可比字符串（依 mongo 命名規則 path_dir 以 _ 連接） */
export function canonicalKey(key: IndexKeySpec): string {
  return Object.entries(key)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, dir]) => `${path}_${String(dir).replace('-1', '-1')}`)
    .join('_')
}

function canonicalPartial(pfe?: Record<string, unknown>): string {
  if (!pfe) return ''
  return JSON.stringify(pfe, Object.keys(pfe).sort())
}

/** existing/expected 是否同一索引（同 collection、key、unique、sparse、partialFilterExpression） */
export function sameIndex(a: { collection: string; key: IndexKeySpec; options: IndexOptions }, b: { collection: string; key: IndexKeySpec; options: IndexOptions }): boolean {
  if (a.collection !== b.collection) return false
  if (canonicalKey(a.key) !== canonicalKey(b.key)) return false
  if (Boolean(a.options.unique) !== Boolean(b.options.unique)) return false
  if (Boolean(a.options.sparse) !== Boolean(b.options.sparse)) return false
  if (canonicalPartial(a.options.partialFilterExpression) !== canonicalPartial(b.options.partialFilterExpression)) return false
  return true
}

/** 判斷某 key 是否命中 headword.search（方案 B 殘留） */
export function isHeadwordSearchIndex(key: IndexKeySpec): boolean {
  return Object.keys(key).some((path) => path === 'headword.search' || path.startsWith('headword.search.'))
}

/** 從 Mongoose model 抽出期望索引 */
export function expectedIndexesFor(model: { schema: { indexes(): Array<[IndexKeySpec, IndexOptions]> } }, collection: string): ExpectedIndex[] {
  return model.schema.indexes().map(([key, options]) => ({ collection, key, options }))
}

/**
 * 計算索引計劃。
 * - existingByCollection / expectedByCollection 以 collection 名為鍵；缺省視為空數組。
 * - `_id_` 隱式索引不參與 drop/create 判定。
 */
export function computeIndexPlan(
  existingByCollection: Record<string, ExistingIndex[]>,
  expectedByCollection: Record<string, ExpectedIndex[]>
): IndexPlan {
  const existing: IndexPlanItem[] = []
  const expected: IndexPlanItem[] = []
  const create: IndexPlanItem[] = []
  const drop: IndexPlanItem[] = []
  let headwordSearchResidue = 0

  const allCollections = new Set([...Object.keys(existingByCollection), ...Object.keys(expectedByCollection)])

  for (const collection of allCollections) {
    const existingList = (existingByCollection[collection] ?? []).filter((idx) => idx.name !== '_id_')
    const expectedList = expectedByCollection[collection] ?? []

    for (const idx of existingList) {
      existing.push({ collection, name: idx.name, key: idx.key, options: idx.options })
    }
    for (const idx of expectedList) {
      expected.push({ collection, key: idx.key, options: idx.options })
    }

    for (const exp of expectedList) {
      if (!existingList.some((ex) => sameIndex(ex, exp))) {
        create.push({ collection, key: exp.key, options: exp.options })
      }
    }
    for (const ex of existingList) {
      if (!expectedList.some((exp) => sameIndex(ex, exp))) {
        const item: IndexPlanItem = { collection, name: ex.name, key: ex.key, options: ex.options }
        if (isHeadwordSearchIndex(ex.key)) {
          item.reason = 'plan_b_residue'
          headwordSearchResidue += 1
        }
        drop.push(item)
      }
    }
  }

  return {
    existing,
    expected,
    create,
    drop,
    summary: { createCount: create.length, dropCount: drop.length, headwordSearchResidue }
  }
}

/**
 * 期望索引來源（7 個導入 collection 的 Mongoose schema）。
 * collection 未建模（如 faanjyut_import_batches，P2 引入）時期望為空。
 */
export function expectedIndexPlan(importCollections: FaanJyutImportCollection[]): Record<string, ExpectedIndex[]> {
  const result: Record<string, ExpectedIndex[]> = {}
  for (const { collection, model } of importCollections) {
    result[collection] = expectedIndexesFor(model, collection)
  }
  return result
}
