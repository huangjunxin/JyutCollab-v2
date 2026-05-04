---
phase: 02-conditional-formatting-and-validation-ui
plan: 03
subsystem: ui
tags: [nuxt, vue, entries-table, conditional-formatting, validation, overlays, vitest]

requires:
  - phase: 02-conditional-formatting-and-validation-ui
    provides: Local rule overlay metadata composable from Plan 01 and presentational rule panel from Plan 02
provides:
  - Entries table wiring for local conditional formatting and validation warning rules
  - Editable cell rendering for read-only overlay highlights, warning icon cues, and rule-name tooltips
  - Source-level TDD coverage for cell metadata rendering and page-level rule panel/composable integration
affects: [entries-table, conditional-formatting-ui, validation-ui, shareable-views, phase-03]

tech-stack:
  added: []
  patterns:
    - Page-level composable orchestration binds rule overlays to rendered entry rows only
    - Editable cells consume optional metadata props and merge fixed safe classes with existing table classes
    - Rule UI remains local-only and read-only with no persistence, URL, API, save, delete, review, or bulk coupling

key-files:
  created:
    - app/components/entries/__tests__/EntriesEditableCell.test.ts
    - app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts
  modified:
    - app/components/entries/EntriesEditableCell.vue
    - app/pages/entries/index.vue

key-decisions:
  - "Derived rule overlay evaluation from visible entry rows (`tableRows` entry rows) so flat and expanded grouped views match the table render loop without changing filtered collections."
  - "Passed overlay metadata into cells via an optional `cellMeta` prop guarded by the existing advanced-filter field allowlist, keeping unsupported columns out of the overlay boundary."
  - "Kept validation warnings non-mutating and non-color-only by adding a warning icon/title alongside merged safe highlight classes."

patterns-established:
  - "Rule overlays are instantiated after advanced filters and use `advancedFilters.buildRowContext` directly for evaluator parity."
  - "Cell-level metadata is rendered only in display mode; editing controls, autosize, AI buttons, review notes, selected-cell rings, and dirty-state rows remain under their existing logic."
  - "Rules panel actions map directly to `useEntriesRuleOverlays` methods and do not introduce persistence or backend calls."

requirements-completed: [COND-01, COND-02, COND-03, COND-04, VALD-01, VALD-02, VALD-03]

duration: 7min 28s
completed: 2026-05-03
---

# Phase 02 Plan 03: Entries Table Rule Overlay Wiring Summary

**Local conditional formatting and validation warnings wired into rendered entries table cells with rule panel controls and read-only metadata**

## Performance

- **Duration:** 7min 28s
- **Started:** 2026-05-03T18:50:46Z
- **Completed:** 2026-05-03T18:58:14Z
- **Tasks:** 2 implementation tasks completed; stopped before 1 blocking human-verification checkpoint
- **Files modified:** 4

## Accomplishments

- Added optional `EntryCellOverlayMeta` support to `EntriesEditableCell.vue`, merging safe overlay class names with existing cell classes without replacing selection, wrap, editing, review-note, AI, or dirty-state behavior.
- Added validation warning rendering with `i-heroicons-exclamation-triangle`, `aria-label="驗證警告"`, and rule-name title/tooltip text so warnings have a non-color cue.
- Imported and mounted `EntriesRuleOverlayPanel` beside the advanced filter trigger with a dedicated below-toolbar `#entries-rule-overlay-host`.
- Instantiated `useEntriesRuleOverlays` using rendered entry rows and `advancedFilters.buildRowContext`, then passed per-cell metadata into supported editable columns.
- Added Vitest source checks for editable-cell metadata rendering and entries-page rule wiring/persistence exclusions.

## Task Commits

Each task was committed atomically with TDD RED/GREEN commits:

1. **Task 1: Add optional overlay metadata rendering to editable cells**
   - `e28e8a2` test(02-03): add failing tests for editable cell overlays
   - `e816496` feat(02-03): render editable cell rule overlays
2. **Task 2: Wire rule composable and panel into entries page**
   - `451324f` test(02-03): add failing tests for entries rule wiring
   - `0dd1763` feat(02-03): wire rules panel into entries table

**Plan metadata:** pending final documentation commit

_Note: Both TDD tasks have paired RED and GREEN commits._

## Files Created/Modified

