/**
 * 泛粵字表 ETL → Node 導入 DTO 的 strict Zod 校驗（見 ImportDataContract.md §5）。
 * unknown 頂層欄位一律拒絕（CONTRACT_UNKNOWN_FIELD）；
 * `_id/__v/createdAt/updatedAt/importBatchId` 禁止出現在輸入中（由 Node 寫入時注入）。
 * P1 dry-run（server/utils/faanjyut/import-contract.ts）在此基礎上擴展外鍵與唯一性檢查。
 */
import { z } from 'zod'
import { DIALECT_IDS } from './dialects'
import { FAANJYUT_LANGUAGE_CODES } from './faanjyut-languages'
import { FAANJYUT_SOURCE_BOOK } from './faanjyut'

const forbiddenInjectedKeys = ['_id', '__v', 'createdAt', 'updatedAt', 'importBatchId'] as const

/** 攔截 Node 注入欄位：出現即整條失敗 */
function rejectInjectedKeys<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.check((ctx) => {
    for (const key of forbiddenInjectedKeys) {
      if (key in ctx.value) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value,
          path: [key],
          message: `ETL 輸入不得包含 ${key}（由 Node 寫入時注入）`
        })
      }
    }
  })
}

const sourceBookSchema = z.literal(FAANJYUT_SOURCE_BOOK)
const dialectIdSchema = z.enum(DIALECT_IDS)
const languageCodeSchema = z.enum(FAANJYUT_LANGUAGE_CODES)

// §5.1 Lexeme
export const FaanJyutLexemeDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  notes: z.string().optional(),
  meta: z.strictObject({
    sourceBook: sourceBookSchema,
    sourceWorkbook: z.string().min(1),
    sourceSheet: z.string().min(1),
    sourceRow: z.number().int().min(1),
    matrixOrder: z.number(),
    sourceKey: z.string().min(1),
    keyAliases: z.array(z.string()).optional(),
    compositePronunciation: z.strictObject({
      raw: z.string().optional(),
      display: z.string().optional(),
      markers: z.strictObject({
        hasQuestion: z.boolean().optional(),
        hasBang: z.boolean().optional()
      }).optional()
    }).optional(),
    representativeChar: z.strictObject({
      raw: z.string().optional(),
      display: z.string().optional(),
      warnings: z.array(z.string()).optional()
    }).optional(),
    commonCharCandidates: z.string().optional(),
    definitionRaw: z.string().optional(),
    sourceFlags: z.array(z.string()).optional(),
    editedAfterImport: z.literal(false)
  }),
  status: z.strictObject({
    publicationStatus: z.literal('published'),
    qualityStatus: z.literal('unreviewed_import')
  })
}))

// §5.2 Entry
export const FaanJyutEntryDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  lexemeId: z.string().min(1),
  sourceBook: sourceBookSchema,
  dialect: z.strictObject({
    name: dialectIdSchema,
    regionCode: z.string().min(1)
  }),
  headword: z.strictObject({
    display: z.string(),
    normalized: z.string(),
    isPlaceholder: z.boolean(),
    variants: z.array(z.string()).optional()
  }),
  phonetic: z.strictObject({
    original: z.union([z.string(), z.array(z.string())]),
    jyutping: z.array(z.string()).optional()
  }),
  entryType: z.enum(['character', 'word', 'phrase']),
  senses: z.array(z.strictObject({
    definition: z.string(),
    label: z.string().optional()
  })),
  theme: z.strictObject({
    level1: z.string().optional(),
    level2: z.string().optional(),
    level3: z.string().optional(),
    level1Id: z.number().int().optional(),
    level2Id: z.number().int().optional(),
    level3Id: z.number().int().optional()
  }),
  meta: z.strictObject({
    category: z.string().optional(),
    pos: z.string().optional(),
    etymology: z.string().optional(),
    register: z.enum(['口語', '書面', '粗俗', '文雅', '中性']).optional(),
    region: z.string().optional(),
    usage: z.string().optional(),
    notes: z.string().optional(),
    sourceWorkbook: z.string().min(1),
    sourceSheet: z.string().min(1),
    sourceRow: z.number().int().min(1),
    sourceColumn: z.string().min(1),
    sourceColumnIndex: z.number().int().min(1),
    sourceCell: z.string().min(1),
    sourceKey: z.string().min(1),
    combinedSound: z.string().optional(),
    searchSound: z.string().optional(),
    importReviewStatus: z.literal('unreviewed_import'),
    editedAfterImport: z.literal(false),
    parseWarnings: z.array(z.string()).optional()
  }),
  status: z.literal('approved'),
  createdBy: z.literal('system:faanjyut_import')
}))

// §5.3 ExternalEtymon
export const FaanJyutExternalEtymonDtoSchema = rejectInjectedKeys(z.strictObject({
  id: z.string().min(1),
  lexemeId: z.string().min(1),
  languageCode: languageCodeSchema,
  scriptForm: z.string(),
  raw: z.string(),
  dialectName: z.string().optional(),
  phonetic: z.string().optional(),
  gloss: z.string().optional(),
  note: z.string().optional(),
  sourceType: z.literal('dictionary'),
  // 2026-08-06：語言點（從 raw 方括號提取，如 [南昌|]→南昌）；無語言點的域外記錄可省略
  sourceDetail: z.string().optional(),
  meta: z.strictObject({
    sourceBook: sourceBookSchema,
    sourceWorkbook: z.string().min(1),
    sourceSheet: z.string().min(1),
    sourceColumn: z.string().min(1),
    sourceColumnIndex: z.number().int().min(1),
    sourceRow: z.number().int().min(1),
    sourceCell: z.string().min(1),
    segmentIndex: z.number().int().min(1),
    parseWarnings: z.array(z.string()).optional(),
    softDeleted: z.literal(false),
    editedAfterImport: z.literal(false)
  }),
  createdBy: z.literal('system:faanjyut_import')
}))

export type FaanJyutLexemeDto = z.infer<typeof FaanJyutLexemeDtoSchema>
export type FaanJyutEntryDto = z.infer<typeof FaanJyutEntryDtoSchema>
export type FaanJyutExternalEtymonDto = z.infer<typeof FaanJyutExternalEtymonDtoSchema>
