# Roadmap: Entries Table Excel Tools

**Created:** 2026-05-03
**Granularity:** Coarse
**Total phases:** 5
**v1 requirements covered:** 24 / 24

## Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Safe Formula and Regex Filtering Foundation | Users can filter entries with safe Excel-style formulas and regex search/column filters. | FORM-01, FORM-02, FORM-03, FORM-04, REGX-01, REGX-02, REGX-03, REGX-04 | 5 |
| 2 | Conditional Formatting and Validation UI | Users can create, manage, and see cell-level formatting and validation rule matches. | COND-01, COND-02, COND-03, COND-04, VALD-01, VALD-02, VALD-03 | 5 |
| 3 | Shareable Excel-Style Views | Users can share and reopen rule/filter configurations safely. | VIEW-01, VIEW-02, VIEW-03, VIEW-04 | 4 |
| 4 | Integration Hardening and UX Verification | Rules remain read-only, responsive, localized, and compatible with existing table workflows. | SAFE-01, SAFE-02, SAFE-03, SAFE-04 | 5 |
| 5 | Basic Saved Views | Users can save, name, and manage views (public/private) instead of only sharing ephemeral URL snapshots. | VIEW-05, VIEW-06, VIEW-07 | 4 |

## Phase Details

### Phase 1: Safe Formula and Regex Filtering Foundation

**Goal:** Users can filter the entries table with safe Excel-style formulas and regex modes without breaking existing search/filter behavior.

**UI hint:** yes

**Requirements:** FORM-01, FORM-02, FORM-03, FORM-04, REGX-01, REGX-02, REGX-03, REGX-04

**Success criteria:**
1. A user can type a supported Excel-style boolean formula and see the entries table filtered to matching rows.
2. Unsupported formula syntax/functions and invalid regex patterns show clear Hong Kong Traditional Chinese validation feedback without crashing the table.
3. Formula execution is implemented through a whitelist parser/interpreter, not arbitrary JavaScript execution.
4. Global regex search and single-column regex filters work against documented display values.
5. Existing plain search, existing filters, grouping modes, and pagination still behave correctly when formula/regex filters are disabled.

**Implementation focus:**
- Define rule/filter types and normalized row context.
- Build safe formula parse/evaluate path.
- Compile and validate regex filters.
- Integrate derived filtering into the entries list/table flow.

### Phase 2: Conditional Formatting and Validation UI

**Goal:** Users can add rules that highlight matching cells and flag validation issues while preserving read-only rule behavior.

**UI hint:** yes

**Requirements:** COND-01, COND-02, COND-03, COND-04, VALD-01, VALD-02, VALD-03

**Success criteria:**
1. A user can create a named conditional formatting rule targeting one or more table columns.
2. Matching cells receive visible highlights while entry data remains unchanged.
3. Users can enable, disable, reorder, and delete rules from a rule management UI.
4. Validation rules appear visually distinct from ordinary formatting highlights.
5. Formatting and validation results update when rule definitions or relevant entry values change.

**Implementation focus:**
- Add rule management UI.
- Pass cell-level formatting metadata into table cell rendering.
- Reuse formula/regex evaluation from Phase 1 for formatting/validation.
- Make rule names discoverable for highlighted cells.

### Phase 3: Shareable Excel-Style Views

**Goal:** Users can copy a link that restores formula filters, regex settings, conditional formatting rules, and validation rules.

**UI hint:** yes

**Requirements:** VIEW-01, VIEW-02, VIEW-03, VIEW-04

**Success criteria:**
1. A user can copy a shareable view link from the entries table.
2. Opening the link restores supported formula, regex, conditional formatting, and validation configuration.
3. Invalid or unsupported shared payloads fail safely with clear feedback and do not block normal table use.
4. Serialized view state includes an explicit version so future changes can be migrated or rejected deliberately.

**Implementation focus:**
- Implement compact versioned view serialization/deserialization.
- Wire restored state to route/query handling.
- Add copy/share UI.
- Validate restored payloads before applying them.

