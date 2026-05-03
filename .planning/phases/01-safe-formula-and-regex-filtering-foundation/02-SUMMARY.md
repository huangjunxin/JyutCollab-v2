---
phase: 01-safe-formula-and-regex-filtering-foundation
plan: 02
subsystem: filtering
tags: [nuxt, vue, typescript, formula-filters, regex-filters, entries-table]

requires:
  - phase: 01-safe-formula-and-regex-filtering-foundation
    provides: Safe formula and regex utility helpers from Plan 01
provides:
  - Advanced filter composable with formula, global regex, and column regex state
  - Client-side derived filtered flat and grouped entry collections
  - Entries table wiring that preserves server-backed search and source draft persistence
  - Keyboard navigation over visible advanced-filtered entry rows
affects: [phase-01-plan-03, conditional-formatting, validation-rules, shareable-views, entries-table]

tech-stack:
  added: []
  patterns:
    - Vue composable derives filtered collections over useEntriesList source arrays
    - Advanced filters return original arrays by reference when inactive
    - Group filtering shallow-clones group wrappers while preserving Entry object references

key-files:
  created:
    - app/composables/useEntriesAdvancedFilters.ts
  modified:
    - app/pages/entries/index.vue

key-decisions:
  - "Kept formula and regex filtering entirely client-side over data returned by useEntriesList."
  - "Preserved Entry object identity in filtered arrays so editing, selection, AI suggestions, and dirty-state tracking continue to operate on source objects."
  - "Left localStorage draft persistence watching source entries/groups instead of advanced-filtered collections."

patterns-established:
  - "Advanced filter composables own pending/applied filter state and expose derived arrays without owning API fetches."
  - "Entries page tableRows/currentPageEntries/displayGroups consume filtered data while useEntriesList remains the server query owner."

requirements-completed: [FORM-01, FORM-02, FORM-04, REGX-01, REGX-02, REGX-03, REGX-04]

duration: 9 min
completed: 2026-05-03
---

# Phase 01 Plan 02: Advanced Filter Composable and Derived Table Flow Summary

**Client-side advanced formula and regex filtering layer wired into entries table rows without changing server-backed search, grouping, pagination, or draft persistence**

## Performance

- **Duration:** 9 min
- **Started:** 2026-05-03T10:31:40Z
- **Completed:** 2026-05-03T10:41:06Z
- **Tasks:** 5
- **Files modified:** 2

## Accomplishments

- Created `useEntriesAdvancedFilters` with pending/applied formula, global regex, column regex, typed error state, loaded/visible counts, and apply/clear actions.
- Added read-only row context construction from `EditableColumnDef.get` display values via `getCellDisplay`, without calling column setters or mutating entries.
- Implemented derived filtering for flat, aggregated, and lexeme collections, returning source arrays by reference when inactive and preserving `Entry` object references when active.
- Wired entries page display groups, table rows, current-page entries, and empty-state derivation to use advanced-filtered data while leaving `useEntriesList` query ownership unchanged.
- Updated table keyboard navigation to index visible filtered entry rows rather than hidden source `entries` rows.

## Task Commits

Each task was committed atomically:

1. **Task 02.1: Create advanced filter composable state and row context builder** - `50893e2` (feat)
2. **Task 02.2: Implement derived matching and filtered collections** - `e6d90b0` (feat)
3. **Task 02.3: Add apply and clear actions with fail-closed validation** - `fce7bc5` (feat)
4. **Task 02.4: Wire filtered data into entries page derived rows** - `5d0347c` (feat)
5. **Task 02.5: Update keyboard navigation to visible filtered entry rows** - `280fa20` (feat)

**Plan metadata:** pending final docs commit

## Files Created/Modified

- `app/composables/useEntriesAdvancedFilters.ts` - New composable for advanced filter state, validation, row context building, rule matching, derived filtered collections, counts, and apply/clear actions.
- `app/pages/entries/index.vue` - Imports and initializes advanced filters, derives visible table/group/selection inputs from filtered data, and navigates visible filtered entry rows.

## Decisions Made

- Kept formula and regex filtering entirely client-side after `useEntriesList` returns data, matching the threat model and avoiding backend query/cache changes.
- Used table display strings from `getCellDisplay` as the row context source so formula and regex matching mirrors the existing entries table presentation.
- Preserved local draft persistence over raw source `entries`, `aggregatedGroups`, and `lexemeGroups` so hidden dirty rows are still saved.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npm run build` passed. The build emitted pre-existing Nuxt/Vite warnings about large chunks and Tailwind sourcemaps, but no errors.

## Verification

- `npm run build` passed successfully.
- Confirmed `app/composables/useEntriesAdvancedFilters.ts` has no imports from server APIs, save/delete composables, or mutation helpers.
- Confirmed `app/pages/entries/index.vue` still calls `useEntriesList(viewMode, searchQuery, filters, sortBy, sortOrder, ...)` with the existing server-backed signature.
- Confirmed task acceptance criteria with targeted grep checks before each task commit.
- Browser/manual verification is deferred until Plan 03 creates the advanced filter UI component.

## Known Stubs

None. Stub scan only found existing UI placeholder attributes in `app/pages/entries/index.vue`; they are normal input placeholders and not unwired data stubs.

## Threat Flags

None. This plan introduced no new network endpoints, auth paths, file access patterns, schema changes, or trust-boundary changes.

## Self-Check: PASSED

- Found created/modified files: `app/composables/useEntriesAdvancedFilters.ts`, `app/pages/entries/index.vue`, and this summary.
- Found task commits in git history: `50893e2`, `e6d90b0`, `fce7bc5`, `5d0347c`, `280fa20`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 01 Plan 03 to build the advanced filter UI component/panel on top of the composable state and derived table flow. No blockers.

---
*Phase: 01-safe-formula-and-regex-filtering-foundation*
*Completed: 2026-05-03*
