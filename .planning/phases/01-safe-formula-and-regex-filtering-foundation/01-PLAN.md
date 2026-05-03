---
phase: 01
plan: 01
name: core-safe-formula-regex-engine
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - app/utils/entriesTableConstants.ts
  - app/utils/entriesAdvancedFilter.ts
requirements:
  - FORM-01
  - FORM-02
  - FORM-03
  - FORM-04
  - REGX-03
  - REGX-04
---

<objective>
Build the pure, read-only advanced filtering engine: stable field constants, row-context types, regex compile/test helpers, Excel-style formula tokenization/parsing/evaluation, and Hong Kong Traditional Chinese validation messages. This plan implements the safety foundation consumed by later Phase 1 table integration.
</objective>

<truths>
- D-01: Implement a small Excel-style formula subset, not JavaScript-like expressions or full Excel compatibility.
- D-02: Support boolean comparison operators, AND, OR, NOT, LEN, ISBLANK, REGEXMATCH, CONTAINS, STARTSWITH, and ENDSWITH.
- D-03: Formula evaluation must use an explicit parser/interpreter and whitelist; do not use eval, new Function, dynamic imports, or arbitrary JavaScript execution.
- D-04: A formula must evaluate to boolean for filtering; non-boolean roots are validation errors.
- D-05: Public formula/regex fields are headword, dialect, phonetic, entryType, theme, definition, register, and status.
- D-06: Evaluation runs against normalized display values derived from editable column getters/display text.
- D-07: Row context must not mutate Entry objects or call column setters.
- D-12: Invalid regex patterns are caught before evaluation and reported with Hong Kong Traditional Chinese messages.
- D-18: All new error/helper strings are Hong Kong Traditional Chinese.
</truths>

<threat_model>
| Threat | Severity | Mitigation |
|--------|----------|------------|
| Formula input executes arbitrary JavaScript | high | `app/utils/entriesAdvancedFilter.ts` must contain a hand-written tokenizer/parser/evaluator and must not contain `eval(`, `new Function`, `import(`, or dynamic code generation. Function dispatch is through a fixed `FORMULA_FUNCTIONS`/switch whitelist only. |
| Formula or regex mutates dictionary entries | high | Utility types accept `RowFilterContext` string values only. This file must not import save/delete APIs, must not import `EditableColumnDef`, and must not call any `set` function. |
| Regex causes browser freeze through invalid or expensive pattern | medium | Regex helper caps patterns at 200 characters, tested input at 2000 characters, allows only `i`, `m`, `u`, rejects obvious nested quantifier patterns, and wraps `new RegExp` in try/catch. |
| Regex statefulness creates inconsistent matches | medium | `g` and `y` flags are rejected; `testAdvancedRegex` still sets `regex.lastIndex = 0` before every test. |
</threat_model>

<must_haves>
- `ADVANCED_FILTER_FIELDS` is exactly `['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const`.
- `compileAdvancedRegex` returns typed errors for `empty_pattern`, `pattern_too_long`, `invalid_flags`, `invalid_pattern`, and `unsafe_pattern`.
- `evaluateAdvancedFormula` accepts formula input with or without one leading `=` and returns `{ ok: true, value: boolean }` only for boolean roots.
- Unsupported fields/functions/tokens and wrong argument counts return typed Hong Kong Traditional Chinese validation errors.
- `REGEXMATCH` uses the same regex compile/test helper as global and column regex filters.
- Static scan of changed utility files finds no `eval(`, `new Function`, or dynamic `import(`.
</must_haves>

