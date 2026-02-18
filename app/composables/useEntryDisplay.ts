import type { Entry } from '~/types'
import { getDialectLabel, getDialectLabelByRegionCode } from '~/utils/dialects'

/** 用於詞條展示的義項結構（審核隊列 / 完整詞條彈窗共用） */
export interface DisplaySense {
  definition: string
  label?: string
  examples?: Array<{
    text?: string
    sentence?: string
    jyutping?: string
    translation?: string
    explanation?: string
  }>
}

/** 用於詞條展示的統一結構（審核隊列 / 完整詞條彈窗共用） */
export interface DisplayEntry {
  headwordDisplay: string
  normalized?: string
  jyutpingDisplay: string
  headwordVariants?: string[]
  meta?: Record<string, any>
  dialectLabel: string
  entryTypeLabel: string
  register?: string
  categoryLabel: string
  sourceBook?: string
  senses: DisplaySense[]
  usage?: string
  notes?: string
  createdBy?: string
  createdAt?: string
}

function normalizeJyutping(entry: any): string {
  const arr = entry?.phonetic?.jyutping
  if (Array.isArray(arr) && arr.length > 0) {
    const hasSpaceInside = arr.some((s: string) => (s || '').includes(' '))
    if (!hasSpaceInside) return arr.join(' ')
    return arr.join('; ')
  }
  return entry?.phoneticNotation || ''
}

const ENTRY_TYPE_LABELS: Record<string, string> = {
  character: '字',
  word: '詞',
  phrase: '短語'
}

/** 將本系統 Entry 轉為展示用 DisplayEntry */
export function entryToDisplay(e: Entry): DisplayEntry {
  const senses: DisplaySense[] = (e.senses?.length
    ? e.senses
    : [{ definition: e.definition || '暫無釋義', examples: e.examples || [] }]) as DisplaySense[]
  return {
    headwordDisplay: e.headword?.display || e.text || '',
    normalized: e.headword?.normalized,
    jyutpingDisplay: normalizeJyutping(e),
    headwordVariants: e.meta?.headword_variants,
    meta: e.meta,
    dialectLabel: getDialectLabel(e.dialect?.name ?? e.region ?? ''),
    entryTypeLabel: ENTRY_TYPE_LABELS[e.entryType] || e.entryType || '詞',
    register: e.meta?.register,
    categoryLabel:
      e.meta?.category ||
      [e.theme?.level1, e.theme?.level2, e.theme?.level3].filter(Boolean).join(' → ') ||
      '',
    sourceBook: (e as any).sourceBook,
    senses,
    usage: e.meta?.usage || e.usageNotes,
    notes: e.meta?.notes,
    createdBy: e.createdBy,
    createdAt: e.createdAt
  }
}

/** 將 Jyutjyu 搜尋結果單條轉為展示用 DisplayEntry */
export function jyutjyuRawToDisplay(raw: Record<string, any>): DisplayEntry {
  const headwordDisplay = raw?.headword?.display || '-'
  const arr = raw?.phonetic?.jyutping
  let jyutpingDisplay = ''
  if (Array.isArray(arr) && arr.length > 0) {
    const hasSpace = arr.some((s: string) => (s || '').includes(' '))
    jyutpingDisplay = hasSpace ? arr.join('; ') : arr.join(' ')
  }
  const dialectLabel =
    getDialectLabelByRegionCode(raw?.dialect?.region_code || '') || raw?.dialect?.name || ''
  const senses: DisplaySense[] =
    Array.isArray(raw?.senses) && raw.senses.length > 0
      ? raw.senses.map((s: any) => ({
          definition: s.definition || '',
          label: s.label,
          examples: (s.examples || []).map((ex: any) => ({
            text: ex.text || ex.sentence,
            sentence: ex.sentence || ex.text,
            jyutping: ex.jyutping,
            translation: ex.translation,
            explanation: ex.explanation
          }))
        }))
      : [{ definition: raw?.senses?.[0]?.definition || '暫無釋義', examples: [] }]
  return {
    headwordDisplay,
    jyutpingDisplay,
    dialectLabel,
    entryTypeLabel: '詞',
    categoryLabel: '',
    sourceBook: raw?.source_book || '',
    senses
  }
}

/** 審核隊列 / 詞條詳情用的日期格式 */
export function formatEntryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
