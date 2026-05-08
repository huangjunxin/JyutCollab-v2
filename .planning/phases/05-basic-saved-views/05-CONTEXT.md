# Phase 5: Basic Saved Views - Context

**Gathered:** 2026-05-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 adds basic saved views to the entries table, unifying the current separate "Share View" popover and "視圖" dropdown into a single cohesive feature. Users save named views with public/private visibility, switch between them from the existing dropdown, and share them via links — replacing the ephemeral URL-only sharing from Phase 3.

Saved views reuse the existing `EntriesSharedViewState` serialization format from Phase 3. This phase adds server-side persistence (MongoDB collection + API endpoints) and merges the sharing UI into the views dropdown.

</domain>

<decisions>
## Implementation Decisions (from User Feedback)

### Unify Share + Views
- **D-01:** The "Share View" popover and the "視圖" dropdown must become a single unified feature. Sharing is an action on a saved view, not a separate popover that generates anonymous ephemeral URLs.
- **D-02:** The existing view mode dropdown (flat/aggregated/lexeme) should be extended to include saved views as selectable items. Selecting a saved view restores its filters and rules.
- **D-03:** Creating a view saves the current filter/rule state. Once saved, the view can be shared via link using the same `?view=` query parameter mechanism already built in Phase 3.

### Permission Model
- **D-04:** Regular users can create, update, and delete their own saved views. They cannot delete or modify views created by other users.
- **D-05:** Reviewers/admins may have additional permissions for team-visible views per VIEW-06.
- **D-06:** Views have two visibility levels: `public` (all authenticated users can see and use) and `private` (only the creator can see and use).

### Backward Compatibility
- **D-07:** Anonymous shared links from Phase 3 (`?view=` with base64url-encoded payload) must continue to work. Opening such a link applies the view state as before, and the UI should offer to let the user save it as a named view.
- **D-08:** The existing `EntriesSharedViewState` Zod schema and encode/decode utilities remain the serialization foundation. Saved views store this same state structure plus metadata (name, creator, visibility, timestamps).

