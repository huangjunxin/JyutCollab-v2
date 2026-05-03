# Phase 1: Safe Formula and Regex Filtering Foundation - Research

**Researched:** 2026-05-03 [VERIFIED: system currentDate]
**Domain:** Client-side entries-table advanced filtering, safe formula interpretation, and regex validation [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
**Confidence:** HIGH for codebase integration and locked scope; MEDIUM for regex ReDoS hardening limits in native JavaScript RegExp [VERIFIED: codebase read + CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Formula Language
- **D-01:** Implement a small Excel-style formula subset, not JavaScript-like expressions and not full Excel compatibility.
- **D-02:** The Phase 1 supported formula set should include boolean comparison operators, `AND`, `OR`, `NOT`, `LEN`, `ISBLANK`, `REGEXMATCH`, `CONTAINS`, `STARTSWITH`, and `ENDSWITH` unless research finds a strong reason to adjust exact names.
- **D-03:** Formula evaluation must use an explicit parser/interpreter and whitelist. Do not use `eval`, `new Function`, dynamic imports, or any arbitrary JavaScript execution.
- **D-04:** A formula must evaluate to boolean for filtering. Non-boolean results are treated as formula validation errors for the filter use case.

### Field Reference Model
- **D-05:** Use stable table column keys as the public formula/regex field names for v1: `headword`, `dialect`, `phonetic`, `entryType`, `theme`, `definition`, `register`, and `status`.
- **D-06:** Formula/regex evaluation should run against normalized display values derived from `EditableColumnDef.get(entry)` so user-visible table text and rule matching stay aligned.
- **D-07:** Planning may add a small adapter that exposes a row context by column key, but it must not mutate `Entry` objects or call column setters.
- **D-08:** The UI should document supported field names near the formula input so users do not need to infer keys from code.

### Regex Behavior
- **D-09:** Phase 1 regex support should be client-side on the currently loaded entries/group data, layered over the existing `/api/entries` response. Do not change the backend query API in this phase.
- **D-10:** Regex mode for global search should be a distinct advanced/search mode rather than changing normal search semantics by default.
- **D-11:** Single-column regex filters should evaluate against that column's normalized display value using the same row context as formulas.
- **D-12:** Invalid regex patterns should be caught before evaluation and reported as user-facing validation errors in Hong Kong Traditional Chinese.

### Entries Table Integration
- **D-13:** Add advanced formula/regex filtering as a derived client-side layer over `entries`, `aggregatedGroups`, and `lexemeGroups` returned by `useEntriesList`; do not replace `useEntriesList` as the API/data-fetching owner.
- **D-14:** Preserve existing server-backed filters and search query behavior. Existing plain search, dialect/status/theme/user filters, sorting, pagination, and group mode requests should continue to flow through `useEntriesList`.
- **D-15:** The derived layer must produce display rows/current entries compatible with existing selection, AI suggestion, editing, dirty-state, and row rendering flows.
- **D-16:** When no advanced formula/regex filter is active, the rendered table should be functionally identical to the current table.

### Error and Empty-State Behavior
- **D-17:** Invalid formulas or regex patterns should fail closed for the advanced rule only: do not apply that advanced filter, do not clear existing data, and do not crash or refetch the table.
- **D-18:** Error copy, helper text, and empty-state text introduced in this phase must use Hong Kong Traditional Chinese.
- **D-19:** If an advanced filter is valid but returns no matches, the table should use the existing empty-state pattern with wording that indicates the advanced filter found no matching entries.

### Claude's Discretion
- Exact parser implementation strategy, internal AST shape, token names, debounce timing, and helper file boundaries are left to research/planning, provided the safety and integration decisions above are preserved.
- Exact UI placement for the formula input and regex controls may be determined during UI planning, but it should stay near the existing search/filter controls unless a better entries-table pattern is found.

### Deferred Ideas (OUT OF SCOPE)
- Cell-level conditional formatting highlights — Phase 2.
- Validation rule UI and warning styling — Phase 2.
- Shareable view URL serialization/restoration — Phase 3.
- Performance hardening and full manual browser verification across all existing workflows — Phase 4.
- Backend account-synced saved views — v2 requirement.
- Formula/regex-driven bulk modification — v2 only, after preview and edit-history safeguards.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FORM-01 | User can enter an Excel-style formula that filters visible entries by evaluating each row to true or false. [VERIFIED: .planning/REQUIREMENTS.md] | Use a client-side parser/evaluator composable that returns boolean match results per row context. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| FORM-02 | User sees clear validation feedback when a formula has unsupported syntax, unsupported functions, or evaluation errors. [VERIFIED: .planning/REQUIREMENTS.md] | Return typed validation errors from tokenization, parsing, and evaluation before applying the derived filter. [ASSUMED] |
| FORM-03 | Formula evaluation only supports a documented whitelist of functions and operators and never executes arbitrary JavaScript. [VERIFIED: .planning/REQUIREMENTS.md] | Implement a hand-written tokenizer/parser/interpreter with function dispatch through an explicit map; forbid `eval`, `new Function`, dynamic imports, and arbitrary JavaScript execution. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| FORM-04 | User can reference supported entry fields in formulas using stable field names documented in the UI. [VERIFIED: .planning/REQUIREMENTS.md] | Expose only `headword`, `dialect`, `phonetic`, `entryType`, `theme`, `definition`, `register`, and `status` from `EditableColumnDef.key`. [VERIFIED: app/composables/useEntriesTableColumns.ts + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| REGX-01 | User can enable regex mode in global search to match searchable entry text fields. [VERIFIED: .planning/REQUIREMENTS.md] | Add a distinct advanced regex global search state separate from existing `searchQuery`; evaluate against concatenated/searchable row display values after API data arrives. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| REGX-02 | User can apply a regex filter to a single table column without affecting other column filters. [VERIFIED: .planning/REQUIREMENTS.md] | Maintain per-column regex filter state keyed by stable column key and evaluate against the row context value for that key. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| REGX-03 | User sees clear validation feedback when a regex pattern is invalid. [VERIFIED: .planning/REQUIREMENTS.md] | Compile user regex with `new RegExp(pattern, flags)` inside `try/catch` and return Hong Kong Traditional Chinese errors on failure. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] |
| REGX-04 | Regex matching works consistently for formula filtering, column filtering, conditional formatting, and validation rules. [VERIFIED: .planning/REQUIREMENTS.md] | Put regex compilation/matching in a shared pure utility used by formula `REGEXMATCH` and Phase 1 filters, with stable result types for later phases. [ASSUMED] |
</phase_requirements>

## Summary

Phase 1 should be implemented as a browser/client derived filtering layer over the existing entries-list owner, not as a backend API change. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] The existing `useEntriesList` composable owns `/api/entries` fetching, cache keys, server-backed search/filter/sort/page/group queries, and hydration into `entries`, `aggregatedGroups`, and `lexemeGroups`. [VERIFIED: app/composables/useEntriesList.ts] The entries page already derives `displayGroups`, `tableRows`, and `currentPageEntries` from those collections; these are the correct seam for advanced filters. [VERIFIED: app/pages/entries/index.vue]

The safest implementation is a small, explicit Excel-style formula language with a hand-written tokenizer, parser, AST evaluator, and whitelist function map. [ASSUMED] Microsoft documents that Excel formulas begin with `=` and can include functions, references, operators, and constants; Phase 1 should borrow that familiarity while intentionally avoiding full Excel compatibility. [CITED: support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173] The parser should accept a leading `=` as optional or recommended UI input, but normalize internally to an expression AST before evaluation. [ASSUMED]

Regex support should use native `RegExp` only through a shared compile function with input limits, flags allowlisting, `try/catch`, and state-safe execution. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] Native JavaScript regex can suffer catastrophic backtracking, and OWASP documents that vulnerable patterns can hang a web browser. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] Because Phase 1 is client-side and not a full performance-hardening phase, planning should include conservative pattern/length limits and clear validation errors, while leaving deeper ReDoS tooling or engine replacement out unless the user accepts dependency scope. [VERIFIED: .planning/ROADMAP.md + CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS]

