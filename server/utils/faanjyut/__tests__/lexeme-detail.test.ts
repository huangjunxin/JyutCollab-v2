/**
 * lexeme-detail 純函數單元測試（FaanjyutV1Design §7 七區塊）：
 * 詞條頭、義項去重、四態格、softDeleted 過濾、域外分組與語言標籤、
 * unresolved/broken 鏈接與目標解析、批注歸屬/排序/作者回退/線程佔位、編輯歷史倒序、導入追溯。
 * 不連真庫，只測 server/utils/faanjyut/lexeme-detail.ts。
 */
import { describe, expect, it } from 'vitest'
import {
  assembleLexemeDetail,
  cellViewForCellState,
  type AssembleLexemeDetailInput
} from '../lexeme-detail'

const LEXEME_ID = 'fjl_20527ec801886102efff50bb'
const KEY = '>416461483360343'
const COL_TS = 'fjcol_ts'
const COL_HK = 'fjcol_hk'
const COL_GZ = 'fjcol_gz'
const COL_OCH = 'fjcol_och'
const COL_INACTIVE = 'fjcol_inactive'
const CELL_GZ = 'fjcell_gz'
const CELL_TS = 'fjcell_ts'
const CELL_HK = 'fjcell_hk'
const CELL_OCH = 'fjcell_och'
const ETYMON_OCH_1 = 'fje_och1'
const ETYMON_OCH_2 = 'fje_och2'
const ETYMON_YIZHANG = 'fje_yizhang'
const ETYMON_SOFT_DELETED = 'fje_hak_deleted'
const ENTRY_GZ = 'fj_gz'
const ENTRY_TS = 'fj_ts'
// 讀側聚合約定（§13.1 既有問題 1）：EditHistory.entryId 一律存 Entry 的 Mongo _id 字符串，
// 詳情頁歷史查詢也按 _id 聚合；應用層 id（fj_…）僅用於格 projection 與詞條映射。
const ENTRY_GZ_OID = 'mongo_oid_gz'
const ENTRY_TS_OID = 'mongo_oid_ts'

