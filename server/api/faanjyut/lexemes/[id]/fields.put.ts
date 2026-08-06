/**
 * PUT /api/faanjyut/lexemes/:id/fields（2026-08-07）
 *
 * 詞條級字段編輯（admin + 私有寫入 flag）：釋義 / 代表字。
 * 綜合音走專用 composite 端點（方案 A），不併入本端點。
 *
 * field=definitionRaw：直接存字符串（trim 後非空）。
 * field=representativeChar：更新 {raw, display}（display=輸入值），清空 warnings
 *   （「見/歸」引用等警告在手改代表字後不再適用）。
 * 審計：meta.{field}EditedBy/EditedAt + editedAfterImport（group 級歷史 v1 不建）。
 *
 * 狀態碼：401 未登錄 / 403 非 admin / 503 flag 關閉 / 404 詞條不存在 / 400 非法字段或空值。
 */
import { z } from 'zod'
import { checkWriteFlag } from '../../../../utils/faanjyut/cells'
import { Lexeme } from '../../../../utils/Lexeme'

const EDITABLE_FIELDS = ['definitionRaw', 'representativeChar', 'commonCharCandidates'] as const
type EditableField = (typeof EDITABLE_FIELDS)[number]

const MAX_FIELD_LENGTH: Record<EditableField, number> = {
  definitionRaw: 5000,
  representativeChar: 50,
  commonCharCandidates: 200
}

const BodySchema = z.object({
  field: z.enum(EDITABLE_FIELDS),
  value: z.string().max(5000, '內容過長')
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
      throw createError({ statusCode: 403, message: '只有管理員可編輯詞條級字段' })
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
        message: validated.error.issues[0]?.message ?? '參數不合法'
      })
    }

    const { field, value } = validated.data
    const trimmed = value.trim()
    // commonCharCandidates 允許清空（= 移除字段，與源表「字頭」留空一致）
    if (trimmed === '' && field !== 'commonCharCandidates') {
      throw createError({ statusCode: 400, message: '內容不能為空' })
    }
    if (trimmed.length > MAX_FIELD_LENGTH[field]) {
      throw createError({ statusCode: 400, message: `內容過長（最多 ${MAX_FIELD_LENGTH[field]} 字）` })
    }

    await connectDB()

    const lexeme = await Lexeme.findOne({ id, 'meta.sourceBook': 'faanjyut' })
      .select(`id meta.${field}`)
      .lean()
    if (!lexeme) {
      throw createError({ statusCode: 404, message: '詞條不存在' })
    }

    const before = field === 'definitionRaw'
      ? (lexeme as any).meta?.definitionRaw ?? null
      : field === 'representativeChar'
        ? (lexeme as any).meta?.representativeChar?.raw ?? null
        : (lexeme as any).meta?.commonCharCandidates ?? null

    // no-op：值未變不寫庫
    if (before === trimmed) {
      return { success: true, changed: false, data: { value: trimmed } }
    }

    const now = new Date()
    const auditField = field === 'definitionRaw' ? 'definition' : field === 'representativeChar' ? 'representative' : 'commonChar'
    const audit: Record<string, unknown> = {
      [`meta.${auditField}EditedBy`]: user.id,
      [`meta.${auditField}EditedAt`]: now,
      'meta.editedAfterImport': true
    }
    if (field === 'definitionRaw') {
      audit['meta.definitionRaw'] = trimmed
    } else if (field === 'representativeChar') {
      audit['meta.representativeChar'] = { raw: trimmed, display: trimmed }
      // 手改代表字後，導入期的見/歸 警告不再適用
      audit['meta.representativeChar.warnings'] = []
    } else if (trimmed === '') {
      // 清空常用字候選 = 移除字段（與源表「字頭」留空一致）
    } else {
      audit['meta.commonCharCandidates'] = trimmed
    }

    const update: Record<string, unknown> = { $set: audit }
    if (field === 'commonCharCandidates' && trimmed === '') {
      update.$unset = { 'meta.commonCharCandidates': 1 }
    }

    await Lexeme.updateOne({ id }, update)

    return { success: true, changed: true, data: { value: trimmed } }
  } catch (error: any) {
    if (error?.statusCode) throw error
    console.error('Update lexeme field error:', error?.message ?? error)
    throw createError({ statusCode: 500, message: '更新詞條字段失敗' })
  }
})
