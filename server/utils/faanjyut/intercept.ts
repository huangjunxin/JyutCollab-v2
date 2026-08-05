import { createError } from 'h3'
import { FAANJYUT_SOURCE_BOOK, isFaanJyutEntry } from '../../../shared/faanjyut'

/**
 * 普通寫入口攔截（FaanjyutV1Design.md §9）：
 * 泛粵字表導入數據一律 409「泛粵字表數據請前往泛粵模組編輯」，
 * 列表/詳情只讀放行。非泛粵或無效 entry 直接通過。
 * 注意：此處顯式 import createError（h3），避免依賴 Nuxt/Nitro 自動導入
 * —— helper 需在 vitest 單測環境可直接載入。
 */
export function assertNotFaanJyutEntry(entry: { sourceBook?: string | null } | null | undefined): void {
  if (isFaanJyutEntry(entry)) {
    throw createError({ statusCode: 409, message: '泛粵字表數據請前往泛粵模組編輯' })
  }
}

/**
 * ExternalEtymon 寫入口攔截：ExternalEtymon 頂層無 sourceBook，
 * 泛粵來源在 meta.sourceBook（見 server/utils/ExternalEtymon.ts）。
 */
export function assertNotFaanJyutExternalEtymon(row: { meta?: { sourceBook?: string | null } } | null | undefined): void {
  if (row?.meta?.sourceBook === FAANJYUT_SOURCE_BOOK) {
    throw createError({ statusCode: 409, message: '泛粵字表數據請前往泛粵模組編輯' })
  }
}
