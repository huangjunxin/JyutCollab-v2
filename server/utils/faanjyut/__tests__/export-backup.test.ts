/**
 * export-backup 純邏輯單元測試（FaanjyutV1Design §10.2、§14.5）：
 * 內存 fake 基建（ExportSource + ExportOutput）仿 cells.test.ts——
 * 不連真庫、不觸文件系統、不測 handler。
 *
 * 覆蓋：7 類 NDJSON 生成（鍵名對齊導入契約形狀、DB 態值不丟）、manifest records/SHA-256
 * 用真實 createHash 對生成內容復算、includeDrafts=false 過濾 draft 及其關聯
 * （entries/cell_states/comments/links）、includeAudit 只含泛粵 Entry 歷史、
 * includeStyles=false 剝 style、summarizeExportBatch 行視圖。
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import {
  EDIT_HISTORIES_FILE,
  EXPORT_FILES,
  runBackupExport,
  summarizeExportBatch,
  type ExportFileName,
  type ExportManifest,
  type ExportOutput,
  type ExportSource
} from '../export-backup'

const EXPORT_ID = 'fjx_test1234567890ab'
const GENERATED_AT = '2026-08-05T10:00:00.000Z'

const L1 = 'fjl_published'
const L2 = 'fjl_draft'

// ---- DB 態 fixture：_id/createdAt/updatedAt 允許、editedAfterImport=true、version>0、真實 userId ----

function makeColumn(id: string, withStyle: boolean): Record<string, unknown> {
  return {
    _id: `oid_${id}`,
    id,
    sourceBook: 'faanjyut',
    sourceSheet: '主表-睇真尐註解',
    sourceColumn: '穗',
    sourceColumnIndex: 37,
    sourceColumnLetter: 'AK',
    sourceRole: 'domestic',
    projectionTarget: 'entry',
    label: '廣州',
    dialectId: 'guangzhou',
    regionCode: 'GZ',
    order: { originalOrder: 37 },
    ...(withStyle ? { style: { color: 'FF0000', defaultTextColor: '000000' } } : {}),
    status: 'active',
    createdBy: 'system:faanjyut_import',
    createdAt: new Date('2026-08-05T08:00:00Z')
  }
}

function makeLexeme(id: string, publicationStatus: string): Record<string, unknown> {
  return {
    _id: `oid_${id}`,
    id,
    notes: '',
    meta: { sourceBook: 'faanjyut', sourceKey: `>${id}`, representativeChar: { raw: '粵', display: '粵' } },
    status: { publicationStatus, qualityStatus: 'unreviewed_import' },
    createdAt: new Date('2026-08-05T08:00:00Z')
  }
}

function makeEntry(id: string, lexemeId: string): Record<string, unknown> {
  return {
    _id: `oid_entry_${id}`,
    id,
    lexemeId,
    sourceBook: 'faanjyut',
    dialect: { name: 'guangzhou', regionCode: 'GZ' },
    headword: { display: '粵', normalized: '粵', isPlaceholder: false },
    phonetic: { original: 'jyut6' },
    entryType: 'character',
    senses: [],
    theme: {},
    meta: { sourceKey: `>${lexemeId}`, editedAfterImport: true },
    status: 'draft',
    createdBy: 'user_1',
    updatedBy: 'user_1',
    viewCount: 0,
    likeCount: 0,
    createdAt: new Date('2026-08-05T08:00:00Z'),
    updatedAt: new Date('2026-08-05T09:00:00Z')
  }
}

function makeCell(id: string, lexemeId: string): Record<string, unknown> {
  return {
    _id: `oid_cell_${id}`,
    id,
    lexemeId,
    columnId: 'fjcol_gz',
    raw: 'jyut6',
    status: { workflow: 'unreviewed', flags: { modifiedPendingReview: true } },
    source: { sourceRow: 7, sourceCell: '主表-睇真尐註解!AK7' },
    editedAfterImport: true,
    version: 2,
    createdBy: 'user_1',
    updatedBy: 'user_1',
    createdAt: new Date('2026-08-05T08:00:00Z'),
    updatedAt: new Date('2026-08-05T09:00:00Z')
  }
}

function makeComment(id: string, targetType: string, targetId: string): Record<string, unknown> {
  return {
    _id: `oid_com_${id}`,
    id,
    targetType,
    targetId,
    source: 'imported_excel_comment',
    content: '批註',
    isResolved: false,
    createdAt: new Date('2026-08-05T08:00:00Z')
  }
}

function makeLink(id: string, from: string, to: string | null): Record<string, unknown> {
  return {
    _id: `oid_link_${id}`,
    id,
    fromLexemeId: from,
    toLexemeId: to ?? undefined,
    type: 'related',
    rawSource: 'DR',
    status: 'active',
    createdBy: 'system:faanjyut_import',
    createdAt: new Date('2026-08-05T08:00:00Z')
  }
}

function makeEditHistory(entryId: string): Record<string, unknown> {
  return {
    _id: `oid_hist_${entryId}`,
    entryId,
    userId: 'user_1',
    beforeSnapshot: {},
    afterSnapshot: {},
    changedFields: ['phonetic.original'],
    action: 'update',
    isReverted: false,
    createdAt: new Date('2026-08-05T09:00:00Z')
  }
}

// ---- 內存 fake：源（按文件名的文檔數組）與輸出（按文件名的行串） ----

class FakeExportSource implements ExportSource {
  docsByFile: Record<string, Array<Record<string, unknown>>> = {}
  faanjyutEntryIds: string[] = []
  editHistories: Array<Record<string, unknown>> = []

  async *iterateDocs(name: ExportFileName): AsyncIterable<Record<string, unknown>> {
    for (const doc of this.docsByFile[name] ?? []) {
      yield doc
    }
  }

  async *iterateFaanjyutEntryIds(): AsyncIterable<string> {
    for (const id of this.faanjyutEntryIds) {
      yield id
    }
  }

  async *iterateEditHistories(): AsyncIterable<Record<string, unknown>> {
    for (const doc of this.editHistories) {
      yield doc
    }
  }
}

class FakeExportOutput implements ExportOutput {
  files = new Map<string, string>()
  aborted = false

  async writeFile(name: string, lines: Iterable<string> | AsyncIterable<string>): Promise<void> {
    let content = this.files.get(name) ?? ''
    for await (const line of lines) {
      content += line
    }
    this.files.set(name, content)
  }

  async finalize(): Promise<{ fileSize: number }> {
    let size = 0
    for (const content of this.files.values()) size += Buffer.byteLength(content, 'utf8')
    return { fileSize: size }
  }

  async abort(): Promise<void> {
    this.aborted = true
  }
}

function makeSource(over: { draftEntries?: boolean } = {}): FakeExportSource {
  const source = new FakeExportSource()
  source.docsByFile['columns.ndjson'] = [makeColumn('fjcol_gz', true), makeColumn('fjcol_ts', false)]
  source.docsByFile['lexemes.ndjson'] = [makeLexeme(L1, 'published'), makeLexeme(L2, 'draft')]
  source.docsByFile['entries.ndjson'] = [
    makeEntry('fj_e1', L1),
    makeEntry('fj_e2', L2),
    ...(over.draftEntries ? [makeEntry('fj_e3', L1)] : [])
  ]
  source.docsByFile['external_etymons.ndjson'] = [{
    _id: 'oid_fje',
    id: 'fje_813a5eacb69a4ac425169c1f',
    meta: { sourceBook: 'faanjyut', sourceKey: `>${L1}` },
    languageCode: 'och',
    segmentIndex: 1,
    scriptForm: '粤',
    raw: '古音',
    createdBy: 'system:faanjyut_import',
    createdAt: new Date('2026-08-05T08:00:00Z')
  }]
  source.docsByFile['cell_states.ndjson'] = [makeCell('fjcell_1', L1), makeCell('fjcell_2', L2)]
  source.docsByFile['comments.ndjson'] = [
    makeComment('fjcom_1', 'lexeme', L1),  // 非 draft 詞條批註 → 保留
    makeComment('fjcom_2', 'lexeme', L2),  // draft 詞條批註 → 過濾
    makeComment('fjcom_3', 'cell', 'fjcell_2') // 格批註（無詞條關聯）→ 保留
  ]
  source.docsByFile['links.ndjson'] = [
    makeLink('fjlink_1', L1, L2), // 涉及 draft → 過濾
    makeLink('fjlink_2', L2, L1), // 源是 draft → 過濾
    makeLink('fjlink_3', L1, L1)  // 純非 draft → 保留
  ]
  source.faanjyutEntryIds = ['oid_entry_fj_e1']
  source.editHistories = [
    makeEditHistory('oid_entry_fj_e1'), // 泛粵 Entry 歷史 → 保留
    makeEditHistory('oid_platform_entry') // 普通詞條歷史 → 過濾
  ]
  return source
}

async function run(options: { includeDrafts?: boolean; includeAudit?: boolean; includeStyles?: boolean }, source = makeSource()) {
  const output = new FakeExportOutput()
  const result = await runBackupExport({
    source,
    output,
    options: {
      includeDrafts: options.includeDrafts ?? false,
      includeAudit: options.includeAudit ?? false,
      includeStyles: options.includeStyles ?? false
    },
    exportId: EXPORT_ID,
    generatedAt: GENERATED_AT
  })
  return { source, output, result }
}

/** 從捕獲內容復算 records + sha256（真實 createHash），與 manifest 逐文件對比 */
function expectManifestMatchesContent(manifest: ExportManifest, output: FakeExportOutput) {
  for (const name of Object.keys(manifest.files)) {
    const content = output.files.get(name)
    expect(content, `${name} 已寫入輸出`).toBeDefined()
    const records = content!.split('\n').filter((line) => line.length > 0).length
    const sha256 = createHash('sha256').update(content!, 'utf8').digest('hex')
    expect(manifest.files[name].records).toBe(records)
    expect(manifest.files[name].sha256).toBe(sha256)
  }
  // manifest.json 自身在包內但不在 files 清單
  expect(output.files.has('manifest.json')).toBe(true)
}

