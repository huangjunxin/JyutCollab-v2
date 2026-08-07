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
  baselineLevel?: string
  createdBy?: string
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
  // 審計 M32：§10.1 要求的基線與創建者
  baselineLevel: string | null
  createdBy: string | null
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
    // 審計 M32：§10.1 要求的基線與創建者（舊批次缺省 → null，前端顯示 —）
    baselineLevel: typeof doc.baselineLevel === 'string' && doc.baselineLevel ? doc.baselineLevel : null,
    createdBy: typeof doc.createdBy === 'string' && doc.createdBy ? doc.createdBy : null,
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
  /** 審計 L5/M46：干預衝突類 finding 的 details.examples（前 5 條）結構化保留，
   *  供前端逐條展示/跳轉（原被 groupFindings 丟棄，只有總數） */
  examples?: Array<{ sourceKey?: string; sourceCell?: string; objectId?: string; text?: string }>
}

/** blocker/warning 按 code 分組的結果（count = 該 code 出現次數） */
export interface GroupedFindings {
  code: string
  count: number
  items: GroupedFindingItem[]
}

/** 審計 L5/M46：從 finding.details.examples 提取前 5 條結構化示例 */
function extractExamples(finding: Finding): GroupedFindingItem['examples'] {
  const raw = finding.details?.examples
  if (!Array.isArray(raw)) return undefined
  return raw.slice(0, 5).map((item) => {
    if (typeof item === 'string') {
      const result: NonNullable<GroupedFindingItem['examples']>[number] = { text: item }
      if (item.startsWith('>')) result.sourceKey = item
      return result
    }
    const rec = item as Record<string, unknown>
    return {
      sourceKey: typeof rec.sourceKey === 'string' ? rec.sourceKey : undefined,
      sourceCell: typeof rec.sourceCell === 'string' ? rec.sourceCell : undefined,
      objectId: typeof rec.objectId === 'string' ? rec.objectId : undefined,
      text: typeof rec.text === 'string' ? rec.text : undefined,
    }
  })
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
      objectId: finding.objectId,
      // 審計 L5/M46：examples 结构化为可跳转项（字符串示例按 message 展示）
      examples: extractExamples(finding)
    })
  }
  return [...byCode.values()].sort(
    (a, b) => b.count - a.count || a.code.localeCompare(b.code)
  )
}
