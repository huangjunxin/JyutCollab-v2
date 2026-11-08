import { describe, expect, it } from 'vitest'
import { Entry } from '../Entry'
import { entryVersion, isEntryVersionConflict } from '../entry-version'

describe('entry optimistic concurrency', () => {
  it('Entry schema 開啟 optimisticConcurrency', () => {
    expect(Entry.schema.options.optimisticConcurrency).toBe(true)
  })

  it('讀取 __v，舊文檔缺省為 0', () => {
    expect(entryVersion({ __v: 3 })).toBe(3)
    expect(entryVersion({})).toBe(0)
    expect(entryVersion(null)).toBe(0)
  })

  it('只將 Mongoose VersionError 識別為版本衝突', () => {
    expect(isEntryVersionConflict({ name: 'VersionError' })).toBe(true)
    expect(isEntryVersionConflict({ name: 'ValidationError' })).toBe(false)
    expect(isEntryVersionConflict(null)).toBe(false)
  })
})