describe('faanjyut/export-backup 默認（includeDrafts=false, includeAudit=false, includeStyles=false）', () => {
  it('7 類 NDJSON 全生成，manifest 字段完整，records/SHA-256 可復算', async () => {
    const { output, result } = await run({})
    const { manifest } = result

    expect(manifest.exportType).toBe('backup')
    expect(manifest.exportId).toBe(EXPORT_ID)
    expect(manifest.generatedAt).toBe(GENERATED_AT)
    expect(manifest.options).toEqual({ includeDrafts: false, includeAudit: false, includeStyles: false })

    // 7 類文件 + manifest，無 edit_histories.ndjson
    expect(Object.keys(manifest.files).sort()).toEqual(EXPORT_FILES.map((f) => f.name).sort())
    expect(manifest.files[EDIT_HISTORIES_FILE]).toBeUndefined()
    expect(output.files.has(EDIT_HISTORIES_FILE)).toBe(false)

    expectManifestMatchesContent(manifest, output)
    expect(result.fileSize).toBeGreaterThan(0)
  })

  it('draft 過濾：draft 詞條及其關聯 entries/cell_states/comments/links 全部剔除，columns/external_etymons 保留', async () => {
    const { output, result } = await run({})
    const { manifest } = result

    expect(manifest.files['lexemes.ndjson'].records).toBe(1)
    expect(manifest.files['entries.ndjson'].records).toBe(1)
    expect(manifest.files['cell_states.ndjson'].records).toBe(1)
    expect(manifest.files['comments.ndjson'].records).toBe(2)
    expect(manifest.files['links.ndjson'].records).toBe(1)
    expect(manifest.files['columns.ndjson'].records).toBe(2)
    expect(manifest.files['external_etymons.ndjson'].records).toBe(1)

    // 過濾結果內容檢查
    const lexemeIds = output.files.get('lexemes.ndjson')!.trim().split('\n').map((l) => JSON.parse(l).id)
    expect(lexemeIds).toEqual([L1])
    const entryLexemeIds = output.files.get('entries.ndjson')!.trim().split('\n').map((l) => JSON.parse(l).lexemeId)
    expect(entryLexemeIds).toEqual([L1])
    const cellLexemeIds = output.files.get('cell_states.ndjson')!.trim().split('\n').map((l) => JSON.parse(l).lexemeId)
    expect(cellLexemeIds).toEqual([L1])
    const commentTargets = output.files.get('comments.ndjson')!.trim().split('\n').map((l) => JSON.parse(l).targetId)
    expect(commentTargets).toEqual(['fjl_published', 'fjcell_2'])
    const linkIds = output.files.get('links.ndjson')!.trim().split('\n').map((l) => JSON.parse(l).id)
    expect(linkIds).toEqual(['fjlink_3'])
  })

  it('DB 態值不丟：_id/createdAt/updatedAt 保留、editedAfterImport=true、version>0、真實 userId（不用導入 DTO 反向校驗）', async () => {
    const { output } = await run({})
    const entry = JSON.parse(output.files.get('entries.ndjson')!.trim().split('\n')[0])
    expect(entry._id).toBe('oid_entry_fj_e1')
    expect(entry.createdAt).toBe('2026-08-05T08:00:00.000Z')
    expect(entry.updatedAt).toBe('2026-08-05T09:00:00.000Z')
    expect(entry.meta.editedAfterImport).toBe(true)
    expect(entry.createdBy).toBe('user_1')
    expect(entry.status).toBe('draft')

    const cell = JSON.parse(output.files.get('cell_states.ndjson')!.trim().split('\n')[0])
    expect(cell.editedAfterImport).toBe(true)
    expect(cell.version).toBe(2)
    expect(cell.createdBy).toBe('user_1')
    expect(cell.status.workflow).toBe('unreviewed')
  })

  it('includeStyles=false：columns.ndjson 剝除 style 字段，其餘字段保留', async () => {
    const { output } = await run({})
    const columns = output.files.get('columns.ndjson')!.trim().split('\n').map((l) => JSON.parse(l))
    expect(columns).toHaveLength(2)
    for (const col of columns) {
      expect(col.style).toBeUndefined()
      expect(col.id).toBeDefined()
      expect(col.sourceRole).toBe('domestic')
      expect(col.order.originalOrder).toBe(37)
    }
  })
})

