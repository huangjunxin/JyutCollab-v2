import { ADVANCED_FILTER_FIELDS } from '~/utils/entriesTableConstants'

export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200
export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000

export type AdvancedFilterFieldKey = (typeof ADVANCED_FILTER_FIELDS)[number]
export type RowFilterContext = Record<AdvancedFilterFieldKey, string>
export type AdvancedFormulaErrorCode = 'empty_formula' | 'unsupported_token' | 'unknown_field' | 'unknown_function' | 'wrong_argument_count' | 'non_boolean_result' | 'evaluation_error' | 'unexpected_end'
export type AdvancedRegexErrorCode = 'empty_pattern' | 'pattern_too_long' | 'invalid_flags' | 'invalid_pattern' | 'unsafe_pattern'
export type FormulaFunctionName = 'AND' | 'OR' | 'NOT' | 'LEN' | 'ISBLANK' | 'REGEXMATCH' | 'CONTAINS' | 'STARTSWITH' | 'ENDSWITH'
export type FormulaNode =
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'field'; key: AdvancedFilterFieldKey }
  | { type: 'call'; name: FormulaFunctionName; args: FormulaNode[] }
  | { type: 'comparison'; operator: '=' | '<>' | '>' | '>=' | '<' | '<='; left: FormulaNode; right: FormulaNode }

export interface AdvancedFilterError {
  code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode
  message: string
  detail?: string
}

export type RegexCompileResult = { ok: true; regex: RegExp } | { ok: false; error: AdvancedFilterError }
export type FormulaParseResult = { ok: true; ast: FormulaNode } | { ok: false; error: AdvancedFilterError }

type Token =
  | { type: 'identifier'; value: string }
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'operator'; value: '=' | '<>' | '>' | '>=' | '<' | '<=' }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma'; value: ',' }
  | { type: 'eof' }

const FORMULA_FUNCTIONS: Record<FormulaFunctionName, { min: number; max: number }> = {
  AND: { min: 1, max: Number.POSITIVE_INFINITY },
  OR: { min: 1, max: Number.POSITIVE_INFINITY },
  NOT: { min: 1, max: 1 },
  LEN: { min: 1, max: 1 },
  ISBLANK: { min: 1, max: 1 },
  REGEXMATCH: { min: 2, max: 3 },
  CONTAINS: { min: 2, max: 2 },
  STARTSWITH: { min: 2, max: 2 },
  ENDSWITH: { min: 2, max: 2 }
}

const FIELD_SET = new Set<string>(ADVANCED_FILTER_FIELDS)
const FUNCTION_SET = new Set<string>(Object.keys(FORMULA_FUNCTIONS))

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

function tokenizeFormula(input: string): { ok: true; tokens: Token[] } | { ok: false; error: AdvancedFilterError } {
  const tokens: Token[] = []
  let index = 0

  while (index < input.length) {
    const char = input[index]
    if (/\s/.test(char)) {
      index += 1
      continue
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = index
      index += 1
      while (index < input.length && /[A-Za-z0-9_]/.test(input[index])) index += 1
      const value = input.slice(start, index)
      const upper = value.toUpperCase()
      if (upper === 'TRUE' || upper === 'FALSE') tokens.push({ type: 'boolean', value: upper === 'TRUE' })
      else tokens.push({ type: 'identifier', value })
      continue
    }

    if (/\d/.test(char)) {
      const start = index
      index += 1
      while (index < input.length && /\d/.test(input[index])) index += 1
      if (input[index] === '.' && /\d/.test(input[index + 1] || '')) {
        index += 1
        while (index < input.length && /\d/.test(input[index])) index += 1
      }
      tokens.push({ type: 'number', value: Number(input.slice(start, index)) })
      continue
    }

    if (char === '"') {
      index += 1
      let value = ''
      while (index < input.length) {
        const current = input[index]
        if (current === '"') {
          index += 1
          tokens.push({ type: 'string', value })
          value = ''
          break
        }
        if (current === '\\') {
          const next = input[index + 1]
          if (next === '"' || next === '\\') {
            value += next
            index += 2
            continue
          }
        }
        value += current
        index += 1
      }
      if (value) continue
      if (tokens[tokens.length - 1]?.type === 'string') continue
      return { ok: false, error: createAdvancedFilterError('unexpected_end') }
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char })
      index += 1
      continue
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char })
      index += 1
      continue
    }

    const twoCharOperator = input.slice(index, index + 2)
    if (twoCharOperator === '<>' || twoCharOperator === '>=' || twoCharOperator === '<=') {
      tokens.push({ type: 'operator', value: twoCharOperator })
      index += 2
      continue
    }

    if (char === '=' || char === '>' || char === '<') {
      tokens.push({ type: 'operator', value: char })
      index += 1
      continue
    }

    return { ok: false, error: createAdvancedFilterError('unsupported_token', char) }
  }

  tokens.push({ type: 'eof' })
  return { ok: true, tokens }
}