**Primary recommendation:** Build `app/utils/entriesAdvancedFilter.ts` for pure formula/regex parsing/evaluation plus `app/composables/useEntriesAdvancedFilters.ts` for Vue state and derived collections, then integrate the resulting filtered `entries`, `displayGroups`, `tableRows`, and `currentPageEntries` into `app/pages/entries/index.vue` behind an inactive-by-default advanced filter UI. [VERIFIED: .planning/codebase/STRUCTURE.md + app/pages/entries/index.vue]

## Project Constraints (from CLAUDE.md)

- All new Chinese UI labels, validation messages, helper text, comments, and prompts must use Hong Kong Traditional Chinese. [VERIFIED: CLAUDE.md]
- The project uses Nuxt 4 with Vue 3 Composition API, @nuxt/ui, MongoDB/Mongoose, nuxt-auth-utils, Pinia, Zod, Cloudinary, OpenRouter, and opencc-js. [VERIFIED: CLAUDE.md]
- Entry-table logic should be extracted into focused composables rather than adding more responsibilities to `app/pages/entries/index.vue`. [VERIFIED: CLAUDE.md + .planning/codebase/CONVENTIONS.md]
- Existing entries-table workflows include inline editing, keyboard navigation, AI suggestions, column resizing, dirty-state tracking, batch selection, search, filters, and view modes. [VERIFIED: CLAUDE.md + app/pages/entries/index.vue]
- Use `id` string fields for entry identity and preserve `lexemeId` for cross-dialect grouping. [VERIFIED: CLAUDE.md]
- Do not log secrets, session cookies, passwords, MongoDB URIs, OpenRouter API keys, Cloudinary credentials, or uploaded file buffers. [VERIFIED: .planning/codebase/CONVENTIONS.md]
- Use `npm run build` as the minimum verification command because no lint/typecheck/test scripts are configured. [VERIFIED: .planning/codebase/CONVENTIONS.md + package.json]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Server-backed plain search, filters, sort, pagination, and grouping | API / Backend | Frontend composable | `/api/entries` remains the owner through `useEntriesList`; Phase 1 must not change backend query behavior. [VERIFIED: app/composables/useEntriesList.ts + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Formula parsing and evaluation for loaded rows | Browser / Client | Frontend composable | Phase 1 formula filtering is a client-side derived layer over loaded data. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Regex global and column filtering | Browser / Client | Frontend composable | Regex mode must run client-side over current `/api/entries` results and must not change backend search semantics. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Stable row field context | Browser / Client | Existing table columns | Field references should be generated from `EditableColumnDef.get(entry)` and public stable column keys. [VERIFIED: app/composables/useEntriesTableColumns.ts + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| UI validation feedback and empty states | Browser / Client | Nuxt UI components | Errors and helper text are entries-page UI concerns and must use Hong Kong Traditional Chinese. [VERIFIED: CLAUDE.md + app/pages/entries/index.vue] |
| Data mutation, save, submit, delete, history | API / Backend | Existing entries page | Phase 1 rules are read-only inspection overlays and must not call setters or mutation APIs. [VERIFIED: .planning/REQUIREMENTS.md + app/pages/entries/index.vue] |

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Nuxt | installed `^4.3.1`; npm current `4.4.4`, modified 2026-04-29 [VERIFIED: package.json + npm registry] | Existing full-stack Vue framework and page/composable runtime. [VERIFIED: CLAUDE.md + package.json] | Use existing Nuxt project structure; do not introduce another app shell. [VERIFIED: .planning/codebase/STRUCTURE.md] |
| Vue | installed `^3.5.28`; npm current `3.5.33`, modified 2026-04-22 [VERIFIED: package.json + npm registry] | Reactive `ref`, `reactive`, `computed`, and `watch` state for filter UI and derived rows. [VERIFIED: app/pages/entries/index.vue + CITED: github.com/vuejs/vue examples via Context7] | Existing entries page and composables already use Composition API patterns. [VERIFIED: app/pages/entries/index.vue] |
| TypeScript | installed transitively `5.9.3` in stack map [VERIFIED: .planning/codebase/STACK.md] | Typed AST, row context, result objects, and error codes. [ASSUMED] | `nuxt.config.ts` enables strict TypeScript per stack map. [VERIFIED: .planning/codebase/STACK.md] |
| Native `RegExp` | JavaScript built-in [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] | Compile and execute user regex in advanced regex mode and formula `REGEXMATCH`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Available without a new dependency; must be constrained because of invalid syntax and ReDoS risks. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] |
| @nuxt/ui | installed `^4.4.0`; npm current `4.7.1`, modified 2026-04-28 [VERIFIED: package.json + npm registry] | Advanced filter UI controls near existing search/filter controls. [VERIFIED: app/pages/entries/index.vue] | Existing entries page already uses `UInput`, `USelectMenu`, `UButton`, `UTooltip`, `UAlert`, `UPagination`, and `UModal`. [VERIFIED: app/pages/entries/index.vue] |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| Zod | installed `^4.3.6`; npm current `4.4.2`, modified 2026-05-01 [VERIFIED: package.json + npm registry] | Optional schema validation if filter state later becomes serializable or URL-restored. [ASSUMED] | Do not require it for Phase 1 pure in-memory parser validation unless planner wants consistent typed validation style. [ASSUMED] |
| `safe-regex2` | npm current `5.1.1`, modified 2026-04-19 [VERIFIED: npm registry] | Optional heuristic ReDoS detector for user regex patterns. [ASSUMED] | Use only if planning chooses a dependency to reject obviously unsafe patterns; native limits are still needed because static ReDoS detection is heuristic. [ASSUMED] |
| `re2-wasm` | npm current `1.0.2`, modified 2023-08-01 [VERIFIED: npm registry] | Optional non-backtracking regex engine alternative. [ASSUMED] | Do not use in Phase 1 unless dependency size/API compatibility is explicitly accepted; this phase can start with constrained native `RegExp`. [ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written formula parser | `hot-formula-parser`, `hyperformula`, or spreadsheet engine packages [ASSUMED] | Full spreadsheet engines are over-scoped for the locked small subset and may bring unsupported functions or unnecessary grid semantics. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED] |
| Native `RegExp` | `re2-wasm` [VERIFIED: npm registry] | Safer execution model may reduce ReDoS risk, but it adds dependency and browser/WASM integration complexity outside Phase 1’s foundation focus. [ASSUMED] |
| Existing `searchQuery` regex toggle | Separate `advancedRegexSearch` state [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Separate state preserves existing server-backed search semantics when advanced filters are disabled. [VERIFIED: app/composables/useEntriesList.ts + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |

**Installation:**

```bash
# No required new runtime dependencies for the recommended Phase 1 implementation. [VERIFIED: package.json]
# Optional only if accepted during planning:
npm install safe-regex2
```

**Version verification:** package versions above were checked with `npm view [package] version time.modified` on 2026-05-03. [VERIFIED: npm registry]

## Implementation Approach

1. Create pure types/utilities in `app/utils/entriesAdvancedFilter.ts` or a small `app/utils/entriesAdvancedFilters/` folder. [VERIFIED: .planning/codebase/STRUCTURE.md]
   - Define `AdvancedFilterFieldKey = 'headword' | 'dialect' | 'phonetic' | 'entryType' | 'theme' | 'definition' | 'register' | 'status'`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
   - Define `RowFilterContext = Record<AdvancedFilterFieldKey, string>` where every value is normalized to a string. [ASSUMED]
   - Define discriminated results such as `ParseResult`, `EvaluationResult`, `RegexCompileResult`, and `AdvancedFilterResult`. [ASSUMED]

2. Create `app/composables/useEntriesAdvancedFilters.ts` to own UI state and derived filtering. [VERIFIED: .planning/codebase/STRUCTURE.md]
   - Inputs should include `entries`, `aggregatedGroups`, `lexemeGroups`, `viewMode`, `editableColumns`, and a row-context builder callback. [VERIFIED: app/pages/entries/index.vue + app/composables/useEntriesTableColumns.ts]
   - Outputs should include `advancedFilterState`, `advancedFilterErrors`, `hasActiveAdvancedFilters`, `filteredEntries`, `filteredAggregatedGroups`, `filteredLexemeGroups`, and `advancedEmptyStateActive`. [ASSUMED]
   - Keep this composable read-only: it should never call `EditableColumnDef.set`, entry save/delete endpoints, or localStorage mutation helpers. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]

3. Integrate the composable in `app/pages/entries/index.vue` after `editableColumns` and `useEntriesTableEdit` are available. [VERIFIED: app/pages/entries/index.vue]
   - Replace direct uses of `entries.value` in `displayGroups`, `tableRows`, `currentPageEntries`, `isEmpty`, and keyboard row-count calculations with filtered equivalents. [VERIFIED: app/pages/entries/index.vue]
   - Preserve direct mutation of original `Entry` objects by returning filtered arrays that contain the same entry object references, not cloned entries. [ASSUMED]
   - When advanced filters are inactive, return original arrays by reference to reduce regression risk. [ASSUMED]

4. Add a compact advanced-filter UI near the existing search/filter controls. [VERIFIED: app/pages/entries/index.vue + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
   - Recommended controls: an “進階篩選” disclosure/panel, formula input, formula enable/clear button, regex mode toggle for advanced global regex search, global regex input, one optional column regex selector/input pair, and a field-name helper line. [ASSUMED]
   - All new copy must be Hong Kong Traditional Chinese. [VERIFIED: CLAUDE.md]

5. Preserve no-advanced-filter behavior as a gate. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
   - If formula text is blank, global regex is disabled/blank, and no column regex filters exist, `tableRows` and `currentPageEntries` should be identical to current behavior. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + app/pages/entries/index.vue]

## Formula Parser/Evaluator Design

### Formula Surface

| Feature | Supported in Phase 1 | Notes |
|---------|----------------------|-------|
| Leading `=` | Yes | Excel formulas begin with `=` according to Microsoft; Phase 1 should accept it and strip it before parsing. [CITED: support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173] |
| Field references | Yes | Only stable column keys: `headword`, `dialect`, `phonetic`, `entryType`, `theme`, `definition`, `register`, `status`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| String literals | Yes | Needed for `CONTAINS(definition, "...')`, comparisons, and regex patterns. [ASSUMED] |
| Numeric literals | Yes | Needed for `LEN(headword) > 2`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Boolean literals | Yes | Useful for explicit comparisons and future reuse. [ASSUMED] |
| Comparisons | Yes | Support `=`, `<>`, `>`, `>=`, `<`, `<=`; internally use a distinct equality token to avoid assignment semantics. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED] |
| Functions | Yes | Whitelist `AND`, `OR`, `NOT`, `LEN`, `ISBLANK`, `REGEXMATCH`, `CONTAINS`, `STARTSWITH`, `ENDSWITH`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Arithmetic | No | Not required by locked Phase 1 supported set except numeric output from `LEN`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Cell/range references | No | Phase 1 uses named fields, not Excel A1 cells or spreadsheet ranges. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |

### Parser Pipeline

1. **Normalize input:** trim whitespace, remove one leading `=` if present, reject empty formula. [ASSUMED]
2. **Tokenize:** produce tokens for identifiers, string literals, number literals, booleans, commas, parentheses, and comparison operators. [ASSUMED]
3. **Parse expression:** use recursive descent with comparison precedence and function calls. [ASSUMED]
4. **Validate AST:** reject unknown identifiers, unknown functions, wrong argument counts, non-boolean root expression, and disallowed tokens. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED]
5. **Evaluate per row:** resolve field identifiers only from `RowFilterContext`, dispatch functions through a constant whitelist map, coerce display values deliberately, and return a boolean or typed evaluation error. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED]

