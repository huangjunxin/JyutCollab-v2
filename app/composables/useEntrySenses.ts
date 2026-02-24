import type { Entry } from '~/types'

/** 確保 entry.senses 至少有一項，且每項有 examples / subSenses 陣列 */
export function ensureSensesStructure(entry: Entry) {
  if (!entry.senses || entry.senses.length === 0) {
    entry.senses = [{ definition: '', examples: [], subSenses: [] }]
    entry._isDirty = true
  }
  entry.senses.forEach((s: any) => {
    if (!Array.isArray(s.examples)) s.examples = []
    if (!Array.isArray(s.subSenses)) s.subSenses = []
    s.subSenses?.forEach((sub: any) => {
      if (!Array.isArray(sub.examples)) sub.examples = []
    })
  })
}

export function addSense(entry: Entry) {
  ensureSensesStructure(entry)
  entry.senses!.push({ definition: '', label: '', examples: [], subSenses: [] })
  entry._isDirty = true
}

export function removeSense(entry: Entry, senseIndex: number) {
  if (entry.senses!.length <= 1) return
  entry.senses!.splice(senseIndex, 1)
  entry._isDirty = true
}

export function addExample(entry: Entry, senseIndex: number) {
  ensureSensesStructure(entry)
  const sense = entry.senses![senseIndex]
  if (!sense) return
  if (!sense.examples) sense.examples = []
  sense.examples.push({ text: '', jyutping: '', translation: '' })
  entry._isDirty = true
}

export function removeExample(entry: Entry, senseIndex: number, exIndex: number) {
  const sense = entry.senses![senseIndex]
  if (!sense?.examples) return
  sense.examples.splice(exIndex, 1)
  entry._isDirty = true
}

export function addSubSense(entry: Entry, senseIndex: number) {
  ensureSensesStructure(entry)
  const sense = entry.senses![senseIndex]
  if (!sense) return
  if (!sense.subSenses) sense.subSenses = []
  sense.subSenses.push({ label: '', definition: '', examples: [] })
  entry._isDirty = true
}

export function removeSubSense(entry: Entry, senseIndex: number, subIndex: number) {
  const sense = entry.senses![senseIndex]
  if (!sense?.subSenses) return
  sense.subSenses.splice(subIndex, 1)
  entry._isDirty = true
}

export function addSubSenseExample(entry: Entry, senseIndex: number, subIndex: number) {
  ensureSensesStructure(entry)
  const sub = entry.senses![senseIndex]?.subSenses?.[subIndex]
  if (!sub) return
  if (!sub.examples) sub.examples = []
  sub.examples.push({ text: '', jyutping: '', translation: '' })
  entry._isDirty = true
}

export function removeSubSenseExample(entry: Entry, senseIndex: number, subIndex: number, exIndex: number) {
  const sub = entry.senses![senseIndex]?.subSenses?.[subIndex]
  if (!sub?.examples) return
  sub.examples.splice(exIndex, 1)
  entry._isDirty = true
}
