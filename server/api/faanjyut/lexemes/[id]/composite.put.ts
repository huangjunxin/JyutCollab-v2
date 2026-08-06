/**
 * PUT /api/faanjyut/lexemes/:id/composite（FaanjyutV1Design §7；2026-08-06 方案 A）
 *
 * 詞條綜合音編輯：僅 admin + 私有寫入 flag。
 * 寫 lexemes.meta.compositePronunciation（raw/display/markers 按 ETL 規則重算，
 * 見 utils/faanjyut/composite.ts）+ meta.compositeEditedBy/At 輕量審計
 * （group 級完整歷史 v1 不建 EditHistory，見設計 §15）；raw 為空 = 清空綜合音。
 *
 * 狀態碼：未登錄 401 / 非 admin 403 / flag 關閉 503 / 詞條不存在 404 / raw 超長 400。
 * 值未變（no-op）返回 changed=false，不寫庫。
 */
import { z } from 'zod'
import { checkWriteFlag } from '../../../../utils/faanjyut/cells'
import { buildCompositePronunciation } from '../../../../utils/faanjyut/composite'
import { Lexeme } from '../../../../utils/Lexeme'

const MAX_COMPOSITE_LENGTH = 200

const BodySchema = z.object({
  raw: z.string().max(MAX_COMPOSITE_LENGTH, `綜合音過長（最多 ${MAX_COMPOSITE_LENGTH} 字）`)
})

export default defineEventHandler(async (event) => {
  try {
    const user = event.context.auth
    if (!user) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }

    const config = useRuntimeConfig(event)
    const flagError = checkWriteFlag(config)
    if (flagError) {
      throw createError({ statusCode: 503, message: flagError })
    }

    if (user.role !== 'admin') {
      throw createError({ statusCode: 403, message: '只有管理員可編輯綜合音' })
    }

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({ statusCode: 400, message: '缺少詞條ID' })
    }

    const body = await readBody(event)
    const validated = BodySchema.safeParse(body)
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: `raw：${validated.error.issues[0]?.message ?? '格式不正確'}`
      })
    }

    await connectDB()

    const lexeme = await Lexeme.findOne({ id, 'meta.sourceBook': 'faanjyut' })
      .select('id meta.compositePronunciation')
      .lean()
    if (!lexeme) {
      throw createError({ statusCode: 404, message: '詞條不存在' })
    }

    const composite = buildCompositePronunciation(validated.data.raw)
    const before = (lexeme as any).meta?.compositePronunciation ?? null

    // no-op：值未變不寫庫（與格編輯一致）
    if (composite && before?.raw === composite.raw) {
      return { success: true, changed: false, data: { composite } }
    }
    if (!composite && !before) {
      return { success: true, changed: false, data: { composite: null } }
    }

    const now = new Date()
    const audit: Record<string, unknown> = {
      'meta.compositeEditedBy': user.id,
      'meta.compositeEditedAt': now,
      'meta.editedAfterImport': true
    }
    if (composite) {
      await Lexeme.updateOne({ id }, { $set: { ...audit, 'meta.compositePronunciation': composite } })
    } else {
      await Lexeme.updateOne({ id }, { $set: audit, $unset: { 'meta.compositePronunciation': 1 } })
    }

    return { success: true, changed: true, data: { composite } }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Update composite pronunciation error:', error?.message ?? error)
    throw createError({ statusCode: 500, message: '更新綜合音失敗' })
  }
})