### Recommended AST Shape

```typescript
// Implementation sketch; names can change during planning. [ASSUMED]
type FormulaNode =
  | { type: 'literal'; value: string | number | boolean }
  | { type: 'field'; key: AdvancedFilterFieldKey }
  | { type: 'call'; name: FormulaFunctionName; args: FormulaNode[] }
  | { type: 'comparison'; operator: '=' | '<>' | '>' | '>=' | '<' | '<='; left: FormulaNode; right: FormulaNode }
```

### Function Semantics

| Function | Signature | Return | Semantics |
|----------|-----------|--------|-----------|
| `AND` | `AND(boolean, ...)` | boolean | True only if all arguments are true. [ASSUMED] |
| `OR` | `OR(boolean, ...)` | boolean | True if any argument is true. [ASSUMED] |
| `NOT` | `NOT(boolean)` | boolean | Logical negation. [ASSUMED] |
| `LEN` | `LEN(value)` | number | String length of normalized value. [ASSUMED] |
| `ISBLANK` | `ISBLANK(value)` | boolean | True when trimmed normalized value is empty or display placeholder is treated as blank. [ASSUMED] |
| `REGEXMATCH` | `REGEXMATCH(value, pattern[, flags])` | boolean | Reuse shared regex compiler and matcher. [VERIFIED: .planning/REQUIREMENTS.md + CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] |
| `CONTAINS` | `CONTAINS(value, needle)` | boolean | Case-insensitive substring search by default is recommended for user expectations. [ASSUMED] |
| `STARTSWITH` | `STARTSWITH(value, prefix)` | boolean | Case-insensitive prefix check by default is recommended. [ASSUMED] |
| `ENDSWITH` | `ENDSWITH(value, suffix)` | boolean | Case-insensitive suffix check by default is recommended. [ASSUMED] |