describe('faanjyut/export-backup 開關組合', () => {
  it('includeStyles=true：columns 保留 style', async () => {
    const { output, result } = await run({ includeStyles: true })
    const columns = output.files.get('columns.ndjson')!.trim().split('\n').map((l) => JSON.parse(l))
    expect(columns.find((c: any) => c.id === 'fjcol_gz').style).toEqual({ color: 'FF0000', defaultTextColor: '000000' })
    expect(columns.find((c: any) => c.id === 'fjcol_ts').style).toBeUndefined() // 原文檔就沒有
    expectManifestMatchesContent(result.manifest, output)
  })

  it('includeDrafts=true：draft 詞條及關聯全部包含', async () => {
    const { output, result } = await run({ includeDrafts: true })
    expect(result.manifest.files['lexemes.ndjson'].records).toBe(2)
    expect(result.manifest.files['entries.ndjson'].records).toBe(2)
    expect(result.manifest.files['cell_states.ndjson'].records).toBe(2)
    expect(result.manifest.files['comments.ndjson'].records).toBe(3)
    expect(result.manifest.files['links.ndjson'].records).toBe(3)
    expectManifestMatchesContent(result.manifest, output)
  })

  it('includeAudit=true：追加 edit_histories.ndjson，只含泛粵 Entry 歷史；manifest.files 覆蓋包內每個 ndjson', async () => {
    const { output, result } = await run({ includeAudit: true })
    const { manifest } = result
    expect(manifest.files[EDIT_HISTORIES_FILE]).toBeDefined()
    expect(manifest.files[EDIT_HISTORIES_FILE].records).toBe(1)
    expect(output.files.has(EDIT_HISTORIES_FILE)).toBe(true)

    const entryIds = output.files.get(EDIT_HISTORIES_FILE)!.trim().split('\n').map((l) => JSON.parse(l).entryId)
    expect(entryIds).toEqual(['oid_entry_fj_e1'])

    // files 清單覆蓋包內每個 .ndjson（7 類 + edit_histories），並可復算
    expect(Object.keys(manifest.files).sort()).toEqual([...EXPORT_FILES.map((f) => f.name), EDIT_HISTORIES_FILE].sort())
    expectManifestMatchesContent(manifest, output)
  })

  it('includeAudit=true + includeDrafts=false：兩者獨立生效（draft 過濾照常）', async () => {
    const { result } = await run({ includeAudit: true, includeDrafts: false })
    expect(result.manifest.files['lexemes.ndjson'].records).toBe(1)
    expect(result.manifest.files[EDIT_HISTORIES_FILE].records).toBe(1)
  })
})