- `app/components/entries/EntriesEditableCell.vue` - Accepts optional read-only overlay metadata, merges overlay classes/titles, and renders validation warning icon cues.
- `app/pages/entries/index.vue` - Binds the rule panel to the entries toolbar, creates the overlay composable from rendered rows, and passes metadata into editable cells.
- `app/components/entries/__tests__/EntriesEditableCell.test.ts` - Source-level tests for typed metadata prop, class/title merge, warning icon, and mutation exclusions.
- `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts` - Source-level tests for panel/composable imports, host placement, visible-row wiring, metadata propagation, and rule persistence exclusions.

## Decisions Made

- Derived `visibleRuleOverlayEntries` from `visibleEntryRows` rather than raw filtered entries so overlays align with the rows the table is currently rendering, including collapsed/expanded grouped modes.
- Reused `advancedFilterFieldOptions` for rule target options and added an `isAdvancedFilterFieldKey` guard before calling `getCellOverlayMeta`, preserving the field allowlist boundary from Phase 1.
- Rendered overlay metadata in display mode only, because edit mode already owns focus/input/autosize behavior and overlays are intended as read-only table affordances.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed locked dependencies for TDD test execution**
- **Found during:** Task 1 (Add optional overlay metadata rendering to editable cells)
- **Issue:** `npx vitest` could not resolve the already-declared `vitest` package in this fresh worktree because dependencies were not installed.
- **Fix:** Ran `npm install`, which restored dependencies from `package-lock.json` and generated Nuxt types via the existing postinstall script.
- **Files modified:** No tracked source files changed.
- **Verification:** `npx vitest run app/components/entries/__tests__/EntriesEditableCell.test.ts`; `npm run build`
- **Committed in:** Not applicable; dependency install produced no tracked changes.

---

**Total deviations:** 1 auto-fixed (1 Rule 3 blocking)
**Impact on plan:** Required to execute mandated TDD verification in the fresh worktree. No product scope expansion.

## Issues Encountered

- The first RED test command failed before assertions because `vitest` was not installed in the worktree; `npm install` resolved this.
- `npm run build` emits existing chunk-size and Tailwind sourcemap warnings; build completes successfully.

## User Setup Required

None - no external service configuration required for implementation verification. The checkpoint requires an authenticated local browser session with loaded entries for visual/UAT verification.

## TDD Gate Compliance

- RED commits exist before GREEN commits for both TDD tasks.
- GREEN commits exist after each corresponding RED commit.
- No refactor commits were needed.

## Known Stubs

None. Stub-pattern scan returned no hits in files created or modified by this plan.

## Threat Flags

None. The plan adds local UI metadata rendering and local rule state wiring only; no new network endpoints, auth paths, file access, or trust-boundary schema changes were introduced beyond the threat model.

## Verification

- `npx vitest run app/components/entries/__tests__/EntriesEditableCell.test.ts`
- `npx vitest run app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts`
- `npx vitest run app/components/entries/__tests__/EntriesEditableCell.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts`
- `npm run build`
- `grep -R "EntryCellOverlayMeta\|cellMeta\|overlayClassNames\|i-heroicons-exclamation-triangle\|驗證警告" app/components/entries/EntriesEditableCell.vue >/dev/null`
- `grep -R "EntriesRuleOverlayPanel\|useEntriesRuleOverlays\|entries-rule-overlay-host\|advancedFilters\.buildRowContext\|getCellOverlayMeta" app/pages/entries/index.vue >/dev/null`
- `grep -R "localStorage.*rule\|\$fetch.*rule\|save.*rule\|delete.*rule\|review.*rule\|bulk.*rule" app/pages/entries/index.vue app/components/entries/EntriesEditableCell.vue; test $? -ne 0`
- `grep -R "col\.set\|_isDirty\|selectedEntryIds\|batch" app/components/entries/EntriesEditableCell.vue; test $? -ne 0`

## Checkpoint Status

Implementation tasks are complete and SUMMARY is created. The plan stops at the blocking `checkpoint:human-verify` for browser verification of placement, visual distinction, tooltips, and preservation of interactive table behavior.

## Self-Check: PASSED

- Verified created/modified files exist: `app/components/entries/EntriesEditableCell.vue`, `app/pages/entries/index.vue`, `app/components/entries/__tests__/EntriesEditableCell.test.ts`, `app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts`, and this summary.
- Verified task commits exist: `e28e8a2`, `e816496`, `451324f`, and `0dd1763`.

---
*Phase: 02-conditional-formatting-and-validation-ui*
*Completed: 2026-05-03*
