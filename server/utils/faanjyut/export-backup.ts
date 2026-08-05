/**
 * 泛粵字表 backup 導出純邏輯（FaanjyutV1Design.md §10.2 導出頁、§14.5 驗收）。
 *
 * v1 只有 backup 一種 scope：全部詞條組 + 全部格 + 註釋/鏈接/域外；
 * 開關：includeDrafts（默認關）、includeAudit（含 histories，僅 admin）、includeStyles。
 *
 * 流式：DB 游標分批讀（ExportSource）→ 逐條序列化 NDJSON 行 → 寫入 ZIP（ExportOutput），
 * 每文件邊寫邊計 records + SHA-256（createHash），manifest.json 最後入包（自身即證據，
 * 不放 reports/）。本模塊不 import mongoose、不觸文件系統，單元測試用內存 fake。
 *
 * 導出值域是 DB 態（非導入 DTO）：editedAfterImport 可能 true、version 可能 >0、
 * createdBy 是真實 userId、詞條可能 status.publicationStatus='draft'、允許
 * _id/createdAt/updatedAt/importBatchId 等運行期字段——**不用導入 DTO 反向校驗**。
 */
import { createHash } from 'node:crypto'

/** 7 類 NDJSON 文件與其 DB 集合（文件名/鍵名對齊導入契約，見 import-contract.ts FILE_TO_COLLECTION） */
export const EXPORT_FILES: Array<{
  name: string
  /** includeDrafts=false 時是否要過濾 draft 詞條及其關聯（columns/external_etymons 不過濾） */
  draftFiltered: boolean
  /** includeStyles=false 時是否剝除 style 字段（僅 columns） */
  stripStyle: boolean
}> = [
  { name: 'columns.ndjson', draftFiltered: false, stripStyle: true },
  { name: 'lexemes.ndjson', draftFiltered: true, stripStyle: false },
  { name: 'entries.ndjson', draftFiltered: true, stripStyle: false },
  { name: 'external_etymons.ndjson', draftFiltered: false, stripStyle: false },
  { name: 'cell_states.ndjson', draftFiltered: true, stripStyle: false },
  { name: 'comments.ndjson', draftFiltered: true, stripStyle: false },
  { name: 'links.ndjson', draftFiltered: true, stripStyle: false }
]

/** includeAudit=true 時追加的歷史文件（只含泛粵 Entry 的歷史，edit_histories 全平台共用） */
export const EDIT_HISTORIES_FILE = 'edit_histories.ndjson'

export interface ExportOptions {
  includeDrafts: boolean
  includeAudit: boolean
  includeStyles: boolean
}

/** manifest.json 結構（§10.2：exportType/exportId/generatedAt/options/files{records+sha256}） */
export interface ExportManifest {
  exportType: 'backup'
  exportId: string
  generatedAt: string
  options: ExportOptions
  files: Record<string, { records: number; sha256: string }>
}

export type ExportFileName = typeof EXPORT_FILES[number]['name'] | typeof EDIT_HISTORIES_FILE

/**
 * DB 訪問面（真實實現見 mongo-db.ts adaptMongooseExportDb；測試用內存 fake）。
 * 全部返回 lean 純對象的異步迭代器——遊標分批，絕不一次性把 8 萬條 entries 裝進內存。
 */
export interface ExportSource {
  /** 按文件名的集合全部文檔（未做 draft/style 過濾，過濾在純邏輯層做） */
  iterateDocs(name: ExportFileName): AsyncIterable<Record<string, unknown>>
  /** 泛粵 Entry 的 _id（includeAudit 用；真實實現分塊查 Entry.find({sourceBook:'faanjyut'})） */
  iterateFaanjyutEntryIds(): AsyncIterable<string>
  /** 全部 EditHistory 文檔（entryId 過濾由純邏輯層做） */
  iterateEditHistories(): AsyncIterable<Record<string, unknown>>
}