### Formula Examples for Planner/UI

```text
=AND(status = "草稿", LEN(definition) = 0)
=CONTAINS(headword, "□")
=REGEXMATCH(phonetic, "^gw")
=OR(register = "粗俗", register = "口語")
=NOT(ISBLANK(theme))
```

These examples use Hong Kong Traditional Chinese UI/domain values where Chinese appears. [VERIFIED: CLAUDE.md + app/utils/entriesTableConstants.ts]

### Formula Validation Messages

Use typed error codes mapped to HK Traditional Chinese strings. [VERIFIED: CLAUDE.md + ASSUMED]

| Error Code | Suggested User Message |
|------------|------------------------|
| `empty_formula` | `請輸入公式。` [ASSUMED] |
| `unsupported_token` | `公式包含未支援的符號。` [ASSUMED] |
| `unknown_field` | `未知欄位：{field}。請使用下方列出的欄位名稱。` [ASSUMED] |
| `unknown_function` | `未支援的函數：{name}。` [ASSUMED] |
| `wrong_argument_count` | `{name} 的參數數量不正確。` [ASSUMED] |
| `non_boolean_result` | `篩選公式必須回傳 TRUE 或 FALSE。` [ASSUMED] |
| `evaluation_error` | `公式計算失敗，請檢查欄位和參數。` [ASSUMED] |

## Regex Design

### Compile Contract

Use a single helper for all regex entry points. [ASSUMED]

```typescript
// Implementation sketch; exact names can change. [ASSUMED]
interface RegexRuleInput {
  pattern: string
  flags?: string
  maxPatternLength?: number
}

interface RegexRuleCompiled {
  ok: true
  regex: RegExp
}

interface RegexRuleError {
  ok: false
  code: 'empty_pattern' | 'pattern_too_long' | 'invalid_flags' | 'invalid_pattern' | 'unsafe_pattern'
  message: string
}
```

MDN documents `new RegExp(pattern, flags)` for dynamic regex creation and recommends `try/catch` to handle invalid patterns or flags. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] MDN also documents that `g` and `y` regexes use `lastIndex`, which can affect repeated tests when a regex object is reused. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] Therefore, do not allow `g` or `y` flags for Phase 1 filters, or reset `lastIndex = 0` before every test if they are allowed. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + ASSUMED]

### Recommended Constraints

| Constraint | Recommendation | Reason |
|------------|----------------|--------|
| Pattern length | Cap at 200 characters initially. [ASSUMED] | Reduces accidental expensive patterns while remaining enough for table filters. [ASSUMED] |
| Input length per cell | Cap tested display string to a reasonable length such as 2,000 characters. [ASSUMED] | OWASP documents browser hangs from evil regex; limiting input reduces worst-case work. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS + ASSUMED] |
| Flags | Allow `i`, `m`, `u` only by default. [ASSUMED] | Avoid `g`/`y` statefulness and unnecessary advanced flags. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + ASSUMED] |
| Empty pattern | Treat as inactive rather than matching everything. [ASSUMED] | Prevents confusing table changes. [ASSUMED] |
| Unsafe patterns | Reject obvious nested quantifier patterns if implementing a heuristic; otherwise document ReDoS risk and rely on length limits. [ASSUMED] | OWASP identifies repeated groups, nested repetition, and overlapping alternation as risky structures. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] |

### Regex Entry Points