describe('faanjyut/export-backup 異常傳播（後台 catch → abort + failed 路徑）', () => {
  it('輸出層拋錯：runBackupExport reject（不吞錯），後台 catch 可調 abort', async () => {
    const source = makeSource()
    const failing = new FakeExportOutput()
    const original = failing.writeFile.bind(failing)
    failing.writeFile = async (name, lines) => {
      if (name === 'entries.ndjson') throw new Error('模擬輸出寫入失敗')
      await original(name, lines)
    }
    await expect(runBackupExport({
      source,
      output: failing,
      options: { includeDrafts: false, includeAudit: false, includeStyles: false },
      exportId: EXPORT_ID,
      generatedAt: GENERATED_AT
    })).rejects.toThrow('模擬輸出寫入失敗')
  })

  it('DB 迭代拋錯（游標中斷）：runBackupExport reject', async () => {
    const source = makeSource()
    const original = source.iterateDocs.bind(source)
    source.iterateDocs = async function* (name: ExportFileName) {
      if (name === 'entries.ndjson') throw new Error('模擬游標中斷')
      yield* original(name)
    }
    const output = new FakeExportOutput()
    await expect(runBackupExport({
      source,
      output,
      options: { includeDrafts: false, includeAudit: false, includeStyles: false },
      exportId: EXPORT_ID,
      generatedAt: GENERATED_AT
    })).rejects.toThrow('模擬游標中斷')
  })
})

