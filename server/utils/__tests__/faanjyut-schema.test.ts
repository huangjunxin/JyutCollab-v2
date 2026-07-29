import { describe, it, expect } from 'vitest'
import { Lexeme } from '../Lexeme'
import { Entry } from '../Entry'
import { ExternalEtymon } from '../ExternalEtymon'

describe('server/utils Mongoose schema 泛粵擴展', () => {
  describe('Lexeme meta/status', () => {
    it('接受完整泛粵 meta/status 並通過 validate', async () => {
      const doc = new Lexeme({
        id: 'fjl_20527ec801886102efff50bb',
        meta: {
          sourceBook: 'faanjyut',
          sourceWorkbook: '泛粵字表 21.202607292320.xlsx',
          sourceSheet: '主表-睇真尐註解',
          sourceRow: 7,
          matrixOrder: 7,
          sourceKey: '>416461483360343',
          keyAliases: ['alias1'],
          compositePronunciation: { raw: 'a?', display: 'a?', markers: { hasQuestion: true } },
          representativeChar: { raw: '見X', warnings: ['unresolved'] },
          commonCharCandidates: '測',
          definitionRaw: '測試',
          sourceFlags: ['DQ'],
          importBatchId: 'fjb_0123456789abcdef',
          editedAfterImport: false
        },
        status: { publicationStatus: 'published', qualityStatus: 'unreviewed_import' }
      })
      await expect(doc.validate()).resolves.toBeUndefined()
      const obj = doc.toObject()
      expect(obj.meta?.sourceKey).toBe('>416461483360343')
      expect(obj.meta?.compositePronunciation?.markers?.hasQuestion).toBe(true)
      expect(obj.status?.publicationStatus).toBe('published')
    })

    it('status enum 拒絕非法值', async () => {
      const doc = new Lexeme({ id: 'x', status: { publicationStatus: 'bogus' } })
      await expect(doc.validate()).rejects.toThrow()
    })

    it('舊式文件（僅 id + notes）仍合法', async () => {
      const doc = new Lexeme({ id: 'lex-1', notes: '舊備註' })
      await expect(doc.validate()).resolves.toBeUndefined()
    })

    it('meta.sourceBook+sourceKey 部分唯一索引已登記', () => {
      const indexes = Lexeme.schema.indexes()
      const target = indexes.find(([keys, options]) =>
        keys['meta.sourceBook'] === 1 && keys['meta.sourceKey'] === 1 &&
        options?.unique === true &&
        options?.partialFilterExpression?.['meta.sourceBook'] === 'faanjyut'
      )
      expect(target).toBeTruthy()
    })
  })

  describe('ExternalEtymon raw/meta', () => {
    it('接受 raw 頂層與 meta.softDeleted 嵌套並通過 validate', async () => {
      const doc = new ExternalEtymon({
        id: 'fje_813a5eacb69a4ac425169c1f',
        lexemeId: 'fjl_20527ec801886102efff50bb',
        languageCode: 'och',
        scriptForm: '測',
        raw: '測 tak',
        sourceType: 'dictionary',
        sourceDetail: '泛粵字表 21.202607292320.xlsx',
        meta: {
          sourceBook: 'faanjyut',
          sourceColumn: '上古漢',
          sourceColumnIndex: 132,
          sourceRow: 7,
          sourceCell: '主表-睇真尐註解!EB7',
          segmentIndex: 1,
          parseWarnings: ['placeholder'],
          softDeleted: false,
          editedAfterImport: false
        },
        createdBy: 'system:faanjyut_import'
      })
      await expect(doc.validate()).resolves.toBeUndefined()
      const obj = doc.toObject()
      expect(obj.raw).toBe('測 tak')
      expect(obj.meta?.softDeleted).toBe(false)
      expect((obj as Record<string, unknown>).softDelete).toBeUndefined()
    })

    it('舊式文件（無 raw/meta）仍合法', async () => {
      const doc = new ExternalEtymon({
        id: 'ee-1',
        lexemeId: 'lex-1',
        languageCode: 'eng',
        scriptForm: 'test',
        createdBy: 'user-1'
      })
      await expect(doc.validate()).resolves.toBeUndefined()
    })
  })

  describe('Entry meta 泛粵新鍵', () => {
    function buildEntry(meta: Record<string, unknown>) {
      return new Entry({
        id: 'fj_20255cd0e675c51e962089d7',
        lexemeId: 'fjl_20527ec801886102efff50bb',
        sourceBook: 'faanjyut',
        dialect: { name: 'guangzhou', regionCode: 'GZ' },
        headword: { display: '測試', normalized: '測試' },
        phonetic: { original: 'tak1' },
        entryType: 'word',
        senses: [{ definition: '測試義' }],
        meta,
        status: 'approved',
        createdBy: 'system:faanjyut_import'
      })
    }

    it('泛粵 meta 鍵通過 validate 且持久化於 toObject', async () => {
      const doc = buildEntry({
        sourceWorkbook: '泛粵字表 21.202607292320.xlsx',
        sourceSheet: '主表-睇真尐註解',
        sourceRow: 7,
        sourceColumn: '穗',
        sourceColumnIndex: 35,
        sourceCell: '主表-睇真尐註解!AI7',
        sourceKey: '>416461483360343',
        importBatchId: 'fjb_0123456789abcdef',
        importReviewStatus: 'unreviewed_import',
        editedAfterImport: false,
        parseWarnings: ['missing_headword_placeholder']
      })
      await expect(doc.validate()).resolves.toBeUndefined()
      const obj = doc.toObject()
      expect(obj.meta?.sourceKey).toBe('>416461483360343')
      expect(obj.meta?.sourceColumnIndex).toBe(35)
      expect(obj.meta?.parseWarnings).toEqual(['missing_headword_placeholder'])
    })

    it('importReviewStatus enum 拒絕非法值', async () => {
      const doc = buildEntry({ importReviewStatus: 'bogus' })
      await expect(doc.validate()).rejects.toThrow()
    })

    it('headword 不再有 search 路徑，頂層 sourceBook 保留', () => {
      expect(Entry.schema.path('headword.search')).toBeUndefined()
      expect(Entry.schema.path('sourceBook')).toBeTruthy()
    })
  })
})
