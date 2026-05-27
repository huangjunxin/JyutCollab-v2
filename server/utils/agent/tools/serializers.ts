const BLOCKED_FIELD_NAMES = new Set([
  'auth_token',
  'authorization',
  'cookie',
  'headers',
  'password',
  'passwordhash',
  'raw',
  'request',
  'token'
])

export function compactEntrySummary(entry: any) {
  return {
    id: String(entry?.id ?? entry?._id ?? ''),
    headword: String(entry?.headword?.display ?? entry?.text ?? ''),
    dialect: String(entry?.dialect?.name ?? entry?.region ?? ''),
    status: String(entry?.status ?? ''),
    entryType: entry?.entryType,
    definitionPreview: entry?.senses?.[0]?.definition ?? entry?.definition,
    jyutping: entry?.phonetic?.jyutping,
    category: entry?.meta?.category
  }
}

export function redactAgentPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => redactAgentPayload(item))
  if (!value || typeof value !== 'object') return value

  const output: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value)) {
    if (BLOCKED_FIELD_NAMES.has(key) || BLOCKED_FIELD_NAMES.has(key.toLowerCase())) continue
    output[key] = redactAgentPayload(nested)
  }
  return output
}
