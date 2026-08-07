/**
 * 泛粵字表模組前端型別（對應 server/utils/faanjyut/lexeme-detail.ts 與
 * server/utils/faanjyut/import-batches.ts 的響應結構）。
 * 僅為消費側型別；欄位名與 API 契約一致（顯示層標籤中文化在頁面內處理）。
 */

// ---- 詞條詳情（GET /api/faanjyut/lexemes/:id） ----

/** 四態格視圖（FaanjyutV1Design §6.3） */
export type FaanJyutCellView =
  | { state: 'null' }
  | { state: 'absent' }
  | { state: 'cleared' }
  | { state: 'normal'; raw: string | null }

export interface FaanJyutLexemeDetail {
  header: {
    id: string
    sourceKey: string | null
    representativeChar: { raw?: string; display?: string; warnings?: string[] } | null
    compositePronunciation: {
      raw?: string
      display?: string
      markers?: { hasQuestion?: boolean; hasBang?: boolean }
    } | null
    commonCharCandidates: string | null
    definitionRaw: string | null
    publicationStatus: string | null
    matrixOrder: number | null
  }
  /** 去重義項（sense 記錄：label + definition；真實數據無 examples） */
  senses: Array<{
    label?: string
    definition: string
    examples?: unknown[]
  }>
  pronunciations: Array<{
    columnId: string
    label: string
    shortLabel: string | null
    dialectId: string | null
    languageCode: string | null
    sourceRole: string | null
    originalOrder: number | null
    style: Record<string, unknown> | null
    cell: FaanJyutCellView
    entry: {
      entryId: string
      headword: Record<string, unknown> | null
      phonetic: Record<string, unknown> | null
    } | null
  }>
  externalMaterials: Array<{
    languageCode: string
    languageLabel: string
    items: Array<{
      id: string
      scriptForm: string | null
      raw: string | null
      phonetic: string | null
      gloss: string | null
      sourceType: string | null
      sourceDetail: string | null
      note: string | null
    }>
  }>
  links: Array<{
    id: string
    fromLexemeId: string
    toLexemeId: string | null
    targetKey: string | null
    targetRaw: string | null
    type: string | null
    rawSource: string | null
    rawLabel: string | null
    rawValue: string | null
    status: string | null
    broken: boolean
    unresolved: boolean
    targetLexeme: {
      id: string
      sourceKey: string | null
      representativeChar: Record<string, any> | null
    } | null
  }>
  comments: Array<{
    id: string
    targetType: string | null
    targetId: string | null
    source: string | null
    author: string | null
    content: string
    threadedPlaceholder: boolean
    originalTimestamp: string | null
    sourceCell: string | null
  }>
  editHistory: Array<{
    id: string
    entryId: string
    userId: string
    action: string | null
    changedFields: string[]
    beforeSnapshot: Record<string, unknown> | null
    afterSnapshot: Record<string, unknown> | null
    comment: string | null
    isReverted: boolean
    createdAt: string | null
  }>
  importTrace: {
    sourceWorkbook: string | null
    sourceSheet: string | null
    sourceRow: number | null
    importBatchId: string | null
    stableId: string
  }
}

// ---- 導入批次列表（GET /api/faanjyut/import-batches） ----

export interface FaanJyutImportBatchSummary {
  batchId: string
  mode: string
  environment: string
  status: 'running' | 'completed' | 'failed' | 'rolled_back' | string
  // 審計 M32：基線與創建者（舊批次缺省 → null）
  baselineLevel: string | null
  createdBy: string | null
  sourceWorkbook: string
  countsWrittenTotal: number
  startedAt: string | null
  completedAt: string | null
  hasError: boolean
  hasRollbackCounts: boolean
}

// ---- 導入批次詳情（GET /api/faanjyut/import-batches/:id） ----

export interface FaanJyutFindingItem {
  sourceKey?: string
  sourceCell?: string
  message: string
  file?: string
  line?: number
  objectId?: string
  // 審計 L5/M46：干預衝突類 finding 的結構化示例（前 5 條）
  examples?: Array<{ sourceKey?: string; sourceCell?: string; objectId?: string; text?: string }>
}

export interface FaanJyutFindingGroup {
  code: string
  count: number
  items: FaanJyutFindingItem[]
}

export interface FaanJyutImportBatchDetail {
  batch: {
    _id: string
    batchId: string
    mode: string
    environment: string
    status: 'running' | 'completed' | 'failed' | 'rolled_back' | string
    source: {
      sourceWorkbook: string
      sourceFileSha256: string
      manifestSha256: string
    }
    precheckRunId?: string
    reportDir?: string
    bulkSize: number
    counts: { written: Record<string, number> }
    error?: string
    startedAt: string | null
    completedAt: string | null
    failedAt: string | null
    rolledBackAt: string | null
    rollbackCounts?: {
      before: Record<string, number>
      after: Record<string, number>
    }
    createdAt: string | null
    updatedAt: string | null
  }
  precheck: {
    passed: boolean
    blockers: FaanJyutFindingGroup[]
    warnings: FaanJyutFindingGroup[]
    databaseProof: {
      collectionNamesBefore: string[]
      collectionNamesAfter: string[]
      collectionsBefore: Record<string, number>
      collectionsAfter: Record<string, number>
      writeCommandsObserved: string[]
      unchanged: boolean
    } | null
    counts: Record<string, unknown> | null
  } | null
  write: {
    matched: boolean
    counts: Record<string, unknown> | null
    bulkSize: number | null
  } | null
  rollback: Record<string, unknown> | null
  rollbackCounts: {
    before: Record<string, number>
    after: Record<string, number>
  } | null
  indexPlan: {
    createCount: number
    dropCount: number
    headwordSearchResidue: number
  } | null
}

// ---- 導出批次（POST /api/faanjyut/export、GET /api/faanjyut/export-batches） ----

export interface FaanJyutExportOptions {
  includeDrafts: boolean
  includeAudit: boolean
  includeStyles: boolean
}

export interface FaanJyutExportBatchSummary {
  id: string
  fileName: string
  fileSize: number | null
  options: FaanJyutExportOptions
  status: 'running' | 'completed' | 'failed' | string
  createdBy: string
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string | null
  downloadable: boolean
}