| Entry Point | Data Source | Match Target |
|-------------|-------------|--------------|
| Global advanced regex search | current loaded row contexts [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Concatenate public display values from all supported fields with separators. [ASSUMED] |
| Single-column regex filter | current loaded row contexts [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | `rowContext[columnKey]`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Formula `REGEXMATCH` | formula evaluator [VERIFIED: .planning/REQUIREMENTS.md] | First argument coerced to string. [ASSUMED] |
| Future formatting/validation | shared utility [VERIFIED: .planning/REQUIREMENTS.md] | Same compiled regex helper to satisfy consistency requirement. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED] |

### Regex Validation Messages

| Error Code | Suggested User Message |
|------------|------------------------|
| `invalid_pattern` | `正則表達式格式無效，請檢查括號、斜線或轉義符號。` [ASSUMED] |
| `invalid_flags` | `正則表達式旗標只支援 i、m、u。` [ASSUMED] |
| `pattern_too_long` | `正則表達式太長，請縮短後再試。` [ASSUMED] |
| `unsafe_pattern` | `此正則表達式可能令瀏覽器變慢，請簡化重複條件。` [ASSUMED] |

## Entries Table Integration

### Current Integration Points

| Existing Item | Finding | Phase 1 Use |
|---------------|---------|-------------|
| `useEntriesList` | Owns `entries`, `aggregatedGroups`, `lexemeGroups`, loading, pagination, current page, fetch, search, sort, cache key, and `/api/entries` query parameters. [VERIFIED: app/composables/useEntriesList.ts] | Do not modify query semantics; consume its outputs. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| `EditableColumnDef` | Each column has `key`, `label`, `type`, `get`, `set`, and options. [VERIFIED: app/composables/useEntriesTableColumns.ts] | Use `key` and `get(entry)` for row context; never call `set`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| `useEntriesTableEdit.getCellDisplay` | Converts raw column values into display strings for theme, dialect, status, select labels, and fallback placeholders. [VERIFIED: app/composables/useEntriesTableEdit.ts] | Prefer a row-context builder that mirrors this display behavior or calls it where safe. [ASSUMED] |
| `displayGroups` | Combines new unsaved entries with server groups for aggregated/lexeme modes. [VERIFIED: app/pages/entries/index.vue] | Filter group entries while preserving group headers for groups with at least one matching entry. [ASSUMED] |
| `tableRows` | Drives rendering and includes group rows plus expanded entry rows. [VERIFIED: app/pages/entries/index.vue] | Build from filtered groups/entries. [ASSUMED] |
| `currentPageEntries` | Feeds selection, AI suggestions, dirty-state checks, save-all, and local draft persistence. [VERIFIED: app/pages/entries/index.vue] | Must use filtered entries for visible selection but avoid losing dirty entries from localStorage persistence. [VERIFIED: app/pages/entries/index.vue + ASSUMED] |

### Critical Integration Warning: localStorage Draft Watch

The page watches raw `entries`, `aggregatedGroups`, and `lexemeGroups` to collect dirty/new entries and save them to localStorage. [VERIFIED: app/pages/entries/index.vue] Do not change this watch to filtered collections, or dirty entries hidden by advanced filters may stop being persisted. [ASSUMED] Selection and visible counts can use filtered collections, but local draft persistence must continue scanning the source collections. [VERIFIED: app/pages/entries/index.vue + ASSUMED]

### Filtering Grouped Views

For aggregated/lexeme view, filter group entries by row match, then include a group row only if at least one entry remains. [ASSUMED] Preserve the group object shape `{ headwordDisplay, headwordNormalized, entries }` because group rendering and expansion use those fields. [VERIFIED: app/pages/entries/index.vue] If a group is expanded, only matched entries should render under it. [ASSUMED]

### Pagination Semantics

Existing `pagination.total` is server-backed and reflects `/api/entries` total, not client advanced-filter result count. [VERIFIED: app/composables/useEntriesList.ts + app/pages/entries/index.vue] Phase 1 has two viable UI options: keep server pagination controls unchanged and add an “進階篩選顯示 X 項” indicator, or adjust only visible range text when advanced filters are active. [ASSUMED] Do not mutate `pagination.total` inside the advanced filter layer because `UPagination` drives server page changes through `currentPage` and `fetchEntries`. [VERIFIED: app/pages/entries/index.vue + ASSUMED]

### Keyboard Navigation Warning

`handleTableKeydown` currently uses `entries.value.length` and `entries.value[rowIndex]` for rows, even though `tableRows` can include group rows in grouped modes. [VERIFIED: app/pages/entries/index.vue] When integrating advanced filters, planner should update keyboard navigation to use filtered entry rows or `tableRows.value.filter(r => r.type === 'entry')` consistently, otherwise focus indices may target hidden rows. [VERIFIED: app/pages/entries/index.vue + ASSUMED]

### Row Context Builder

Recommended row context algorithm: [ASSUMED]

1. Iterate over `editableColumns.value`. [VERIFIED: app/composables/useEntriesTableColumns.ts]
2. Skip any column key not in the locked public field list. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
3. For each field, obtain display text using `getCellDisplay(entry, col)` or a helper with equivalent logic. [VERIFIED: app/composables/useEntriesTableEdit.ts + ASSUMED]
4. Normalize placeholders: convert `'-'` and `選擇分類` to `''` for `ISBLANK`, but keep user-visible strings for plain comparisons only if planner deliberately chooses that behavior. [ASSUMED]
5. Return a frozen or readonly object to make mutation impossible by convention. [ASSUMED]

## UI/UX Notes

- Place controls near the existing search/filter panel because the context decisions recommend staying near existing search/filter controls. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
- Use an opt-in advanced mode/disclosure so default plain search behavior remains unchanged. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
- Display supported fields inline, for example: `可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
- Suggested label for formula input: `公式篩選`. [ASSUMED]
- Suggested formula placeholder: `例如：=AND(status = "草稿", ISBLANK(definition))`. [ASSUMED]
- Suggested global regex label: `正則搜尋`. [ASSUMED]
- Suggested column regex label: `欄位正則篩選`. [ASSUMED]
- Suggested inactive helper: `進階篩選只影響目前已載入的詞條，不會修改資料。` [ASSUMED]
- Suggested no-match empty-state text: `進階篩選沒有找到匹配的詞條。請調整公式或正則條件。` [ASSUMED]
- Use Nuxt UI components already present in the file (`UInput`, `USelectMenu`, `UButton`, `UTooltip`, `UAlert`) for visual consistency. [VERIFIED: app/pages/entries/index.vue]
- Avoid adding browser `alert()` for validation feedback; project conventions recommend Nuxt UI toast/modal patterns over more browser dialogs in new UI. [VERIFIED: .planning/codebase/CONVENTIONS.md]

## Security Threat Model Inputs

| Threat | STRIDE | Applies | Standard Mitigation |
|--------|--------|---------|---------------------|
| Arbitrary code execution through formula input | Elevation of Privilege / Tampering | Yes [VERIFIED: .planning/REQUIREMENTS.md] | Hand-written parser/interpreter, whitelist functions, no `eval`, no `new Function`, no dynamic imports, no arbitrary JS execution. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Data mutation through formulas/rules | Tampering | Yes [VERIFIED: .planning/REQUIREMENTS.md] | Advanced filter utilities accept readonly row context strings and never receive mutable `Entry` setters or mutation callbacks. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED] |
| Regex denial of service / browser freeze | Denial of Service | Yes [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] | Pattern length limits, input length limits, flags allowlist, optional unsafe-pattern heuristic, debounce evaluation, and clear validation errors. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS + ASSUMED] |
| Regex statefulness causing inconsistent matches | Tampering / Reliability | Yes [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] | Disallow `g`/`y` flags or reset `lastIndex` before every `.test()`. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + ASSUMED] |
| User confusion causing accidental server refetch behavior changes | Reliability | Yes [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Keep advanced filters separate from `searchQuery` and do not include advanced state in `useEntriesList` cache/query keys. [VERIFIED: app/composables/useEntriesList.ts + ASSUMED] |
| Leaking secrets via logs | Information Disclosure | Low for this phase [ASSUMED] | Do not log raw formula/regex contents if they may include sensitive text; do not log environment values. [VERIFIED: .planning/codebase/CONVENTIONS.md + ASSUMED] |

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No direct change [ASSUMED] | Existing route auth remains unchanged. [VERIFIED: CLAUDE.md] |
| V3 Session Management | No direct change [ASSUMED] | Existing `nuxt-auth-utils` sessions remain unchanged. [VERIFIED: CLAUDE.md] |
| V4 Access Control | Indirectly yes [ASSUMED] | Read-only filters must not bypass existing mutation permission checks. [VERIFIED: CLAUDE.md + .planning/REQUIREMENTS.md] |
| V5 Input Validation | Yes [VERIFIED: .planning/REQUIREMENTS.md] | Formula tokenizer/parser validation and regex compile validation. [VERIFIED: .planning/REQUIREMENTS.md + CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] |
| V6 Cryptography | No [ASSUMED] | No crypto changes. [ASSUMED] |

## Verification Strategy

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`, so the full Validation Architecture section is omitted. [VERIFIED: .planning/config.json]

### Existing Verification Constraints

- No test framework, test config, or app test files were detected outside `node_modules`. [VERIFIED: find command + .planning/codebase/STACK.md]
- `package.json` defines `build`, `dev`, `generate`, `preview`, and `postinstall`; it does not define `lint`, `typecheck`, or `test`. [VERIFIED: package.json]
- Minimum automated verification is `npm run build`. [VERIFIED: .planning/codebase/CONVENTIONS.md]

### Recommended Planner Verification Tasks

| Requirement | Verification |
|-------------|--------------|
| FORM-01 | Add pure parser/evaluator examples or lightweight executable checks if a test framework is introduced; manually verify formulas filter rows in flat and grouped views. [ASSUMED] |
| FORM-02 | Manually test unknown field, unknown function, missing parenthesis, wrong argument count, and non-boolean root formula with HK Traditional error messages. [ASSUMED] |
| FORM-03 | Static scan changed files for forbidden `eval`, `new Function`, dynamic `import()` in formula/regex code, and function dispatch outside whitelist. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED] |
| FORM-04 | Verify UI lists exactly the supported field names and parser rejects any other identifier. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| REGX-01 | Verify plain search still refetches through `useEntriesList`; advanced regex global search filters only loaded results and does not alter `searchQuery` semantics. [VERIFIED: app/composables/useEntriesList.ts + ASSUMED] |
| REGX-02 | Verify column regex filters only the selected column’s row-context value and can be cleared independently. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED] |
| REGX-03 | Verify invalid regex such as `(` reports a HK Traditional error and leaves current table data visible. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| REGX-04 | Verify formula `REGEXMATCH`, global regex, and column regex call the same shared compile/match helper. [ASSUMED] |
| Regression | Verify inactive advanced filters keep existing table behavior, including search, filters, pagination, selection, inline edit, dirty state, AI suggestions, flat/aggregated/lexeme modes, and local draft persistence. [VERIFIED: CLAUDE.md + app/pages/entries/index.vue] |

