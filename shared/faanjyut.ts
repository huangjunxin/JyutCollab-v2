/**
 * 泛粵字表（FaanJyutZibiu）共用常數與來源判別 helper。
 * 機器可判別來源統一為頂層 sourceBook === 'faanjyut'（見 ImportDataContract.md §1）。
 */

export const FAANJYUT_SOURCE_BOOK = 'faanjyut'

/** 判斷 Entry 是否來自泛粵字表導入（P4 寫入口攔截使用） */
export function isFaanJyutEntry(entry: { sourceBook?: string | null } | null | undefined): boolean {
  return entry?.sourceBook === FAANJYUT_SOURCE_BOOK
}
