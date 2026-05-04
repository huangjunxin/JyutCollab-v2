---
phase: 03-shareable-excel-style-views
plan: 02
subsystem: ui
tags: [nuxt-ui, vue, vitest, shareable-views, accessibility]

requires:
  - phase: 03-shareable-excel-style-views
    provides: 03-01 shared-view serialization constants and page-supplied URL/version contract
provides:
  - Presentational share-view popover component for entries toolbar wiring
  - Source-level regression tests for copy, accessibility, fallback, and local-only safety
affects: [03-shareable-excel-style-views, entries-table, view-sharing]

tech-stack:
  added: []
  patterns:
    - Source-level Vue component contract tests using Vitest readFileSync
    - Presentational Nuxt UI popover with copy and clear-query emits only

key-files:
  created:
    - app/components/entries/EntriesShareViewPopover.vue
    - app/components/entries/__tests__/EntriesShareViewPopover.test.ts
  modified: []

key-decisions:
  - "Kept EntriesShareViewPopover presentational by accepting page-generated URL/status props and emitting only copy and clear-share-query actions."
  - "Used Nuxt UI UPopover/UTooltip/UButton/UBadge/UAlert/UInput primitives to match the existing toolbar density and accessibility contract."

patterns-established:
  - "Share-view UI displays exact Hong Kong Traditional Chinese copy from 03-UI-SPEC and leaves routing, clipboard implementation, persistence, and restore logic to page wiring."
  - "Source tests ban backend, localStorage, direct route mutation, saved-view, and entry-mutation coupling in the popover source."

requirements-completed: [VIEW-01, VIEW-03, VIEW-04]

duration: 4min
completed: 2026-05-04
---

# Phase 03 Plan 02: Share Popover UI Summary

**Presentational Nuxt UI share popover with exact Hong Kong Traditional copy, accessible copy feedback, restored/error states, and source-level local-only safety tests**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-04T14:16:23Z
- **Completed:** 2026-05-04T14:20:32Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `EntriesShareViewPopover.vue` with icon-only `分享目前視圖` trigger, version metadata, empty state, restored badge, copy success/error feedback, invalid shared-view alert, and readonly URL fallback.
- Added source-level Vitest coverage that locks required props/emits, Nuxt UI primitives, accessibility markers, exact UI-SPEC copy, and local-only safety bans.
- Verified the component remains presentational: no backend calls, no localStorage, no route mutation/navigation, no entry mutation, and no saved-view persistence.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create source-level tests for share popover contract** - `b400cf9` (test)
2. **Task 2: Implement presentational share popover component** - `7b3de23` (feat)

_Note: TDD ordering was followed: the source test was committed first and failed because the component did not exist; implementation was committed after the test passed._

## Files Created/Modified

- `app/components/entries/EntriesShareViewPopover.vue` - Presentational Nuxt UI share popover that renders page-supplied generated URL, shareability, version, counts, restored/error status, and copy fallback UI.
- `app/components/entries/__tests__/EntriesShareViewPopover.test.ts` - Source-level regression tests for props/emits, exact Hong Kong Traditional copy, accessibility markers, state affordances, and local-only safety constraints.

## Decisions Made

- Kept `EntriesShareViewPopover` presentational by accepting page-generated URL/status props and emitting only `copy` and `clear-share-query` actions.
- Used Nuxt UI `UPopover`, `UTooltip`, `UButton`, `UBadge`, `UAlert`, and `UInput` primitives to match the existing toolbar density and accessibility contract.

## Verification

- `cd /Users/trenton/Projects/JyutCollab-v2 && npx vitest run app/components/entries/__tests__/EntriesShareViewPopover.test.ts` - Passed, 1 file / 4 tests.
- `cd /Users/trenton/Projects/JyutCollab-v2 && npm run build` - Passed; Nuxt build completed with existing chunk-size and Tailwind sourcemap warnings only.
- `cd /Users/trenton/Projects/JyutCollab-v2 && grep -R "分享目前視圖\|複製視圖連結\|視圖連結已複製。\|無法複製連結。請手動複製下方網址。\|已套用分享視圖\|清除分享參數" app/components/entries/EntriesShareViewPopover.vue app/components/entries/__tests__/EntriesShareViewPopover.test.ts` - Passed.
- `cd /Users/trenton/Projects/JyutCollab-v2 && ! grep -R "\$fetch\|localStorage\|navigateTo\|router\.push\|router\.replace\|save.*shared\|delete.*shared\|review.*shared\|bulk.*shared\|_isDirty" app/components/entries/EntriesShareViewPopover.vue` - Passed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 03-03 can wire this presentational component into `app/pages/entries/index.vue` by supplying generated URL/version/count/status props and handling `copy` plus `clear-share-query` emits. The popover itself does not implement route mutation, clipboard calls, backend persistence, localStorage, entry mutation, or saved views.

## Self-Check: PASSED

- Found: `/Users/trenton/Projects/JyutCollab-v2/app/components/entries/EntriesShareViewPopover.vue`
- Found: `/Users/trenton/Projects/JyutCollab-v2/app/components/entries/__tests__/EntriesShareViewPopover.test.ts`
- Found: commit `b400cf9`
- Found: commit `7b3de23`

---
*Phase: 03-shareable-excel-style-views*
*Completed: 2026-05-04*