### Build Command

```bash
npm run build
```

This is the required minimum verification command after implementation. [VERIFIED: .planning/codebase/CONVENTIONS.md + package.json]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Nuxt build/dev and any parser utility checks | Yes [VERIFIED: command -v node] | v24.14.1 [VERIFIED: node --version] | README documents Node.js 18+ as sufficient. [VERIFIED: .planning/codebase/STACK.md] |
| npm | Dependency install and build scripts | Yes [VERIFIED: command -v npm] | 11.11.0 [VERIFIED: npm --version] | None needed. [ASSUMED] |
| npx | Context7 documentation lookup and optional one-off tooling | Yes [VERIFIED: command -v npx] | 11.11.0 [VERIFIED: npx --version] | Use npm scripts directly if unavailable. [ASSUMED] |
| MongoDB / external APIs | Existing entries table data when running full app | Unknown in this session [ASSUMED] | — | Phase 1 implementation and build do not require live DB if no browser verification is performed. [ASSUMED] |

**Missing dependencies with no fallback:** None for code implementation and build. [ASSUMED]

**Missing dependencies with fallback:** Live database/API availability is unknown; planner can still implement and run `npm run build`, then defer full browser data verification if local `.env` services are unavailable. [ASSUMED]

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Advanced filter accidentally changes existing server search behavior | Violates D-14 and regressions in plain table workflows. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Keep advanced filter state outside `useEntriesList` query/cache keys and return original arrays when inactive. [VERIFIED: app/composables/useEntriesList.ts + ASSUMED] |
| Formula parser grows into full Excel compatibility | Scope creep and security surface expansion. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Support only the locked subset and reject unsupported tokens/functions with clear errors. [VERIFIED: .planning/REQUIREMENTS.md] |
| Regex causes browser freeze | Denial-of-service and poor UX. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] | Limit pattern/input length, disallow stateful flags, optionally reject obvious evil regex structures, and debounce evaluation. [ASSUMED] |
| Filtering cloned entries breaks editing and dirty-state flows | Saves/selection/AI may target copies instead of source entries. [VERIFIED: app/pages/entries/index.vue + ASSUMED] | Filter arrays should contain original `Entry` object references. [ASSUMED] |
| Hiding dirty rows breaks draft persistence | Unsaved changes might not be saved to localStorage. [VERIFIED: app/pages/entries/index.vue + ASSUMED] | Keep localStorage watch on source collections rather than filtered collections. [VERIFIED: app/pages/entries/index.vue + ASSUMED] |
| Group view filtering leaves empty group headers | Confusing UI and inaccurate row count. [ASSUMED] | Filter group entries first, then remove groups with zero matching entries. [ASSUMED] |
| Keyboard focus indexes target hidden rows after filtering | Keyboard navigation/editing regressions. [VERIFIED: app/pages/entries/index.vue + ASSUMED] | Rebase keyboard navigation on filtered visible entry rows/table rows. [ASSUMED] |
| Error messages use non-HK Chinese wording | Violates project text standard. [VERIFIED: CLAUDE.md] | Review all new Chinese strings against Hong Kong Traditional Chinese before build. [VERIFIED: CLAUDE.md + ASSUMED] |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Arbitrary expression execution | Do not evaluate formulas as JavaScript with `eval`, `new Function`, dynamic imports, or runtime code generation. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Explicit parser/interpreter and whitelist function map. [VERIFIED: .planning/REQUIREMENTS.md] | Avoids arbitrary code execution and keeps formula semantics inspectable. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED] |
| Backend regex search for Phase 1 | Do not extend `/api/entries` query API for regex. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Client-side derived regex filtering over loaded data. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Preserves existing server-backed search/filter behavior. [VERIFIED: app/composables/useEntriesList.ts] |
| Column field discovery | Do not infer fields from arbitrary `Entry` object paths. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | `EditableColumnDef.key` and `EditableColumnDef.get(entry)`. [VERIFIED: app/composables/useEntriesTableColumns.ts] | Keeps filtering aligned with table-visible values. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] |
| Error display | Do not add more browser `alert()` validation flows. [VERIFIED: .planning/codebase/CONVENTIONS.md] | Inline Nuxt UI alert/help text near controls. [ASSUMED] | Existing conventions discourage expanding browser dialogs. [VERIFIED: .planning/codebase/CONVENTIONS.md] |
| Full spreadsheet engine | Do not replace the entries table or introduce spreadsheet grid semantics. [VERIFIED: .planning/REQUIREMENTS.md] | Small formula subset utility. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Avoids regressions in editing, AI, grouping, and review workflows. [VERIFIED: .planning/REQUIREMENTS.md] |

