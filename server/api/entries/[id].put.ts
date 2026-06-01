import { z } from 'zod'
import { DIALECT_IDS } from '../../../shared/dialects'
import { canContributeToDialect } from '../../utils/auth'
import { formatZodErrorToMessage } from '../../utils/validation'
import { connectDB } from '../../utils/db'
import { AISuggestion } from '../../utils/AISuggestion'

function formatMongoDuplicateMessage(error: any) {
  const key = error.keyValue || {}
  const headword = key['headword.display']
  const dialect = key['dialect.name']

  if (headword && dialect) {
    return `「${headword}」在「${dialect}」仍被資料庫唯一索引阻擋，請確認 headword.display_1_dialect.name_1 索引已移除後再試。`
  }

  if (key.id) {
    return '系統未能產生唯一詞條編號，請重新保存一次。'
  }

  return '已有相同資料，請檢查詞條內容或重新整理頁面後再試。'
}

/**
 * 比對條目當前欄位值與 pending AI 建議的 suggestedContent。
 * 若一致則標記為 accepted（auto_matched_on_save），否則保持 pending。
 * 僅處理 userAction === 'pending' 的記錄——已由客戶端標記為 ignored/rejected 的記錄不處理。
 */
async function resolvePendingAISuggestions(entryDoc: any, entryId: string) {
  const pendingSuggestions = await AISuggestion.find({
    userAction: 'pending',
    $or: [
      { entryId },
      // 新建詞條可能只有 clientEntryKey，在 PUT 場景通常已有 entryId，保留兼容
      { clientEntryKey: entryId }
    ]
  })

  for (const s of pendingSuggestions) {
    let currentValue: unknown = undefined
    let suggestedValue: unknown = undefined

    switch (s.suggestionType) {
      case 'definition': {
        currentValue = entryDoc.senses?.[0]?.definition?.trim?.()
        const sc = s.suggestedContent as Record<string, unknown> | undefined
        suggestedValue = typeof sc?.definition === 'string' ? sc.definition.trim() : undefined
        break
      }
      case 'theme_classification': {
        currentValue = entryDoc.theme?.level3Id
        const sc = s.suggestedContent as Record<string, unknown> | undefined
        suggestedValue = typeof sc?.themeId === 'number' ? sc.themeId : undefined
        break
      }
      case 'register': {
        currentValue = entryDoc.meta?.register
        const sc = s.suggestedContent as Record<string, unknown> | undefined
        suggestedValue = typeof sc?.register === 'string' ? sc.register : undefined
        break
      }
      case 'example':
        // example 在客戶端總是即時接受（generateAIExamples），不應有 pending
        continue
      default:
        continue
    }

    if (currentValue !== undefined && suggestedValue !== undefined && String(currentValue) === String(suggestedValue)) {
      const now = new Date()
      s.userAction = 'accepted'
      s.acceptedAt = now
      s.acceptedContent = s.suggestedContent
      s.metadata = {
        ...(typeof s.metadata === 'object' && s.metadata !== null ? (s.metadata as Record<string, unknown>) : {}),
        resolution: 'auto_matched_on_save'
      }
      await s.save()
    }
  }
}

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
    name: z.enum(DIALECT_IDS as unknown as [string, ...string[]]),
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
    let existingEntry = await Entry.findOne({ id } as any)
    if (!existingEntry && /^[a-f\d]{24}$/i.test(id)) {
      // Mongoose model overloads 導致型別不可呼叫，用 assertion
      existingEntry = await (Entry as any).findById(id)
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
    const isReviewerOrAdmin = userRole === 'admin' || userRole === 'reviewer'
    const canEdit = isOwner || isReviewerOrAdmin

    if (!canEdit) {
      throw createError({
        statusCode: 403,
        message: '無權編輯此詞條'
      })
    }

    const data = validated.data

    if (existingEntry.status === 'approved' && !isReviewerOrAdmin) {
      throw createError({
        statusCode: 403,
        message: '已通過審核的詞條不可直接修改，請提交修訂建議'
      })
    }

    const effectiveDialectName = data.dialect?.name || existingEntry.dialect?.name
    if (effectiveDialectName && !canContributeToDialect(event.context.auth, effectiveDialectName)) {
      throw createError({
        statusCode: 403,
        message: data.dialect ? '你沒有權限將詞條改為此方言' : '你沒有權限修改此方言的詞條'
      })
    }

    const beforeSnapshot = existingEntry.toObject()
    const changedFields: string[] = []

    // Update headword
    if (data.headword) {
      const displayRaw = data.headword.display ?? existingEntry.headword?.display ?? ''
      const displayText = convertToHongKongTraditional(displayRaw)

      // 異形詞：優先使用 headword.variants，其次沿用現有 DB 內的 variants
      let variants: string[] = existingEntry.headword?.variants ?? []
      if (Array.isArray(data.headword.variants)) {
        variants = data.headword.variants.map(v => convertToHongKongTraditional(v))
      }

      existingEntry.headword = {
        display: displayText,
        normalized: convertToHongKongTraditional(data.headword.normalized || displayText),
        isPlaceholder: displayText.includes('□'),
        variants
        // search 已棄用：保留現有值但不再主動更新
      }
      changedFields.push('headword')
    }

    // Update dialect
    if (data.dialect) {
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
        (s): s is { definition: string; label?: string; examples?: any[]; subSenses?: any[]; images?: string[] } =>
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
            source: ex.source || 'user_generated' as const
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
              source: ex.source || 'user_generated' as const
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
        if (!isReviewerOrAdmin) {
          throw createError({
            statusCode: 403,
            message: '無權更改審核狀態'
          })
        }
        existingEntry.reviewedBy = userId
        existingEntry.reviewedAt = new Date()
      }
      // Block non-reviewers from moving pending_review back to draft (removes from review queue)
      if (data.status === 'draft' && existingEntry.status === 'pending_review' && !isReviewerOrAdmin) {
        throw createError({
          statusCode: 403,
          message: '無權將待審核詞條退回草稿'
        })
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

    // 詞素詞頭同步：當本詞條的 headword.display 變更時，同步更新所有引用本詞條的多音節詞的對應選字與詞頭
    if (changedFields.includes('headword')) {
      const oldDisplay = beforeSnapshot.headword?.display ?? ''
      const newDisplay = convertToHongKongTraditional((existingEntry.headword?.display ?? '').trim())
      if (oldDisplay !== newDisplay && newDisplay !== '') {
        // Mongoose 點號路徑查詢，型別不推斷故用 assertion
        const affected = await Entry.find({ 'morphemeRefs.targetEntryId': id } as any).sort({ id: 1 }).exec()
        for (const E of affected) {
          const refs = E.morphemeRefs || []
          const matchingRefs = refs
            .map((r: { targetEntryId?: string; position?: number; char?: string }, i: number) => ({ ref: r, i }))
            .filter(({ ref }: { ref: { targetEntryId?: string } }) => ref.targetEntryId === id)
          if (matchingRefs.length === 0) continue

          const beforeCascade = E.toObject()

          let display = (E.headword?.display ?? '') || ''
          const normalizedWasDisplay = (E.headword?.normalized ?? '') === display

          // 按 position 升序處理，避免位置錯位
          const sorted = [...matchingRefs].sort(
            (a, b) => (a.ref.position ?? 0) - (b.ref.position ?? 0)
          )
          for (const { ref } of sorted) {
            const position = ref.position
            const oldLen = (ref.char ? String(ref.char).length : 0) || 1
            ref.char = newDisplay
            if (position != null && position >= 0) {
              // 邊界檢查：避免 position + oldLen 超出 display 長度導致錯位
              const end = position + oldLen
              if (end > display.length) continue
              // 等長替換：避免多音節詞頭長度變化導致後續 position 錯位
              const newChar = newDisplay.length === oldLen
                ? newDisplay
                : (oldLen >= 1 ? newDisplay.slice(0, oldLen) : '')
              display = display.slice(0, position) + newChar + display.slice(end)
            }
          }

          if (!E.headword) {
            E.headword = { display: '', normalized: '', isPlaceholder: false, variants: [] }
          }
          E.headword.display = display
          if (normalizedWasDisplay) {
            E.headword.normalized = display
          }
          E.headword.isPlaceholder = display.includes('□')
          E.morphemeRefs = refs
          try {
            await E.save()
            await EditHistory.create({
              entryId: E._id.toString(),
              userId,
              beforeSnapshot: beforeCascade,
              afterSnapshot: E.toObject(),
              changedFields: ['headword', 'morphemeRefs'],
              action: 'update',
              comment: `詞素詞頭同步：${oldDisplay} → ${newDisplay}（源自詞條 ${id}）`
            })
          } catch (err: any) {
            console.error('Morpheme headword sync: failed to update entry', E.id, err?.message)
          }
        }
      }
    }

    // 服務端 auto-match：將欄位值與 AI 建議一致的 pending 記錄標記為 accepted
    // 注意：existingEntry.id 是應用層 nanoid，與前端 getRealEntryId() 傳入 AI 建議的 entryId 一致
    // 不可用 _id（MongoDB ObjectId），否則與 AI 建議記錄中的 entryId 無法匹配
    await resolvePendingAISuggestions(existingEntry, existingEntry.id)

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

    if (error.code === 11000) {
      throw createError({
        statusCode: 409,
        message: formatMongoDuplicateMessage(error)
      })
    }

    throw createError({
      statusCode: 500,
      message: '更新詞條失敗'
    })
  }
})
