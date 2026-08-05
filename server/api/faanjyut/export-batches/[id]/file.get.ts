/**
 * GET /api/faanjyut/export-batches/[id]/file（FaanjyutV1Design §10.2：重新下載，admin）。
 *
 * 校驗批次 completed + 路徑防護（resolveReportFile 模式，防 ../../ 穿越）→
 * sendStream 流式回傳 ZIP + Content-Disposition: attachment。cookie session 自帶鑑權。
 */
import { createReadStream, existsSync } from 'node:fs'
import { basename, dirname } from 'node:path'
import { sendStream, setHeader } from 'h3'
import { FaanJyutExportBatch } from '../../../../utils/FaanJyutExportBatch'
import { connectDB } from '../../../../utils/db'
import { resolveReportFile } from '../../../../utils/faanjyut/import-batches'

export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    if (event.context.auth.role !== 'admin') {
      throw createError({ statusCode: 403, message: '無權下載導出文件' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少導出批次 ID' })
    }

    await connectDB()

    const batch = await FaanJyutExportBatch.findOne({ id }).lean()
    if (!batch) {
      throw createError({ statusCode: 404, message: '導出批次不存在' })
    }
    if (batch.status !== 'completed') {
      throw createError({ statusCode: 409, message: '導出尚未完成，無法下載' })
    }

    const artifactsRoot = useRuntimeConfig(event).faanjyutArtifactsRoot as string
    const filePath = resolveReportFile({
      artifactsRoot,
      reportDir: dirname(batch.filePath),
      fileName: basename(batch.filePath)
    })
    if (!filePath || !existsSync(filePath)) {
      throw createError({ statusCode: 404, message: '導出文件不存在或已被清理' })
    }

    setHeader(event, 'Content-Type', 'application/zip')
    setHeader(event, 'Content-Disposition', `attachment; filename="${batch.fileName}"`)
    return sendStream(event, createReadStream(filePath))
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '下載導出文件失敗' })
  }
})
