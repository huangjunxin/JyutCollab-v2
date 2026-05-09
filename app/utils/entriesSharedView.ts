import { z } from 'zod'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { compileAdvancedRegex, parseAdvancedFormula, type AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import type { EntriesRuleDraft } from '~/composables/useEntriesRuleOverlays'

export const ENTRIES_SHARED_VIEW_VERSION = 1
export const ENTRIES_SHARED_VIEW_QUERY_PARAM = 'view'
export const ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH = 6000

export type EntriesSharedViewDecodeCode =
  | 'missing_payload'
  | 'decode_failed'
  | 'schema_mismatch'
  | 'unsupported_field'
  | 'unsupported_rule_kind'
  | 'unsupported_condition_kind'
  | 'unsupported_version'
  | 'too_old_version'
  | 'too_large'
  | 'invalid_formula'
  | 'invalid_regex'

export interface EntriesSharedViewAdvancedFilterState {
  formula: {
    input: string
    applied: string
  }
  regex: {
    field: AdvancedFilterFieldKey | 'any'
    pattern: string
    flags: string
    applied: {
      field: AdvancedFilterFieldKey | 'any'
      pattern: string
      flags: string
    }
  }
}

export type EntriesSharedViewRule = EntriesRuleDraft

export type EntriesSharedViewMode = 'flat' | 'aggregated' | 'lexeme'

export interface EntriesSharedViewState {
  version: typeof ENTRIES_SHARED_VIEW_VERSION
  viewMode?: EntriesSharedViewMode
  filters: EntriesSharedViewAdvancedFilterState
  rules: EntriesSharedViewRule[]
}

export type EntriesSharedViewDecodeResult =
  | { ok: true; data: EntriesSharedViewState }
  | { ok: false; reason: string; code: EntriesSharedViewDecodeCode }

export interface EntriesSharedViewSummary {
  filterCount: number
  ruleCount: number
  message: string
}

const FIELD_VALUES = ADVANCED_FILTER_FIELDS as unknown as [AdvancedFilterFieldKey, ...AdvancedFilterFieldKey[]]
const RULE_KIND_VALUES = ['formatting', 'validation'] as const
const CONDITION_KIND_VALUES = ['formula', 'regex'] as const
const STYLE_PRESET_VALUES = ['green', 'blue', 'purple', 'amber'] as const
const REGEX_FIELD_VALUES = ['any', ...ADVANCED_FILTER_FIELDS] as const

const fieldSchema = z.enum(FIELD_VALUES)
const regexFieldSchema = z.enum(REGEX_FIELD_VALUES)
const ruleKindSchema = z.enum(RULE_KIND_VALUES)
const conditionKindSchema = z.enum(CONDITION_KIND_VALUES)
const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const filterStateSchema = z.strictObject({
  formula: z.strictObject({
    input: z.string(),
    applied: z.string()
  }),
  regex: z.strictObject({
    field: regexFieldSchema,
    pattern: z.string(),
    flags: z.string(),
    applied: z.strictObject({
      field: regexFieldSchema,
      pattern: z.string(),
      flags: z.string()
    })
  })
})

const ruleSchema = z.strictObject({
  name: z.string(),
  kind: ruleKindSchema,
  enabled: z.boolean(),
  targetFields: z.array(fieldSchema),
  condition: z.strictObject({
    kind: conditionKindSchema,
    formula: z.string(),
    regex: z.strictObject({
      pattern: z.string(),
      flags: z.string(),
      field: regexFieldSchema
    })
  }),
  stylePreset: z.enum(STYLE_PRESET_VALUES),
  colorHex: colorHexSchema
})

const viewModeSchema = z.enum(['flat', 'aggregated', 'lexeme'])

const sharedViewSchema = z.strictObject({
  version: z.literal(ENTRIES_SHARED_VIEW_VERSION),
  viewMode: viewModeSchema.optional(),
  filters: filterStateSchema,
  rules: z.array(ruleSchema)
})

const baseSharedViewSchema = z.strictObject({
  version: z.number()
}).passthrough()

function createDecodeError(code: EntriesSharedViewDecodeCode, detail?: string): EntriesSharedViewDecodeResult {
  const reasons: Record<EntriesSharedViewDecodeCode, string> = {
    missing_payload: '分享視圖資料不存在。',
    decode_failed: '分享視圖資料無法解碼。',
    schema_mismatch: '分享視圖資料格式無效，無法安全還原。',
    unsupported_field: detail ? `分享視圖包含未支援欄位：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_rule_kind: detail ? `分享視圖包含未支援規則類型：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_condition_kind: detail ? `分享視圖包含未支援條件模式：${detail}。` : '分享視圖資料格式無效，無法安全還原。',
    unsupported_version: '此分享視圖版本未受支援。',
    too_old_version: '此分享視圖版本太舊，無法安全還原。',
    too_large: '分享視圖資料太長，無法安全還原。',
    invalid_formula: detail ? `分享視圖中的公式無法套用：${detail}` : '分享視圖資料格式無效，無法安全還原。',
    invalid_regex: detail ? `分享視圖中的正則表達式無法套用：${detail}` : '分享視圖資料格式無效，無法安全還原。'
  }

  return { ok: false, code, reason: reasons[code] }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSupportedField(value: unknown): value is AdvancedFilterFieldKey {
  return typeof value === 'string' && ADVANCED_FILTER_FIELDS.includes(value as AdvancedFilterFieldKey)
}

function normalizeState(state: EntriesSharedViewState): EntriesSharedViewState {
  return {
    version: ENTRIES_SHARED_VIEW_VERSION,
    ...(state.viewMode ? { viewMode: state.viewMode } : {}),
    filters: {
      formula: {
        input: state.filters.formula.input,
        applied: state.filters.formula.applied
      },
      regex: {
        field: state.filters.regex.field,
        pattern: state.filters.regex.pattern,
        flags: state.filters.regex.flags,
        applied: {
          field: state.filters.regex.applied.field,
          pattern: state.filters.regex.applied.pattern,
          flags: state.filters.regex.applied.flags
        }
      }
    },
    rules: state.rules.map(rule => ({
      name: rule.name,
      kind: rule.kind,
      enabled: rule.enabled,
      targetFields: [...rule.targetFields],
      condition: {
        kind: rule.condition.kind,
        formula: rule.condition.formula,
        regex: {
          pattern: rule.condition.regex.pattern,
          flags: rule.condition.regex.flags,
          field: rule.condition.regex.field
        }
      },
      stylePreset: rule.stylePreset,
      colorHex: rule.colorHex
    }))
  }
}

function encodeUtf8Base64Url(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function decodeUtf8Base64Url(encoded: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('invalid-base64url')
  const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encoded.length % 4) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

function findUnsupportedSemanticValue(payload: unknown): EntriesSharedViewDecodeResult | null {
  if (!isPlainObject(payload)) return null

  const filters = payload.filters
  if (isPlainObject(filters)) {
    const regex = filters.regex
    if (isPlainObject(regex)) {
      for (const key of ['field', 'applied']) {
        const section = isPlainObject(regex[key as string]) ? regex[key as string] : regex
        if (isPlainObject(section)) {
          const field = section.field
          if (typeof field === 'string' && field !== 'any' && !isSupportedField(field)) return createDecodeError('unsupported_field', field)
        }
      }
    }
  }

  const rules = payload.rules
  if (!Array.isArray(rules)) return null
  for (const rule of rules) {
    if (!isPlainObject(rule)) continue
    if (typeof rule.kind === 'string' && !RULE_KIND_VALUES.includes(rule.kind as any)) return createDecodeError('unsupported_rule_kind', rule.kind)
    const condition = rule.condition
    if (isPlainObject(condition)) {
      if (typeof condition.kind === 'string' && !CONDITION_KIND_VALUES.includes(condition.kind as any)) return createDecodeError('unsupported_condition_kind', condition.kind)
      const regex = condition.regex
      if (isPlainObject(regex)) {
        const regexField = regex.field
        if (typeof regexField === 'string' && regexField !== 'any' && !isSupportedField(regexField)) return createDecodeError('unsupported_field', regexField)
      }
    }
    const targetFields = rule.targetFields
    if (Array.isArray(targetFields)) {
      const unsupported = targetFields.find(field => typeof field === 'string' && !isSupportedField(field))
      if (typeof unsupported === 'string') return createDecodeError('unsupported_field', unsupported)
    }
  }

  return null
}

function validateFormula(formula: string): EntriesSharedViewDecodeResult | null {
  if (!formula.trim()) return null
  const parsed = parseAdvancedFormula(formula)
  if (!parsed.ok) return createDecodeError('invalid_formula', parsed.error.message)
  return null
}

function validateRegex(pattern: string, flags: string): EntriesSharedViewDecodeResult | null {
  if (!pattern.trim()) return null
  const compiled = compileAdvancedRegex(pattern, flags)
  if (!compiled.ok) return createDecodeError('invalid_regex', compiled.error.message)
  return null
}

function validateSharedViewSemantics(state: EntriesSharedViewState): EntriesSharedViewDecodeResult | null {
  const formulaError = validateFormula(state.filters.formula.input) ?? validateFormula(state.filters.formula.applied)
  if (formulaError) return formulaError

  const regexError = validateRegex(state.filters.regex.pattern, state.filters.regex.flags)
    ?? validateRegex(state.filters.regex.applied.pattern, state.filters.regex.applied.flags)
  if (regexError) return regexError

  for (const rule of state.rules) {
    if (rule.condition.kind === 'formula') {
      const error = validateFormula(rule.condition.formula)
      if (error) return error
    } else {
      const error = validateRegex(rule.condition.regex.pattern, rule.condition.regex.flags)
      if (error) return error
    }
  }

  return null
}

export function encodeEntriesSharedView(state: EntriesSharedViewState): string {
  return encodeUtf8Base64Url(normalizeState(state))
}

export function decodeEntriesSharedView(payload: string | null | undefined): EntriesSharedViewDecodeResult {
  if (!payload) return createDecodeError('missing_payload')
  if (payload.length > ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH) return createDecodeError('too_large')

  let decoded: unknown
  try {
    decoded = decodeUtf8Base64Url(payload)
  } catch {
    return createDecodeError('decode_failed')
  }

  const base = baseSharedViewSchema.safeParse(decoded)
  if (!base.success) return createDecodeError('schema_mismatch')
  if (base.data.version < ENTRIES_SHARED_VIEW_VERSION) return createDecodeError('too_old_version')
  if (base.data.version > ENTRIES_SHARED_VIEW_VERSION) return createDecodeError('unsupported_version')

  const unsupported = findUnsupportedSemanticValue(decoded)
  if (unsupported) return unsupported

  const parsed = sharedViewSchema.safeParse(decoded)
  if (!parsed.success) return createDecodeError('schema_mismatch')

  const semanticError = validateSharedViewSemantics(parsed.data)
  if (semanticError) return semanticError

  return { ok: true, data: normalizeState(parsed.data) }
}

export function buildEntriesSharedViewUrl(baseUrl: string, state: EntriesSharedViewState): string {
  const url = new URL(baseUrl)
  url.searchParams.set(ENTRIES_SHARED_VIEW_QUERY_PARAM, encodeEntriesSharedView(state))
  return url.toString()
}

export function summarizeEntriesSharedView(state: EntriesSharedViewState): EntriesSharedViewSummary {
  const filterCount = [
    state.filters.formula.applied.trim(),
    state.filters.regex.applied.pattern.trim()
  ].filter(Boolean).length
  const ruleCount = state.rules.length

  return {
    filterCount,
    ruleCount,
    message: `已還原 ${filterCount} 項篩選和 ${ruleCount} 項規則。`
  }
}
