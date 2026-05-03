# Phase 2: Conditional Formatting and Validation UI - Research

**Researched:** 2026-05-04 [VERIFIED: system currentDate]
**Domain:** Client-side entries-table conditional formatting, validation-rule overlays, cell-level metadata, and Vue/Nuxt UI integration [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
**Confidence:** HIGH for codebase integration and Phase 1 utility reuse; MEDIUM for exact visual styling choices until UI-spec review locks them. [VERIFIED: codebase read + .planning/phases/01-safe-formula-and-regex-filtering-foundation/* artifacts]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Goal

Users can add rules that highlight matching cells and flag validation issues while preserving read-only rule behavior.

## Requirements

- **COND-01**: User can create a conditional formatting rule that targets one or more table columns.
- **COND-02**: Matching cells are visually highlighted without changing the underlying entry data.
- **COND-03**: User can name rules so highlighted cells can indicate why they matched.
- **COND-04**: User can enable, disable, reorder, and remove conditional formatting rules.
- **VALD-01**: User can create a validation rule that flags cells or rows matching a formula or regex condition.
- **VALD-02**: User can distinguish validation warnings from normal conditional formatting highlights.
- **VALD-03**: Validation results update when table data, filters, or rule definitions change.

## Success Criteria

1. A user can create a named conditional formatting rule targeting one or more table columns.
2. Matching cells receive visible highlights while entry data remains unchanged.
3. Users can enable, disable, and delete rules from a rule management UI.
4. Validation rules appear visually distinct from ordinary formatting highlights.
5. Formatting and validation results update when rule definitions or relevant entry values change.

## Implementation Focus

- Add rule management UI.
- Pass cell-level formatting metadata into table cell rendering.
- Reuse formula/regex evaluation from Phase 1 for formatting/validation.
- Make rule names discoverable for highlighted cells.

## Constraints

- Rules are read-only overlays and must not mutate entries, call save/delete/review APIs, or trigger bulk actions.
- Reuse the safe formula and regex utilities from Phase 1 instead of adding arbitrary JavaScript execution.
- Apply rules to the currently loaded entries table data, consistent with Phase 1 advanced filtering scope.
- Preserve existing entries table behavior: flat/aggregated/lexeme modes, inline editing, AI suggestions, selection, dirty-state tracking, pagination, search/filter controls, and column resizing.
- All Chinese UI copy must use Hong Kong Traditional Chinese.

### Claude's Discretion
No separate `## Claude's Discretion` section exists in `02-CONTEXT.md`; implementation details not locked above are discretionary within the listed constraints. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
No separate `## Deferred Ideas` section exists in `02-CONTEXT.md`; use roadmap/requirements out-of-scope boundaries: shareable view URL serialization/restoration is Phase 3, integration/performance hardening and full UI verification are Phase 4, backend saved views are v2, and formula/regex-driven bulk modification is v2/out of scope. [VERIFIED: .planning/ROADMAP.md + .planning/REQUIREMENTS.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COND-01 | User can create a conditional formatting rule that targets one or more table columns. [VERIFIED: .planning/REQUIREMENTS.md] | Add a rule-management component/composable whose formatting rules have `name`, `enabled`, `targetFields: AdvancedFilterFieldKey[]`, `condition` using Phase 1 formula or regex helpers, and optional style preset. [VERIFIED: app/utils/entriesAdvancedFilter.ts + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| COND-02 | Matching cells are visually highlighted without changing the underlying entry data. [VERIFIED: .planning/REQUIREMENTS.md] | Evaluate rules against readonly row contexts and pass metadata/classes into `EntriesEditableCell`; never call `EditableColumnDef.set`, save/delete APIs, or mutation callbacks. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + app/components/entries/EntriesEditableCell.vue] |
| COND-03 | User can name rules so highlighted cells can indicate why they matched. [VERIFIED: .planning/REQUIREMENTS.md] | Store rule names in per-cell metadata and expose names via accessible tooltip/title/inline badge text rather than only through color. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html] |
| COND-04 | User can enable, disable, reorder, and remove conditional formatting rules. [VERIFIED: .planning/REQUIREMENTS.md] | Implement rule list actions that mutate only local rule arrays: toggle `enabled`, splice/remove, and move rules up/down; do not call entry mutation APIs. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| VALD-01 | User can create a validation rule that flags cells or rows matching a formula or regex condition. [VERIFIED: .planning/REQUIREMENTS.md] | Use the same condition type and Phase 1 parser/regex helpers as formatting rules, with validation-specific target scope allowing `targetFields` or row-level metadata. [VERIFIED: app/utils/entriesAdvancedFilter.ts + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| VALD-02 | User can distinguish validation warnings from normal conditional formatting highlights. [VERIFIED: .planning/REQUIREMENTS.md] | Use different visual language for validation: warning/error border/icon/label and text explanation, not only a different background color. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] |
| VALD-03 | Validation results update when table data, filters, or rule definitions change. [VERIFIED: .planning/REQUIREMENTS.md] | Compute cell metadata from `currentPageEntries` / visible `tableRows`, `editableColumns`, `buildRowContext`, and reactive rule arrays so Vue recomputes on entry edits, Phase 1 filtering changes, and rule changes. [VERIFIED: app/pages/entries/index.vue + app/composables/useEntriesAdvancedFilters.ts + CITED: github.com/vuejs/vue examples via Context7] |
</phase_requirements>

## Summary

Phase 2 should be implemented as a client-only, read-only overlay layer on top of the Phase 1 advanced filtering foundation. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] Phase 1 already provides `ADVANCED_FILTER_FIELDS`, `AdvancedFilterFieldKey`, `RowFilterContext`, `compileAdvancedRegex`, `testAdvancedRegex`, `parseAdvancedFormula`, `evaluateAdvancedFormula`, and `buildRowContext` through `useEntriesAdvancedFilters`; these are the correct primitives for formatting and validation rule evaluation. [VERIFIED: app/utils/entriesTableConstants.ts + app/utils/entriesAdvancedFilter.ts + app/composables/useEntriesAdvancedFilters.ts]

The correct architecture is a new composable such as `useEntriesRuleOverlays.ts` that owns local formatting/validation rule state and derives `cellMetaByEntryKey` from visible entries and stable column keys. [ASSUMED] The entries page should pass that cell metadata into `EntriesEditableCell.vue` as a prop, and the cell component should merge overlay classes/indicators with its existing `cellClass`, selection ring, editing state, AI buttons, expand hints, and review-note icon behavior. [VERIFIED: app/pages/entries/index.vue + app/components/entries/EntriesEditableCell.vue]

Validation and formatting must have distinct semantics and visuals: formatting highlights are informational, while validation warnings require explicit text and a non-color cue such as an icon, border, or badge. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] Rules must never mutate `Entry` data, call save/delete/review/bulk APIs, or change `useEntriesList` query/cache behavior; they should only read normalized display values for currently loaded rows, matching Phase 1 scope. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + app/composables/useEntriesList.ts]

**Primary recommendation:** Build a local `useEntriesRuleOverlays` composable plus `EntriesRuleOverlayPanel.vue` and extend `EntriesEditableCell.vue` with a `cellMeta` prop; evaluate enabled rules against Phase 1 row contexts and pass only read-only metadata/classes/tooltips into visible cells. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + app/components/entries/EntriesEditableCell.vue + ASSUMED]

## Project Constraints (from CLAUDE.md)

- All Chinese UI labels, buttons, placeholders, validation text, comments, AI prompts, and enum values must use Hong Kong Traditional Chinese. [VERIFIED: CLAUDE.md]
- Use `opencc-js` conversion helpers for Chinese text normalization where source text may be Simplified or non-HK Traditional. [VERIFIED: CLAUDE.md]
- The project stack is Nuxt 4, Vue 3 Composition API, @nuxt/ui, MongoDB/Mongoose, nuxt-auth-utils, Pinia, Zod, Cloudinary, OpenRouter, and opencc-js. [VERIFIED: CLAUDE.md]
- Entries-table behavior includes flat/aggregated/lexeme modes, inline editing, keyboard navigation, AI suggestions, column resizing, dirty-state tracking, batch selection, search, filters, and view modes. [VERIFIED: CLAUDE.md]
- Entry identity uses the custom `id` string field and client `_tempId` for unsaved rows; use `lexemeId` for cross-dialect grouping. [VERIFIED: CLAUDE.md + app/utils/entryKey.ts]
- Create edit history for CRUD operations, but Phase 2 overlays are read-only and must not create CRUD operations or edit-history records. [VERIFIED: CLAUDE.md + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- Always check dialect permissions before entry modifications, but Phase 2 should not introduce entry modifications. [VERIFIED: CLAUDE.md + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- Theme IDs are valid in range 60-498; Phase 2 rules read theme display values and should not alter theme IDs. [VERIFIED: CLAUDE.md + app/composables/useEntriesTableColumns.ts]
- Column widths persist in localStorage as `jyutcollab-column-widths`; Phase 2 must not disturb column resizing. [VERIFIED: CLAUDE.md + app/composables/useColumnResize.ts]
- Testing should consider dialect permission boundaries, status workflow transitions, AI suggestions, edit-history snapshot accuracy, revert functionality, concurrent edits, and keyboard navigation. [VERIFIED: CLAUDE.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Conditional-formatting rule creation and management | Browser / Client | Vue component/composable | Phase 2 rules apply to currently loaded table data and are read-only overlays; no backend persistence is in scope. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + .planning/ROADMAP.md] |
| Validation rule creation and warning display | Browser / Client | Vue component/composable | Validation flags cells/rows in the loaded entries table and must update with client table data and rule definitions. [VERIFIED: .planning/REQUIREMENTS.md] |
| Formula and regex condition evaluation | Browser / Client | Existing Phase 1 utility | Phase 2 must reuse Phase 1 safe formula/regex utilities instead of arbitrary JavaScript. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + app/utils/entriesAdvancedFilter.ts] |
| Stable row context / public fields | Browser / Client | Existing editable columns | Phase 1 already builds `RowFilterContext` from `EditableColumnDef` display values and public fields. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + app/composables/useEntriesTableColumns.ts] |
| Cell-level metadata and rendering | Browser / Client | `EntriesEditableCell.vue` | Existing cells receive props for display text, classes, selected/editing state, AI hints, and review notes; overlay metadata should be an additional prop. [VERIFIED: app/pages/entries/index.vue + app/components/entries/EntriesEditableCell.vue] |
| Server-backed entries fetch/search/filter/pagination | API / Backend | `useEntriesList` | Phase 2 must not change existing `/api/entries` query behavior or pagination ownership. [VERIFIED: app/composables/useEntriesList.ts + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] |
| Data mutation, save/delete/review/bulk actions | API / Backend | Existing entries page/actions | Overlays must not call or trigger these actions; existing buttons/actions remain separate. [VERIFIED: app/pages/entries/index.vue + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] |
| Accessibility/error communication | Browser / Client | Nuxt UI components | Validation warnings require text and non-color cues; formatting rule names need discoverable text/tooltips. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] |

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Nuxt | installed `^4.3.1`; npm current `4.4.4`, modified 2026-04-29 [VERIFIED: package.json + npm registry] | Existing app framework, auto-imported components, and page/composable runtime. [VERIFIED: CLAUDE.md + CITED: nuxt.com/docs/4.x] | Use the existing Nuxt 4 app/components/composables structure; do not introduce another grid/app shell. [VERIFIED: .planning/codebase/STRUCTURE.md + CITED: nuxt.com/docs/4.x] |
| Vue | installed `^3.5.28`; npm current `3.5.33`, modified 2026-04-22 [VERIFIED: package.json + npm registry] | `ref`, `reactive`, `computed`, and `watch` state for rules and derived cell metadata. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + CITED: github.com/vuejs/vue examples via Context7] | Phase 1 advanced filtering already uses Vue computed derived arrays; Phase 2 metadata should follow the same pattern. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] |
| @nuxt/ui | installed `^4.4.0`; npm current `4.7.1`, modified 2026-04-28 [VERIFIED: package.json + npm registry] | Rule management panel, buttons, inputs, selects, badges, tooltips, and alerts. [VERIFIED: app/components/entries/EntriesAdvancedFilterPanel.vue + CITED: ui.nuxt.com/docs] | The entries table already uses Nuxt UI controls; reusing them preserves visual and accessibility consistency. [VERIFIED: app/pages/entries/index.vue + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md] |
| Phase 1 `entriesAdvancedFilter` utilities | local source [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Safe formula parsing/evaluation and constrained regex compilation/testing. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Required by Phase 2 context; avoids arbitrary JavaScript execution and keeps REGX-04 consistency. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + .planning/REQUIREMENTS.md] |
| Phase 1 `useEntriesAdvancedFilters` row context | local source [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Builds `RowFilterContext` from table display values and public fields. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Reuse or extract this builder so formatting/validation match formula/regex filtering semantics. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| Native `RegExp` via Phase 1 helpers | JavaScript built-in [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] | Regex condition matching for formatting/validation rules. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Phase 1 already wraps dynamic `new RegExp` in validation, flag allowlist, input caps, and `lastIndex` reset. [VERIFIED: app/utils/entriesAdvancedFilter.ts + CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp] |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| Zod | installed `^4.3.6`; npm current `4.4.2`, modified 2026-05-01 [VERIFIED: package.json + npm registry] | Optional in-memory schema validation for rule objects if planner wants consistent typed validation. [ASSUMED] | Use if rule forms become complex or need future Phase 3 serialization validation; otherwise TypeScript + utility validation is enough for Phase 2. [ASSUMED] |
| Browser `crypto.randomUUID()` | Web API [ASSUMED] | Generate local rule IDs. [ASSUMED] | Use with fallback to timestamp/counter if compatibility concern exists; IDs are client-local for Phase 2 and not persisted server-side. [ASSUMED] |
| `localStorage` | Browser API [VERIFIED: CLAUDE.md + app/composables/useColumnResize.ts] | Optional temporary persistence of rule UI state. [ASSUMED] | Do not use unless explicitly accepted; Phase 3 owns shareable/saved view state, and Phase 2 can keep rules in memory only. [VERIFIED: .planning/ROADMAP.md + ASSUMED] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local Vue composable for rules | Backend persistence/API for rules | Backend persistence is out of Phase 2 scope and would overlap Phase 3/v2 saved-view work. [VERIFIED: .planning/ROADMAP.md + .planning/REQUIREMENTS.md] |
| Extending `EntriesEditableCell.vue` with metadata prop | Replacing table with spreadsheet/grid library | Replacing the table is explicitly out of scope and risks regressions in editing, AI, grouping, review, and column-width workflows. [VERIFIED: .planning/REQUIREMENTS.md] |
| Reusing Phase 1 formula/regex utilities | `eval`, `new Function`, arbitrary JavaScript, or third-party spreadsheet formula engine | Phase 2 context requires Phase 1 reuse; arbitrary execution is forbidden; full spreadsheet engines are over-scoped. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + .planning/REQUIREMENTS.md] |
| Color-only warnings/highlights | Color plus tooltip/icon/text metadata | WCAG guidance says color must not be the only means of conveying information, and validation errors need text identification. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] |
| Live backend validation | Client-side overlay validation over loaded rows | Phase 2 scope is read-only overlays on currently loaded table data, not backend validation policy. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] |

**Installation:**

```bash
# No required new runtime dependencies for the recommended Phase 2 implementation. [VERIFIED: package.json]
```

**Version verification:** Nuxt, Vue, @nuxt/ui, and Zod current versions were checked with `npm view [package] version time.modified` on 2026-05-04. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User opens rule panel / edits rule definitions
        |
        v
EntriesRuleOverlayPanel.vue
(local rule forms: name, type, target fields, condition, enabled/order)
        |
        | apply / toggle / reorder / remove (local state only)
        v
useEntriesRuleOverlays.ts
        |
        | reads enabled rules + visible table rows/currentPageEntries
        | calls buildRowContext(entry) from Phase 1 advancedFilters
        | calls evaluateAdvancedFormula / compileAdvancedRegex / testAdvancedRegex
        v
Derived cell metadata map
Map<entryKey, Map<fieldKey, { formattingMatches[], validationMatches[], classes, tooltip }>>
        |
        v
app/pages/entries/index.vue tableRows render loop
        |
        | for each visible Entry x EditableColumnDef
        v
EntriesEditableCell.vue
        |
        | merges existing display/edit/AI/review/selection UI with overlay classes/icons/tooltips
        v
Visible read-only highlights and validation warnings

External boundaries:
- useEntriesList and /api/entries remain unchanged. [VERIFIED: app/composables/useEntriesList.ts]
- save/delete/review/bulk APIs are not reachable from overlay composable/panel. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- Phase 3 shareable URL serialization is not implemented in Phase 2. [VERIFIED: .planning/ROADMAP.md]
```

### Recommended Project Structure

```text
app/
├── components/
│   └── entries/
│       ├── EntriesEditableCell.vue          # add cellMeta prop + indicators [VERIFIED: existing file]
│       ├── EntriesAdvancedFilterPanel.vue   # existing Phase 1 panel, leave intact [VERIFIED: existing file]
│       └── EntriesRuleOverlayPanel.vue      # new rule-management UI [ASSUMED]
├── composables/
│   ├── useEntriesAdvancedFilters.ts         # existing Phase 1 filters/buildRowContext [VERIFIED: existing file]
│   └── useEntriesRuleOverlays.ts            # new rule state + derived cell metadata [ASSUMED]
├── utils/
│   ├── entriesAdvancedFilter.ts             # reuse formula/regex helpers [VERIFIED: existing file]
│   └── entriesTableConstants.ts             # reuse field constants/labels [VERIFIED: existing file]
└── pages/
    └── entries/index.vue                    # wire overlay composable/panel/cell prop [VERIFIED: existing file]
```

### Pattern 1: Rule Model with Explicit Read-Only Conditions

**What:** Define discriminated rule objects that describe only matching and presentation metadata, never mutation actions. [ASSUMED]

**When to use:** Use for both conditional formatting and validation rules so the same evaluator can produce different metadata buckets. [ASSUMED]

**Recommended shape:**

```typescript
// Source: Phase 1 field/key and formula/regex utility types. [VERIFIED: app/utils/entriesAdvancedFilter.ts + app/utils/entriesTableConstants.ts]
type OverlayRuleKind = 'formatting' | 'validation'
type OverlayConditionKind = 'formula' | 'regex'

type OverlayStylePreset = 'green' | 'blue' | 'purple' | 'amber'

interface EntriesRuleOverlay {
  id: string
  name: string
  kind: OverlayRuleKind
  enabled: boolean
  targetFields: AdvancedFilterFieldKey[]
  conditionKind: OverlayConditionKind
  formula: string
  regex: { field: AdvancedFilterFieldKey | 'any'; pattern: string; flags: string }
  stylePreset: OverlayStylePreset
}
```

**Prescriptive notes:**
- Use `targetFields` to decide which cells receive metadata after the row/regex condition matches. [ASSUMED]
- Use `regex.field = 'any'` for a condition that tests `buildSearchableRowText(context)` but still applies highlight/warning only to `targetFields`. [VERIFIED: app/utils/entriesAdvancedFilter.ts + ASSUMED]
- Keep `stylePreset` informational only; validation rules should ignore arbitrary formatting presets and use validation visual language. [ASSUMED]

### Pattern 2: Derived Cell Metadata Map

**What:** Compute a nested map keyed by `getEntryIdString(entry)` and `AdvancedFilterFieldKey`, containing rule-match metadata for each visible cell. [ASSUMED]

**When to use:** Use during table rendering to avoid recomputing every rule inside every cell component render. [ASSUMED]

**Example:**

```typescript
// Source: Vue computed derived-data pattern and Phase 1 row context pattern. [CITED: github.com/vuejs/vue examples via Context7 + VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
interface CellRuleMatch {
  ruleId: string
  ruleName: string
  kind: 'formatting' | 'validation'
  stylePreset?: OverlayStylePreset
}

interface EntryCellOverlayMeta {
  formattingMatches: CellRuleMatch[]
  validationMatches: CellRuleMatch[]
  classNames: string[]
  tooltipText: string
}

type CellOverlayMetaByEntryKey = Map<string, Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>>
```

**Prescriptive notes:**
- Return a stable empty meta object for cells without matches to simplify `EntriesEditableCell` props. [ASSUMED]
- Preserve original `Entry` object references; metadata is separate and never written to entries. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + ASSUMED]
- Compute from visible entries/table rows, not raw all-source arrays, so results update with current filters and group expansion semantics. [VERIFIED: app/pages/entries/index.vue + .planning/REQUIREMENTS.md]

### Pattern 3: Formatting vs Validation Visual Distinction

**What:** Use separate visual channels: formatting uses soft background/ring, validation uses warning/error border/icon and text. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html]

**When to use:** Apply every time metadata reaches a cell. [VERIFIED: .planning/REQUIREMENTS.md]

**Recommended cell behavior:**
- Conditional formatting match: soft background such as `bg-green-50 dark:bg-green-900/20` plus subtle inset ring. [ASSUMED]
- Validation warning: amber/red left border or inset ring plus `i-heroicons-exclamation-triangle` icon with tooltip/title containing rule names. [CITED: w3.org/WAI/WCAG22/Understanding/error-identification.html + ASSUMED]
- If both formatting and validation match, validation styling takes precedence for border/icon, while formatting background may remain if it does not obscure warning state. [ASSUMED]
- Do not rely on red/green alone; include tooltip text, title, aria label, or visible icon. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html]

### Pattern 4: Integration Through `EntriesEditableCell.vue` Prop

**What:** Add a typed optional `cellMeta` prop to `EntriesEditableCell.vue` and use it only in display mode plus `td` classes. [ASSUMED]

**When to use:** Use for metadata rendering; do not add rule evaluation logic to the cell component. [ASSUMED]

**Example:**

```vue
<!-- Source: Existing cell prop/class pattern. [VERIFIED: app/components/entries/EntriesEditableCell.vue + app/pages/entries/index.vue] -->
<EntriesEditableCell
  :cell-class="getCellClass(row.entry, col.key).join(' ')"
  :cell-meta="getCellOverlayMeta(row.entry, col.key)"
/>
```

**Prescriptive notes:**
- `EntriesEditableCell.vue` should render metadata indicators only when `!isEditing`; editing controls should retain existing focus/border classes. [VERIFIED: app/components/entries/EntriesEditableCell.vue + ASSUMED]
- Overlay classes should be merged in addition to existing status text classes from `getCellClass`, not replace them. [VERIFIED: app/composables/useEntriesTableEdit.ts]
- Existing review note icon on rejected status must remain visible; validation warning icons should not obscure it. [VERIFIED: app/components/entries/EntriesEditableCell.vue]

### Pattern 5: Rule Management UI as Local Panel

**What:** Add a compact `EntriesRuleOverlayPanel.vue` near the existing Phase 1 `EntriesAdvancedFilterPanel.vue`, with separate sections/tabs for conditional formatting and validation rules. [ASSUMED]

**When to use:** Use to satisfy creation, naming, enable/disable, reorder, and delete requirements without bloating `app/pages/entries/index.vue`. [VERIFIED: .planning/codebase/CONVENTIONS.md]

**Recommended UI controls:**
- Rule name input: `規則名稱` placeholder `例如：缺少釋義`. [ASSUMED]
- Rule type selector/toggle: `格式標示` vs `驗證警告`. [ASSUMED]
- Condition type: `公式` or `正則`. [ASSUMED]
- Formula input: reuse example style from Phase 1, e.g. `=ISBLANK(definition)`. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md]
- Target columns multi-select: supported fields from `ADVANCED_FILTER_FIELD_LABELS`. [VERIFIED: app/utils/entriesTableConstants.ts]
- Rule list actions: `啟用`/`停用`, `上移`, `下移`, `移除`. [ASSUMED]
- Read-only helper: `規則只會標示目前已載入的詞條，不會修改資料。` [ASSUMED]

### Anti-Patterns to Avoid

- **Evaluating formulas as JavaScript:** Do not use `eval`, `new Function`, dynamic imports, or executable user-provided code. Use Phase 1 parser/evaluator. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + app/utils/entriesAdvancedFilter.ts]
- **Rule overlays mutating entries:** Do not write match state into `Entry`, `_isDirty`, `senses`, `meta`, `status`, or any other data field. Store metadata in separate maps/computed state. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- **Calling save/delete/review/bulk APIs from rule code:** Overlay composables/components must not import `$fetch` mutation flows or emit save/delete/submit/bulk events. [VERIFIED: app/pages/entries/index.vue + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- **Changing Phase 1 filter semantics:** Conditional formatting/validation should not alter `filteredEntries` or `useEntriesList`; it only adds visual metadata. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- **Color-only validation:** Validation must use text/icon/border/tooltips in addition to color. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html]
- **Adding broad logic to `app/pages/entries/index.vue`:** Keep rule state/evaluation in composables and UI in components because the page is already large. [VERIFIED: .planning/codebase/CONVENTIONS.md]
- **Using hidden rule results for selection/bulk actions:** Rule matches are overlays only and must not drive `selectedEntryIds`, `batchDeleteSelected`, or any bulk operation. [VERIFIED: .planning/REQUIREMENTS.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formula condition execution | Do not implement another parser or JavaScript execution path. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] | `parseAdvancedFormula`, `evaluateAdvancedFormula`, `evaluateAdvancedFormulaAst` from Phase 1. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Keeps all formula syntax, whitelist, errors, and safety behavior consistent. [VERIFIED: .planning/REQUIREMENTS.md] |
| Regex compile/match | Do not call `new RegExp` directly in the Phase 2 rule code. [ASSUMED] | `compileAdvancedRegex` and `testAdvancedRegex`. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Existing helper caps pattern/input length, allowlists flags, catches syntax errors, rejects obvious nested quantifiers, and resets `lastIndex`. [VERIFIED: app/utils/entriesAdvancedFilter.ts + CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp + owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] |
| Field/source mapping | Do not infer arbitrary nested `Entry` paths from user input. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md] | `ADVANCED_FILTER_FIELDS`, `ADVANCED_FILTER_FIELD_LABELS`, and Phase 1 `buildRowContext`. [VERIFIED: app/utils/entriesTableConstants.ts + app/composables/useEntriesAdvancedFilters.ts] | Keeps conditions aligned with user-visible table display values. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] |
| Cell UI primitives | Do not build custom popover/tooltip/select components. [ASSUMED] | Nuxt UI `UButton`, `UInput`, `USelectMenu`, `UBadge`, `UTooltip`, `UAlert`. [VERIFIED: app/pages/entries/index.vue + CITED: ui.nuxt.com/docs] | Existing table already uses Nuxt UI; custom controls increase accessibility and styling risk. [VERIFIED: .planning/codebase/CONVENTIONS.md] |
| Spreadsheet grid behavior | Do not replace table rendering or introduce spreadsheet library semantics. [VERIFIED: .planning/REQUIREMENTS.md] | Extend current `tableRows` -> `EntriesEditableCell` data flow. [VERIFIED: app/pages/entries/index.vue] | Existing table has specialized editing, AI, grouping, review, and lexeme behavior. [VERIFIED: CLAUDE.md] |
| Persisted saved views/rules | Do not build backend saved views or account-sync in Phase 2. [VERIFIED: .planning/ROADMAP.md + .planning/REQUIREMENTS.md] | In-memory local state; Phase 3 handles shareable view serialization. [VERIFIED: .planning/ROADMAP.md] | Avoids scope creep and storage/API design before serialization versioning. [VERIFIED: .planning/REQUIREMENTS.md] |

**Key insight:** Phase 2 is not a data-validation backend or spreadsheet engine; it is a read-only client overlay that should reuse Phase 1’s safe condition evaluation and the existing table cell render path. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Recomputing Rule Evaluation Inside Every Cell Component

**What goes wrong:** Each `EntriesEditableCell` evaluates all rules independently, multiplying work by visible cells and causing typing/scrolling lag. [ASSUMED]
**Why it happens:** The natural location for visual state is the cell, but rule conditions operate at row context level. [ASSUMED]
**How to avoid:** Compute `cellMetaByEntryKey` once in a composable from visible entries and pass precomputed metadata to each cell. [ASSUMED]
**Warning signs:** `evaluateAdvancedFormula` or `compileAdvancedRegex` appears inside `EntriesEditableCell.vue`. [ASSUMED]

### Pitfall 2: Validation and Formatting Differ Only by Color

**What goes wrong:** Users cannot reliably distinguish warning semantics from ordinary highlights, especially with color-vision differences or dark mode. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html]
**Why it happens:** It is easy to assign amber for validation and green for formatting without text or icon cues. [ASSUMED]
**How to avoid:** Add validation icon/border/text tooltip and keep formatting as softer highlight. [CITED: w3.org/WAI/WCAG22/Understanding/error-identification.html + ASSUMED]
**Warning signs:** VALD-02 is implemented only as `bg-red-*` or `bg-amber-*`. [ASSUMED]

### Pitfall 3: Writing Match State Into Entries

**What goes wrong:** Entries become dirty, localStorage draft persistence saves overlay state, or save APIs accidentally persist UI-only metadata. [ASSUMED]
**Why it happens:** Developers may add `_validationMatches` or `_formattingMatches` directly to `Entry` objects for convenience. [ASSUMED]
**How to avoid:** Store overlay state in `Map<entryKey, Map<fieldKey, meta>>` returned by a composable. [ASSUMED]
**Warning signs:** Source includes `entry._validation`, `entry._formatting`, `entry._rule`, or `entry._isDirty = true` in rule code. [ASSUMED]

### Pitfall 4: Reusing Rule Matches for Bulk Selection

**What goes wrong:** Read-only inspection tools become an implicit bulk action surface, violating Phase 2 constraints and v1 safety requirements. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + .planning/REQUIREMENTS.md]
**Why it happens:** Users may want to select all validation matches, but bulk modification is explicitly deferred. [VERIFIED: .planning/REQUIREMENTS.md]
**How to avoid:** Rule panel can show counts but must not add “select matches,” “delete matches,” or “fix matches” actions in Phase 2. [ASSUMED]
**Warning signs:** New emits/actions named `selectMatched`, `bulk`, `deleteMatched`, `applyFix`, or `$fetch('/api/entries'...)` in rule overlay files. [ASSUMED]

### Pitfall 5: Target Columns and Regex Condition Field Are Confused

**What goes wrong:** A regex condition targeting `headword` highlights every column, or a row-level formula highlights unintended cells. [ASSUMED]
**Why it happens:** “condition field” and “highlight target fields” are separate concepts. [ASSUMED]
**How to avoid:** Model `targetFields` separately from condition inputs. Formula rules evaluate against the whole row context; regex rules evaluate against `regex.field` or searchable row text, then apply metadata only to `targetFields`. [VERIFIED: app/utils/entriesAdvancedFilter.ts + ASSUMED]
**Warning signs:** Rule has only one `field` property and no `targetFields` array. [ASSUMED]

### Pitfall 6: Overwriting Existing Cell Status Classes or Selection Ring

**What goes wrong:** Status colors, selected-cell ring, hover style, dirty-row amber background, AI buttons, or review notes disappear. [VERIFIED: app/components/entries/EntriesEditableCell.vue + app/pages/entries/index.vue]
**Why it happens:** Overlay class logic replaces `cellClass` or the `td` class array instead of merging. [ASSUMED]
**How to avoid:** Keep existing `cellClass` prop and append overlay-specific class arrays separately, with validation classes having visual precedence but not removing existing props. [ASSUMED]
**Warning signs:** `:cell-class="overlayClass"` replaces `getCellClass(row.entry, col.key).join(' ')`. [ASSUMED]

### Pitfall 7: Rule Validation Throws Through Vue Render

**What goes wrong:** Invalid formula or regex breaks the table render or logs noisy exceptions during every computed recompute. [ASSUMED]
**Why it happens:** Rule evaluation is done directly without checking typed `{ ok: false }` results. [VERIFIED: app/utils/entriesAdvancedFilter.ts]
**How to avoid:** Compile/parse rule definitions on apply, store typed rule errors, and skip invalid rules during metadata computation. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + ASSUMED]
**Warning signs:** `throw` in overlay evaluator or direct `new RegExp` in computed metadata. [ASSUMED]

### Pitfall 8: Breaking LocalStorage Draft Watch or Source Collections

**What goes wrong:** Hidden dirty rows stop persisting, or filtering/grouping behavior changes when rules are active. [VERIFIED: app/pages/entries/index.vue + .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md]
**Why it happens:** Overlay logic is wired into source arrays rather than metadata maps. [ASSUMED]
**How to avoid:** Leave the existing source-based localStorage watch unchanged and derive overlays from existing visible rows. [VERIFIED: app/pages/entries/index.vue]
**Warning signs:** localStorage watch sources change from `entries`, `aggregatedGroups`, `lexemeGroups` to overlay-filtered or rule-derived collections. [VERIFIED: app/pages/entries/index.vue + ASSUMED]

## Code Examples

Verified patterns from official/codebase sources:

### Shared Rule Evaluator Pattern

```typescript
// Source: Phase 1 safe formula/regex helpers. [VERIFIED: app/utils/entriesAdvancedFilter.ts]
function ruleMatchesContext(rule: EntriesRuleOverlay, context: RowFilterContext): boolean {
  if (!rule.enabled) return false

  if (rule.conditionKind === 'formula') {
    const result = evaluateAdvancedFormula(rule.formula, context)
    return result.ok ? result.value : false
  }

  const compiled = compileAdvancedRegex(rule.regex.pattern, rule.regex.flags || 'i')
  if (!compiled.ok) return false
  const value = rule.regex.field === 'any'
    ? buildSearchableRowText(context)
    : context[rule.regex.field]
  return testAdvancedRegex(compiled.regex, value)
}
```

### Derived Cell Metadata Pattern

```typescript
// Source: Vue computed derived-data examples and entries table key pattern. [CITED: github.com/vuejs/vue examples via Context7 + VERIFIED: app/utils/entryKey.ts]
const cellOverlayMetaByEntryKey = computed(() => {
  const map = new Map<string, Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>>()
  for (const entry of visibleEntries.value) {
    const context = buildRowContext(entry)
    const entryKey = getEntryIdString(entry)
    for (const rule of rules.value) {
      if (!ruleMatchesContext(rule, context)) continue
      const fieldMap = map.get(entryKey) ?? new Map<AdvancedFilterFieldKey, EntryCellOverlayMeta>()
      for (const field of rule.targetFields) {
        const meta = fieldMap.get(field) ?? createEmptyCellOverlayMeta()
        const match = { ruleId: rule.id, ruleName: rule.name, kind: rule.kind, stylePreset: rule.stylePreset }
        if (rule.kind === 'validation') meta.validationMatches.push(match)
        else meta.formattingMatches.push(match)
        fieldMap.set(field, deriveCellOverlayPresentation(meta))
      }
      map.set(entryKey, fieldMap)
    }
  }
  return map
})
```

### Cell Prop Integration Pattern

```vue
<!-- Source: Current entries table cell loop and existing cell-class prop. [VERIFIED: app/pages/entries/index.vue] -->
<EntriesEditableCell
  v-for="(col, colIndex) in editableColumns"
  :key="`${getEntryKey(row.entry)}-${col.key}`"
  :col="col"
  :display-text="getCellDisplay(row.entry, col)"
  :cell-class="getCellClass(row.entry, col.key).join(' ')"
  :cell-meta="getCellOverlayMeta(row.entry, col.key)"
/>
```

### Validation Indicator Pattern

```vue
<!-- Source: Existing UTooltip/UIcon use in EntriesEditableCell and WCAG text/non-color guidance. [VERIFIED: app/components/entries/EntriesEditableCell.vue + CITED: w3.org/WAI/WCAG22/Understanding/error-identification.html] -->
<UTooltip
  v-if="cellMeta.validationMatches.length"
  :text="cellMeta.validationMatches.map(match => `驗證警告：${match.ruleName}`).join('\n')"
  :ui="{ content: 'max-w-xs whitespace-pre-wrap' }"
>
  <UIcon
    name="i-heroicons-exclamation-triangle"
    class="w-4 h-4 text-amber-600 dark:text-amber-400 cursor-help flex-shrink-0"
    aria-label="驗證警告"
  />
</UTooltip>
```

### Rule Reorder Pattern

```typescript
// Source: Vue ref mutation pattern; replace arrays after mutation for reactivity. [CITED: github.com/vuejs/vue examples via Context7 + VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md]
function moveRule(ruleId: string, direction: -1 | 1) {
  const index = rules.value.findIndex(rule => rule.id === ruleId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= rules.value.length) return
  const next = [...rules.value]
  const [rule] = next.splice(index, 1)
  next.splice(nextIndex, 0, rule)
  rules.value = next
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Arbitrary JavaScript rules for table highlighting | Safe parser/interpreter and regex helper reused from Phase 1 | Locked by Phase 1 and Phase 2 context in 2026-05 planning docs [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] | Avoids code execution and keeps conditions consistent across filtering/formatting/validation. [VERIFIED: .planning/REQUIREMENTS.md] |
| Filtering/removing rows to communicate validation | Cell-level read-only metadata overlays | Phase 2 requirement set [VERIFIED: .planning/ROADMAP.md] | Validation flags cells/rows without changing loaded data or existing filter semantics. [VERIFIED: .planning/REQUIREMENTS.md] |
| Color-only spreadsheet-style conditional formatting | Color plus discoverable rule names and validation-specific icon/text | WCAG guidance current as fetched 2026-05-04 [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] | Supports VALD-02 and accessibility by not relying only on color. [VERIFIED: .planning/REQUIREMENTS.md] |
| New feature logic directly in large entries page | Feature composable plus feature component with minimal page wiring | Project convention analysis 2026-04-29 [VERIFIED: .planning/codebase/CONVENTIONS.md] | Reduces risk in the already-large entries page. [VERIFIED: .planning/codebase/CONVENTIONS.md] |

**Deprecated/outdated for this phase:**
- `eval`, `new Function`, dynamic imports, or arbitrary JavaScript formula/rule execution are forbidden. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
- Backend rule persistence, account-synced saved views, and shareable view links are not Phase 2. [VERIFIED: .planning/ROADMAP.md + .planning/REQUIREMENTS.md]
- Replacing the entries table with a spreadsheet grid library is explicitly out of scope. [VERIFIED: .planning/REQUIREMENTS.md]
- Bulk actions driven by formula/regex/rule matches are out of v1 scope. [VERIFIED: .planning/REQUIREMENTS.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Use a new `useEntriesRuleOverlays.ts` composable for local rules and metadata. | Summary / Architecture Patterns | Planner may choose to extend `useEntriesAdvancedFilters`; separate composable still better isolates responsibilities. |
| A2 | Use `EntriesRuleOverlayPanel.vue` for management UI near existing advanced filter controls. | Recommended Project Structure / Pattern 5 | UI spec may prefer integrating into the existing Phase 1 panel or a modal/drawer. |
| A3 | Rule IDs can be generated client-side because Phase 2 does not persist rules server-side. | Standard Stack | If Phase 2 must persist rules, ID strategy and schemas need revision. |
| A4 | Target fields and condition fields should be separate model properties. | Pattern 1 / Pitfall 5 | If users expect regex target field to equal highlight field by default, UI must make defaults clear. |
| A5 | Formatting presets should be limited to a small soft-color set; validation should use fixed warning visuals. | Pattern 3 | UI design may lock different colors/presets. |
| A6 | Rule metadata should be computed for visible/current entries rather than all raw source groups. | Pattern 2 | If collapsed group children need warning counts on headers, planner may need an additional group-level summary map. |
| A7 | Rules can be in-memory only for Phase 2. | Standard Stack / Don’t Hand-Roll | If users expect rules to survive reload before Phase 3, localStorage or URL state becomes needed. |
| A8 | Validation warnings are warnings, not blocking save/submit behavior in Phase 2. | Security / Pitfalls | If product expects validation to block saves, backend/API and permission design changes are required. |

## Open Questions

1. **Should Phase 2 rule definitions persist across page reloads?** [ASSUMED]
   - What we know: Phase 3 handles shareable view state, and v2 handles backend saved views. [VERIFIED: .planning/ROADMAP.md + .planning/REQUIREMENTS.md]
   - What's unclear: Phase 2 context does not say whether local in-memory rules should survive reload. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - Recommendation: Keep Phase 2 rules in memory only; design state shape to be serializable for Phase 3. [ASSUMED]

2. **Should validation rules flag entire rows, cells, or both?** [ASSUMED]
   - What we know: VALD-01 says flags cells or rows; implementation focus says pass cell-level metadata. [VERIFIED: .planning/REQUIREMENTS.md + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - What's unclear: Exact row-level visual treatment is not locked. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - Recommendation: Implement cell-level warnings for `targetFields`; optionally show a row action/left-edge summary icon/count only if UI spec includes it. [ASSUMED]

3. **How many style presets should conditional formatting support in v1?** [ASSUMED]
   - What we know: COND-02 requires visible highlights, not arbitrary style customization. [VERIFIED: .planning/REQUIREMENTS.md]
   - What's unclear: Exact colors/presets are not locked. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - Recommendation: Use 3-4 soft presets with fixed accessible class maps; do not allow custom CSS/classes. [ASSUMED]

4. **Should invalid rules remain in the list disabled or be rejected before adding?** [ASSUMED]
   - What we know: Phase 1 invalid formulas/regex show inline errors and fail closed. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
   - What's unclear: Phase 2 rule-management UX is not locked. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - Recommendation: Validate before adding/updating applied rules; keep invalid draft input in the form with inline HK Traditional error messages. [ASSUMED]

5. **Should collapsed grouped rows show counts of hidden child validation warnings?** [ASSUMED]
   - What we know: Current table renders group rows and expanded child entry rows; Phase 2 focuses on cell-level metadata. [VERIFIED: app/pages/entries/index.vue + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md]
   - What's unclear: Requirements do not explicitly require group-header warning summaries. [VERIFIED: .planning/REQUIREMENTS.md]
   - Recommendation: Do not add group summaries in the first Phase 2 implementation unless UI spec requests it; ensure child cells show metadata when expanded. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Nuxt build/dev and TypeScript/Vue compilation | Yes [VERIFIED: command -v node] | v24.14.1 [VERIFIED: node --version] | README/stack map documents Node 18+ as sufficient. [VERIFIED: .planning/codebase/STACK.md] |
| npm | Dependency install and `npm run build` | Yes [VERIFIED: command -v npm] | 11.11.0 [VERIFIED: npm --version] | None needed. [ASSUMED] |
| npx | Context7 CLI documentation lookup | Yes [VERIFIED: command -v npx] | 11.11.0 [VERIFIED: npx --version] | Use built-in docs knowledge only with lower confidence if unavailable. [ASSUMED] |
| Docker | Optional local service support | Yes [VERIFIED: command -v docker] | 29.3.1 [VERIFIED: docker --version] | Not required for Phase 2 build. [ASSUMED] |
| MongoDB / authenticated session | Browser verification of loaded `/entries` data | Unknown in this session [VERIFIED: Phase 1 UAT notes + environment audit] | — | Human UAT in configured environment; build/static checks can run without DB. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-HUMAN-UAT.md + ASSUMED] |
| Browser `localStorage` | Existing column widths/draft persistence | Required by existing UI [VERIFIED: CLAUDE.md + app/pages/entries/index.vue] | Browser-provided | Phase 2 should not add required storage. [ASSUMED] |

**Missing dependencies with no fallback:** None for implementation and build verification. [ASSUMED]

**Missing dependencies with fallback:** Live MongoDB/authenticated browser verification may be unavailable locally; Phase 1 human UAT was completed in a configured environment, and Phase 2 should similarly document browser verification blockers if local services are unavailable. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-HUMAN-UAT.md + .planning/phases/01-safe-formula-and-regex-filtering-foundation/03-SUMMARY.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No direct change [ASSUMED] | Existing `nuxt-auth-utils` session flow remains unchanged; no new protected routes. [VERIFIED: CLAUDE.md] |
| V3 Session Management | No direct change [ASSUMED] | No session-cookie handling changes. [VERIFIED: CLAUDE.md] |
| V4 Access Control | Indirectly yes [ASSUMED] | Rule overlays must not bypass existing permission checks by triggering mutations; no save/delete/review/bulk emits from overlay code. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + app/pages/entries/index.vue] |
| V5 Input Validation | Yes [VERIFIED: .planning/REQUIREMENTS.md] | Validate rule names, target fields, formulas, and regex patterns using allowlisted fields and Phase 1 typed errors. [VERIFIED: app/utils/entriesAdvancedFilter.ts + app/utils/entriesTableConstants.ts] |
| V6 Cryptography | No [ASSUMED] | No cryptographic storage or token changes. [ASSUMED] |

### Known Threat Patterns for Nuxt/Vue Client Rule Overlays

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arbitrary code execution through formula/rule input | Elevation of Privilege / Tampering | Reuse Phase 1 tokenizer/parser/evaluator; scan for `eval`, `new Function`, and dynamic imports in rule code. [VERIFIED: app/utils/entriesAdvancedFilter.ts + .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md] |
| Regex denial of service / browser hang | Denial of Service | Reuse `compileAdvancedRegex`/`testAdvancedRegex`, pattern/input length caps, flag allowlist, and nested-quantifier rejection; OWASP documents browser hang risk for evil regex. [VERIFIED: app/utils/entriesAdvancedFilter.ts + CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS] |
| User confusion between warnings and data changes | Spoofing / Reliability | Display read-only helper text and do not change dirty/save state; validation warnings are overlays only. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| Overlay rule accidentally mutates entries | Tampering | Rule composable accepts entries/read-only row contexts and returns metadata maps; never call `EditableColumnDef.set` or assign to `entry`. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts + ASSUMED] |
| Validation warning communicated only by color | Information Disclosure / Accessibility | Add text, icon, tooltip, or aria label; W3C says color must not be the only means and errors need text. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html] |
| Hidden rule state drives unintended bulk action | Tampering | No select/fix/delete matched actions; rule panel emits only local add/update/toggle/reorder/remove. [VERIFIED: .planning/REQUIREMENTS.md + ASSUMED] |
| Secret leakage through rule logs | Information Disclosure | Do not log rule formulas/regexes or environment values; project conventions prohibit logging secrets. [VERIFIED: .planning/codebase/CONVENTIONS.md] |

## Verification Strategy

`workflow.nyquist_validation` is explicitly `false` in `.planning/config.json`, so the full Validation Architecture section is omitted. [VERIFIED: .planning/config.json]

### Existing Verification Constraints

- No test framework, config, or app test files were detected outside `node_modules`. [VERIFIED: find command + .planning/codebase/STACK.md]
- `package.json` defines `build`, `dev`, `generate`, `preview`, and `postinstall`; it does not define `lint`, `typecheck`, or `test`. [VERIFIED: package.json]
- Minimum automated verification is `npm run build`. [VERIFIED: .planning/codebase/CONVENTIONS.md]
- Phase 1 human UAT passed for formula filtering, validation feedback, regex filtering, and inactive table behavior in a configured environment. [VERIFIED: .planning/phases/01-safe-formula-and-regex-filtering-foundation/01-HUMAN-UAT.md]

### Recommended Planner Verification Tasks

| Requirement | Verification |
|-------------|--------------|
| COND-01 | Create a named formatting rule targeting `headword` and `definition`; verify rule appears in management list and applies only to those columns. [ASSUMED] |
| COND-02 | Verify highlighted cells do not set `_isDirty`, do not alter `Entry` values, do not call save APIs, and disappear when rule is disabled/removed. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED] |
| COND-03 | Hover/focus a highlighted cell and verify the rule name is discoverable via tooltip/title/indicator text. [ASSUMED] |
| COND-04 | Toggle enable/disable, move a rule up/down, and remove it; verify local rule order affects presentation precedence while entries remain unchanged. [ASSUMED] |
| VALD-01 | Create formula validation rule such as `=ISBLANK(definition)` targeting `definition`; verify matching cells/rows show warning metadata. [ASSUMED] |
| VALD-02 | Confirm validation warning has a distinct icon/border/text cue and is not merely another highlight color. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html] |
| VALD-03 | Edit a matching cell value, switch Phase 1 filters/view modes, and edit rule definition; verify validation/formatting metadata updates without refetch or data mutation. [VERIFIED: app/pages/entries/index.vue + ASSUMED] |
| Regression | Verify inline editing, AI suggestions, selection, dirty-state persistence, pagination, search/filter controls, flat/aggregated/lexeme modes, and column resizing with overlays enabled and disabled. [VERIFIED: CLAUDE.md + app/pages/entries/index.vue] |
| Safety scan | Grep new rule overlay files for `$fetch`, `save`, `delete`, `review`, `bulk`, `eval(`, `new Function`, `import(`, `col.set`, and `entry._isDirty`. [ASSUMED] |
| Localization | Scan new Chinese UI strings for HK Traditional; avoid simplified characters listed in `CLAUDE.md`. [VERIFIED: CLAUDE.md] |

### Build Command

```bash
npm run build
```

This is the required minimum automated verification command after implementation. [VERIFIED: .planning/codebase/CONVENTIONS.md + package.json]

## Sources

### Primary (HIGH confidence)

- `.planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md` — Phase 2 goal, requirements, constraints, and implementation focus. [VERIFIED: planning context]
- `.planning/REQUIREMENTS.md` — COND/VALD requirements and out-of-scope boundaries. [VERIFIED: planning context]
- `.planning/ROADMAP.md` — Phase 2 placement and Phase 3/4 boundaries. [VERIFIED: planning context]
- `.planning/config.json` — `workflow.nyquist_validation: false` and UI-phase flags. [VERIFIED: planning config]
- `CLAUDE.md` — HK Traditional Chinese, stack, entries-table workflows, conventions. [VERIFIED: project instructions]
- `.planning/codebase/STACK.md` — installed stack, no test framework, environment notes. [VERIFIED: planning artifact]
- `.planning/codebase/CONVENTIONS.md` — extraction into composables/components, no secret logging, build verification. [VERIFIED: planning artifact]
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-RESEARCH.md` — Phase 1 architecture and integration warnings. [VERIFIED: Phase 1 artifact]
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-PATTERNS.md` — Phase 1 code patterns for utilities/composables/components. [VERIFIED: Phase 1 artifact]
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-UI-SPEC.md` — Nuxt UI design contract and Phase 1 out-of-scope boundaries. [VERIFIED: Phase 1 artifact]
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-HUMAN-UAT.md` — configured-environment human testing passed for Phase 1. [VERIFIED: Phase 1 artifact]
- `app/utils/entriesAdvancedFilter.ts` — safe regex/formula utilities and typed errors. [VERIFIED: codebase read]
- `app/utils/entriesTableConstants.ts` — `ADVANCED_FILTER_FIELDS` and field labels. [VERIFIED: codebase read]
- `app/composables/useEntriesAdvancedFilters.ts` — Phase 1 state, `buildRowContext`, filtered arrays, fail-closed validation. [VERIFIED: codebase read]
- `app/components/entries/EntriesAdvancedFilterPanel.vue` — existing Nuxt UI panel/accessibility patterns. [VERIFIED: codebase read]
- `app/components/entries/EntriesEditableCell.vue` — cell props/classes/icons/tooltips/editing behavior. [VERIFIED: codebase read]
- `app/pages/entries/index.vue` — table row rendering, advanced filter wiring, currentPageEntries, localStorage watch, mutation actions. [VERIFIED: codebase read]
- `app/composables/useEntriesTableEdit.ts` — `getCellDisplay` and `getCellClass` behavior. [VERIFIED: codebase read]
- `app/composables/useEntriesTableColumns.ts` — public editable column keys/getters/setters. [VERIFIED: codebase read]
- npm registry — Nuxt, Vue, @nuxt/ui, and Zod current versions. [VERIFIED: npm registry]
- Context7 `/vuejs/vue` — Vue Composition API `ref`, `reactive`, `computed`, and derived filtering examples. [CITED: github.com/vuejs/vue examples via Context7]
- Context7 `/websites/ui_nuxt` — Nuxt UI component docs for Button/Input/Tooltip/FieldGroup patterns. [CITED: ui.nuxt.com/docs]
- Context7 `/websites/nuxt_4_x` — Nuxt 4 app components/composables directory behavior. [CITED: nuxt.com/docs/4.x]
- MDN JavaScript `RegExp` — dynamic constructor, invalid pattern/flag errors, `lastIndex`/`g`/`y` statefulness. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp]
- OWASP ReDoS — catastrophic backtracking, evil regex traits, and browser hang risk. [CITED: owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS]
- W3C WCAG 2.2 Use of Color — color must not be the only visual means of conveying information. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html]
- W3C WCAG 2.2 Error Identification — validation errors need text identification/description. [CITED: w3.org/WAI/WCAG22/Understanding/error-identification.html]

### Secondary (MEDIUM confidence)

- No secondary sources used beyond official documentation, direct source reads, package registry, and Phase 1 verified artifacts. [VERIFIED: research process]

### Tertiary (LOW confidence)

- Assumed implementation details are explicitly listed in the Assumptions Log. [VERIFIED: this document]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — existing package versions, npm current versions, and Nuxt/Vue/Nuxt UI docs were verified. [VERIFIED: package.json + npm registry + CITED: nuxt.com/docs/4.x + ui.nuxt.com/docs]
- Architecture: HIGH — Phase 1 utilities/composables and entries-page/cell integration seams were read directly. [VERIFIED: app/utils/entriesAdvancedFilter.ts + app/composables/useEntriesAdvancedFilters.ts + app/pages/entries/index.vue + app/components/entries/EntriesEditableCell.vue]
- Rule model details: MEDIUM — read-only overlay constraints are locked, but exact rule schema/UI controls are recommended assumptions. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + ASSUMED]
- Visual distinction/accessibility: HIGH for need for non-color cues and text; MEDIUM for exact Tailwind classes until UI spec locks design. [CITED: w3.org/WAI/WCAG22/Understanding/use-of-color.html + w3.org/WAI/WCAG22/Understanding/error-identification.html + ASSUMED]
- Security/pitfalls: HIGH for arbitrary execution and mutation constraints; MEDIUM for exact static scan command coverage. [VERIFIED: .planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md + app/utils/entriesAdvancedFilter.ts + ASSUMED]
- Environment/validation: HIGH for local Node/npm/build-script detection; MEDIUM for live MongoDB/auth browser availability. [VERIFIED: environment audit + package.json + .planning/phases/01-safe-formula-and-regex-filtering-foundation/03-SUMMARY.md]

**Research date:** 2026-05-04 [VERIFIED: system currentDate]
**Valid until:** 2026-06-03 for codebase integration assumptions; 2026-05-11 for npm package/version currency and UI library docs. [ASSUMED]
