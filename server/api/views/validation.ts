import { z } from 'zod'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { compileAdvancedRegex, parseAdvancedFormula, type AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import { ENTRIES_SHARED_VIEW_VERSION, type EntriesSharedViewState } from '~/utils/entriesSharedView'
import type { AdvancedFilterRegexConditionPayload } from '~/composables/useEntriesAdvancedFilters'

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
const regexConditionSchema = z.strictObject({
  field: regexFieldSchema,
  pattern: z.string(),
  flags: z.string()
})

const filterFormulaSchema = z.strictObject({
  input: z.string(),
  applied: z.string()
})

const canonicalFilterStateSchema = z.strictObject({
  formula: filterFormulaSchema,
  regexRows: z.array(regexConditionSchema),
  appliedRegexRows: z.array(regexConditionSchema)
})

const singleRegexFilterStateSchema = z.strictObject({
  formula: filterFormulaSchema,
  regex: z.strictObject({
    field: regexFieldSchema,
    pattern: z.string(),
    flags: z.string(),
    applied: regexConditionSchema
  })
})

const legacyFilterStateSchema = z.strictObject({
  formula: filterFormulaSchema,
  globalRegex: z.strictObject({
    enabled: z.boolean(),
    input: z.string(),
    applied: z.string(),
    flags: z.string()
  }),
  columnRegex: z.strictObject({
    field: z.union([z.literal(''), fieldSchema]),
    pattern: z.string(),
    flags: z.string()
  })
})

const viewModeSchema = z.enum(['flat', 'aggregated', 'lexeme'])

const savedViewStateEnvelopeSchema = z.strictObject({
  version: z.literal(ENTRIES_SHARED_VIEW_VERSION),
  viewMode: viewModeSchema.optional(),
  filters: z.unknown(),
  rules: z.array(z.strictObject({
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
  }))
})

function validateFormula(formula: string): string | null {
  if (!formula.trim()) return null
  const parsed = parseAdvancedFormula(formula)
  return parsed.ok ? null : parsed.error.message
}

function validateRegex(pattern: string, flags: string): string | null {
  if (!pattern.trim()) return null
  const compiled = compileAdvancedRegex(pattern, flags)
  return compiled.ok ? null : compiled.error.message
}

function cloneRegexRow(row: AdvancedFilterRegexConditionPayload): AdvancedFilterRegexConditionPayload {
  return {
    field: row.field,
    pattern: row.pattern,
    flags: row.flags
  }
}

function normalizeFilters(filters: unknown): EntriesSharedViewState['filters'] | null {
  const canonical = canonicalFilterStateSchema.safeParse(filters)
  if (canonical.success) {
    return {
      formula: { ...canonical.data.formula },
      regexRows: canonical.data.regexRows.map(cloneRegexRow),
      appliedRegexRows: canonical.data.appliedRegexRows.map(cloneRegexRow)
    }
  }

  const single = singleRegexFilterStateSchema.safeParse(filters)
  if (single.success) {
    return {
      formula: { ...single.data.formula },
      regexRows: [cloneRegexRow(single.data.regex)],
      appliedRegexRows: single.data.regex.applied.pattern.trim() ? [cloneRegexRow(single.data.regex.applied)] : []
    }
  }

  const legacy = legacyFilterStateSchema.safeParse(filters)
  if (legacy.success) {
    const regexRows: AdvancedFilterRegexConditionPayload[] = []
    const appliedRegexRows: AdvancedFilterRegexConditionPayload[] = []
    const col = legacy.data.columnRegex
    const glob = legacy.data.globalRegex

    if (col.field && col.pattern) {
      const row = { field: col.field, pattern: col.pattern, flags: col.flags }
      regexRows.push(row)
      appliedRegexRows.push(row)
    } else if (glob.enabled && glob.applied) {
      const row = { field: 'any' as const, pattern: glob.applied, flags: glob.flags }
      regexRows.push(row)
      appliedRegexRows.push(row)
    } else if (glob.input) {
      regexRows.push({ field: 'any', pattern: glob.input, flags: glob.flags })
    }

    return {
      formula: { ...legacy.data.formula },
      regexRows,
      appliedRegexRows
    }
  }

  return null
}

function validateRegexRows(rows: AdvancedFilterRegexConditionPayload[]): string | null {
  for (const row of rows) {
    const error = validateRegex(row.pattern, row.flags)
    if (error) return error
  }
  return null
}

function throwInvalidSavedViewState(): never {
  throw createError({
    statusCode: 400,
    message: '分享視圖資料格式無效，無法安全還原。'
  })
}

export function validateSavedViewState(state: unknown): EntriesSharedViewState {
  const parsed = savedViewStateEnvelopeSchema.safeParse(state)
  if (!parsed.success) throwInvalidSavedViewState()

  const data = parsed.data
  const filters = normalizeFilters(data.filters)
  if (!filters) throwInvalidSavedViewState()

  const formulaError = validateFormula(filters.formula.input) ?? validateFormula(filters.formula.applied)
  const regexError = validateRegexRows(filters.regexRows) ?? validateRegexRows(filters.appliedRegexRows)

  if (formulaError || regexError) throwInvalidSavedViewState()

  for (const rule of data.rules) {
    const error = rule.condition.kind === 'formula'
      ? validateFormula(rule.condition.formula)
      : validateRegex(rule.condition.regex.pattern, rule.condition.regex.flags)

    if (error) throwInvalidSavedViewState()
  }

  return {
    version: ENTRIES_SHARED_VIEW_VERSION,
    ...(data.viewMode ? { viewMode: data.viewMode } : {}),
    filters,
    rules: data.rules.map(rule => ({
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
