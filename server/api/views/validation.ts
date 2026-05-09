import { z } from 'zod'
import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'
import { compileAdvancedRegex, parseAdvancedFormula, type AdvancedFilterFieldKey } from '~/utils/entriesAdvancedFilter'
import { ENTRIES_SHARED_VIEW_VERSION, type EntriesSharedViewState } from '~/utils/entriesSharedView'

const FIELD_VALUES = ADVANCED_FILTER_FIELDS as unknown as [AdvancedFilterFieldKey, ...AdvancedFilterFieldKey[]]
const RULE_KIND_VALUES = ['formatting', 'validation'] as const
const CONDITION_KIND_VALUES = ['formula', 'regex'] as const
const STYLE_PRESET_VALUES = ['green', 'blue', 'purple', 'amber'] as const
const REGEX_FIELD_VALUES = ['any', ...ADVANCED_FILTER_FIELDS] as const

const fieldSchema = z.enum(FIELD_VALUES)
const emptyOrFieldSchema = z.union([z.literal(''), fieldSchema])
const regexFieldSchema = z.enum(REGEX_FIELD_VALUES)
const ruleKindSchema = z.enum(RULE_KIND_VALUES)
const conditionKindSchema = z.enum(CONDITION_KIND_VALUES)
const colorHexSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/)

const viewModeSchema = z.enum(['flat', 'aggregated', 'lexeme'])

const savedViewStateSchema = z.strictObject({
  version: z.literal(ENTRIES_SHARED_VIEW_VERSION),
  viewMode: viewModeSchema.optional(),
  filters: z.strictObject({
    formula: z.strictObject({
      input: z.string(),
      applied: z.string()
    }),
    globalRegex: z.strictObject({
      enabled: z.boolean(),
      input: z.string(),
      applied: z.string(),
      flags: z.string()
    }),
    columnRegex: z.strictObject({
      field: emptyOrFieldSchema,
      pattern: z.string(),
      flags: z.string()
    })
  }),
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

export function validateSavedViewState(state: unknown): EntriesSharedViewState {
  const parsed = savedViewStateSchema.safeParse(state)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: '分享視圖資料格式無效，無法安全還原。'
    })
  }

  const data = parsed.data
  const formulaError = validateFormula(data.filters.formula.input) ?? validateFormula(data.filters.formula.applied)
  const globalRegexError = validateRegex(data.filters.globalRegex.input, data.filters.globalRegex.flags) ?? validateRegex(data.filters.globalRegex.applied, data.filters.globalRegex.flags)
  const columnRegexError = validateRegex(data.filters.columnRegex.pattern, data.filters.columnRegex.flags)

  if (formulaError || globalRegexError || columnRegexError) {
    throw createError({
      statusCode: 400,
      message: '分享視圖資料格式無效，無法安全還原。'
    })
  }

  for (const rule of data.rules) {
    const error = rule.condition.kind === 'formula'
      ? validateFormula(rule.condition.formula)
      : validateRegex(rule.condition.regex.pattern, rule.condition.regex.flags)

    if (error) {
      throw createError({
        statusCode: 400,
        message: '分享視圖資料格式無效，無法安全還原。'
      })
    }
  }

  return {
    version: ENTRIES_SHARED_VIEW_VERSION,
    ...(data.viewMode ? { viewMode: data.viewMode } : {}),
    filters: {
      formula: {
        input: data.filters.formula.input,
        applied: data.filters.formula.applied
      },
      globalRegex: {
        enabled: data.filters.globalRegex.enabled,
        input: data.filters.globalRegex.input,
        applied: data.filters.globalRegex.applied,
        flags: data.filters.globalRegex.flags
      },
      columnRegex: {
        field: data.filters.columnRegex.field,
        pattern: data.filters.columnRegex.pattern,
        flags: data.filters.columnRegex.flags
      }
    },
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
