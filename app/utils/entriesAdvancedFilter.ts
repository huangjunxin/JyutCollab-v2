import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200
export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000

export type AdvancedFormulaErrorCode = 'empty_formula' | 'unsupported_token' | 'unknown_field' | 'unknown_function' | 'wrong_argument_count' | 'non_boolean_result' | 'evaluation_error' | 'unexpected_end'
export type AdvancedRegexErrorCode = 'empty_pattern' | 'pattern_too_long' | 'invalid_flags' | 'invalid_pattern' | 'unsafe_pattern'

export interface AdvancedFilterError {
  code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode
  message: string
  detail?: string
}

export type RegexCompileResult = { ok: true; regex: RegExp } | { ok: false; error: AdvancedFilterError }

export function getAdvancedFilterErrorMessage(code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode, detail?: string): string {
  const messages: Record<AdvancedRegexErrorCode | AdvancedFormulaErrorCode, string> = {
    empty_pattern: '請輸入正則表達式。',
    pattern_too_long: '正則表達式太長，請縮短後再試。',
    invalid_flags: '正則表達式旗標只支援 i、m、u。',
    invalid_pattern: '正則表達式格式無效，請檢查括號、斜線或轉義符號。',
    unsafe_pattern: '此正則表達式可能令瀏覽器變慢，請簡化重複條件。',
    empty_formula: '請輸入公式。',
    unsupported_token: '公式包含未支援的符號。',
    unknown_field: detail ? `未知欄位：${detail}。請使用下方列出的欄位名稱。` : '未知欄位。請使用下方列出的欄位名稱。',
    unknown_function: detail ? `未支援的函數：${detail}。` : '未支援的函數。',
    wrong_argument_count: detail ? `${detail} 的參數數量不正確。` : '函數的參數數量不正確。',
    non_boolean_result: '篩選公式必須回傳 TRUE 或 FALSE。',
    evaluation_error: '公式計算失敗，請檢查欄位和參數。',
    unexpected_end: '公式尚未完成，請檢查括號或參數。'
  }
  return messages[code]
}

function createAdvancedFilterError(code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode, detail?: string): AdvancedFilterError {
  return {
    code,
    message: getAdvancedFilterErrorMessage(code, detail),
    detail
  }
}

export function compileAdvancedRegex(pattern: string, flags = 'i'): RegexCompileResult {
  const trimmed = String(pattern ?? '').trim()
  if (!trimmed) return { ok: false, error: createAdvancedFilterError('empty_pattern') }
  if (trimmed.length > ADVANCED_REGEX_MAX_PATTERN_LENGTH) return { ok: false, error: createAdvancedFilterError('pattern_too_long') }
  if (!/^[imu]*$/.test(flags)) return { ok: false, error: createAdvancedFilterError('invalid_flags') }
  if (/\([^)]*[+*][^)]*\)[+*{]/.test(trimmed)) return { ok: false, error: createAdvancedFilterError('unsafe_pattern') }

  try {
    return { ok: true, regex: new RegExp(trimmed, flags) }
  } catch {
    return { ok: false, error: createAdvancedFilterError('invalid_pattern') }
  }
}

export function testAdvancedRegex(regex: RegExp, value: string): boolean {
  regex.lastIndex = 0
  return regex.test(String(value ?? '').slice(0, ADVANCED_REGEX_MAX_INPUT_LENGTH))
}

void ADVANCED_FILTER_FIELDS
