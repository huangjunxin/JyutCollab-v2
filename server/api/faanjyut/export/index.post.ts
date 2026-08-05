/**
 * POST /api/faanjyut/export（FaanjyutV1Design §10.2、§12：backup ZIP 流式導出，admin）。
 *
 * body：{ includeDrafts?, includeAudit?, includeStyles? }（Zod 全可缺省，默認 false）。
 *
 * 執行模型：**後台執行**——創建 running 批次後立即返回，導出在後台 Promise 跑到
 * completed/failed（與客戶端斷連無關）；前端以 2.5s 間隔輪詢
 * GET /api/faanjyut/export-batches。失敗 → 批次 failed + error + 刪半成品 ZIP。
 * 未登錄 401；非 admin 403。
 */
import { z } from 'zod'
import { dirname, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import mongoose from 'mongoose'
import { nanoid } from 'nanoid'
import { FaanJyutExportBatch } from '../../../utils/FaanJyutExportBatch'
import { connectDB } from '../../../utils/db'
import { formatZodErrorToMessage } from '../../../utils/validation'
import { adaptMongooseExportDb } from '../../../utils/faanjyut/mongo-db'
import { createArchiverExportOutput } from '../../../utils/faanjyut/export-archiver'
import {
  runBackupExport,
  summarizeExportBatch,
  type ExportOptions,
  type ExportOutput
} from '../../../utils/faanjyut/export-backup'

const ExportBodySchema = z.object({
  includeDrafts: z.boolean().optional(),
  includeAudit: z.boolean().optional(),
  includeStyles: z.boolean().optional()
})

/** 導出批次 ID：fjx_ + nanoid(16)（不用 fje_——那是 externalEtymon 穩定 ID 前綴） */
function newExportId(): string {
  return `fjx_${nanoid(16)}`
}

/**
 * 後台導出（fire-and-forget，不 await）：捕獲全部所需值（不依賴 event/請求生命週期），
 * 用全局 mongoose 連接流式寫 ZIP；任何異常 → 批次 failed + error + 清理半成品。
 * Nitro（node-server）下 handler 返回後未 await 的 Promise 繼續在事件循環跑完，
 * 客戶端斷連不取消。
 */
async function runExportInBackground(args: {
  id: string
  filePath: string
  artifactsRoot: string
  options: ExportOptions
}): Promise<void> {
  const { id, filePath, artifactsRoot, options } = args
  let output: ExportOutput | null = null
  try {
    const zipPath = resolve(artifactsRoot, filePath)
    mkdirSync(dirname(zipPath), { recursive: true })
    output = createArchiverExportOutput(zipPath)
    const result = await runBackupExport({
      source: adaptMongooseExportDb(mongoose.connection),
      output,
      options,
      exportId: id,
      generatedAt: new Date().toISOString()
    })
    await FaanJyutExportBatch.updateOne(
      { id },
      { $set: { status: 'completed', fileSize: result.fileSize, completedAt: new Date() } }
    )
  } catch (error: any) {
    await output?.abort().catch(() => {})
    const detail = typeof error?.message === 'string' && error.message ? error.message : String(error)
    await FaanJyutExportBatch.updateOne(
      { id },
      { $set: { status: 'failed', error: detail, failedAt: new Date() } }
    )
  }
}

export default defineEventHandler(async (event) => {
  try {
    // 全局 middleware 已保證登錄；admin 判定與 import-batches/index.get.ts 一致
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    if (event.context.auth.role !== 'admin') {
      throw createError({ statusCode: 403, message: '無權執行導出' })
    }

    const body = await readBody(event)
    const validated = ExportBodySchema.safeParse(body ?? {})
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: formatZodErrorToMessage(validated.error)
      })
    }

    await connectDB()

    const options: ExportOptions = {
      includeDrafts: validated.data.includeDrafts ?? false,
      includeAudit: validated.data.includeAudit ?? false,
      includeStyles: validated.data.includeStyles ?? false
    }
    const id = newExportId()
    const fileName = `faanjyut-backup-${id}.zip`
    const filePath = `export/${id}.zip`
    const artifactsRoot = useRuntimeConfig(event).faanjyutArtifactsRoot as string

    const startedAt = new Date()
    await FaanJyutExportBatch.create({
      id,
      fileName,
      options,
      status: 'running',
      filePath,
      createdBy: event.context.auth.id,
      startedAt
    })

    // 後台執行：捕獲配置值後 fire-and-forget，立即返回 running 批次
    void runExportInBackground({ id, filePath, artifactsRoot, options }).catch(() => {
      // 後台函數內部已捕獲並標 failed；此處兜底避免 unhandled rejection
    })

    const batch = await FaanJyutExportBatch.findOne({ id }).lean()
    return { success: true, data: summarizeExportBatch(batch as never) }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '啟動導出失敗' })
  }
})