### Phase 4: Integration Hardening and UX Verification

**Goal:** The Excel-style tools are safe, responsive, localized, and compatible with the existing entries table experience.

**UI hint:** yes

**Requirements:** SAFE-01, SAFE-02, SAFE-03, SAFE-04

**Success criteria:**
1. Formula/regex/formatting/validation rules cannot call entry mutation APIs or bulk-modify data in v1.
2. Inline editing, save/submit/delete, local draft recovery, AI suggestions, keyboard navigation, column resizing, and flat/aggregated/lexeme modes still work with rules enabled.
3. Rule evaluation is debounced/cached enough that typical typing, filtering, and editing interactions remain responsive.
4. All new user-facing Chinese UI strings use Hong Kong Traditional Chinese.
5. Manual browser verification covers golden path and edge cases for invalid formulas, invalid regex, shared views, rule ordering, and existing table workflows.

**Implementation focus:**
- Performance profiling and targeted memoization/debouncing.
- End-to-end manual UI verification in the browser.
- Regression checks for existing table behavior.
- Localization/text review.

### Phase 5: Basic Saved Views

**Goal:** Users can save, name, and manage views (public/private) instead of only sharing ephemeral URL snapshots. The "Share View" popover and the "視圖" dropdown are merged into a unified Views feature.

**UI hint:** yes

**Requirements:** VIEW-05, VIEW-06, VIEW-07

**Success criteria:**
1. A user can save the current filter/rule configuration as a named view.
2. Saved views appear in the existing "視圖" dropdown alongside the current view modes (flat/aggregated/lexeme).
3. A user can switch between their saved views from the dropdown, restoring the saved filters and rules.
4. A user can share a saved view via a link, unifying the current separate "Share View" popover into the views workflow.
5. View creation supports public (all users can see) and private (only the creator can see) visibility.
6. A user can update or delete their own saved views (permission-scoped: regular users can only delete their own views).

**Implementation focus:**
- Add saved-view persistence (server-side: MongoDB collection for named views).
- Add save/load/update/delete API endpoints for views.
- Merge the "Share View" popover into the views dropdown — sharing becomes an action on a saved view.
- Add public/private visibility toggle for views.
- Team-visible views with permissions per VIEW-06.
- Backward compatibility: anonymous shared links from Phase 3 still work alongside saved views.

**Depends on:** Phase 4 (the serialization format, composable export/restore APIs, and strict validation from Phases 1-4 provide the foundation).

## Requirement Coverage Matrix

| Requirement | Phase |
|-------------|-------|
| FORM-01 | Phase 1 |
| FORM-02 | Phase 1 |
| FORM-03 | Phase 1 |
| FORM-04 | Phase 1 |
| REGX-01 | Phase 1 |
| REGX-02 | Phase 1 |
| REGX-03 | Phase 1 |
| REGX-04 | Phase 1 |
| COND-01 | Phase 2 |
| COND-02 | Phase 2 |
| COND-03 | Phase 2 |
| COND-04 | Phase 2 |
| VALD-01 | Phase 2 |
| VALD-02 | Phase 2 |
| VALD-03 | Phase 2 |
| VIEW-01 | Phase 3 |
| VIEW-02 | Phase 3 |
| VIEW-03 | Phase 3 |
| VIEW-04 | Phase 3 |
| SAFE-01 | Phase 4 |
| SAFE-02 | Phase 4 |
| SAFE-03 | Phase 4 |
| SAFE-04 | Phase 4 |
| VIEW-05 | Phase 5 |
| VIEW-06 | Phase 5 |
| VIEW-07 | Phase 5 |

**Coverage validation:**
- v1 requirements: 24
- Requirements mapped exactly once: 24
- Unmapped requirements: 0
- Duplicate mappings: 0

## Next Step

Run `/gsd-discuss-phase 5` to gather implementation context for the basic saved views feature.

---
*Roadmap created: 2026-05-03 after initial project setup*
