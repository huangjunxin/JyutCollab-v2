import { z } from 'zod'
import { nanoid } from 'nanoid'
import { canContributeToDialect } from '../../utils/auth'

const CreateEntrySchema = z.object({
  // 新格式
  headword: z.object({
    display: z.string().min(1, '請輸入詞條文本').max(200, '詞條文本過長'),
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
    definition: z.string(),
    label: z.string().optional(),
    examples: z.array(z.object({
      text: z.string(),
      jyutping: z.string().optional(),
      translation: z.string().optional(),
      scenario: z.string().optional()
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
    register: z.enum(['口語', '書面', '粗俗', '文雅', '中性']).optional(),
    usage: z.string().optional(),
    notes: z.string().optional(),
    etymology: z.string().optional(),
    pos: z.string().optional()
  }).optional(),
  // 兼容舊格式
  text: z.string().min(1).max(200).optional(),
  region: z.enum(['guangzhou', 'hongkong', 'taishan', 'overseas']).optional(),
  themeIdL1: z.number().int().optional(),
  themeIdL2: z.number().int().optional(),
  themeIdL3: z.number().int().optional(),
  definition: z.string().optional(),
  usageNotes: z.string().optional(),
  formalityLevel: z.enum(['formal', 'neutral', 'informal', 'slang', 'vulgar']).optional(),
  examples: z.array(z.object({
    sentence: z.string(),
    text: z.string().optional(),
    explanation: z.string().optional(),
    translation: z.string().optional(),
    scenario: z.string().optional()
  })).optional(),
  phoneticNotation: z.string().optional(),
  status: z.enum(['draft', 'pending_review', 'approved', 'rejected']).optional()
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

    const body = await readBody(event)
    const validated = CreateEntrySchema.safeParse(body)

    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: validated.error.errors[0]?.message || '輸入數據無效'
      })
    }

    const data = validated.data
    const userId = event.context.auth.id

    // 轉換文本為港式繁體（顯示/標準化用）
    const displayText = convertToHongKongTraditional(data.headword?.display || data.text || '')
    const normalizedText = convertToHongKongTraditional(data.headword?.normalized || displayText)

    // 異形詞：直接使用 headword.variants（若缺省則為空陣列）
    let variants: string[] = []
    if (Array.isArray(data.headword?.variants)) {
      variants = data.headword!.variants
    }

    // 構建詞頭
    const headword = {
      display: displayText,
      normalized: normalizedText,
      isPlaceholder: displayText.includes('□'),
      variants
      // search 已棄用：如有需要可在後續遷移時重新生成
    }

    // 構建方言
    const dialect = {
      name: data.dialect?.name || data.region || 'hongkong',
      regionCode: data.dialect?.regionCode
    }

    // 方案 A：貢獻者僅能在其方言權限內建立詞條
    const auth = event.context.auth
    if (!canContributeToDialect(auth, dialect.name)) {
      throw createError({
        statusCode: 403,
        message: '你沒有權限為此方言建立詞條'
      })
    }

    // 檢查重複（以 display + dialect 為唯一鍵；異形詞只作輔助信息）
    const existing = await Entry.findOne({
      'headword.display': headword.display,
      'dialect.name': dialect.name
    })

    if (existing) {
      throw createError({
        statusCode: 409,
        message: '該詞條已存在'
      })
    }

    // 構建 senses
    const senses = data.senses || [{
      definition: convertToHongKongTraditional(data.definition || ''),
      examples: (data.examples || []).map(ex => ({
        text: convertToHongKongTraditional(ex.text || ex.sentence || ''),
        jyutping: ex.jyutping,
        translation: convertToHongKongTraditional(ex.translation || ''),
        explanation: convertToHongKongTraditional(ex.explanation || ''),
        scenario: ex.scenario,
        source: 'user_generated' as const
      }))
    }]

    // 構建 theme
    const theme = {
      level1: data.theme?.level1,
      level2: data.theme?.level2,
      level3: data.theme?.level3,
      level1Id: data.theme?.level1Id || data.themeIdL1,
      level2Id: data.theme?.level2Id || data.themeIdL2,
      level3Id: data.theme?.level3Id || data.themeIdL3
    }

    // 構建 meta
    const meta = {
      register: data.meta?.register || data.formalityLevel,
      usage: convertToHongKongTraditional(data.meta?.usage || data.usageNotes || ''),
      notes: convertToHongKongTraditional(data.meta?.notes || ''),
      etymology: data.meta?.etymology,
      pos: data.meta?.pos
    }

    // 構建 phonetic
    const phonetic = data.phonetic || {
      jyutping: data.phoneticNotation ? [data.phoneticNotation] : []
    }

    // 創建詞條
    const entryData = {
      id: nanoid(12),
      headword,
      dialect,
      phonetic,
      entryType: data.entryType || 'word',
      senses,
      theme,
      meta,
      status: data.status || 'draft',
      createdBy: userId,
      viewCount: 0,
      likeCount: 0
    }

    const entry = await Entry.create(entryData)

    // 創建編輯歷史
    await EditHistory.create({
      entryId: entry._id.toString(),
      userId,
      beforeSnapshot: {},
      afterSnapshot: entry.toObject(),
      changedFields: Object.keys(entryData),
      action: 'create'
    })

    return {
      success: true,
      data: {
        id: entry.id,
        headword: entry.headword,
        dialect: entry.dialect,
        phonetic: entry.phonetic,
        entryType: entry.entryType,
        senses: entry.senses,
        theme: entry.theme,
        meta: entry.meta,
        status: entry.status,
        createdAt: entry.createdAt
      }
    }
  } catch (error: any) {
    console.error('Create entry error:', error)
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '創建詞條失敗'
    })
  }
})
