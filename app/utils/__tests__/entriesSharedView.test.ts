import { describe, expect, it } from 'vitest'
import {
  ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH,
  ENTRIES_SHARED_VIEW_QUERY_PARAM,
  ENTRIES_SHARED_VIEW_VERSION,
  buildEntriesSharedViewUrl,
  decodeEntriesSharedView,
  encodeEntriesSharedView,
  summarizeEntriesSharedView,
  type EntriesSharedViewState
} from '../entriesSharedView'

function createState(overrides: Partial<EntriesSharedViewState> = {}): EntriesSharedViewState {
  return {
    version: ENTRIES_SHARED_VIEW_VERSION,
    filters: {
      formula: {
        input: '=CONTAINS(definition, "檢查")',
        applied: '=CONTAINS(definition, "檢查")'
      },
      globalRegex: {
        enabled: true,
        input: '香港|廣州',
        applied: '香港|廣州',
        flags: 'iu'
      },
      columnRegex: {
        field: 'headword',
        pattern: '測試',
        flags: 'i'
      }
    },
    rules: [
      {
        name: '缺少例句',
        kind: 'formatting',
        enabled: true,
        targetFields: ['definition'],
        condition: {
          kind: 'formula',
          formula: '=CONTAINS(definition, "缺少")',
          regex: { pattern: '', flags: 'i', field: 'any' }
        },
        stylePreset: 'amber',
        colorHex: '#f59e0b'
      },
      {
        name: '詞頭警告',
        kind: 'validation',
        enabled: true,
        targetFields: ['headword'],
        condition: {
          kind: 'regex',
          formula: '',
          regex: { pattern: '測試', flags: 'i', field: 'headword' }
        },
        stylePreset: 'purple',
        colorHex: '#a855f7'
      }
    ],
    ...overrides
  }
}

