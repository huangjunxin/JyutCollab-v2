import { describe, it, expect } from 'vitest'
import {
  computeIndexPlan,
  canonicalKey,
  isHeadwordSearchIndex,
  expectedIndexesFor,
  type ExistingIndex,
  type ExpectedIndex
} from '../index-plan'
import { Lexeme } from '../../Lexeme'
import { Entry } from '../../Entry'

function existing(collection: string, name: string, key: Record<string, number | string>, options: ExistingIndex['options'] = {}): ExistingIndex {
  return { collection, name, key, options }
}

function expected(collection: string, key: Record<string, number | string>, options: ExpectedIndex['options'] = {}): ExpectedIndex {
  return { collection, key, options }
}

describe('faanjyut/index-plan', () => {
  it('canonicalKey 穩定排序', () => {
    expect(canonicalKey({ 'b': 1, 'a': 1 })).toBe('a_1_b_1')
    expect(canonicalKey({ 'headword.search': 1 })).toBe('headword.search_1')
  })

  it('isHeadwordSearchIndex 識別方案 B 殘留', () => {
    expect(isHeadwordSearchIndex({ 'headword.search': 1 })).toBe(true)
    expect(isHeadwordSearchIndex({ 'headword.search.normalized': 1 })).toBe(true)
    expect(isHeadwordSearchIndex({ 'headword.display': 1 })).toBe(false)
  })

  it('空輸入 → 無 create/drop', () => {
    const plan = computeIndexPlan({}, {})
    expect(plan.create).toEqual([])
    expect(plan.drop).toEqual([])
  })

  it('existing 完全匹配 expected → 無差異', () => {
    const plan = computeIndexPlan(
      { lexemes: [existing('lexemes', 'id_1', { id: 1 }, { unique: true })] },
      { lexemes: [expected('lexemes', { id: 1 }, { unique: true })] }
    )
    expect(plan.create).toEqual([])
    expect(plan.drop).toEqual([])
  })

  it('expected 缺索引 → create；existing 多餘索引 → drop', () => {
    const plan = computeIndexPlan(
      { lexemes: [existing('lexemes', 'old_1', { old: 1 })] },
      { lexemes: [expected('lexemes', { id: 1 }, { unique: true })] }
    )
    expect(plan.create).toHaveLength(1)
    expect(plan.create[0].key).toEqual({ id: 1 })
    expect(plan.drop).toHaveLength(1)
    expect(plan.drop[0].name).toBe('old_1')
  })

  it('headword.search 殘留索引列入 drop 並標 plan_b_residue', () => {
    const plan = computeIndexPlan(
      { entries: [existing('entries', 'headword.search_1', { 'headword.search': 1 })] },
      { entries: [expected('entries', { 'headword.display': 1, 'dialect.name': 1 })] }
    )
    const drop = plan.drop.find((d) => d.name === 'headword.search_1')
    expect(drop).toBeTruthy()
    expect(drop?.reason).toBe('plan_b_residue')
    expect(plan.summary.headwordSearchResidue).toBe(1)
  })

  it('同 key 不同 unique/partial → 不算匹配（create+drop）', () => {
    const plan = computeIndexPlan(
      { lexemes: [existing('lexemes', 'k_1', { k: 1 }, { unique: false })] },
      { lexemes: [expected('lexemes', { k: 1 }, { unique: true })] }
    )
    expect(plan.create).toHaveLength(1)
    expect(plan.drop).toHaveLength(1)
  })

  it('_id_ 隱式索引永不進 drop', () => {
    const plan = computeIndexPlan(
      { lexemes: [existing('lexemes', '_id_', { _id: 1 })] },
      { lexemes: [] }
    )
    expect(plan.drop).toEqual([])
  })

  it('Mongoose schema 抽取期望索引（Lexeme / Entry）', () => {
    const lexemeIdx = expectedIndexesFor(Lexeme, 'lexemes')
    expect(lexemeIdx.some((i) => canonicalKey(i.key) === 'id_1' && i.options.unique)).toBe(true)
    const entryIdx = expectedIndexesFor(Entry, 'entries')
    // 方案 B：Entry 期望索引不得含 headword.search
    expect(entryIdx.some((i) => isHeadwordSearchIndex(i.key))).toBe(false)
  })
})
