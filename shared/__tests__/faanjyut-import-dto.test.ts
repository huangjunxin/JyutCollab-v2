import { describe, it, expect } from 'vitest'
import {
  FaanJyutLexemeDtoSchema,
  FaanJyutEntryDtoSchema,
  FaanJyutExternalEtymonDtoSchema
} from '../faanjyut-import-dto'

const validLexeme = {
  id: 'fjl_20527ec801886102efff50bb',
  meta: {
    sourceBook: 'faanjyut',
    sourceWorkbook: '泛粵字表 21.202607292320.xlsx',
    sourceSheet: '主表-睇真尐註解',
    sourceRow: 7,
    matrixOrder: 7,
    sourceKey: '>416461483360343',
    compositePronunciation: { raw: 'a?', markers: { hasQuestion: true } },
    editedAfterImport: false
  },
  status: { publicationStatus: 'published', qualityStatus: 'unreviewed_import' }
}

const validEntry = {
  id: 'fj_20255cd0e675c51e962089d7',
  lexemeId: 'fjl_20527ec801886102efff50bb',
  sourceBook: 'faanjyut',
  dialect: { name: 'guangzhou', regionCode: 'GZ' },
  headword: { display: '測試', normalized: '測試', isPlaceholder: false },
  phonetic: { original: 'tak1' },
  entryType: 'word',
  senses: [{ definition: '測試義' }],
  theme: {},
  meta: {
    sourceWorkbook: '泛粵字表 21.202607292320.xlsx',
    sourceSheet: '主表-睇真尐註解',
    sourceRow: 7,
    sourceColumn: '穗',
    sourceColumnIndex: 35,
    sourceCell: '主表-睇真尐註解!AI7',
    sourceKey: '>416461483360343',
    importReviewStatus: 'unreviewed_import',
    editedAfterImport: false
  },
  status: 'approved',
  createdBy: 'system:faanjyut_import'
}

const validExternalEtymon = {
  id: 'fje_813a5eacb69a4ac425169c1f',
  lexemeId: 'fjl_20527ec801886102efff50bb',
  languageCode: 'och',
  scriptForm: '測',
  raw: '測 tak',
  sourceType: 'dictionary',
  sourceDetail: '南昌',
  meta: {
    sourceBook: 'faanjyut',
    sourceWorkbook: '泛粵字表 21.202607292320.xlsx',
    sourceSheet: '主表-睇真尐註解',
    sourceColumn: '上古漢',
    sourceColumnIndex: 132,
    sourceRow: 7,
    sourceCell: '主表-睇真尐註解!EB7',
    segmentIndex: 1,
    softDeleted: false,
    editedAfterImport: false
  },
  createdBy: 'system:faanjyut_import'
}

describe('shared/faanjyut-import-dto strict DTO', () => {
  it('合法 Lexeme / Entry / ExternalEtymon 通過', () => {
    expect(FaanJyutLexemeDtoSchema.safeParse(validLexeme).success).toBe(true)
    expect(FaanJyutEntryDtoSchema.safeParse(validEntry).success).toBe(true)
    expect(FaanJyutExternalEtymonDtoSchema.safeParse(validExternalEtymon).success).toBe(true)
  })

  it('Lexeme 允許可選 notes，拒絕未知頂層欄位', () => {
    expect(FaanJyutLexemeDtoSchema.safeParse({ ...validLexeme, notes: '備註' }).success).toBe(true)
    expect(FaanJyutLexemeDtoSchema.safeParse({ ...validLexeme, foo: 1 }).success).toBe(false)
  })

  it('拒絕 Node 注入欄位（importBatchId / createdAt / _id）', () => {
    expect(FaanJyutLexemeDtoSchema.safeParse({ ...validLexeme, importBatchId: 'fjb_x' }).success).toBe(false)
    expect(FaanJyutEntryDtoSchema.safeParse({ ...validEntry, createdAt: '2026-07-29' }).success).toBe(false)
    expect(FaanJyutExternalEtymonDtoSchema.safeParse({ ...validExternalEtymon, _id: 'abc' }).success).toBe(false)
  })

  it('Entry headword.search 禁止出現（方案 B）', () => {
    const withSearch = { ...validEntry, headword: { ...validEntry.headword, search: 'test' } }
    expect(FaanJyutEntryDtoSchema.safeParse(withSearch).success).toBe(false)
  })

  it('Entry dialect.name 必須是合法 DialectId（含新增 12 個）', () => {
    const newDialect = { ...validEntry, dialect: { name: 'jiangmen_baisha', regionCode: 'JMBS' } }
    expect(FaanJyutEntryDtoSchema.safeParse(newDialect).success).toBe(true)
    const badDialect = { ...validEntry, dialect: { name: 'nowhere', regionCode: 'NW' } }
    expect(FaanJyutEntryDtoSchema.safeParse(badDialect).success).toBe(false)
  })

  it('ExternalEtymon languageCode 必須在 46 個權威集合內', () => {
    const bad = { ...validExternalEtymon, languageCode: 'yue' }
    expect(FaanJyutExternalEtymonDtoSchema.safeParse(bad).success).toBe(false)
    const ok = { ...validExternalEtymon, languageCode: 'japonic' }
    expect(FaanJyutExternalEtymonDtoSchema.safeParse(ok).success).toBe(true)
  })

  it('importReviewStatus / editedAfterImport / softDeleted 只接受導入初值', () => {
    const badStatus = { ...validEntry, meta: { ...validEntry.meta, importReviewStatus: 'checked' } }
    expect(FaanJyutEntryDtoSchema.safeParse(badStatus).success).toBe(false)
    const badEdited = { ...validEntry, meta: { ...validEntry.meta, editedAfterImport: true } }
    expect(FaanJyutEntryDtoSchema.safeParse(badEdited).success).toBe(false)
    const badSoftDeleted = { ...validExternalEtymon, meta: { ...validExternalEtymon.meta, softDeleted: true } }
    expect(FaanJyutExternalEtymonDtoSchema.safeParse(badSoftDeleted).success).toBe(false)
  })

  it('meta 未知欄位同樣拒絕', () => {
    const bad = { ...validEntry, meta: { ...validEntry.meta, sourceBook: 'faanjyut' } }
    expect(FaanJyutEntryDtoSchema.safeParse(bad).success).toBe(false)
  })
})