/**
 * 輸出面（真實實現見 export-archiver.ts createArchiverExportOutput：archiver 流式寫 ZIP；
 * 測試用內存 fake）。行內容已含換行符；manifest 也是最後一行。
 *
 * **pull 模型**：writeFile 接收一個行迭代器，由 archiver 按需拉取（Readable.from），
 * 不允許「逐條 write + drain 等待」的手動寫入——那是 PassThrough 緩衝與消費端
 * 競爭導致的死鎖根源（診斷：全量導出 ZIP 精確停在 21185 字節）。
 */
export interface ExportOutput {
  /** 把一個文件的所有行寫入包（archiver 流式拉取迭代器；返回時迭代器已完全消費） */
  writeFile(name: string, lines: Iterable<string> | AsyncIterable<string>): Promise<void>
  /** 結束全部輸出；返回最終產物字節數（ZIP 文件大小） */
  finalize(): Promise<{ fileSize: number }>
  /** 中途中止：銷毀未完成流、清理半成品（失敗路徑用；可空實現） */
  abort(): Promise<void>
}

/** 批次行視圖（導出歷史列表用；字段對應 FaanJyutExportBatch 模型） */
export interface ExportBatchDocLike {
  id: string
  fileName?: string
  fileSize?: number
  options?: Partial<ExportOptions>
  status?: string
  filePath?: string
  createdBy?: string
  error?: string | null
  startedAt?: Date | string
  completedAt?: Date | string | null
  createdAt?: Date | string
  [key: string]: unknown
}

export interface ExportBatchSummary {
  id: string
  fileName: string
  fileSize: number | null
  options: ExportOptions
  status: string
  createdBy: string
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string | null
  /** completed 且 filePath 存在才可下載 */
  downloadable: boolean
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.length > 0) return value
  return null
}

export function summarizeExportBatch(doc: ExportBatchDocLike): ExportBatchSummary {
  return {
    id: doc.id,
    fileName: doc.fileName ?? `${doc.id}.zip`,
    fileSize: typeof doc.fileSize === 'number' ? doc.fileSize : null,
    options: {
      includeDrafts: doc.options?.includeDrafts ?? false,
      includeAudit: doc.options?.includeAudit ?? false,
      includeStyles: doc.options?.includeStyles ?? false
    },
    status: doc.status ?? 'unknown',
    createdBy: doc.createdBy ?? '',
    error: doc.error ?? null,
    startedAt: toIsoOrNull(doc.startedAt),
    completedAt: toIsoOrNull(doc.completedAt),
    createdAt: toIsoOrNull(doc.createdAt),
    downloadable: doc.status === 'completed' && Boolean(doc.filePath)
  }
}

/** draft 判定：status.publicationStatus === 'draft'（P5 新建詞條引入；當前導入數據庫中無） */
export function isDraftLexeme(doc: Record<string, unknown>): boolean {
  const status = doc.status as { publicationStatus?: string } | undefined
  return status?.publicationStatus === 'draft'
}

/** comments 關聯：targetType === 'lexeme' 且 targetId 是 draft 詞條 */
function commentRefsDraft(doc: Record<string, unknown>, draftLexemeIds: Set<string>): boolean {
  return doc.targetType === 'lexeme' && draftLexemeIds.has(String(doc.targetId ?? ''))
}

/** links 關聯：from/to 任一側是 draft 詞條 */
function linkRefsDraft(doc: Record<string, unknown>, draftLexemeIds: Set<string>): boolean {
  return (
    draftLexemeIds.has(String(doc.fromLexemeId ?? '')) ||
    (doc.toLexemeId != null && draftLexemeIds.has(String(doc.toLexemeId)))
  )
}

/** 是否要跳過該文檔（draft 過濾；includeDrafts=true 時恆不跳過）。按文件類型取關聯字段 */
function draftSkipPredicate(
  name: ExportFileName
): (doc: Record<string, unknown>, draftLexemeIds: Set<string>) => boolean {
  switch (name) {
    case 'comments.ndjson':
      return commentRefsDraft
    case 'links.ndjson':
      return linkRefsDraft
    default:
      // entries / cell_states：以頂層 lexemeId 關聯
      return (doc, draftLexemeIds) => draftLexemeIds.has(String(doc.lexemeId ?? ''))
  }
}

/**
 * 序列化一行 NDJSON（DB 態：_id/Date 經 JSON.stringify 自然轉為 hex/ISO 字符串）。
 * 不反向用導入 DTO 校驗（literal 約束會全掛）。
 */
