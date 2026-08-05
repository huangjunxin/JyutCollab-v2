/**
 * 泛粵導入涉及的 7 個 collection 與其 Mongoose 模型（索引計劃的 expected 來源）。
 *
 * 索引一律由 scripts/migrate-faanjyut-indexes.ts 管理，importer 不調 syncIndexes()
 * （見 ImportDataContract.md §10、ImplementationPlan P1 任務 4）。
 */
import mongoose from 'mongoose'
import { Lexeme } from '../Lexeme'
import { Entry } from '../Entry'
import { ExternalEtymon } from '../ExternalEtymon'
import { FaanJyutColumn } from '../FaanJyutColumn'
import { FaanJyutCellState } from '../FaanJyutCellState'
import { FaanJyutComment } from '../FaanJyutComment'
import { FaanJyutLink } from '../FaanJyutLink'
import { FaanJyutImportBatch } from '../FaanJyutImportBatch'

export interface FaanJyutImportCollection {
  collection: string
  model: mongoose.Model<unknown>
  /** NDJSON 文件基名（無則為純 DB 集合，如 faanjyut_import_batches） */
  ndjsonFile?: string
}

/** 導入涉及的 7 個 collection（與 ImportDataContract.md §2 的 7 類 NDJSON 一一對應） */
export const FAANJYUT_IMPORT_COLLECTIONS: FaanJyutImportCollection[] = [
  { collection: 'lexemes', model: Lexeme, ndjsonFile: 'lexemes.ndjson' },
  { collection: 'entries', model: Entry, ndjsonFile: 'entries.ndjson' },
  { collection: 'external_etymons', model: ExternalEtymon, ndjsonFile: 'external_etymons.ndjson' },
  { collection: 'faanjyut_columns', model: FaanJyutColumn, ndjsonFile: 'columns.ndjson' },
  { collection: 'faanjyut_cell_states', model: FaanJyutCellState, ndjsonFile: 'cell_states.ndjson' },
  { collection: 'faanjyut_comments', model: FaanJyutComment, ndjsonFile: 'comments.ndjson' },
  { collection: 'faanjyut_links', model: FaanJyutLink, ndjsonFile: 'links.ndjson' }
]

export function modelForCollection(collection: string): mongoose.Model<unknown> | undefined {
  return FAANJYUT_IMPORT_COLLECTIONS.find((c) => c.collection === collection)?.model
}

/** 無 NDJSON 對應的輔助 collection（P2 引入）：僅參與索引計劃/遷移，不參與契約校驗與衝突檢查 */
export const FAANJYUT_AUX_COLLECTIONS: FaanJyutImportCollection[] = [
  { collection: 'faanjyut_import_batches', model: FaanJyutImportBatch }
]

/** 索引計劃/遷移管理的全部 collection（7 個導入 collection + 輔助 collection） */
export const FAANJYUT_INDEXED_COLLECTIONS: FaanJyutImportCollection[] = [
  ...FAANJYUT_IMPORT_COLLECTIONS,
  ...FAANJYUT_AUX_COLLECTIONS
]