class FormulaParser {
  private index = 0

  constructor(private readonly tokens: Token[]) {}

  parse(): FormulaParseResult {
    const expression = this.parseExpression()
    if (!expression.ok) return expression
    if (this.current().type !== 'eof') return { ok: false, error: createAdvancedFilterError('unsupported_token') }
    return { ok: true, ast: expression.ast }
  }

  private parseExpression(): FormulaParseResult {
    const left = this.parsePrimary()
    if (!left.ok) return left
    const token = this.current()
    if (token.type !== 'operator') return left
    this.advance()
    const right = this.parsePrimary()
    if (!right.ok) return right
    return { ok: true, ast: { type: 'comparison', operator: token.value, left: left.ast, right: right.ast } }
  }

  private parsePrimary(): FormulaParseResult {
    const token = this.current()
    if (token.type === 'eof') return { ok: false, error: createAdvancedFilterError('unexpected_end') }
    if (token.type === 'string' || token.type === 'number' || token.type === 'boolean') {
      this.advance()
      return { ok: true, ast: { type: 'literal', value: token.value } }
    }
    if (token.type === 'identifier') return this.parseIdentifier(token.value)
    if (token.type === 'paren' && token.value === '(') {
      this.advance()
      const expression = this.parseExpression()
      if (!expression.ok) return expression
      if (!this.matchParen(')')) return { ok: false, error: createAdvancedFilterError('unexpected_end') }
      return expression
    }
    return { ok: false, error: createAdvancedFilterError('unsupported_token') }
  }

  private parseIdentifier(value: string): FormulaParseResult {
    this.advance()
    const upper = value.toUpperCase()
    if (this.current().type === 'paren' && this.current().value === '(') {
      if (!FUNCTION_SET.has(upper)) return { ok: false, error: createAdvancedFilterError('unknown_function', value) }
      this.advance()
      const args = this.parseArguments(upper as FormulaFunctionName)
      if (!args.ok) return args
      return { ok: true, ast: { type: 'call', name: upper as FormulaFunctionName, args: args.args } }
    }
    if (FIELD_SET.has(value)) return { ok: true, ast: { type: 'field', key: value as AdvancedFilterFieldKey } }
    return { ok: false, error: createAdvancedFilterError('unknown_field', value) }
  }

  private parseArguments(name: FormulaFunctionName): { ok: true; args: FormulaNode[] } | { ok: false; error: AdvancedFilterError } {
    const args: FormulaNode[] = []
    if (this.matchParen(')')) return this.validateArgumentCount(name, args)

    while (true) {
      const arg = this.parseExpression()
      if (!arg.ok) return arg
      args.push(arg.ast)
      if (this.matchParen(')')) return this.validateArgumentCount(name, args)
      if (!this.matchComma()) return { ok: false, error: createAdvancedFilterError('unexpected_end') }
    }
  }

  private validateArgumentCount(name: FormulaFunctionName, args: FormulaNode[]): { ok: true; args: FormulaNode[] } | { ok: false; error: AdvancedFilterError } {
    const rule = FORMULA_FUNCTIONS[name]
    if (args.length < rule.min || args.length > rule.max) return { ok: false, error: createAdvancedFilterError('wrong_argument_count', name) }
    return { ok: true, args }
  }

  private current(): Token {
    return this.tokens[this.index] || { type: 'eof' }
  }

  private advance(): Token {
    const token = this.current()
    this.index += 1
    return token
  }

  private matchParen(value: '(' | ')'): boolean {
    const token = this.current()
    if (token.type !== 'paren' || token.value !== value) return false
    this.advance()
    return true
  }

  private matchComma(): boolean {
    const token = this.current()
    if (token.type !== 'comma') return false
    this.advance()
    return true
  }
}

export function parseAdvancedFormula(input: string): FormulaParseResult {
  const trimmed = String(input ?? '').trim()
  const normalized = trimmed.startsWith('=') ? trimmed.slice(1).trim() : trimmed
  if (!normalized) return { ok: false, error: createAdvancedFilterError('empty_formula') }

  const tokenized = tokenizeFormula(normalized)
  if (!tokenized.ok) return tokenized
  return new FormulaParser(tokenized.tokens).parse()
}
