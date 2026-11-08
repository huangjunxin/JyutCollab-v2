import { existsSync, readFileSync } from 'node:fs'
import { FaanJyutImportBatch } from '../../../utils/FaanJyutImportBatch'
import { connectDB } from '../../../utils/db'
import {
  groupFindings,
  resolveReportFile
} from '../../../utils/faanjyut/import-batches'
import type { Finding } from '../../../utils/faanjyut/import-contract'

/** 把 lean 文檔的日期/ID 規範化為 JSON 友好值 */
function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** 讀 reportDir 內的 JSON 報告；路徑越界/文件缺失/解析失敗一律返回 null（不報錯） */
function readReportJson(
  artifactsRoot: string,
  reportDir: string | undefined,
  fileName: string
): unknown {
  const filePath = resolveReportFile({ artifactsRoot, reportDir, fileName })
  if (!filePath || !existsSync(filePath)) return null
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

/** precheck（schema_dry_run_report.json）：passed + 按 code 分組的 blocker/warning + databaseProof + 契約計數 */
function extractPrecheck(raw: unknown): unknown {
  const report = raw as {
    passed?: boolean
    blockers?: Array<Record<string, unknown>>
    warnings?: Array<Record<string, unknown>>
    databaseProof?: unknown
    counts?: unknown
  } | null
  if (!report) return null
  return {
    passed: Boolean(report.passed),
    blockers: groupFindings((report.blockers ?? []) as Finding[]),
    warnings: groupFindings((report.warnings ?? []) as Finding[]),
    databaseProof: report.databaseProof ?? null,
    counts: report.counts ?? null
  }
}

/** write（import_write_report.json）：matched/counts/bulkSize */
function extractWrite(raw: unknown): unknown {
  const report = raw as { matched?: boolean; counts?: unknown; bulkSize?: number } | null
  if (!report) return null
  return {
    matched: Boolean(report.matched),
    counts: report.counts ?? null,
    bulkSize: typeof report.bulkSize === 'number' ? report.bulkSize : null
  }
}

/** indexPlan（index-plan.json）：summary（create/drop 計數 + headword.search 方案 B 殘留） */
function extractIndexPlan(raw: unknown): unknown {
  const report = raw as {
    summary?: { createCount?: number; dropCount?: number; headwordSearchResidue?: number }
  } | null
  const summary = report?.summary
  if (!summary) return null
  return {
    createCount: summary.createCount ?? 0,
    dropCount: summary.dropCount ?? 0,
    headwordSearchResidue: summary.headwordSearchResidue ?? 0
  }
}

export default defineEventHandler(async (event) => {
  try {
    // 全局 middleware 已保證登錄；admin 判定與 users/index.get.ts 一致
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    if (event.context.auth.role !== 'admin') {
      throw createError({ statusCode: 403, message: '無權查看導入批次' })
    }

    const batchId = getRouterParam(event, 'id')
    if (!batchId) {
      throw createError({ statusCode: 400, message: '缺少批次 ID' })
    }

    await connectDB()

    const batch = await FaanJyutImportBatch.findOne({ batchId }).lean()
    if (!batch) {
      throw createError({ statusCode: 404, message: '導入批次不存在' })
    }

    const artifactsRoot = useRuntimeConfig(event).faanjyutArtifactsRoot
    const reportDir = batch.reportDir

    const precheckRaw = readReportJson(artifactsRoot, reportDir, 'schema_dry_run_report.json')
    const writeRaw = readReportJson(artifactsRoot, reportDir, 'import_write_report.json')
    const rollbackRaw = readReportJson(artifactsRoot, reportDir, 'import_rollback_report.json')
    const indexPlanRaw = readReportJson(artifactsRoot, reportDir, 'index-plan.json')

    return {
      success: true,
      data: {
        batch: {
          ...batch,
          _id: String(batch._id),
          startedAt: iso(batch.startedAt),
          completedAt: iso(batch.completedAt),
          failedAt: iso(batch.failedAt),
          interruptedAt: iso(batch.interruptedAt),
          rolledBackAt: iso(batch.rolledBackAt),
          createdAt: iso(batch.createdAt),
          updatedAt: iso(batch.updatedAt)
        },
        // 報告塊：文件不存在 → null（不報錯）；rollbackCounts 恆返回（以批次字段為準）
        precheck: extractPrecheck(precheckRaw),
        write: extractWrite(writeRaw),
        rollback: rollbackRaw ?? null,
        rollbackCounts: batch.rollbackCounts ?? null,
        indexPlan: extractIndexPlan(indexPlanRaw)
      }
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '獲取導入批次詳情失敗' })
  }
})
