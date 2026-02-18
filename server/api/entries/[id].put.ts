import { z } from 'zod'
import { canContributeToDialect } from '../../utils/auth'
import { formatZodErrorToMessage } from '../../utils/validation'

const UpdateEntrySchema = z.object({
  // 新格式
  headword: z.object({
    // 允許僅更新異形詞而不改 display
    display: z.string().optional(),
    normalized: z.string().optional(),
    // 異形／其他詞形列表
    variants: z.array(z.string()).optional()
  }).optional(),
  dialect: z.object({
    name: z.string(),
    regionCode: z.string().optional()
  }).optional(),
  phonetic: z.object({
    original: z.union([z.string(), z.array(z.string())]).optional(),
    jyutping: z.array(z.string()).optional(),
    toneSandhi: z.array(z.string()).optional()
  }).optional(),
  entryType: z.enum(['character', 'word', 'phrase']).optional(),
  senses: z.array(z.object({
    definition: z.string().min(1, '釋義不能為空'),
    label: z.string().optional(),
    examples: z.array(z.object({
      text: z.string(),
      jyutping: z.string().optional(),
      translation: z.string().optional(),
      scenario: z.string().optional()
    })).optional(),
    images: z.array(z.string()).optional(),
    subSenses: z.array(z.object({
      label: z.string(),
      definition: z.string(),
      examples: z.array(z.object({
        text: z.string(),
        jyutping: z.string().optional(),
        translation: z.string().optional(),
        scenario: z.string().optional()
      })).optional()
    })).optional()
  })).optional(),
  theme: z.object({
    level1: z.string().optional(),
    level2: z.string().optional(),
    level3: z.string().optional(),
    level1Id: z.number().optional(),
    level2Id: z.number().optional(),
    level3Id: z.number().optional()
  }).optional(),
  meta: z.object({
    register: z.enum(['', '口語', '書面', '粗俗', '文雅', '中性']).optional(),
    usage: z.string().optional(),
    notes: z.string().optional(),
    etymology: z.string().optional(),
    pos: z.string().optional()
  }).optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional(),
  // 詞級關聯（可選）：用作範本時沿用來源詞條的 lexemeId，方便按詞語聚合
  lexemeId: z.string().optional(),
  // 詞素／單音節來源（僅屬於本方言點詞條，不跨方言共享）
  morphemeRefs: z.array(z.object({
    targetEntryId: z.string().optional(),
    position: z.number().optional(),
    char: z.string().optional(),
    jyutping: z.string().optional(),
    note: z.string().optional()
  })).optional()
})

