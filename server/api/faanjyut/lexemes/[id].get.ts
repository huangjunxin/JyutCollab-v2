/**
 * 泛粵字表詞條詳情聚合（FaanjyutV1Design §7、§12 API 面清單）。
 *
 * 薄壳：按 id + sourceBook=faanjyut 取 Lexeme（找不到 404），其餘六路等值查詢全 lean，
 * 交由 assembleLexemeDetail（server/utils/faanjyut/lexeme-detail.ts）組裝七區塊。
 * 批注/歷史查詢先依本詞條的 cell/etymon/entry id 集合收窄，純函數內再做歸屬過濾（自洽可測）。
 */
import { assembleLexemeDetail } from '../../../utils/faanjyut/lexeme-detail'
import { Lexeme } from '../../../utils/Lexeme'
import { Entry } from '../../../utils/Entry'
import { ExternalEtymon } from '../../../utils/ExternalEtymon'
import { FaanJyutColumn } from '../../../utils/FaanJyutColumn'
import { FaanJyutCellState } from '../../../utils/FaanJyutCellState'
import { FaanJyutComment } from '../../../utils/FaanJyutComment'
import { FaanJyutLink } from '../../../utils/FaanJyutLink'
import { EditHistory } from '../../../utils/EditHistory'

export default defineEventHandler(async (event) => {
  try {
    await connectDB()

    const id = getRouterParam(event, 'id')
    if (!id) {
      throw createError({
        statusCode: 400,
        message: '缺少詞條ID'
      })
    }

    const lexeme = await Lexeme.findOne({ id, 'meta.sourceBook': 'faanjyut' }).lean()
    if (!lexeme) {
      throw createError({
        statusCode: 404,
        message: '詞條不存在'
      })
    }

    const [columns, cells, entries, etymons, links] = await Promise.all([
      FaanJyutColumn.find({ sourceBook: 'faanjyut', status: 'active' })
        .select('id label shortLabel sourceRole dialectId languageCode order style status')
        .lean(),
      FaanJyutCellState.find({ lexemeId: id })
        .select('id columnId raw status projection source')
        .lean(),
      Entry.find({ lexemeId: id, sourceBook: 'faanjyut' })
        .select('_id id dialect headword phonetic senses')
        .lean(),
      ExternalEtymon.find({ lexemeId: id, 'meta.softDeleted': { $ne: true } })
        .select('id languageCode scriptForm raw phonetic gloss sourceType sourceDetail note meta')
        .lean(),
      FaanJyutLink.find({ fromLexemeId: id })
        .select('id fromLexemeId toLexemeId targetKey targetRaw type rawSource rawLabel rawValue status')
        .lean()
    ])

    // 鏈接目標詞條解析：toLexemeId 命中 → 附目標 representativeChar/sourceKey
    const linkTargetIds = [...new Set(
      links
        .map((link: any) => link.toLexemeId)
        .filter((value): value is string => Boolean(value))
    )]
    const targetLexemes = linkTargetIds.length
      ? await Lexeme.find({ id: { $in: linkTargetIds }, 'meta.sourceBook': 'faanjyut' })
          .select('id meta.sourceKey meta.representativeChar')
          .lean()
      : []
    const targetLexemeById = new Map(targetLexemes.map((target: any) => [target.id, target]))
    const enrichedLinks = links.map((link: any) => {
      const target = link.toLexemeId ? targetLexemeById.get(link.toLexemeId) : undefined
      return {
        ...link,
        targetLexeme: target
          ? {
              id: target.id,
              sourceKey: target.meta?.sourceKey ?? null,
              representativeChar: target.meta?.representativeChar ?? null
            }
          : null
      }
    })

    // 批注：僅取可能屬於本詞條的目標（lexeme=自身 / cell=本詞條格集 / etymon=本詞條域外集）
    const cellIds = cells.map((cell: any) => cell.id)
    const etymonIds = etymons.map((etymon: any) => etymon.id)
    const comments = await FaanJyutComment.find({
      $or: [
        { targetType: 'lexeme', targetId: id },
        ...(cellIds.length ? [{ targetType: 'cell', targetId: { $in: cellIds } }] : []),
        ...(etymonIds.length ? [{ targetType: 'externalEtymon', targetId: { $in: etymonIds } }] : [])
      ]
    }).lean()

    // 編輯歷史：按本詞條泛粵 entries 的 _id（Mongo ObjectId 字符串）聚合。
    // 平台所有寫側一律存 entry._id.toString()，此處按同一約定查詢（見 FaanjyutV1Design §13.1 既有問題 1；
    // P2 導入不寫 EditHistory，故此前按應用層 fj_ id 查詢的錯誤從未暴露）。
    const entryIds = entries
      .map((entry: any) => entry._id?.toString?.() ?? entry._id)
      .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    const histories = entryIds.length
      ? await EditHistory.find({ entryId: { $in: entryIds } }).lean()
      : []

    const data = assembleLexemeDetail({
      lexeme,
      columns,
      cells,
      entries,
      etymons,
      links: enrichedLinks,
      comments,
      histories
    })

    return { success: true, data }
  } catch (error: any) {
    console.error('Get faanjyut lexeme detail error:', error?.message ?? error)
    if (error?.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '獲取詞條詳情失敗'
    })
  }
})
