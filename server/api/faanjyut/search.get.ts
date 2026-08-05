/**
 * 泛粵字表六維度只讀搜索（FaanjyutV1Design §6.1、§12 API 面清單）。
 *
 * 六路查詢（全 lean、限制返回字段），命中策略：
 *   1. key（詞條鍵）：meta.sourceKey 精確或前綴（`^escaped` 一併覆蓋精確）
 *   2. 綜合音：meta.compositePronunciation.display / raw 包含
 *   3. 代表字：meta.representativeChar.display / meta.commonCharCandidates 包含
 *   4. 釋義：meta.definitionRaw 包含
 *   5. 地點方音：Entry（sourceBook=faanjyut）headword.display / phonetic.original 包含，回帶 lexemeId
 *   6. 域外材料：ExternalEtymon scriptForm / raw 包含（排除 meta.softDeleted），回帶 lexemeId
 *
 * 每維先取放大上限（limit×10，封頂 500）做 DB 查詢，再由 mergeSearchHits 去重/限量/排序，
 * 避免「單一詞條多格佔滿整維」後去重不足 limit 的問題。
 */
import { z } from 'zod'
import { formatZodErrorToMessage } from '../../utils/validation'
import {
  buildSearchRegex,
  mergeSearchHits,
  truncateText,
  type SearchHit
} from '../../utils/faanjyut/search'
import { Lexeme } from '../../utils/Lexeme'
import { Entry } from '../../utils/Entry'
import { ExternalEtymon } from '../../utils/ExternalEtymon'
import { getFaanJyutLanguageLabel } from '../../../shared/faanjyut-languages'

const QuerySchema = z.object({
  q: z.string().trim().min(1, '請輸入搜尋字詞').max(100, '搜尋字詞過長（最多 100 字）'),
  limit: z.coerce.number().int().min(1).max(50).default(10)
})

/** Lexeme 命中投影：僅返回聚合/展示所需字段 */
const LEXEME_PROJECTION = {
  id: 1,
  'meta.sourceKey': 1,
  'meta.matrixOrder': 1,
  'meta.compositePronunciation': 1,
  'meta.representativeChar': 1,
  'meta.commonCharCandidates': 1,
  'meta.definitionRaw': 1
}

/** 每維 DB 查詢上限：limit×10，封頂 500（去重後可能少於 limit，屬預期） */
function rawLimitFor(limit: number): number {
  return Math.min(limit * 10, 500)
}