export default defineEventHandler(async (event) => {
  try {
    // Check auth
    if (!event.context.auth) {
      throw createError({
        statusCode: 401,
        message: '請先登錄'
      })
    }

    await connectDB()

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    // 先用自定義 id 查找，若未找到且 id 形如 MongoDB ObjectId 則用 _id 查找（與列表返回 id 方式一致）
    let existingEntry = await Entry.findOne({ id })
    if (!existingEntry && /^[a-f\d]{24}$/i.test(id)) {
      existingEntry = await Entry.findById(id)
    }
    if (!existingEntry) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    const body = await readBody(event)
    const validated = UpdateEntrySchema.safeParse(body)

    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({
        statusCode: 400,
        message
      })
    }

    const userId = event.context.auth.id
    const userRole = event.context.auth.role

    // Check permission - only owner or admin/reviewer can edit
    const isOwner = existingEntry.createdBy === userId
    const canEdit = isOwner || userRole === 'admin' || userRole === 'reviewer'

    if (!canEdit) {
      throw createError({
        statusCode: 403,
        message: '無權編輯此詞條'
      })
    }

    const data = validated.data
    const beforeSnapshot = existingEntry.toObject()
    const changedFields: string[] = []

    // Update headword
    if (data.headword) {
      const displayRaw = data.headword.display ?? existingEntry.headword?.display ?? ''
      const displayText = convertToHongKongTraditional(displayRaw)

      // 異形詞：優先使用 headword.variants，其次沿用現有 DB 內的 variants
      let variants: string[] = existingEntry.headword?.variants ?? []
      if (Array.isArray(data.headword.variants)) {
        variants = data.headword.variants
      }

      existingEntry.headword = {
        display: displayText,
        normalized: data.headword.normalized || displayText,
        isPlaceholder: displayText.includes('□'),
        variants
        // search 已棄用：保留現有值但不再主動更新
      }
      changedFields.push('headword')
    }

    // Update dialect（方案 A：貢獻者僅能在其方言權限內修改）
    if (data.dialect) {
      const auth = event.context.auth
      if (!canContributeToDialect(auth, data.dialect.name)) {
        throw createError({
          statusCode: 403,
          message: '你沒有權限將詞條改為此方言'
        })
      }
      existingEntry.dialect = data.dialect
      changedFields.push('dialect')
    }

    // Update phonetic
    if (data.phonetic) {
      existingEntry.phonetic = data.phonetic
      changedFields.push('phonetic')
    }

    // Update entryType
    if (data.entryType) {
      existingEntry.entryType = data.entryType
      changedFields.push('entryType')
    }

    // Update senses (only apply if all senses have a non-empty definition)
    if (data.senses) {
      const validSenses = data.senses.filter(
        (s): s is { definition: string; label?: string; examples?: any[]; subSenses?: any[] } =>
          typeof s.definition === 'string' && s.definition.trim().length > 0
      )
      if (validSenses.length > 0) {
        existingEntry.senses = validSenses.map(sense => ({
          definition: convertToHongKongTraditional(sense.definition.trim()),
          label: sense.label,
          examples: sense.examples?.map((ex: any) => ({
            text: convertToHongKongTraditional(ex.text),
            jyutping: ex.jyutping,
            translation: convertToHongKongTraditional(ex.translation || ''),
            scenario: ex.scenario,
            source: 'user_generated' as const
          })),
          images: Array.isArray(sense.images) ? sense.images.slice(0, 3) : undefined,
          subSenses: sense.subSenses?.map((sub: any) => ({
            label: sub.label || '',
            definition: convertToHongKongTraditional((sub.definition || '').trim()),
            examples: sub.examples?.map((ex: any) => ({
              text: convertToHongKongTraditional(ex.text),
              jyutping: ex.jyutping,
              translation: convertToHongKongTraditional(ex.translation || ''),
              scenario: ex.scenario,
              source: 'user_generated' as const
            }))
          }))
        }))
        changedFields.push('senses')
      }
    }

    // Update theme
    if (data.theme) {
      existingEntry.theme = {
        ...existingEntry.theme,
        ...data.theme
      }
      changedFields.push('theme')
    }

    // Update meta
    if (data.meta) {
      existingEntry.meta = {
        ...existingEntry.meta,
        ...data.meta,
        // 過濾掉空字符串的 register，避免 Mongoose enum 驗證失敗
        register: data.meta.register || undefined,
        usage: data.meta.usage ? convertToHongKongTraditional(data.meta.usage) : existingEntry.meta?.usage,
        notes: data.meta.notes ? convertToHongKongTraditional(data.meta.notes) : existingEntry.meta?.notes
      }
      changedFields.push('meta')
    }

    // Update lexemeId（用作範本時沿用來源詞條的詞語組；僅在傳入有效值時更新）
    if (data.lexemeId !== undefined && data.lexemeId !== '' && !String(data.lexemeId).startsWith('__unassigned__:')) {
      existingEntry.lexemeId = data.lexemeId
      changedFields.push('lexemeId')
    }

    // Update morphemeRefs（詞素／單音節來源）
    if (data.morphemeRefs !== undefined) {
      existingEntry.morphemeRefs = Array.isArray(data.morphemeRefs) ? data.morphemeRefs : []
      changedFields.push('morphemeRefs')
    }

    // Update status (only reviewers/admins can approve/reject)
    if (data.status) {
      if (data.status === 'approved' || data.status === 'rejected') {
        if (userRole !== 'admin' && userRole !== 'reviewer') {
          throw createError({
            statusCode: 403,
            message: '無權更改審核狀態'
          })
        }
        existingEntry.reviewedBy = userId
        existingEntry.reviewedAt = new Date()
      }
      existingEntry.status = data.status
      changedFields.push('status')
    }

    // Set updatedBy
    existingEntry.updatedBy = userId

    // Save changes
    await existingEntry.save()

    // Create edit history if there were changes
    if (changedFields.length > 0) {
      await EditHistory.create({
        entryId: existingEntry._id.toString(),
        userId,
        beforeSnapshot,
        afterSnapshot: existingEntry.toObject(),
        changedFields,
        action: 'update'
      })
    }

    return {
      success: true,
      data: {
        id: existingEntry.id,
        headword: existingEntry.headword,
        status: existingEntry.status
      }
    }
  } catch (error: any) {
    console.error('Update entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新詞條失敗'
    })
  }
})
