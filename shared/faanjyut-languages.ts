/**
 * 泛粵字表域外語言代碼（單一權威來源，hardcode，不寫入數據庫）
 * 與 ETL 倉庫 PanJ2MongoDB.py 的 LANGUAGE_CODE_MAP 逐項對應；
 * ETL mapping、Node 導入 validator 和 ExternalEtymon UI 共用本清單，
 * 前端不得另維護子集（見 ImportDataContract.md §1、NewTablesDesign.md §8）。
 * 標籤為原表列頭（香港繁體）。
 */

/** 原表列頭 → 語言代碼 */
export const FAANJYUT_LANGUAGE_LABEL_TO_CODE = {
  上古漢: 'och',
  宜章一六: 'yizhang_liudu',
  東江惠: 'dongjiang',
  汝: 'rucheng',
  客: 'hak',
  閩: 'min',
  贛: 'gan',
  湘: 'xiang',
  吳: 'wu',
  桂柳: 'guiliu_mandarin',
  '西官(餘)': 'southwestern_mandarin_other',
  中官: 'central_plains_mandarin',
  '官(餘)': 'mandarin_other',
  晉: 'jin',
  藏羌: 'tibeto_qiangic',
  緬彝: 'burmish_loloish',
  薩: 'sal',
  英: 'eng',
  西羅: 'western_romance',
  原始偙: 'proto_tai',
  北偙: 'northern_tai',
  中偙: 'central_tai',
  西南偙: 'southwestern_tai',
  臨高: 'hlai_lingao',
  黎: 'hlai',
  仡央: 'kra',
  仱水: 'kam_sui',
  '標-拉珈': 'biao_lakkia',
  '侗偙(餘)': 'kam_tai_other',
  苗瑤: 'hmong_mien',
  原始南亞: 'proto_austroasiatic',
  原始京: 'proto_vietic',
  京: 'vietic',
  芒: 'mang',
  '京(餘)': 'vietic_other',
  戈都: 'katuic',
  巴拿: 'bahnaric',
  高棉: 'khm',
  佤德昂: 'palaungic',
  卡西: 'khasic',
  克木: 'khmuic',
  孟: 'monic',
  '南亞(餘)': 'austroasiatic_other',
  原始南島: 'proto_austronesian',
  南島: 'austronesian',
  日: 'japonic'
} as const

export type FaanJyutLanguageCode = (typeof FAANJYUT_LANGUAGE_LABEL_TO_CODE)[keyof typeof FAANJYUT_LANGUAGE_LABEL_TO_CODE]

/** 語言代碼 → 原表列頭標籤 */
export const FAANJYUT_LANGUAGE_LABELS: Record<FaanJyutLanguageCode, string> = Object.fromEntries(
  Object.entries(FAANJYUT_LANGUAGE_LABEL_TO_CODE).map(([label, code]) => [code, label])
) as Record<FaanJyutLanguageCode, string>

/** 全部合法語言代碼 */
export const FAANJYUT_LANGUAGE_CODES = Object.values(FAANJYUT_LANGUAGE_LABEL_TO_CODE) as FaanJyutLanguageCode[]

/** 用於下拉的選項：{ value, label } */
export const FAANJYUT_LANGUAGE_OPTIONS = FAANJYUT_LANGUAGE_CODES.map((code) => ({
  value: code,
  label: FAANJYUT_LANGUAGE_LABELS[code]
}))

export function isFaanJyutLanguageCode(code: string): code is FaanJyutLanguageCode {
  return code in FAANJYUT_LANGUAGE_LABELS
}

/** 根據代碼取原表列頭標籤；未知則回傳原值 */
export function getFaanJyutLanguageLabel(code: string): string {
  return FAANJYUT_LANGUAGE_LABELS[code as FaanJyutLanguageCode] ?? code
}