function buildInput(overrides: Partial<AssembleLexemeDetailInput> = {}): AssembleLexemeDetailInput {
  const base: AssembleLexemeDetailInput = {
    lexeme: {
      id: LEXEME_ID,
      meta: {
        sourceBook: 'faanjyut',
        sourceWorkbook: '泛粵字表 21.202608051509.xlsx',
        sourceSheet: '主表-睇真尐註解',
        sourceRow: 7,
        matrixOrder: 7,
        sourceKey: KEY,
        compositePronunciation: { raw: 'Jyut6', display: 'Jyut6', markers: { hasQuestion: false, hasBang: false } },
        representativeChar: { raw: '粵', display: '粵' },
        commonCharCandidates: '粵',
        definitionRaw: '不言自明$'
      },
      status: { publicationStatus: 'published', qualityStatus: 'unreviewed_import' }
    },
    columns: [
      { id: COL_TS, label: '台山', shortLabel: '台', sourceRole: 'domestic', dialectId: 'taishan', order: { originalOrder: 17 }, status: 'active' },
      { id: COL_HK, label: '香港', shortLabel: '港', sourceRole: 'domestic', dialectId: 'hongkong', order: { originalOrder: 24 }, status: 'active' },
      { id: COL_GZ, label: '廣州', shortLabel: '穗', sourceRole: 'domestic', dialectId: 'guangzhou', order: { originalOrder: 35 }, status: 'active' },
      { id: COL_OCH, label: '上古漢', shortLabel: '上古', sourceRole: 'external', languageCode: 'och', order: { originalOrder: 126 }, status: 'active' },
      { id: COL_INACTIVE, label: '廢列', sourceRole: 'domestic', dialectId: 'yizhang', order: { originalOrder: 99 }, status: 'inactive' }
    ],
    cells: [
      { id: CELL_TS, columnId: COL_TS, status: { workflow: 'unreviewed', flags: { explicitlyAbsent: true } }, projection: { entryId: ENTRY_TS }, source: { sourceRow: 7, sourceColumn: '台山' }, editedAfterImport: false },
      { id: CELL_HK, columnId: COL_HK, status: { workflow: 'unreviewed', flags: { explicitlyCleared: true } }, source: { sourceRow: 7, sourceColumn: '香港' }, editedAfterImport: true },
      { id: CELL_GZ, columnId: COL_GZ, raw: 'jyut6', status: { workflow: 'unreviewed', flags: {} }, projection: { entryId: ENTRY_GZ }, source: { sourceRow: 7, sourceColumn: '廣州' }, editedAfterImport: false },
      { id: CELL_OCH, columnId: COL_OCH, raw: '[ɢ]ʷat', status: { workflow: 'unreviewed', flags: {} }, projection: { externalEtymonIds: [ETYMON_OCH_1] }, source: { sourceRow: 7, sourceColumn: '上古漢' }, editedAfterImport: false }
    ],
    entries: [
      {
        _id: ENTRY_GZ_OID,
        id: ENTRY_GZ,
        dialect: { name: 'guangzhou', regionCode: 'GZ' },
        headword: { display: '粵', normalized: '粵', isPlaceholder: false },
        phonetic: { original: 'jyut6' },
        senses: [
          { definition: '不言自明$' },
          { definition: '某義項二' }
        ]
      },
      {
        _id: ENTRY_TS_OID,
        id: ENTRY_TS,
        dialect: { name: 'taishan', regionCode: 'TS' },
        headword: { display: '粵', normalized: '粵', isPlaceholder: false },
        phonetic: { original: 'juot9' },
        // 與廣州條首義項重複 → 應被去重
        senses: [{ definition: '不言自明$' }]
      }
    ],
    etymons: [
      { id: ETYMON_OCH_1, languageCode: 'och', scriptForm: '[ɢ]ʷat', raw: '[ɢ]ʷat 戉鉞', sourceType: 'dictionary', meta: { softDeleted: false } },
      { id: ETYMON_OCH_2, languageCode: 'och', scriptForm: 'wat', raw: 'wat', sourceType: 'dictionary', meta: {} },
      { id: ETYMON_YIZHANG, languageCode: 'yizhang_liudu', scriptForm: 'jye6', raw: 'jye6', meta: { softDeleted: false } },
      { id: ETYMON_SOFT_DELETED, languageCode: 'hak', scriptForm: 'ik', raw: 'ik', meta: { softDeleted: true } }
    ],
    links: [
      {
        id: 'fjlink_dr1',
        fromLexemeId: LEXEME_ID,
        toLexemeId: 'fjl_target',
        targetKey: '>target123',
        targetRaw: '>target123',
        type: 'related',
        rawSource: 'DR',
        rawValue: '>target123',
        status: 'active',
        targetLexeme: { id: 'fjl_target', sourceKey: '>target123', representativeChar: { display: '標' } }
      },
      {
        id: 'fjlink_dq1',
        fromLexemeId: LEXEME_ID,
        targetRaw: '>unknown456',
        type: 'twin_potential',
        rawSource: 'DQ',
        rawValue: '>unknown456',
        status: 'unresolved'
      },
      {
        id: 'fjlink_dr2',
        fromLexemeId: LEXEME_ID,
        targetRaw: '>gone789',
        type: 'related',
        rawSource: 'DR',
        status: 'broken'
      }
    ],
    comments: [
      // 屬於其他詞條的 cell 批注 → 應被排除
      { id: 'fjcom_other_cell', targetType: 'cell', targetId: 'fjcell_other', content: '別的詞條', legacyMeta: { originalTimestamp: new Date('2020-01-01T00:00:00Z') } },
      // 線程佔位批注（最早）→ 排最前
      { id: 'fjcom_placeholder', targetType: 'lexeme', targetId: LEXEME_ID, content: '（線程佔位）', legacyMeta: { originalTimestamp: new Date('2019-12-31T00:00:00Z'), threadedPlaceholder: true } },
      // cell 批注：authorDisplay 缺失 → 回退 legacyMeta.originalAuthor
      { id: 'fjcom_cell', targetType: 'cell', targetId: CELL_GZ, content: '廣州格批注', legacyMeta: { originalAuthor: '李四', originalTimestamp: new Date('2020-01-01T00:00:00Z') } },
      // lexeme 批注：authorDisplay 優先
      { id: 'fjcom_lexeme', targetType: 'lexeme', targetId: LEXEME_ID, authorDisplay: '張三', content: '詞條批注', legacyMeta: { originalTimestamp: new Date('2020-01-02T00:00:00Z') } },
      // externalEtymon 批注
      { id: 'fjcom_etymon', targetType: 'externalEtymon', targetId: ETYMON_OCH_1, content: '域外批注', legacyMeta: { originalTimestamp: new Date('2020-01-03T00:00:00Z') } },
      // column / sense 目標類型 → 一律排除
      { id: 'fjcom_column', targetType: 'column', targetId: COL_GZ, content: '列批注' },
      { id: 'fjcom_sense', targetType: 'sense', targetId: 'sense1', content: '義項批注' }
    ],
    histories: [
      {
        _id: 'fh_1',
        entryId: ENTRY_GZ_OID,
        userId: 'system:faanjyut_import',
        action: 'create',
        changedFields: ['headword', 'phonetic'],
        beforeSnapshot: {},
        afterSnapshot: { headword: { display: '粵' } },
        createdAt: new Date('2026-08-01T00:00:00Z')
      },
      {
        _id: 'fh_2',
        entryId: ENTRY_GZ_OID,
        userId: 'user_abc',
        action: 'update',
        changedFields: ['phonetic.original'],
        beforeSnapshot: { 'phonetic.original': 'jyut6' },
        afterSnapshot: { 'phonetic.original': 'jyut6?' },
        createdAt: new Date('2026-08-03T00:00:00Z')
      }
    ],
    ...overrides
  }
  return base
}

