# JyutCollab Entries Table Excel Tools

## What This Is

JyutCollab is an existing collaborative Cantonese multi-syllable expression dictionary platform. This project adds Excel-like power tools to the entries table page so contributors and reviewers can find, inspect, and validate entries using conditional formatting, formula filters, and regular expressions without leaving the table workflow.

The work is focused on the existing `/entries` table: users should be able to create shareable filtered/highlighted views that make dictionary cleanup, review preparation, and data quality checks faster and more precise.

## Core Value

Users can reliably surface the exact entries or cells that need attention using safe, expressive table rules without risking accidental data mutation.

## Requirements

### Validated

- ✓ Authenticated users can browse and edit entries in a Notion-style table — existing
- ✓ Users can search and filter entries by existing supported fields such as dialect, theme, status, and text search — existing
- ✓ Users can resize columns and keep table preferences locally — existing
- ✓ Users can save and submit entry edits through protected API flows with edit history — existing
- ✓ Entries table supports flat, aggregated, and lexeme views — existing

### Active

- [ ] Add Excel-style formula filtering with a safe whitelist of supported functions and operators.
- [ ] Add regular expression support for global search, single-column filtering, conditional formatting, and data validation checks.
- [ ] Add conditional formatting that highlights matching cells in the entries table.
- [ ] Add shareable views so configured rules and filters can be reopened or sent to collaborators.
- [ ] Keep v1 read-only for these tools: rules can filter, highlight, and validate, but must not bulk-modify entry data.
- [ ] Preserve existing table editing, AI suggestions, grouping modes, keyboard navigation, and save workflows.

### Out of Scope

- Bulk edits driven by formulas or regex — high risk of accidental dictionary data corruption; v1 is inspection-only.
- Arbitrary JavaScript execution in formulas — unsafe and unnecessary for table filtering.
- Full Excel formula compatibility — v1 should support a focused, documented subset rather than recreating a spreadsheet engine.
- Backend account-level rule sync — shareable views are the v1 collaboration mechanism; persistent server-side saved views can come later if needed.
- Changing the entry status workflow or review permissions — this project augments table analysis, not moderation policy.

## Context

This is a brownfield Nuxt 4/Vue 3 application with a large entries table at `app/pages/entries/index.vue`. Existing table responsibilities include search/filter UI, view modes, inline editing, keyboard navigation, AI suggestions, column resizing, local drafts, batch selection, and save/submit/delete flows.

The requested product direction is “像 Excel 那樣”: contributors and reviewers should be able to express quality checks and narrow down large entry sets using familiar spreadsheet-like tools. The confirmed v1 direction is:

- Formula syntax should feel like Excel, not raw JavaScript.
- Formula evaluation must use a whitelist of functions/operators.
- Regex should apply to global search, single-column filters, conditional formatting, and validation checks.
- Conditional formatting should primarily highlight individual cells.
- Rules/views should be shareable.
- Formula/regex functionality should not perform bulk mutation in v1.

The project must respect the repository-wide Chinese text standard: all Chinese UI labels, messages, validation text, comments, prompts, and enum-like values must use Hong Kong Traditional Chinese.

## Constraints

- **Tech stack**: Implement within Nuxt 4, Vue 3 Composition API, TypeScript, and Nuxt UI — match existing app architecture.
- **Safety**: Do not evaluate user formulas as arbitrary JavaScript — formula execution must be parsed/interpreted through a safe whitelist.
- **Data integrity**: v1 tools are read-only overlays for filtering/highlighting/validation and must not bypass existing entry save, permission, or edit-history flows.
- **Architecture**: Keep page-level orchestration in the entries page/composables and avoid moving persistence or authorization into browser-only rule code.
- **Performance**: Rules must remain usable on large entry sets and must not make typing/search interactions feel broken in the existing table.
- **Compatibility**: Existing search/filter/grouping, local draft recovery, keyboard navigation, AI suggestions, and column resizing must continue to work.
- **Language**: User-facing Chinese text must be Hong Kong Traditional Chinese.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1 includes conditional formatting, formula filters, and regex together | User selected all three as equally important to the Excel-like workflow | — Pending |
| Formula syntax should be Excel-style | Matches the user's stated “像 Excel 那樣” mental model better than JavaScript-like expressions | — Pending |
| Formula evaluator uses whitelisted functions/operators | Prevents unsafe arbitrary code execution and keeps behavior predictable | — Pending |
| Regex applies to global search, single-column filters, conditional formatting, and validation | User selected all regex application areas for v1 | — Pending |
| Conditional formatting highlights cells, not whole rows | User prioritized locating the exact problematic field | — Pending |
| Views should be shareable | User wants collaborators to reopen or receive configured rule/filter views | — Pending |
| No formula/regex bulk modification in v1 | User accepted inspection-only v1 to avoid accidental mass changes | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
