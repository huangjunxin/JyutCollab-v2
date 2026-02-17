/**
 * 方言點常數（單一來源，hardcode，不寫入數據庫）
 * 覆蓋廣東、廣西主要粵語方言點，香港繁體標籤。
 */

export const DIALECT_IDS = [
  // 廣東
  'guangzhou',
  'hongkong',
  'macau',
  'foshan',
  'shunde',
  'zhongshan',
  'jiangmen',
  'taishan',
  'kaiping',
  'enping',
  'heshan',
  'xinhui',
  'zhuhai',
  'dongguan',
  'shenzhen',
  'zhaoqing',
  'yunfu',
  'yangjiang',
  'maoming',
  'zhanjiang',
  'qingyuan',
  'shaoguan',
  // 廣西
  'nanning',
  'wuzhou',
  'hezhou',
  'yulin',
  'guigang',
  'beihai',
  'qinzhou',
  'fangchenggang',
  // 其他
  'overseas'
] as const
export type DialectId = (typeof DIALECT_IDS)[number]

/** 方言代碼 → 顯示名稱（香港繁體） */
export const DIALECT_LABELS: Record<DialectId, string> = {
  // 廣東
  guangzhou: '廣州',
  hongkong: '香港',
  macau: '澳門',
  foshan: '佛山',
  shunde: '順德',
  zhongshan: '中山',
  jiangmen: '江門',
  taishan: '台山',
  kaiping: '開平',
  enping: '恩平',
  heshan: '鶴山',
  xinhui: '新會',
  zhuhai: '珠海',
  dongguan: '東莞',
  shenzhen: '深圳',
  zhaoqing: '肇慶',
  yunfu: '雲浮',
  yangjiang: '陽江',
  maoming: '茂名',
  zhanjiang: '湛江',
  qingyuan: '清遠',
  shaoguan: '韶關',
  // 廣西
  nanning: '南寧',
  wuzhou: '梧州',
  hezhou: '賀州',
  yulin: '玉林',
  guigang: '貴港',
  beihai: '北海',
  qinzhou: '欽州',
  fangchenggang: '防城港',
  // 其他
  overseas: '海外'
}

/**
 * 方言代碼 → Jyutjyu 地區代碼（dialect.region_code）
 * 規則通常為地名拼音首字母大寫（如 廣州 GuangZhou → GZ），香港為 HK。
 */
export const DIALECT_REGION_CODES: Record<DialectId, string> = {
  // 廣東
  guangzhou: 'GZ',
  hongkong: 'HK',
  macau: 'MO',
  foshan: 'FS',
  shunde: 'SD',
  zhongshan: 'ZS',
  jiangmen: 'JM',
  taishan: 'TS',
  kaiping: 'KP',
  enping: 'EP',
  heshan: 'HS',
  xinhui: 'XH',
  zhuhai: 'ZH',
  dongguan: 'DG',
  shenzhen: 'SZ',
  zhaoqing: 'ZQ',
  yunfu: 'YF',
  yangjiang: 'YJ',
  maoming: 'MM',
  zhanjiang: 'ZJ',
  qingyuan: 'QY',
  shaoguan: 'SG',
  // 廣西
  nanning: 'NN',
  wuzhou: 'WZ',
  hezhou: 'HZ',
  yulin: 'YL',
  guigang: 'GG',
  beihai: 'BH',
  qinzhou: 'QZ',
  fangchenggang: 'FCG',
  // 其他
  overseas: 'OS'
}

/** Jyutjyu 地區代碼（region_code） → 方言代碼 */
export const REGION_CODE_TO_DIALECT_ID: Record<string, DialectId> = Object.fromEntries(
  Object.entries(DIALECT_REGION_CODES).map(([id, code]) => [code, id as DialectId])
) as Record<string, DialectId>

/** 根據 Jyutjyu 的 region_code 取顯示名稱（香港繁體）；未知則回傳原值 */
export function getDialectLabelByRegionCode(regionCode: string): string {
  const code = String(regionCode || '').trim().toUpperCase()
  if (!code) return ''
  const id = REGION_CODE_TO_DIALECT_ID[code]
  return id ? DIALECT_LABELS[id] : code
}

/** 用於下拉的選項：{ value, label } */
export const DIALECT_OPTIONS = DIALECT_IDS.map((id) => ({
  value: id,
  label: DIALECT_LABELS[id]
}))

/** 根據代碼取顯示名稱 */
export function getDialectLabel(id: string): string {
  return DIALECT_LABELS[id as DialectId] ?? id
}

/** 方言對應的 UBadge 顏色（用於審核頁等） */
export const DIALECT_COLORS: Record<DialectId, string> = {
  guangzhou: 'blue',
  hongkong: 'green',
  macau: 'teal',
  foshan: 'orange',
  shunde: 'amber',
  zhongshan: 'yellow',
  jiangmen: 'purple',
  taishan: 'orange',
  kaiping: 'pink',
  enping: 'indigo',
  heshan: 'cyan',
  xinhui: 'teal',
  zhuhai: 'blue',
  dongguan: 'green',
  shenzhen: 'red',
  zhaoqing: 'purple',
  yunfu: 'orange',
  yangjiang: 'pink',
  maoming: 'indigo',
  zhanjiang: 'cyan',
  qingyuan: 'teal',
  shaoguan: 'amber',
  nanning: 'blue',
  wuzhou: 'green',
  hezhou: 'teal',
  yulin: 'orange',
  guigang: 'cyan',
  beihai: 'purple',
  qinzhou: 'pink',
  fangchenggang: 'indigo',
  overseas: 'gray'
}

export function getDialectColor(id: string): string {
  return DIALECT_COLORS[id as DialectId] ?? 'gray'
}