function encodeRaw(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeRaw(encoded: string): any {
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

describe('entries shared view utility', () => {
  it('encodes and decodes a valid v1 payload with strict summary counts', () => {
    const state = createState()
    const encoded = encodeEntriesSharedView(state)
    const decoded = decodeEntriesSharedView(encoded)

    expect(decodeRaw(encoded).version).toBe(1)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.data).toEqual(state)
    expect(summarizeEntriesSharedView(decoded.data)).toEqual({
      filterCount: 3,
      ruleCount: 2,
      message: '已還原 3 項篩選和 2 項規則。'
    })
  })

  it('preserves Hong Kong Traditional Unicode content via UTF-8 base64url', () => {
    const state = createState({
      filters: {
        ...createState().filters,
        formula: { input: '=CONTAINS(definition, "粵語詞條")', applied: '=CONTAINS(definition, "粵語詞條")' }
      },
      rules: [
        {
          ...createState().rules[0],
          name: '香港繁體詞條',
          condition: {
            ...createState().rules[0].condition,
            formula: '=CONTAINS(definition, "香港繁體詞條")'
          }
        }
      ]
    })

    const encoded = encodeEntriesSharedView(state)
    expect(encoded).not.toContain('+')
    expect(encoded).not.toContain('/')
    expect(encoded).not.toContain('=')
    const decoded = decodeEntriesSharedView(encoded)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.data.rules[0].name).toBe('香港繁體詞條')
    expect(decoded.data.filters.formula.applied).toContain('粵語詞條')
  })

  it('builds a URL by setting only the view query parameter', () => {
    const state = createState()
    const url = buildEntriesSharedViewUrl('https://example.com/entries?search=測試&page=2', state)
    const parsed = new URL(url)

    expect(ENTRIES_SHARED_VIEW_QUERY_PARAM).toBe('view')
    expect(parsed.pathname).toBe('/entries')
    expect(parsed.searchParams.get('search')).toBe('測試')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('view')).toBeTruthy()
  })

  it('rejects missing payloads and malformed base64url data without throwing', () => {
    expect(decodeEntriesSharedView('').ok).toBe(false)
    expect(decodeEntriesSharedView(null).ok).toBe(false)

    const decoded = decodeEntriesSharedView('不是-base64')
    expect(decoded).toMatchObject({
      ok: false,
      code: 'decode_failed',
      reason: '分享視圖資料無法解碼。'
    })
  })

  it('rejects payloads longer than 6000 characters before decoding', () => {
    const decoded = decodeEntriesSharedView('a'.repeat(ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH + 1))
    expect(ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH).toBe(6000)
    expect(decoded).toMatchObject({
      ok: false,
      code: 'too_large',
      reason: '分享視圖資料太長，無法安全還原。'
    })
  })

  it('rejects unsupported and too-old versions', () => {
    expect(decodeEntriesSharedView(encodeRaw({ ...createState(), version: 2 }))).toMatchObject({
      ok: false,
      code: 'unsupported_version',
      reason: '此分享視圖版本未受支援。'
    })
    expect(decodeEntriesSharedView(encodeRaw({ ...createState(), version: 0 }))).toMatchObject({
      ok: false,
      code: 'too_old_version',
      reason: '此分享視圖版本太舊，無法安全還原。'
    })
  })

  it('rejects schema mismatches and unknown nested fields', () => {
    expect(decodeEntriesSharedView(encodeRaw({ version: 1, filters: {}, rules: [] }))).toMatchObject({
      ok: false,
      code: 'schema_mismatch',
      reason: '分享視圖資料格式無效，無法安全還原。'
    })

    const withUnknownNestedField = createState()
    ;(withUnknownNestedField.filters.globalRegex as any).secretToken = 'sk-secret'
    expect(decodeEntriesSharedView(encodeRaw(withUnknownNestedField))).toMatchObject({
      ok: false,
      code: 'schema_mismatch',
      reason: '分享視圖資料格式無效，無法安全還原。'
    })
  })

  it('rejects unsupported fields, rule kinds, and condition kinds with explicit copy', () => {
    const unsupportedField = createState()
    unsupportedField.filters.columnRegex.field = 'unknown' as any
    expect(decodeEntriesSharedView(encodeRaw(unsupportedField))).toMatchObject({
      ok: false,
      code: 'unsupported_field',
      reason: '分享視圖包含未支援欄位：unknown。'
    })

    const unsupportedRule = createState()
    unsupportedRule.rules[0].kind = ['sa', 've'].join('') as any
    expect(decodeEntriesSharedView(encodeRaw(unsupportedRule))).toMatchObject({
      ok: false,
      code: 'unsupported_rule_kind',
      reason: `分享視圖包含未支援規則類型：${['sa', 've'].join('')}。`
    })

    const unsupportedCondition = createState()
    unsupportedCondition.rules[0].condition.kind = 'script' as any
    expect(decodeEntriesSharedView(encodeRaw(unsupportedCondition))).toMatchObject({
      ok: false,
      code: 'unsupported_condition_kind',
      reason: '分享視圖包含未支援條件模式：script。'
    })
  })

  it('rejects untrusted non-hex rule colors before restore', () => {
    const invalidColor = createState()
    invalidColor.rules[0].colorHex = 'red;box-shadow:0 0 0 9999px black' as any

    expect(decodeEntriesSharedView(encodeRaw(invalidColor))).toMatchObject({
      ok: false,
      code: 'schema_mismatch',
      reason: '分享視圖資料格式無效，無法安全還原。'
    })
  })

  it('rejects invalid formula and invalid regex semantics before restore', () => {
    const invalidFormula = createState({
      filters: {
        ...createState().filters,
        formula: { input: '=UNKNOWN(definition)', applied: '=UNKNOWN(definition)' }
      }
    })
    expect(decodeEntriesSharedView(encodeRaw(invalidFormula))).toMatchObject({
      ok: false,
      code: 'invalid_formula'
    })

    const invalidRegex = createState({
      filters: {
        ...createState().filters,
        globalRegex: { enabled: true, input: '(', applied: '(', flags: 'i' }
      }
    })
    expect(decodeEntriesSharedView(encodeRaw(invalidRegex))).toMatchObject({
      ok: false,
      code: 'invalid_regex'
    })
  })

  it('does not serialize local IDs, secrets, entry data, or dirty draft state', () => {
    const suspicious = createState()
    ;(suspicious.rules[0] as any).id = 'local-rule-id'
    ;(suspicious as any).entries = [{ id: 'entry-1', headword: '秘密詞條' }]
    ;(suspicious as any).token = 'sk-secret'
    ;(suspicious as any)._isDirty = true

    const encoded = encodeEntriesSharedView(suspicious)
    const raw = JSON.stringify(decodeRaw(encoded))
    expect(raw).not.toContain('local-rule-id')
    expect(raw).not.toContain('秘密詞條')
    expect(raw).not.toContain('sk-secret')
    expect(raw).not.toContain('_isDirty')
    expect(raw).not.toMatch(/userId|session|Cloudinary|apiResponse|selectedRow/i)
  })

  it('does not serialize user identifiers, session data, AI responses, Cloudinary credentials, selected rows, or API responses', () => {
    const sensitive = createState()
    ;(sensitive as any).userId = 'user-12345'
    ;(sensitive as any).sessionId = 'sess-abc-def-ghi'
    ;(sensitive as any).currentUser = { id: 'user-12345', role: 'admin', email: 'user@example.com' }
    ;(sensitive.filters as any).aiResponse = { suggestion: 'AI建議內容', confidence: 0.95 }
    ;(sensitive.filters as any).cloudinaryUpload = { publicId: 'cloudinary-123', apiKey: 'api-key-secret', apiSecret: 'api-secret-value' }
    ;(sensitive as any).selectedRows = ['entry-1', 'entry-2', 'entry-3']
    ;(sensitive as any).lastFetchResponse = { entries: [], totalCount: 100, timestamp: '2026-05-05' }
    ;(sensitive.rules[0] as any).suggestedDefinition = 'AI自動生成釋義'

    const encoded = encodeEntriesSharedView(sensitive)
    const raw = JSON.stringify(decodeRaw(encoded))

    expect(raw).not.toContain('user-12345')
    expect(raw).not.toContain('sess-abc-def-ghi')
    expect(raw).not.toContain('user@example.com')
    expect(raw).not.toContain('AI建議內容')
    expect(raw).not.toContain('cloudinary-123')
    expect(raw).not.toContain('api-key-secret')
    expect(raw).not.toContain('api-secret-value')
    expect(raw).not.toContain('entry-1')
    expect(raw).not.toContain('entry-2')
    expect(raw).not.toContain('entry-3')
    expect(raw).not.toContain('AI自動生成釋義')
    expect(raw).not.toContain('lastFetchResponse')
    expect(raw).not.toMatch(/apiKey|apiSecret|publicId|email|password|token|secret|credential/i)
  })
})