describe('faanjyut/lexeme-detail cellViewForCellState 四態', () => {
  it('無文檔 → null', () => {
    expect(cellViewForCellState(null)).toEqual({ state: 'null' })
    expect(cellViewForCellState(undefined)).toEqual({ state: 'null' })
  })

  it('explicitlyAbsent → absent', () => {
    expect(cellViewForCellState({ id: 'c', columnId: 'x', status: { flags: { explicitlyAbsent: true } } })).toEqual({ state: 'absent' })
  })

  it('explicitlyCleared → cleared（優先於 absent 之外的其餘 flag）', () => {
    expect(cellViewForCellState({ id: 'c', columnId: 'x', status: { flags: { explicitlyCleared: true, hasQuestion: true } } })).toEqual({ state: 'cleared' })
  })

  it('否則 → normal + raw', () => {
    expect(cellViewForCellState({ id: 'c', columnId: 'x', raw: 'jyut6', status: { flags: {} } })).toEqual({ state: 'normal', raw: 'jyut6' })
    expect(cellViewForCellState({ id: 'c', columnId: 'x', status: { flags: {} } })).toEqual({ state: 'normal', raw: null })
  })
})

describe('faanjyut/lexeme-detail assembleLexemeDetail', () => {
  it('header：詞條頭字段齊全（key/代表字/綜合音/候選/釋義/狀態/matrixOrder）', () => {
    const { header } = assembleLexemeDetail(buildInput())
    expect(header.id).toBe(LEXEME_ID)
    expect(header.sourceKey).toBe(KEY)
    expect(header.representativeChar).toEqual({ raw: '粵', display: '粵' })
    expect(header.compositePronunciation).toEqual({ raw: 'Jyut6', display: 'Jyut6', markers: { hasQuestion: false, hasBang: false } })
    expect(header.commonCharCandidates).toBe('粵')
    expect(header.definitionRaw).toBe('不言自明$')
    expect(header.publicationStatus).toBe('published')
    expect(header.matrixOrder).toBe(7)
  })

  it('senses：多義項保留、跨 Entry 重複義項去重', () => {
    const { senses } = assembleLexemeDetail(buildInput())
    expect(senses).toEqual([
      { definition: '不言自明$' },
      { definition: '某義項二' }
    ])
  })

  it('pronunciations：僅 active 列、按 originalOrder 升序、四態正確、域內列附 Entry', () => {
    const { pronunciations } = assembleLexemeDetail(buildInput())
    expect(pronunciations.map((p) => p.columnId)).toEqual([COL_TS, COL_HK, COL_GZ, COL_OCH]) // 99 的 inactive 列被過濾

    const ts = pronunciations.find((p) => p.columnId === COL_TS)!
    expect(ts.cell).toEqual({ state: 'absent' })
    expect(ts.entry).toEqual({ entryId: ENTRY_TS, headword: { display: '粵', normalized: '粵', isPlaceholder: false }, phonetic: { original: 'juot9' } })

    const hk = pronunciations.find((p) => p.columnId === COL_HK)!
    expect(hk.cell).toEqual({ state: 'cleared' })
    expect(hk.entry).toBeNull() // 無對應 Entry

    const gz = pronunciations.find((p) => p.columnId === COL_GZ)!
    expect(gz.cell).toEqual({ state: 'normal', raw: 'jyut6' })
    expect(gz.entry?.entryId).toBe(ENTRY_GZ)
    expect(gz.entry?.phonetic).toEqual({ original: 'jyut6' })

    const och = pronunciations.find((p) => p.columnId === COL_OCH)!
    expect(och.cell).toEqual({ state: 'normal', raw: '[ɢ]ʷat' })
    expect(och.entry).toBeNull() // 域外列不附 Entry
    expect(och.languageCode).toBe('och')
  })

  it('externalMaterials：排除 softDeleted、按語言代碼分組並附繁體標籤、組內保序', () => {
    const { externalMaterials } = assembleLexemeDetail(buildInput())
    expect(externalMaterials.map((g) => g.languageCode)).toEqual(['och', 'yizhang_liudu']) // hak 已軟刪
    expect(externalMaterials[0].languageLabel).toBe('上古漢')
    expect(externalMaterials[0].items.map((i) => i.id)).toEqual([ETYMON_OCH_1, ETYMON_OCH_2])
    expect(externalMaterials[1].languageLabel).toBe('宜章一六')
    expect(externalMaterials[1].items[0].scriptForm).toBe('jye6')
    expect(externalMaterials[1].items[0].raw).toBe('jye6')
  })

  it('links：關係卡字段齊全；active 帶已解析目標；unresolved/broken 打標', () => {
    const { links } = assembleLexemeDetail(buildInput())
    expect(links).toHaveLength(3)

    expect(links[0]).toMatchObject({
      fromLexemeId: LEXEME_ID,
      toLexemeId: 'fjl_target',
      targetKey: '>target123',
      type: 'related',
      rawSource: 'DR',
      status: 'active',
      broken: false,
      unresolved: false,
      targetLexeme: { id: 'fjl_target', sourceKey: '>target123', representativeChar: { display: '標' } }
    })

    expect(links[1].unresolved).toBe(true)
    expect(links[1].toLexemeId).toBeNull()
    expect(links[1].targetLexeme).toBeNull()

    expect(links[2].broken).toBe(true)
    expect(links[2].targetLexeme).toBeNull()
  })

  it('comments：僅 lexeme/cell/externalEtymon 且屬於本詞條；按原表時間升序；作者回退；線程佔位標記', () => {
    const { comments } = assembleLexemeDetail(buildInput())
    expect(comments.map((c) => c.id)).toEqual(['fjcom_placeholder', 'fjcom_cell', 'fjcom_lexeme', 'fjcom_etymon'])

    expect(comments[0].threadedPlaceholder).toBe(true)
    expect(comments[0].originalTimestamp).toBe('2019-12-31T00:00:00.000Z')

    expect(comments[1]).toMatchObject({
      targetType: 'cell',
      targetId: CELL_GZ,
      author: '李*', // authorDisplay 缺失 → legacyMeta.originalAuthor（2026-08-07 拍板 M45：首尾字脫敏）
      threadedPlaceholder: false
    })

    expect(comments[2].author).toBe('張三') // authorDisplay 優先
    expect(comments[3].targetType).toBe('externalEtymon')
  })

  it('editHistory：時間倒序；entryId 為 Mongo _id 字符串（讀側聚合約定）；userId 原樣返回（system:faanjyut_import 由前端顯示）', () => {
    const { editHistory } = assembleLexemeDetail(buildInput())
    expect(editHistory.map((h) => h.id)).toEqual(['fh_2', 'fh_1'])
    expect(editHistory[0]).toMatchObject({
      id: 'fh_2',
      entryId: ENTRY_GZ_OID,
      userId: 'user_abc',
      action: 'update',
      changedFields: ['phonetic.original'],
      createdAt: '2026-08-03T00:00:00.000Z'
    })
    expect(editHistory[1].userId).toBe('system:faanjyut_import')
    expect(editHistory[1].action).toBe('create')
  })

  it('importTrace：sourceWorkbook/Sheet/Row、穩定 ID；importBatchId 優先 lexeme meta', () => {
    const { importTrace } = assembleLexemeDetail(buildInput())
    expect(importTrace).toEqual({
      sourceWorkbook: '泛粵字表 21.202608051509.xlsx',
      sourceSheet: '主表-睇真尐註解',
      sourceRow: 7,
      importBatchId: null,
      stableId: LEXEME_ID
    })
  })

  it('importTrace：lexeme meta 無 importBatchId 時回退到 cell source.importBatchId（寫入注入路徑）', () => {
    const lexeme = { id: LEXEME_ID, meta: { sourceKey: KEY } }
    const input = buildInput({ lexeme })
    input.cells = [
      { id: CELL_GZ, columnId: COL_GZ, source: { importBatchId: 'fjb_cell_9' } }
    ]
    const { importTrace } = assembleLexemeDetail(input)
    expect(importTrace.importBatchId).toBe('fjb_cell_9')
    expect(importTrace.sourceWorkbook).toBeNull()
  })
})
