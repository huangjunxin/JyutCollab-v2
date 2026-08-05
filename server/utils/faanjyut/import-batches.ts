/**
 * 導入批次與報告的只讀查詢邏輯（FaanjyutV1Design §10.1 導入報告頁、§12 API 面）。
 *
 * 純函數模塊，不依賴 MongoDB 連接與文件系統（文件讀取由 handler 負責），可單元測試：
 *  - summarizeBatch：批次列表行視圖
 *  - resolveReportFile：把批次 reportDir + 文件名解析為 artifactsRoot 之內的絕對路徑（路徑穿越防護）
 *  - groupFindings：blocker/warning 按 code 分組，組內保留前端跳轉所需結構化字段
 */
import { resolve, sep } from 'node:path'
import type { Finding } from './import-contract'

/** lean 查詢結果的批次文檔子集（summarizeBatch 只依賴這些字段） */
export interface BatchDocLike {
  batchId: string
  mode?: string
  environment?: string
  status?: string
  source?: { sourceWorkbook?: string }
  counts?: { written?: Record<string, number> }
  error?: string | null
  rollbackCounts?: Record<string, unknown> | null
  startedAt?: Date | string
  completedAt?: Date | string | null
  [key: string]: unknown
}

/** 批次列表行視圖（導入報告頁批次列表用） */
export interface BatchSummary {
  batchId: string
  mode: string
  environment: string
  status: string
  sourceWorkbook: string
  /** counts.written 各 collection 計數合計 */
  countsWrittenTotal: number
  startedAt: string | null
  completedAt: string | null
  hasError: boolean
  hasRollbackCounts: boolean
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' && value.length > 0) return value
  return null
}

/** 列表行視圖：batchId/mode/environment/status/sourceWorkbook/written 合計/時間/錯誤/回滾計數存在與否 */
export function summarizeBatch(doc: BatchDocLike): BatchSummary {
  const written = doc.counts?.written ?? {}
  const countsWrittenTotal = Object.values(written).reduce(
    (sum, n) => sum + (typeof n === 'number' ? n : 0),
    0
  )
  return {
    batchId: doc.batchId,
    mode: doc.mode ?? 'unknown',
    environment: doc.environment ?? 'unknown',
    status: doc.status ?? 'unknown',
    sourceWorkbook: doc.source?.sourceWorkbook ?? '',
    countsWrittenTotal,
    startedAt: toIsoOrNull(doc.startedAt),
    completedAt: toIsoOrNull(doc.completedAt),
    hasError: Boolean(doc.error),
    hasRollbackCounts: Boolean(doc.rollbackCounts)
  }
}

/**
 * 把批次 reportDir + 報告文件名解析為 artifactsRoot 之內的絕對路徑。
 *
 * 路徑安全：reportDir 與最終文件路徑都必須解析到 artifactsRoot 之內
 * （path.resolve 後 startsWith 檢查），否則返回 null——防止批次記錄攜帶
 * ../../etc 之類的越界路徑被報告 API 讀取。reportDir 缺省或文件名缺失亦返回 null。
 */
export function resolveReportFile(input: {
  artifactsRoot: string
  reportDir?: string
  fileName: string
}): string | null {
  const { artifactsRoot, reportDir, fileName } = input
  if (!reportDir || !fileName) return null
  const root = resolve(artifactsRoot)
  const dir = resolve(root, reportDir)
  if (!isWithinRoot(root, dir)) return null
  const file = resolve(dir, fileName)
  if (!isWithinRoot(root, file)) return null
  return file
}

function isWithinRoot(root: string, target: string): boolean {
  return target === root || target.startsWith(root + sep)
}

/** groupFindings 的組內項（保留前端跳轉所需字段；不解析自由文本，契約 §8.1） */
export interface GroupedFindingItem {
  sourceKey?: string
  sourceCell?: string
  message: string
  file?: string
  line?: number
  objectId?: string
}

/** blocker/warning 按 code 分組的結果（count = 該 code 出現次數） */
export interface GroupedFindings {
  code: string
  count: number
  items: GroupedFindingItem[]
}

/**
 * 按 code 分組（組序：count 降序 → code 字典序，保證響應穩定）。
 * 組內僅保留結構化跳轉字段（sourceKey/sourceCell/message/file/line/objectId），
 * 不解析 message 自由文本（契約 §8.1：跳轉依賴結構化字段）。
 */
export function groupFindings(findings: Finding[]): GroupedFindings[] {
  const byCode = new Map<string, GroupedFindings>()
  for (const finding of findings) {
    let group = byCode.get(finding.code)
    if (!group) {
      group = { code: finding.code, count: 0, items: [] }
      byCode.set(finding.code, group)
    }
    group.count += 1
    group.items.push({
      sourceKey: finding.sourceKey,
      sourceCell: finding.sourceCell,
      message: finding.message,
      file: finding.file,
      line: finding.line,
      objectId: finding.objectId
    })
  }
  return [...byCode.values()].sort(
    (a, b) => b.count - a.count || a.code.localeCompare(b.code)
  )
}
