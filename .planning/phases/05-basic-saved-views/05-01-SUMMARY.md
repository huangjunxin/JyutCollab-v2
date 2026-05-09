---
phase: 05-basic-saved-views
plan: 01
subsystem: api
tags: [nuxt, h3, mongoose, zod, saved-views, auth]

requires:
  - phase: 03-shareable-excel-style-views
    provides: EntriesSharedViewState v1 serialization and validation boundary
provides:
  - SavedView Mongoose model backed by the savedviews collection
  - CRUD API routes under /api/views with owner/admin mutation checks
  - Public GET /api/views/:id auth middleware allowlist for shared view links
affects: [05-basic-saved-views, saved-view-ui, entries-table]

tech-stack:
  added: []
  patterns: [Mongoose model with custom string id, H3 CRUD endpoints, source-level API contract tests]

key-files:
  created:
    - server/utils/SavedView.ts
    - server/api/views/index.get.ts
    - server/api/views/index.post.ts
    - server/api/views/[id].get.ts
    - server/api/views/[id].put.ts
    - server/api/views/[id].delete.ts
    - server/api/views/validation.ts
    - server/api/views/response.ts
    - app/components/entries/__tests__/EntriesSavedViewsApiContract.test.ts
  modified:
    - server/middleware/auth.ts

key-decisions:
  - "Stored creatorName as optional safe display metadata while keeping creatorId as the authorization source of truth."
  - "Kept admin-only override for update/delete and intentionally excluded reviewer override per VIEW-06/D-11 deferral."
  - "Added route-local validation helpers to reuse the EntriesSharedViewState v1 shape without changing the Phase 3 shared-view version."

patterns-established:
  - "Saved view API responses use DTO shaping and never expose Mongo _id."
  - "GET /api/views/:id is public; list/create/update/delete remain session-protected."

requirements-completed: [VIEW-05, VIEW-06, VIEW-07]

duration: unknown
completed: 2026-05-08
---

# Phase 05 Plan 01: Server Saved Views Foundation Summary

**MongoDB-backed saved views with v1 shared-view state validation, owner-scoped CRUD endpoints, and public view-ID resolution**

## Performance

- **Duration:** Not recorded by orchestrator in this manual no-commit run
- **Started:** Not recorded
- **Completed:** 2026-05-08T03:15:36Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `SavedView` Mongoose model for the `savedviews` collection with custom `view_...` IDs, creator metadata, public/private visibility, mixed validated state, timestamps, and indexes.
- Implemented `/api/views` list/create plus `/api/views/[id]` get/update/delete handlers with HK Traditional Chinese messages, Zod request validation, v1 saved-view state validation, and DTO response shaping.
- Updated auth middleware so unauthenticated recipients can resolve `GET /api/views/:id` while `/api/views` list and all mutations remain protected.
- Added source-level contract tests proving the model, endpoint, authorization, public allowlist, and non-leakage contracts.

## Task Commits

No commits were created because the user explicitly requested: "Do not commit."

## Files Created/Modified

- `server/utils/SavedView.ts` - Saved view Mongoose model for the `savedviews` collection.
- `server/api/views/index.get.ts` - Authenticated list endpoint returning own views plus all public views.
- `server/api/views/index.post.ts` - Authenticated create endpoint with `view_${nanoid(12)}` IDs, HK Traditional name normalization, and state validation.
- `server/api/views/[id].get.ts` - Public view-ID resolution endpoint returning only safe saved-view DTO fields.
- `server/api/views/[id].put.ts` - Owner/admin update endpoint for name, visibility, and state.
- `server/api/views/[id].delete.ts` - Owner/admin delete endpoint.
- `server/api/views/validation.ts` - Route-local `EntriesSharedViewState` v1 validation and normalization helper.
- `server/api/views/response.ts` - DTO shaping helper that omits Mongo `_id` and any session/private fields.
- `server/middleware/auth.ts` - Public allowlist branch for `GET /api/views/:id` only.
- `app/components/entries/__tests__/EntriesSavedViewsApiContract.test.ts` - Source-level API contract tests for Phase 5 saved views.

## Decisions Made

- Stored `creatorName` as optional safe display metadata for future UI banners/dropdowns while using `creatorId` from session as the authoritative identity for permissions.
- Implemented only owner/admin mutation permissions; reviewer delete/update of public views remains deferred as specified by D-11.
- Added a route-local validation helper rather than changing `app/utils/entriesSharedView.ts`, preserving `ENTRIES_SHARED_VIEW_VERSION = 1` and avoiding client UI/dependent wave work.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added DTO response helper**
- **Found during:** Task 2 (Implement saved-view CRUD endpoints)
- **Issue:** Returning raw Mongoose documents could expose Mongo `_id` or other internal fields, conflicting with T-05-01-03.
- **Fix:** Added `toSavedViewDto()` and used it in all read/write responses.
- **Files modified:** `server/api/views/response.ts`, CRUD route files
- **Verification:** Contract test checks public GET source has no `_id` DTO field and build passes.

**2. [Rule 3 - Blocking] Fixed server import aliases for Nitro build**
- **Found during:** Task 2 validation
- **Issue:** Nitro resolved `~/server/utils/SavedView` to `app//server/utils/SavedView`, causing `npm run build` to fail.
- **Fix:** Switched new server route imports for server utilities to relative paths matching existing server route patterns.
- **Files modified:** `server/api/views/index.get.ts`, `server/api/views/index.post.ts`, `server/api/views/[id].get.ts`, `server/api/views/[id].put.ts`, `server/api/views/[id].delete.ts`, `server/api/views/response.ts`
- **Verification:** `npm run build` passes.

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes were required for safe API output and build correctness; no client UI or deferred features were implemented.

## Issues Encountered

- The worktree initially lacked Phase 3 shared-view utility files, so the implementation and final validation were applied in the requested root repository at `/Users/trenton/Projects/JyutCollab-v2`.
- Initial build failed because server routes used the `~/server/...` alias; fixed by using relative server imports.

## Validation

- `npm exec --prefix /Users/trenton/Projects/JyutCollab-v2 -- vitest run --root /Users/trenton/Projects/JyutCollab-v2 app/components/entries/__tests__/EntriesSavedViewsApiContract.test.ts` - passed (2 files, 12 tests; includes duplicate worktree discovery from current shell context).
- `npm --prefix /Users/trenton/Projects/JyutCollab-v2 run build` - passed.

## Known Stubs

None detected in files created or modified for this plan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Server-side saved views foundation is ready for client UI integration in downstream Phase 5 plans.
- Downstream UI should call `GET /api/views` for dropdown/manage data, `POST /api/views` to save current state, and `GET /api/views/[id]` for `?view=view_...` resolution.

## Self-Check: PASSED

- Created files exist at the expected absolute paths under `/Users/trenton/Projects/JyutCollab-v2`.
- Required validations passed.
- No commits were expected or created due to the user's explicit no-commit instruction.

---
*Phase: 05-basic-saved-views*
*Completed: 2026-05-08*
