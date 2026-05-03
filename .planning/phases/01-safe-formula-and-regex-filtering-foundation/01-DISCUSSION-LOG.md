# Phase 1: Safe Formula and Regex Filtering Foundation - Discussion Log

**Date:** 2026-05-03
**Mode:** auto
**Status:** Complete

## Phase Goal

Users can filter the entries table with safe Excel-style formulas and regex modes without breaking existing search/filter behavior.

## Auto-Resolved Gray Areas

### 1. Formula subset

**Decision:** Implement a small Excel-style formula subset rather than JavaScript-like expressions or full Excel compatibility.

**Rationale:** The user asked for behavior that feels “像 Excel 那樣”, but Phase 1 only needs a safe filtering foundation. A limited whitelist gives users familiar spreadsheet-style power while keeping execution predictable and safe.

**Locked guidance:** Support boolean comparison operators plus `AND`, `OR`, `NOT`, `LEN`, `ISBLANK`, `REGEXMATCH`, `CONTAINS`, `STARTSWITH`, and `ENDSWITH` unless planning/research finds a strong reason to adjust exact names.

### 2. Field reference model

**Decision:** Use stable editable table column keys as public formula/regex field names.

**Rationale:** `EditableColumnDef.key` already maps to user-visible table columns, and `EditableColumnDef.get(entry)` provides the display-facing value. This avoids inventing a second field vocabulary and keeps rule matching aligned with what users see.

**Locked guidance:** Expose `headword`, `dialect`, `phonetic`, `entryType`, `theme`, `definition`, `register`, and `status` in v1. Rule evaluation may use a row-context adapter, but must not mutate entries or call column setters.

### 3. Regex mode

**Decision:** Add client-side regex filtering over the currently loaded entries/group data.

**Rationale:** Phase 1 must not change the `/api/entries` query API or normal search semantics. Regex should be an explicit advanced mode so plain search, server-backed filters, sorting, pagination, and grouping keep their current behavior.

**Locked guidance:** Global regex search should be distinct from default search. Single-column regex filters should evaluate against the same normalized display values used by formula evaluation.

### 4. Entries table integration

**Decision:** Add advanced formula/regex filtering as a derived client-side layer over `useEntriesList` results.

**Rationale:** `useEntriesList` already owns API fetching, caching, existing filters, sorting, pagination, and grouped responses. Replacing it would increase regression risk in the large entries table page.

**Locked guidance:** Integrate around derived state for `entries`, `aggregatedGroups`, `lexemeGroups`, `displayGroups`, `tableRows`, and `currentPageEntries` so selection, editing, AI suggestions, dirty-state handling, and row rendering remain compatible.

### 5. Error and empty-state behavior

**Decision:** Invalid formulas or regex patterns fail closed for the advanced rule only.

**Rationale:** A bad advanced rule should not clear existing data, crash the table, or trigger unexpected refetches. Users should keep seeing their current table data with clear Hong Kong Traditional Chinese validation feedback.

**Locked guidance:** Invalid advanced filters are not applied. Valid advanced filters that match nothing should use the existing empty-state pattern with copy indicating the advanced filter found no matching entries.

## Deferred Items

- Conditional formatting highlights are Phase 2.
- Validation rule UI and warning styling are Phase 2.
- Shareable view serialization/restoration is Phase 3.
- Performance hardening and full manual browser regression verification are Phase 4.
- Formula/regex-driven bulk modifications remain out of scope for v1.

## Canonical Output

See `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md` for downstream planning and implementation guidance.
