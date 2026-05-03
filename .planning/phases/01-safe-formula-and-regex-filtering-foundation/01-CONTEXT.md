# Phase 1: Safe Formula and Regex Filtering Foundation - Context

**Gathered:** 2026-05-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the foundation for filtering the existing entries table with safe Excel-style formulas and regex modes. It covers formula parsing/evaluation, regex validation/compilation, stable field references, and integration with current search/filter/table display behavior. Conditional formatting UI, validation rule UI, and shareable views are separate later phases.

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

- The user wants this to feel “像 Excel 那樣”: familiar enough for spreadsheet-style filtering, but not a full spreadsheet engine.
- Phase 1 should focus on filtering and rule foundation only. Cell highlights, validation badges, rule management, and shareable view links belong to later phases.
- Rules are inspection-only throughout v1 and must not bulk-modify dictionary entries.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project and phase scope
- `.planning/PROJECT.md` — Project vision, locked product decisions, out-of-scope boundaries, and safety constraints.
- `.planning/REQUIREMENTS.md` — Phase 1 requirements `FORM-01` through `FORM-04` and `REGX-01` through `REGX-04`.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and explicit implementation focus.
- `.planning/research/SUMMARY.md` — Research summary and recommended build order for Excel-style table tools.

### Codebase maps
- `.planning/codebase/CONVENTIONS.md` — Frontend/composable conventions, entries table guidance, and Hong Kong Traditional Chinese requirement.
- `.planning/codebase/STRUCTURE.md` — Where to add new entry table composables, components, utilities, and type definitions.
- `.planning/codebase/STACK.md` — Nuxt/Vue/TypeScript/Nuxt UI stack and build verification constraints.

### Source integration points
- `app/pages/entries/index.vue` — Main entries table orchestration, search/filter UI, row rendering, `tableRows`, `currentPageEntries`, and cell integration.
- `app/composables/useEntriesList.ts` — Existing server-backed list/search/filter/grouping/pagination owner.
- `app/composables/useEntriesTableColumns.ts` — Stable editable column definitions and `EditableColumnDef.get()` display-value source.
- `app/composables/useEntriesTableEdit.ts` — Existing editable cell display behavior.
- `app/components/entries/EntriesEditableCell.vue` — Cell rendering contract that later phases will extend for formatting metadata.
- `app/utils/entriesTableConstants.ts` — Existing table constants and sortable column key conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/composables/useEntriesList.ts`: Owns API fetching, Nuxt payload cache, existing search/filter query params, grouping modes, pagination, and draft restoration. Phase 1 should layer advanced filters after this composable returns data.
- `app/composables/useEntriesTableColumns.ts`: Provides `EditableColumnDef` with `key`, `label`, `type`, `get`, and `set`. Use `key` plus `get(entry)` as the basis for formula/regex field references and display values.
- `app/pages/entries/index.vue`: Already computes `displayGroups`, `tableRows`, and `currentPageEntries`; these are the key derived-state integration points for advanced filtering.
- `app/components/entries/EntriesEditableCell.vue`: Accepts `displayText` and `cellClass`, which can support later cell-formatting phases without rewriting the cell component.

### Established Patterns
- Entry table state belongs in focused composables before adding more logic to `app/pages/entries/index.vue`, which is already large.
- Existing table filters use `searchQuery`, `filters`, `sortBy`, `sortOrder`, `currentPage`, and `pagination` through `useEntriesList`.
- Existing UI copy is inline Hong Kong Traditional Chinese and uses Nuxt UI components such as `UInput`, `USelectMenu`, `UButton`, and `UTooltip`.
- Browser-only state such as drafts and column widths uses localStorage guarded through composables.

### Integration Points
- Add a new entries-table composable such as `useEntriesAdvancedFilters` or similar to own formula/regex state, validation errors, row context generation, and derived filtering.
- Use `EditableColumnDef[]` from `useEntriesTableColumns` as the canonical set of fields exposed to formulas and regex column filters.
- Integrate derived results around the current `displayGroups`, `tableRows`, and `currentPageEntries` computed values so selection, editing, and AI flows receive the filtered set.
- Keep `/api/entries` unchanged in Phase 1; server-backed filters continue to constrain the fetched dataset before client-side advanced filters run.

</code_context>

<deferred>
## Deferred Ideas

- Cell-level conditional formatting highlights — Phase 2.
- Validation rule UI and warning styling — Phase 2.
- Shareable view URL serialization/restoration — Phase 3.
- Performance hardening and full manual browser verification across all existing workflows — Phase 4.
- Backend account-synced saved views — v2 requirement.
- Formula/regex-driven bulk modification — v2 only, after preview and edit-history safeguards.

</deferred>

---

*Phase: 01-safe-formula-and-regex-filtering-foundation*
*Context gathered: 2026-05-03*
