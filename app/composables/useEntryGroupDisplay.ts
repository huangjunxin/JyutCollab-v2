import { getThemeNameById } from '~/composables/useThemeData'
import { STATUS_LABELS, ENTRY_TYPE_LABELS } from '~/utils/entriesTableConstants'
import type { Entry } from '~/types'

/** 聚合組列顯示：粵拼（首條或「多種」） */
export function getGroupPhonetic(group: { entries: Entry[] }): string {
  const first = group.entries[0]?.phonetic?.jyutping?.join?.(' ')
  if (!first) return '—'
  const allSame = group.entries.every(e => (e.phonetic?.jyutping?.join?.(' ') ?? '') === first)
  return allSame ? first : '多種'
}

/** 聚合組列顯示：類型（首條或「混合」） */
export function getGroupEntryType(group: { entries: Entry[] }): string {
  const first = group.entries[0]?.entryType ?? 'word'
  const allSame = group.entries.every(e => (e.entryType ?? 'word') === first)
  return allSame ? (ENTRY_TYPE_LABELS[first] ?? first) : '混合'
}

/** 聚合組列顯示：分類（首條 L3 名稱或「多種」） */
export function getGroupTheme(group: { entries: Entry[] }): string {
  const firstId = group.entries[0]?.theme?.level3Id
  if (firstId == null) return group.entries.some(e => e.theme?.level3Id != null) ? '多種' : '—'
  const name = getThemeNameById(firstId)
  const allSame = group.entries.every(e => (e.theme?.level3Id ?? null) === (firstId ?? null))
  return allSame ? (name || '—') : '多種'
}

/** 聚合組列顯示：語域（首條或「多種」） */
export function getGroupRegister(group: { entries: Entry[] }): string {
  const first = (group.entries[0]?.meta?.register as string) ?? '__none__'
  const allSame = group.entries.every(e => ((e.meta?.register as string) ?? '__none__') === first)
  if (first === '__none__' || first === '') return allSame ? '—' : '多種'
  return allSame ? first : '多種'
}

/** 聚合組列顯示：狀態（一致則一項，否則列出各狀態數量） */
export function getGroupStatus(group: { entries: Entry[] }): string {
  const statuses = group.entries.map(e => e.status || 'draft')
  const uniq = [...new Set(statuses)]
  const first = uniq[0]
  if (uniq.length === 1 && first) return STATUS_LABELS[first] ?? first
  const counts = statuses.reduce((acc, s) => { acc[s] = (acc[s] ?? 0) + 1; return acc }, {} as Record<string, number>)
  return uniq.filter(Boolean).map(s => `${counts[s]} ${STATUS_LABELS[s] ?? s}`).join(' · ')
}