## Common Pitfalls

### Pitfall 1: Treating Advanced Regex as Normal Search

**What goes wrong:** The existing `searchQuery` begins carrying regex semantics and backend queries change. [ASSUMED]
**Why it happens:** The current search input is already wired to `useEntriesList.handleSearch()` and `/api/entries`. [VERIFIED: app/pages/entries/index.vue + app/composables/useEntriesList.ts]
**How to avoid:** Use separate advanced regex state and derived filtering after `useEntriesList` returns data. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
**Warning signs:** `advancedRegex` appears in `fetchFromAPI()` query object or `cacheKey`. [VERIFIED: app/composables/useEntriesList.ts + ASSUMED]

### Pitfall 2: Using Display Placeholders as Data

**What goes wrong:** `ISBLANK(theme)` may return false because `getCellDisplay()` returns `選擇分類`. [VERIFIED: app/composables/useEntriesTableEdit.ts]
**Why it happens:** Table display helpers return placeholder labels for blank theme/select values. [VERIFIED: app/composables/useEntriesTableEdit.ts]
**How to avoid:** Row context should retain display value and blank-normalized value or define `ISBLANK` against trimmed raw/placeholder-normalized values. [ASSUMED]
**Warning signs:** Blank theme cells fail to match `ISBLANK(theme)`. [ASSUMED]

### Pitfall 3: Reusing Global Regex Objects

**What goes wrong:** Regex `.test()` gives inconsistent results across rows. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp]
**Why it happens:** `g` and `y` flags use `lastIndex` state. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp]
**How to avoid:** Disallow `g` and `y`, or reset `lastIndex = 0` before every match. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + ASSUMED]
**Warning signs:** Same row alternates between matched and unmatched without input changes. [ASSUMED]

### Pitfall 4: Filtering Copies Instead of Source Entries

**What goes wrong:** Editing a filtered row does not persist correctly or dirty state appears inconsistent. [ASSUMED]
**Why it happens:** The entries page mutates `Entry` objects in place for editing and saving. [VERIFIED: app/pages/entries/index.vue]
**How to avoid:** Derived filter arrays should retain source `Entry` object references. [ASSUMED]
**Warning signs:** `filteredEntries` maps entries with `{ ...entry }` before rendering. [ASSUMED]

### Pitfall 5: Non-Boolean Formula Result Treated as Truthy

**What goes wrong:** `LEN(headword)` filters rows with nonzero length even though D-04 requires boolean result. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
**Why it happens:** JavaScript truthiness leaks into formula evaluation. [ASSUMED]
**How to avoid:** Evaluator root must check `typeof result === 'boolean'`; otherwise return `non_boolean_result`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED]
**Warning signs:** Numeric/string formula roots are accepted. [ASSUMED]

## Code Examples

### Safe Regex Compile/Match Pattern

```typescript
// Source: MDN RegExp constructor and stateful flag caveats. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp]
const ALLOWED_REGEX_FLAGS = new Set(['i', 'm', 'u'])

export function compileAdvancedRegex(pattern: string, flags = 'i') {
  const trimmed = pattern.trim()
  if (!trimmed) return { ok: false as const, code: 'empty_pattern' }
  if (trimmed.length > 200) return { ok: false as const, code: 'pattern_too_long' }
  if ([...flags].some(flag => !ALLOWED_REGEX_FLAGS.has(flag))) {
    return { ok: false as const, code: 'invalid_flags' }
  }
  try {
    return { ok: true as const, regex: new RegExp(trimmed, flags) }
  } catch {
    return { ok: false as const, code: 'invalid_pattern' }
  }
}

export function testAdvancedRegex(regex: RegExp, value: string) {
  regex.lastIndex = 0
  return regex.test(value.slice(0, 2000))
}
```

### Row Context Builder Pattern

```typescript
// Source: EditableColumnDef.get contract and entries table display helper. [VERIFIED: app/composables/useEntriesTableColumns.ts + app/composables/useEntriesTableEdit.ts]
const ADVANCED_FILTER_FIELDS = ['headword', 'dialect', 'phonetic', 'entryType', 'theme', 'definition', 'register', 'status'] as const

type AdvancedFilterFieldKey = typeof ADVANCED_FILTER_FIELDS[number]
type RowFilterContext = Record<AdvancedFilterFieldKey, string>

function buildRowFilterContext(entry: Entry, columns: EditableColumnDef[], getCellDisplay: (entry: Entry, col: EditableColumnDef) => string): RowFilterContext {
  const context = Object.fromEntries(ADVANCED_FILTER_FIELDS.map(key => [key, ''])) as RowFilterContext
  for (const col of columns) {
    if (!ADVANCED_FILTER_FIELDS.includes(col.key as AdvancedFilterFieldKey)) continue
    context[col.key as AdvancedFilterFieldKey] = getCellDisplay(entry, col).trim()
  }
  return context
}
```

### Derived Group Filtering Pattern