function serializeDoc(doc: Record<string, unknown>): string {
  return `${JSON.stringify(doc)}\n`
}

/**
 * 把一個集合流式寫成文件：產行時同步計 records + SHA-256（generator 被 archiver
 * 拉取時執行），輸出走 pull 模型（writeFile 由消費端按需拉取，無手動 write/drain）。
 * 返回該文件的行數與哈希。
 */
async function writeFileStream(
  output: ExportOutput,
  name: ExportFileName,
  iterate: AsyncIterable<Record<string, unknown>>,
  transform: (doc: Record<string, unknown>) => Record<string, unknown> | null
): Promise<{ records: number; sha256: string }> {
  const hash = createHash('sha256')
  let records = 0

  async function* lines(): AsyncGenerator<string> {
    for await (const doc of iterate) {
      const lineDoc = transform(doc)
      if (lineDoc === null) continue
      const line = serializeDoc(lineDoc)
      hash.update(line, 'utf8')
      records += 1
      yield line
    }
  }

  await output.writeFile(name, lines())
  return { records, sha256: hash.digest('hex') }
}

export interface BackupExportResult {
  manifest: ExportManifest
  fileSize: number
}

/**
 * 執行一次 backup 導出（純邏輯）。流程：
 * 1) columns → lexemes（順帶收集 draft 詞條 id）→ entries/external_etymons/cell_states/
 *    comments/links（draft 關聯過濾）→ 每文件寫完即得 records+sha256；
 * 2) includeAudit：收集泛粵 Entry._id → 過濾 edit_histories 只留泛粵歷史；
 * 3) manifest.json 最後入包（含每文件記錄數 + SHA-256）；
 * 4) output.finalize() 取最終文件大小。
 */
export async function runBackupExport(input: {
  source: ExportSource
  output: ExportOutput
  options: ExportOptions
  exportId: string
  generatedAt: string
}): Promise<BackupExportResult> {
  const { source, output, options, exportId, generatedAt } = input
  const files: ExportManifest['files'] = {}
  const draftLexemeIds = new Set<string>()

  for (const file of EXPORT_FILES) {
    const skipDraft = file.draftFiltered && !options.includeDrafts ? draftSkipPredicate(file.name) : null
    const transform = (doc: Record<string, unknown>): Record<string, unknown> | null => {
      if (skipDraft && skipDraft(doc, draftLexemeIds)) return null
      if (file.stripStyle && !options.includeStyles && doc.style !== undefined) {
        const { style: _dropped, ...rest } = doc
        return rest
      }
      return doc
    }
    const collected: string[] = []
    const { records, sha256 } = await writeFileStream(output, file.name, source.iterateDocs(file.name), (doc) => {
      // lexemes 過濾 + draft id 收集；其他文件僅過濾
      if (file.name === 'lexemes.ndjson' && !options.includeDrafts && isDraftLexeme(doc)) {
        collected.push(String(doc.id ?? ''))
        return null
      }
      return transform(doc)
    })
    for (const id of collected) draftLexemeIds.add(id)
    files[file.name] = { records, sha256 }
  }

  if (options.includeAudit) {
    const faanjyutEntryIds = new Set<string>()
    for await (const entryId of source.iterateFaanjyutEntryIds()) {
      faanjyutEntryIds.add(entryId)
    }
    const { records, sha256 } = await writeFileStream(
      output,
      EDIT_HISTORIES_FILE,
      source.iterateEditHistories(),
      (doc) => {
        if (!faanjyutEntryIds.has(String(doc.entryId ?? ''))) return null
        return doc
      }
    )
    files[EDIT_HISTORIES_FILE] = { records, sha256 }
  }

  const manifest: ExportManifest = {
    exportType: 'backup',
    exportId,
    generatedAt,
    options: { ...options },
    files
  }

  // manifest 自身不入 files 清單（manifest 即包內證據）；最後入包保證 ZIP 條目順序穩定
  await output.writeFile('manifest.json', [`${JSON.stringify(manifest)}\n`])

  const { fileSize } = await output.finalize()
  return { manifest, fileSize }
}