### Data Model
- **D-09:** Saved views are stored in a new MongoDB collection (`savedviews`) with fields: `id` (string), `name` (string, HK Traditional), `creatorId` (string), `visibility` (`'public' | 'private'`), `state` (validated `EntriesSharedViewState`), `createdAt`, `updatedAt`.
- **D-10:** The API provides standard CRUD: `GET /api/views` (list user's own + public views), `POST /api/views` (create), `PUT /api/views/[id]` (update own), `DELETE /api/views/[id]` (delete own).
- **D-11:** Admin/reviewer delete of any public view is deferred to VIEW-06 planning.

### URL Strategy
- **D-12:** Shareable URLs use view ID: `?view=view_abc123`. The client calls `GET /api/views/[id]` to fetch the `EntriesSharedViewState` and applies it. This allows views to be updated without changing the share URL.
- **D-13:** Phase 3 anonymous embedded payloads (`?view=<base64url>`) remain supported. The `decodeEntriesSharedView()` function is the discriminator: if `?view=` starts with `eyJ` (base64url JSON), treat as embedded payload; otherwise treat as view ID.
- **D-14:** The `GET /api/views/[id]` endpoint is public (returns only non-sensitive view state). View list endpoint requires auth.

### UI Integration
- **D-15:** The "視圖" dropdown (`USelectMenu`) is restructured: mode options (flat/aggregated/lexeme) at top, divider, then saved views listed by name with visibility badge (公開/私人). Bottom actions: "儲存目前視圖..." and "管理視圖...".
- **D-16:** Selecting a saved view from the dropdown triggers `restoreAdvancedFilterState()` + `replaceRuleOverlayState()` with the view's stored state.
- **D-17:** The `EntriesShareViewPopover` component is removed. The toolbar button for sharing is replaced by a "分享" action that appears after a view is saved (generates URL from view ID).
- **D-18:** Opening a shared link (embedded or view-ID) shows a `UAlert` banner: "你正在檢視「{viewName}」" with actions "套用視圖" / "儲存為我的視圖" / "關閉". The existing `lastAppliedSharedView` guard from Phase 3 handles re-application.

### Permission Enforcement
- **D-19:** Server validates `view.creatorId === currentUser.id` on PUT/DELETE endpoints. Admins bypass this check.
- **D-20:** Client hides "編輯" / "刪除" actions for views where `view.creatorId !== currentUser.id`. Non-owners see "檢視" / "複製為我的視圖" only.
- **D-21:** View creation (`POST /api/views`) requires authentication but no special role — any authenticated user can create views.

### Scope Guard
- **D-22:** Do not implement bulk operations, view templates, or view analytics in this phase.
- **D-23:** Do not change the existing `EntriesSharedViewState` version (stays v1). Schema migration for saved views is deferred.

### Claude's Discretion (--auto selections)
<!--
[auto] API Design — Q: "New Mongoose model + CRUD endpoints, or lightweight single-endpoint approach?" → Selected: "Mongoose model + full CRUD" (follows existing Entry/EditHistory/Lexeme patterns)
[auto] URL Strategy — Q: "View ID or embedded state in share URLs?" → Selected: "View ID (?view=view_abc123) with backward compat for embedded payloads" (allows view updates without URL changes, discriminator in decodeEntriesSharedView)
[auto] UI Integration — Q: "How to restructure the views dropdown?" → Selected: "Extend existing USelectMenu with mode options + saved views + action items" (minimal disruption to existing toolbar layout)
[auto] Permissions — Q: "How to enforce owner-only delete?" → Selected: "Server-side creatorId check + client-side conditional rendering" (defense in depth, matches existing entry ownership pattern)
[auto] share link disambiguation — Q: "How to tell view IDs from base64url payloads in ?view=?" → Selected: "Prefix detection — base64url JSON starts with 'eyJ', view IDs are alphanumeric strings" (no format change to Phase 3 payloads)
-->

</decisions>

<specifics>
## User Feedback (Verbatim)

> "为什么是分享现有视图呢？你觉不觉得很奇怪？右边不是有一个视图功能吗？为什么不能直接做成同一个东西？就算是普通用户不能随便删除视图，那创建视图总可以吧？比如创建给所有人看的视图，或者只给自己看的，这都可以吧？"

Translated context: The user finds the separate "Share View" popover and "視圖" dropdown confusing. They want them merged. Regular users should be able to create views (public/private) even if they can't delete other people's views.

## Key Design Insight

The current architecture already has all the building blocks:
- `EntriesSharedViewState` — the serialization format (versioned, strict Zod validation)
- `exportAdvancedFilterState()` / `restoreAdvancedFilterState()` — filter export/import
- `exportRuleOverlayState()` / `replaceRuleOverlayState()` — rule export/import
- `?view=` query parameter — URL sharing mechanism
- The "視圖" dropdown — already exists for flat/aggregated/lexeme modes

Phase 5 essentially adds: names, persistence, and visibility control to what is currently an anonymous ephemeral snapshot.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product requirements and scope
- `.planning/PROJECT.md` — Project vision, core safety value, and out-of-scope boundaries.
- `.planning/REQUIREMENTS.md` — VIEW-05, VIEW-06, VIEW-07 requirements (promoted from v2 to v1).
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, and implementation focus.

### Prior phase outputs (foundation for Phase 5)
- `.planning/phases/03-shareable-excel-style-views/03-01-SUMMARY.md` — Shared-view serialization boundary, strict validation, composable export/restore APIs.
- `.planning/phases/03-shareable-excel-style-views/03-02-SUMMARY.md` — Share popover UI contract.
- `.planning/phases/03-shareable-excel-style-views/03-03-SUMMARY.md` — Route/query wiring, copy/clear behavior.
- `.planning/phases/04-integration-hardening-and-ux-verification/04-01-SUMMARY.md` — Safety regression coverage for read-only boundaries.
- `.planning/phases/04-integration-hardening-and-ux-verification/04-02-SUMMARY.md` — UI/performance hardening, accessibility fixes.

### Source integration points
- `app/utils/entriesSharedView.ts` — Versioned encode/decode/validation trust boundary.
- `app/composables/useEntriesAdvancedFilters.ts` — Filter state + export/restore APIs.
- `app/composables/useEntriesRuleOverlays.ts` — Rule state + export/replace APIs.
- `app/components/entries/EntriesShareViewPopover.vue` — Current share popover (to be replaced/merged).
- `app/pages/entries/index.vue` — Toolbar layout, view mode dropdown, route watcher.
- `server/api/` — API pattern reference for new view endpoints.
- `server/utils/db.ts` — MongoDB connection pattern.

</canonical_refs>

<deferred>
## Deferred Ideas

- Admin/reviewer ability to delete any public view — scope for VIEW-06 planning.
- View templates for common dictionary cleanup checks — v2 (TEMP-01).
- View analytics (how many times a view was used/shared) — out of scope.
- Bulk import/export of views — out of scope.
- View folders/categories — out of scope for v1.

</deferred>

---
*Phase: 05-basic-saved-views*
*Context gathered: 2026-05-06*