```typescript
// Source: displayGroups/tableRows grouped shape. [VERIFIED: app/pages/entries/index.vue]
function filterGroups<T extends { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }>(groups: T[], matches: (entry: Entry) => boolean): T[] {
  return groups
    .map(group => ({ ...group, entries: group.entries.filter(matches) }))
    .filter(group => group.entries.length > 0)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embedding arbitrary JavaScript in filters | Explicit parser/interpreter with whitelisted functions | Locked by Phase 1 context on 2026-05-03 [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Safer and easier to validate than executable code. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED] |
| Backend-only search/filter for every condition | Server-backed basic filters plus client-side derived advanced filters | Locked by Phase 1 context on 2026-05-03 [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | Preserves current API semantics and enables formula/regex on loaded rows. [VERIFIED: app/composables/useEntriesList.ts] |
| Full spreadsheet/grid replacement | Keep existing entries table and add rule foundation | Project requirements defined 2026-05-03 [VERIFIED: .planning/REQUIREMENTS.md] | Avoids regressions in existing editing, AI, grouping, and review workflows. [VERIFIED: .planning/REQUIREMENTS.md] |

**Deprecated/outdated for this phase:**

- `eval`/`new Function` formula execution: explicitly forbidden. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
- Backend regex query API changes: explicitly out of Phase 1. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
- Conditional formatting, validation rule UI, shareable views, and bulk modification: deferred. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A hand-written recursive-descent parser is the best fit for the small formula subset. | Summary / Formula Parser Design | Planner might prefer a parser generator or existing package, increasing dependency scope. |
| A2 | Formula parser should accept and strip one leading `=`. | Formula Parser Design | UX could diverge if user expects mandatory Excel-style `=`. |
| A3 | `CONTAINS`, `STARTSWITH`, and `ENDSWITH` should be case-insensitive by default. | Formula Function Semantics | User expectations might prefer exact case-sensitive matching. |
| A4 | Pattern cap of 200 chars and input cap of 2,000 chars are reasonable initial limits. | Regex Design | Limits may be too strict or too loose for real datasets. |
| A5 | Derived filter arrays should preserve original `Entry` object references. | Implementation Approach / Integration | If Vue reactivity requires cloned group wrappers only, entry object identity still must be preserved. |
| A6 | LocalStorage draft persistence must scan source collections, not filtered collections. | Entries Table Integration | If changed incorrectly, hidden dirty rows could lose draft persistence. |
| A7 | No required new runtime dependencies are needed. | Standard Stack | Planner may choose `safe-regex2` or another library for additional safety. |

## Open Questions

1. **Should formula text require a leading `=` or merely allow it?** [ASSUMED]
   - What we know: Excel formulas begin with `=` according to Microsoft. [CITED: support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173]
   - What's unclear: The user said “像 Excel 那樣” but did not explicitly require mandatory `=`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
   - Recommendation: Accept both `=...` and `...`, but show examples with `=`. [ASSUMED]

2. **Should text functions be case-sensitive?** [ASSUMED]
   - What we know: Requirements do not define case sensitivity. [VERIFIED: .planning/REQUIREMENTS.md]
   - What's unclear: Cantonese/HK Traditional Chinese matching often has no case issue, but Latin jyutping and status/entryType fields do. [ASSUMED]
   - Recommendation: Default text helper functions and regex global search to case-insensitive matching via `i`, while allowing explicit regex flags later if needed. [ASSUMED]

3. **How should placeholder display values be treated in formulas?** [ASSUMED]
   - What we know: `getCellDisplay()` returns placeholders such as `選擇分類` and `-`. [VERIFIED: app/composables/useEntriesTableEdit.ts]
   - What's unclear: D-06 says use normalized display values, but `ISBLANK` semantics are more useful if placeholders count as blank. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED]
   - Recommendation: Store both display string and blank-normalized string internally, using blank-normalized value for `ISBLANK`. [ASSUMED]

4. **Should advanced filtering operate only within the current server page or across all matching server results?** [ASSUMED]
   - What we know: D-09 says regex support is client-side on currently loaded entries/group data. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md]
   - What's unclear: Users may expect advanced filters to search the entire dataset. [ASSUMED]
   - Recommendation: Phase 1 should state in UI that advanced filtering affects currently loaded results and leave cross-page/all-dataset advanced filtering for a backend/search phase. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED]

## Sources

### Primary (HIGH confidence)

- `app/pages/entries/index.vue` — entries table UI, `displayGroups`, `tableRows`, `currentPageEntries`, keyboard navigation, localStorage watch, search/filter controls. [VERIFIED: codebase read]
- `app/composables/useEntriesList.ts` — server-backed list/search/filter/grouping/pagination owner. [VERIFIED: codebase read]
- `app/composables/useEntriesTableColumns.ts` — stable column keys and `EditableColumnDef.get()`/`set()` contract. [VERIFIED: codebase read]
- `app/composables/useEntriesTableEdit.ts` — display value conversion for cells. [VERIFIED: codebase read]
- `app/components/entries/EntriesEditableCell.vue` — editable cell rendering props/emits and display contract. [VERIFIED: codebase read]
- `app/utils/entriesTableConstants.ts` — table constants and labels. [VERIFIED: codebase read]
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md` — locked implementation decisions. [VERIFIED: planning context]
- `.planning/REQUIREMENTS.md` — Phase 1 requirement IDs and descriptions. [VERIFIED: planning context]
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria. [VERIFIED: planning context]
- `.planning/codebase/CONVENTIONS.md` — project coding/security/verification conventions. [VERIFIED: planning context]
- `.planning/codebase/STRUCTURE.md` — where to add entry table features. [VERIFIED: planning context]
- `.planning/codebase/STACK.md` — current stack and no-test-framework finding. [VERIFIED: planning context]
- `CLAUDE.md` — Hong Kong Traditional Chinese and project architecture directives. [VERIFIED: project instructions]
- Context7 `/websites/nuxt_4_x` — Nuxt 4 composable and app directory documentation. [CITED: nuxt.com/docs/4.x]
- Context7 `/vuejs/vue` — Vue Composition API `ref`, `computed`, `reactive`, and filtering examples. [CITED: github.com/vuejs/vue examples via Context7]
- MDN JavaScript `RegExp` — dynamic constructor, `try/catch`, flags, `lastIndex`, and Unicode caveats. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp]
- OWASP ReDoS — catastrophic backtracking, evil regex structures, and browser hang risk. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS]
- Microsoft Excel formulas overview — formulas begin with `=`, functions/references/operators/constants. [CITED: support.microsoft.com/en-us/office/overview-of-formulas-in-excel-ecfdc708-9162-49e8-b993-c311f47ca173]
- npm registry — Nuxt, Vue, @nuxt/ui, Zod, safe-regex2, and re2-wasm current versions. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- No secondary sources used beyond official documentation and direct codebase/planning files. [VERIFIED: research process]

### Tertiary (LOW confidence)

- Assumed implementation details are explicitly listed in the Assumptions Log. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing stack was verified from `package.json`, codebase maps, npm registry, and project instructions. [VERIFIED: package.json + npm registry + .planning/codebase/STACK.md]
- Architecture: HIGH — integration points were verified in the entries page and composables. [VERIFIED: app/pages/entries/index.vue + app/composables/useEntriesList.ts]
- Formula design: MEDIUM — safety constraints and supported functions are locked, while AST/parser details are recommended assumptions. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + ASSUMED]
- Regex design: MEDIUM — MDN/OWASP risks are verified, but exact ReDoS limits and heuristics require product confirmation. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS + ASSUMED]
- UI copy: MEDIUM — Hong Kong Traditional requirement is verified, but exact wording is recommended. [VERIFIED: CLAUDE.md + ASSUMED]

**Research date:** 2026-05-03 [VERIFIED: system currentDate]
**Valid until:** 2026-06-02 for codebase integration assumptions; 2026-05-10 for npm package/version currency. [ASSUMED]