/** 把 Lexeme lean 文檔轉成通用命中（extra 帶 matrixOrder 供維內排序） */
function lexemeHit(lexeme: Record<string, any>, snippet: string): SearchHit {
  return {
    lexemeId: lexeme.id,
    snippet,
    extra: {
      sourceKey: lexeme.meta?.sourceKey ?? null,
      matrixOrder: typeof lexeme.meta?.matrixOrder === 'number' ? lexeme.meta.matrixOrder : null
    }
  }
}

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const validated = QuerySchema.safeParse(getQuery(event))
    if (!validated.success) {
      throw createError({
        statusCode: 400,
        message: formatZodErrorToMessage(validated.error, { q: '搜尋字詞', limit: '每維數量' })
      })
    }

    const { q, limit } = validated.data
    const rawLimit = rawLimitFor(limit)
    const containsRegex = buildSearchRegex(q)
    const keyRegex = buildSearchRegex(q, { mode: 'prefix' })
    const lexemeSort = { 'meta.matrixOrder': 1 as const }

    // 1. key：精確或前綴
    const keyDocs = await Lexeme.find({
      'meta.sourceBook': 'faanjyut',
      $or: [
        { 'meta.sourceKey': q },
        { 'meta.sourceKey': { $regex: keyRegex } }
      ]
    }).select(LEXEME_PROJECTION).sort(lexemeSort).limit(rawLimit).lean()
    const keyHits = keyDocs.map((doc: any) => lexemeHit(doc, doc.meta?.sourceKey ?? doc.id))

    // 2. 綜合音
    const pronDocs = await Lexeme.find({
      'meta.sourceBook': 'faanjyut',
      $or: [
        { 'meta.compositePronunciation.display': { $regex: containsRegex } },
        { 'meta.compositePronunciation.raw': { $regex: containsRegex } }
      ]
    }).select(LEXEME_PROJECTION).sort(lexemeSort).limit(rawLimit).lean()
    const pronHits = pronDocs.map((doc: any) =>
      lexemeHit(doc, doc.meta?.compositePronunciation?.display ?? doc.meta?.compositePronunciation?.raw ?? '')
    )

    // 3. 代表字
    const repCharDocs = await Lexeme.find({
      'meta.sourceBook': 'faanjyut',
      $or: [
        { 'meta.representativeChar.display': { $regex: containsRegex } },
        { 'meta.commonCharCandidates': { $regex: containsRegex } }
      ]
    }).select(LEXEME_PROJECTION).sort(lexemeSort).limit(rawLimit).lean()
    const repCharHits = repCharDocs.map((doc: any) =>
      lexemeHit(doc, doc.meta?.representativeChar?.display ?? doc.meta?.commonCharCandidates ?? '')
    )

    // 4. 釋義
    const definitionDocs = await Lexeme.find({
      'meta.sourceBook': 'faanjyut',
      'meta.definitionRaw': { $regex: containsRegex }
    }).select(LEXEME_PROJECTION).sort(lexemeSort).limit(rawLimit).lean()
    const definitionHits = definitionDocs.map((doc: any) =>
      lexemeHit(doc, truncateText(doc.meta?.definitionRaw ?? ''))
    )

    // 5. 地點方音：Entry 命中回帶 lexemeId
    const entryDocs = await Entry.find({
      sourceBook: 'faanjyut',
      $or: [
        { 'headword.display': { $regex: containsRegex } },
        { 'phonetic.original': { $regex: containsRegex } }
      ]
    }).select({
      id: 1,
      lexemeId: 1,
      'headword.display': 1,
      'phonetic.original': 1,
      'dialect.name': 1
    }).sort({ lexemeId: 1 }).limit(rawLimit).lean()
    const entryHits: SearchHit[] = entryDocs.map((entry: any) => {
      const original = entry.phonetic?.original
      const phonetic = Array.isArray(original) ? original.join(' / ') : (original ?? '')
      return {
        lexemeId: entry.lexemeId,
        snippet: [entry.headword?.display, phonetic].filter(Boolean).join(' '),
        extra: {
          dialectName: entry.dialect?.name ?? null,
          headword: entry.headword?.display ?? null,
          phonetic: original ?? null
        }
      }
    })

    // 6. 域外材料：ExternalEtymon 命中回帶 lexemeId（排除 softDeleted）
    const etymonDocs = await ExternalEtymon.find({
      'meta.softDeleted': { $ne: true },
      $or: [
        { scriptForm: { $regex: containsRegex } },
        { raw: { $regex: containsRegex } }
      ]
    }).select({
      id: 1,
      lexemeId: 1,
      languageCode: 1,
      scriptForm: 1,
      raw: 1
    }).sort({ lexemeId: 1 }).limit(rawLimit).lean()
    const etymonHits: SearchHit[] = etymonDocs.map((etymon: any) => {
      const languageCode = etymon.languageCode ?? null
      return {
        lexemeId: etymon.lexemeId,
        snippet: etymon.scriptForm ?? etymon.raw ?? '',
        extra: {
          languageCode,
          languageLabel: languageCode ? getFaanJyutLanguageLabel(languageCode) : null
        }
      }
    })

    const groups = mergeSearchHits(
      [
        { dimension: 'key', hits: keyHits },
        { dimension: 'compositePronunciation', hits: pronHits },
        { dimension: 'representativeChar', hits: repCharHits },
        { dimension: 'definition', hits: definitionHits },
        { dimension: 'entry', hits: entryHits },
        { dimension: 'externalEtymon', hits: etymonHits }
      ],
      { limitPerDimension: limit }
    )
    const totalHits = groups.reduce((sum, group) => sum + group.hits.length, 0)

    return { success: true, data: { q, groups, totalHits } }
  } catch (error: any) {
    console.error('Faanjyut search error:', error?.message ?? error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '搜尋失敗'
    })
  }
})