describe('faanjyut/export-backup summarizeExportBatch', () => {
  it('completed 批次：downloadable=true，字段透傳/缺省', () => {
    const summary = summarizeExportBatch({
      id: 'fjx_abc',
      fileName: 'faanjyut-backup-fjx_abc.zip',
      fileSize: 12345,
      options: { includeDrafts: true },
      status: 'completed',
      filePath: 'export/fjx_abc.zip',
      createdBy: 'admin_1',
      startedAt: new Date('2026-08-05T10:00:00Z'),
      completedAt: new Date('2026-08-05T10:01:00Z'),
      createdAt: new Date('2026-08-05T10:00:00Z')
    })
    expect(summary.downloadable).toBe(true)
    expect(summary.fileSize).toBe(12345)
    expect(summary.options).toEqual({ includeDrafts: true, includeAudit: false, includeStyles: false })
    expect(summary.completedAt).toBe('2026-08-05T10:01:00.000Z')
  })

  it('failed/running 批次：downloadable=false；缺省字段給缺省值不拋錯', () => {
    expect(summarizeExportBatch({ id: 'fjx_x', status: 'failed', error: 'boom', filePath: 'export/fjx_x.zip' }).downloadable).toBe(false)
    expect(summarizeExportBatch({ id: 'fjx_y', status: 'running', filePath: 'export/fjx_y.zip' }).downloadable).toBe(false)
    const min = summarizeExportBatch({ id: 'fjx_min' })
    expect(min.fileName).toBe('fjx_min.zip')
    expect(min.fileSize).toBeNull()
    expect(min.status).toBe('unknown')
  })
})
