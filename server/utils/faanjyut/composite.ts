/**
 * 綜合音（lexemes.meta.compositePronunciation）編輯共用（2026-08-06，方案 A）。
 *
 * ETL 側 display（檢索音）由 PanJSheet2Sql_new.JyutpingConverter 生成：
 * 原文 → 按 DEFAULT_SUBSTITUTIONS 順序替換 → `/` 分段去重（保留首現）→ 重連。
 * 此處 1:1 移植同一規則表（ETL PanJSheet2Sql_new.py:265-319），平台編輯綜合音後
 * 服務端重算 display/markers，保證與導入語義一致；替換表變更須兩倉同步。
 */
export const COMPOSITE_SUBSTITUTIONS: ReadonlyArray<readonly [string, string]> = [
  ['..', '.'],
  ['n.zh', 'nj'], ['n.ch', 'nj'], ['n.sh', 'nj'], ['n.j', 'nj'],
  ['n.b', 'm'], ['n.p', 'm'], ['n.f', 'm'],
  ['n.d', 'n'], ['n.t', 'n'], ['n.l', 'n'],
  ['n.z', 'n'], ['n.c', 'n'], ['n.s', 'n'],
  ['n.g', 'ng'], ['n.k', 'ng'], ['n.h', 'ng'], ['n.', 'ng'],
  ['lh', 'l'], ['mh', 'm'], ['jh', 'j'], ['nh', 'n'], ['ngh', 'ng'],
  ['sh', 's'], ['zh', 'z'], ['ch', 'c'], ['sr', 's'], ['zr', 'z'], ['cr', 'c'], ['nj', 'j'],
  ['ngi', 'ji'], ['jiung', 'jung'],
  ['eo', 'a'], ['ooi', 'ui'], ['eoi', 'ui'], ['yk', 'ik'], ['yng', 'ing'],
  ['ae', 'aa'], ['om', 'am'], ['op', 'ap'], ['aw', 'o'],
  ['?', ''], ['!', '']
]

/** 綜合音原文 → 檢索音（display）：順序替換 → `/` 分段去重（保留首現） */
export function compositeDisplayFromRaw(raw: string): string {
  let result = raw
  for (const [old, next] of COMPOSITE_SUBSTITUTIONS) {
    result = result.split(old).join(next)
  }
  return [...new Set(result.split('/'))].join('/')
}

/** 標記解析（與 ETL PanJ2MongoDB.py:502-505 一致：`?`/`？` → hasQuestion，`!` → hasBang） */
export function compositeMarkersFromRaw(raw: string): { hasQuestion: boolean; hasBang: boolean } {
  return {
    hasQuestion: raw.includes('?') || raw.includes('？'),
    hasBang: raw.includes('!')
  }
}

export interface CompositePronunciation {
  raw: string
  display: string
  markers: { hasQuestion: boolean; hasBang: boolean }
}

/** 編輯輸入 → 完整 compositePronunciation；trim 後為空返回 null（= 清空綜合音） */
export function buildCompositePronunciation(raw: string): CompositePronunciation | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  return {
    raw: trimmed,
    display: compositeDisplayFromRaw(trimmed),
    markers: compositeMarkersFromRaw(trimmed)
  }
}
