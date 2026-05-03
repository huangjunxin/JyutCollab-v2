---
phase: 02-conditional-formatting-and-validation-ui
phase_name: Conditional Formatting and Validation UI
status: planning
created: "2026-05-04T00:00:00.000Z"
requirements:
  - COND-01
  - COND-02
  - COND-03
  - COND-04
  - VALD-01
  - VALD-02
  - VALD-03
---

# Phase 02 Context: Conditional Formatting and Validation UI

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
3. Users can enable, disable, reorder, and delete rules from a rule management UI.
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