<tasks>
  <task id="01.1" type="implementation">
    <title>Add shared advanced filter field constants</title>
    <read_first>
      - app/utils/entriesTableConstants.ts
      - app/composables/useEntriesTableColumns.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md
    </read_first>
    <files>
      - app/utils/entriesTableConstants.ts
    </files>
    <action>
      Add these named exports to `app/utils/entriesTableConstants.ts` near the existing table constants:

      ```ts
      /** 進階篩選可引用的欄位鍵 */
      export const ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const

      export const ADVANCED_FILTER_FIELD_LABELS: Record<(typeof ADVANCED_FILTER_FIELDS)[number], string> = {
        headword: '詞頭',
        dialect: '方言',
        phonetic: '粵拼',
        entryType: '類型',
        theme: '分類',
        definition: '釋義',
        register: '語域',
        status: '狀態'
      }
      ```

      Keep the existing exports unchanged. Do not add new sortable column keys.
    </action>
    <acceptance_criteria>
      - `app/utils/entriesTableConstants.ts` contains `export const ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const`.
      - `app/utils/entriesTableConstants.ts` contains `ADVANCED_FILTER_FIELD_LABELS` with labels `詞頭`, `方言`, `粵拼`, `類型`, `分類`, `釋義`, `語域`, `狀態`.
      - `app/utils/entriesTableConstants.ts` still contains `export const SORTABLE_COLUMN_KEYS`.
    </acceptance_criteria>
  </task>

  <task id="01.2" type="implementation">
    <title>Create typed regex helpers and validation messages</title>
    <read_first>
      - app/utils/entriesTableConstants.ts
      - app/utils/entryKey.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md
    </read_first>
    <files>
      - app/utils/entriesAdvancedFilter.ts
    </files>
    <action>
      Create `app/utils/entriesAdvancedFilter.ts` with type-only imports where needed and these exported regex constants/types/functions:

      - `export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200`
      - `export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000`
      - `export type AdvancedRegexErrorCode = 'empty_pattern' | 'pattern_too_long' | 'invalid_flags' | 'invalid_pattern' | 'unsafe_pattern'`
      - `export interface AdvancedFilterError { code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode; message: string; detail?: string }`
      - `export type RegexCompileResult = { ok: true; regex: RegExp } | { ok: false; error: AdvancedFilterError }`
      - `export function compileAdvancedRegex(pattern: string, flags = 'i'): RegexCompileResult`
      - `export function testAdvancedRegex(regex: RegExp, value: string): boolean`
      - `export function getAdvancedFilterErrorMessage(code: AdvancedRegexErrorCode | AdvancedFormulaErrorCode, detail?: string): string`

      Implement `compileAdvancedRegex` with this exact behavior:
      - Trim pattern before validation.
      - Empty pattern returns `empty_pattern` with `請輸入正則表達式。`.
      - Pattern longer than 200 returns `pattern_too_long` with `正則表達式太長，請縮短後再試。`.
      - Flags outside `/^[imu]*$/` return `invalid_flags` with `正則表達式旗標只支援 i、m、u。`.
      - Obvious nested quantifier patterns matching `/\([^)]*[+*][^)]*\)[+*{]/` return `unsafe_pattern` with `此正則表達式可能令瀏覽器變慢，請簡化重複條件。`.
      - `new RegExp(trimmed, flags)` runs inside try/catch; catch returns `invalid_pattern` with `正則表達式格式無效，請檢查括號、斜線或轉義符號。`.
      - Successful result returns `{ ok: true, regex }`.

      Implement `testAdvancedRegex` by setting `regex.lastIndex = 0` and testing `String(value ?? '').slice(0, ADVANCED_REGEX_MAX_INPUT_LENGTH)`.
    </action>
    <acceptance_criteria>
      - `app/utils/entriesAdvancedFilter.ts` contains `export const ADVANCED_REGEX_MAX_PATTERN_LENGTH = 200`.
      - `app/utils/entriesAdvancedFilter.ts` contains `export const ADVANCED_REGEX_MAX_INPUT_LENGTH = 2000`.
      - `app/utils/entriesAdvancedFilter.ts` contains `export function compileAdvancedRegex(pattern: string, flags = 'i')`.
      - `app/utils/entriesAdvancedFilter.ts` contains `new RegExp(trimmed, flags)` inside the regex compile function.
      - `app/utils/entriesAdvancedFilter.ts` contains `regex.lastIndex = 0`.
      - `app/utils/entriesAdvancedFilter.ts` contains the strings `正則表達式旗標只支援 i、m、u。`, `正則表達式太長，請縮短後再試。`, and `此正則表達式可能令瀏覽器變慢，請簡化重複條件。`.
    </acceptance_criteria>
  </task>

  <task id="01.3" type="implementation">
    <title>Implement Excel-style formula tokenizer and parser</title>
    <read_first>
      - app/utils/entriesAdvancedFilter.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md
    </read_first>
    <files>
      - app/utils/entriesAdvancedFilter.ts
    </files>
    <action>
      Extend `app/utils/entriesAdvancedFilter.ts` with formula-specific types and parser functions. Add these exported types and functions:

      - `export type AdvancedFilterFieldKey = (typeof ADVANCED_FILTER_FIELDS)[number]`
      - `export type RowFilterContext = Record<AdvancedFilterFieldKey, string>`
      - `export type AdvancedFormulaErrorCode = 'empty_formula' | 'unsupported_token' | 'unknown_field' | 'unknown_function' | 'wrong_argument_count' | 'non_boolean_result' | 'evaluation_error' | 'unexpected_end'`
      - `export type FormulaFunctionName = 'AND' | 'OR' | 'NOT' | 'LEN' | 'ISBLANK' | 'REGEXMATCH' | 'CONTAINS' | 'STARTSWITH' | 'ENDSWITH'`
      - `export type FormulaNode = { type: 'literal'; value: string | number | boolean } | { type: 'field'; key: AdvancedFilterFieldKey } | { type: 'call'; name: FormulaFunctionName; args: FormulaNode[] } | { type: 'comparison'; operator: '=' | '<>' | '>' | '>=' | '<' | '<='; left: FormulaNode; right: FormulaNode }`
      - `export type FormulaParseResult = { ok: true; ast: FormulaNode } | { ok: false; error: AdvancedFilterError }`
      - `export function parseAdvancedFormula(input: string): FormulaParseResult`

      Implement a hand-written tokenizer/parser with these exact supported tokens:
      - identifiers matching `/[A-Za-z_][A-Za-z0-9_]*/`.
      - double-quoted string literals with escaped `\"` and `\\` support.
      - number literals matching digits with optional decimal part.
      - booleans `TRUE` and `FALSE`, case-insensitive.
      - comparison operators `=`, `<>`, `>`, `>=`, `<`, `<=`.
      - parentheses and comma.

      Normalize by trimming input and removing one leading `=` before tokenization. Parse function names case-insensitively but store uppercase function names. Reject unknown identifiers that are neither supported public fields nor known function names. Validate argument counts:
      - `AND`: at least 1 argument.
      - `OR`: at least 1 argument.
      - `NOT`: exactly 1 argument.
      - `LEN`: exactly 1 argument.
      - `ISBLANK`: exactly 1 argument.
      - `REGEXMATCH`: 2 or 3 arguments.
      - `CONTAINS`: exactly 2 arguments.
      - `STARTSWITH`: exactly 2 arguments.
      - `ENDSWITH`: exactly 2 arguments.
    </action>
    <acceptance_criteria>
      - `app/utils/entriesAdvancedFilter.ts` contains `export function parseAdvancedFormula(input: string): FormulaParseResult`.
      - `app/utils/entriesAdvancedFilter.ts` contains all function-name literals: `AND`, `OR`, `NOT`, `LEN`, `ISBLANK`, `REGEXMATCH`, `CONTAINS`, `STARTSWITH`, `ENDSWITH`.
      - `app/utils/entriesAdvancedFilter.ts` contains all field-name literals: `headword`, `dialect`, `phonetic`, `entryType`, `theme`, `definition`, `register`, `status` through `ADVANCED_FILTER_FIELDS` import/use.
      - `app/utils/entriesAdvancedFilter.ts` contains `wrong_argument_count` and `unknown_function` handling.
      - `app/utils/entriesAdvancedFilter.ts` contains `trimmed.startsWith('=')` or equivalent one-leading-equals normalization.
    </acceptance_criteria>
  </task>

  <task id="01.4" type="implementation">
    <title>Implement whitelisted formula evaluation</title>
    <read_first>
      - app/utils/entriesAdvancedFilter.ts
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md
      - .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md
    </read_first>
    <files>
      - app/utils/entriesAdvancedFilter.ts
    </files>
    <action>
      Extend `app/utils/entriesAdvancedFilter.ts` with evaluation. Add:

      - `type FormulaValue = string | number | boolean`
      - `export type FormulaEvaluationResult = { ok: true; value: boolean } | { ok: false; error: AdvancedFilterError }`
      - `export function evaluateAdvancedFormula(input: string, context: RowFilterContext): FormulaEvaluationResult`
      - `export function evaluateAdvancedFormulaAst(ast: FormulaNode, context: RowFilterContext): FormulaEvaluationResult`
      - `export function buildSearchableRowText(context: RowFilterContext): string`

      Evaluation semantics:
      - Field nodes return `context[key] ?? ''`.
      - Comparisons support string equality/inequality for `=` and `<>`; numeric comparisons use `Number()` only when both operands are numeric strings/numbers, otherwise compare normalized lowercase strings lexicographically for `>`, `>=`, `<`, `<=`.
      - The root result must be `typeof value === 'boolean'`; otherwise return `non_boolean_result` with `篩選公式必須回傳 TRUE 或 FALSE。`.
      - `AND`, `OR`, `NOT` require boolean arguments and return `evaluation_error` if an argument is not boolean.
      - `LEN(value)` returns `String(value ?? '').length`.
      - `ISBLANK(value)` returns true when `String(value ?? '').trim()` is empty or equals `'-'` or `選擇分類` or `__none__`.
      - `REGEXMATCH(value, pattern[, flags])` calls `compileAdvancedRegex(String(pattern), flags ? String(flags) : 'i')` and `testAdvancedRegex`.
      - `CONTAINS`, `STARTSWITH`, and `ENDSWITH` compare lowercased string values.
      - Catch unexpected evaluation errors and return `evaluation_error` with `公式計算失敗，請檢查欄位和參數。`.

      `buildSearchableRowText` returns `ADVANCED_FILTER_FIELDS.map(key => context[key] || '').join(' ')`.
    </action>
    <acceptance_criteria>
      - `app/utils/entriesAdvancedFilter.ts` contains `export function evaluateAdvancedFormula(input: string, context: RowFilterContext): FormulaEvaluationResult`.
      - `app/utils/entriesAdvancedFilter.ts` contains `export function evaluateAdvancedFormulaAst(ast: FormulaNode, context: RowFilterContext): FormulaEvaluationResult`.
      - `app/utils/entriesAdvancedFilter.ts` contains `non_boolean_result` and the exact message `篩選公式必須回傳 TRUE 或 FALSE。`.
      - `app/utils/entriesAdvancedFilter.ts` contains `compileAdvancedRegex(String(pattern)` or equivalent in `REGEXMATCH` evaluation.
      - `app/utils/entriesAdvancedFilter.ts` contains `export function buildSearchableRowText(context: RowFilterContext): string`.
      - `grep -R "eval(\|new Function\|import(" app/utils/entriesAdvancedFilter.ts` exits non-zero.
    </acceptance_criteria>
  </task>
</tasks>

<verification>
- Run `npm run build` after all Phase 1 implementation plans complete.
- Run `grep -R "eval(\|new Function\|import(" app/utils/entriesAdvancedFilter.ts` and confirm it exits non-zero.
- Read `app/utils/entriesAdvancedFilter.ts` and verify every supported formula function is present exactly once in the whitelist/evaluator path.
- Read `app/utils/entriesTableConstants.ts` and verify `ADVANCED_FILTER_FIELDS` matches D-05 exactly.
</verification>

<success_criteria>
- Safe formula parsing/evaluation exists without arbitrary JavaScript execution.
- Regex validation/compilation is shared and typed.
- All validation messages introduced by this plan are Hong Kong Traditional Chinese.
- The utilities are pure and do not import or call entry mutation APIs.
</success_criteria>
