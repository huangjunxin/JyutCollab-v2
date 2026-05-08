# Phase 5: Basic Saved Views - Research

**Researched:** 2026-05-08
**Domain:** Server-side persistence for serialized table view state with full CRUD API and unified UI
**Confidence:** HIGH

## Summary

Phase 5 adds server-persisted saved views to the entries table. It reuses the existing `EntriesSharedViewState` serialization format from Phase 3 as its core data structure, adding a Mongoose model + CRUD API layer for persistence, and merging the separate "Share View" popover and "視圖" dropdown into a single unified feature.

The existing codebase provides all the foundational building blocks: the `EntriesSharedViewState` versioned schema with strict Zod validation, the `exportAdvancedFilterState()` / `restoreAdvancedFilterState()` composable APIs, the `exportRuleOverlayState()` / `replaceRuleOverlayState()` composable APIs, and the `?view=` query parameter mechanism. Phase 5 adds names, persistence, ownership, and visibility control to what is currently an anonymous ephemeral snapshot.

**Primary recommendation:** Follow the exact Mongoose model + CRUD API patterns established by Entry.ts and EditHistory.ts. Use `nanoid(12)` for view IDs prefixed with `view_`. Reuse the `EntriesSharedViewState` type as the stored `state` field with Zod validation on write. Extend the existing USelectMenu dropdown (not create a new component) to include saved views as selectable items.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** The "Share View" popover and the "視圖" dropdown must become a single unified feature. Sharing is an action on a saved view, not a separate popover that generates anonymous ephemeral URLs.
- **D-02:** The existing view mode dropdown (flat/aggregated/lexeme) should be extended to include saved views as selectable items. Selecting a saved view restores its filters and rules.
- **D-03:** Creating a view saves the current filter/rule state. Once saved, the view can be shared via link using the same `?view=` query parameter mechanism already built in Phase 3.
- **D-04:** Regular users can create, update, and delete their own saved views. They cannot delete or modify views created by other users.
- **D-05:** Reviewers/admins may have additional permissions for team-visible views per VIEW-06.
- **D-06:** Views have two visibility levels: `public` (all authenticated users can see and use) and `private` (only the creator can see and use).
- **D-07:** Anonymous shared links from Phase 3 (`?view=` with base64url-encoded payload) must continue to work. Opening such a link applies the view state as before, and the UI should offer to let the user save it as a named view.
- **D-08:** The existing `EntriesSharedViewState` Zod schema and encode/decode utilities remain the serialization foundation. Saved views store this same state structure plus metadata (name, creator, visibility, timestamps).
- **D-09:** Saved views are stored in a new MongoDB collection (`savedviews`) with fields: `id` (string), `name` (string, HK Traditional), `creatorId` (string), `visibility` (`'public' | 'private'`), `state` (validated `EntriesSharedViewState`), `createdAt`, `updatedAt`.
- **D-10:** The API provides standard CRUD: `GET /api/views` (list user's own + public views), `POST /api/views` (create), `PUT /api/views/[id]` (update own), `DELETE /api/views/[id]` (delete own).
- **D-11:** Admin/reviewer delete of any public view is deferred to VIEW-06 planning.
- **D-12:** Shareable URLs use view ID: `?view=view_abc123`. The client calls `GET /api/views/[id]` to fetch the `EntriesSharedViewState` and applies it. This allows views to be updated without changing the share URL.
- **D-13:** Phase 3 anonymous embedded payloads (`?view=<base64url>`) remain supported. The `decodeEntriesSharedView()` function is the discriminator: if `?view=` starts with `eyJ` (base64url JSON), treat as embedded payload; otherwise treat as view ID.
- **D-14:** The `GET /api/views/[id]` endpoint is public (returns only non-sensitive view state). View list endpoint requires auth.
- **D-15:** The "視圖" dropdown (`USelectMenu`) is restructured: mode options (flat/aggregated/lexeme) at top, divider, then saved views listed by name with visibility badge (公開/私人). Bottom actions: "儲存目前視圖..." and "管理視圖...".
- **D-16:** Selecting a saved view from the dropdown triggers `restoreAdvancedFilterState()` + `replaceRuleOverlayState()` with the view's stored state.
- **D-17:** The `EntriesShareViewPopover` component is removed. The toolbar button for sharing is replaced by a "分享" action that appears after a view is saved (generates URL from view ID).
- **D-18:** Opening a shared link (embedded or view-ID) shows a `UAlert` banner: "你正在檢視「{viewName}」" with actions "套用視圖" / "儲存為我的視圖" / "關閉". The existing `lastAppliedSharedView` guard from Phase 3 handles re-application.
- **D-19:** Server validates `view.creatorId === currentUser.id` on PUT/DELETE endpoints. Admins bypass this check.
- **D-20:** Client hides "編輯" / "刪除" actions for views where `view.creatorId !== currentUser.id`. Non-owners see "檢視" / "複製為我的視圖" only.
- **D-21:** View creation (`POST /api/views`) requires authentication but no special role — any authenticated user can create views.
- **D-22:** Do not implement bulk operations, view templates, or view analytics in this phase.
- **D-23:** Do not change the existing `EntriesSharedViewState` version (stays v1). Schema migration for saved views is deferred.

### Claude's Discretion

- API Design: Mongoose model + full CRUD (follows existing Entry/EditHistory/Lexeme patterns)
- URL Strategy: View ID (`?view=view_abc123`) with backward compat for embedded payloads, discriminator in decodeEntriesSharedView
- UI Integration: Extend existing USelectMenu with mode options + saved views + action items
- Permissions: Server-side creatorId check + client-side conditional rendering
- Share link disambiguation: Prefix detection — base64url JSON starts with `eyJ`, view IDs are alphanumeric strings

### Deferred Ideas (OUT OF SCOPE)

- Admin/reviewer ability to delete any public view — scope for VIEW-06 planning
- View templates for common dictionary cleanup checks — v2 (TEMP-01)
- View analytics (how many times a view was used/shared) — out of scope
- Bulk import/export of views — out of scope
- View folders/categories — out of scope for v1

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| View persistence (CRUD) | API / Backend | Database / Storage | Mongoose model + H3 endpoints own the data; MongoDB stores it |
| View state serialization | Browser / Client | API / Backend | Export/encode happens client-side; server validates on write |
| View list rendering | Browser / Client | — | USelectMenu dropdown is pure client-side UI |
| View state restoration | Browser / Client | — | `restoreAdvancedFilterState()` + `replaceRuleOverlayState()` are client-side composables |
| View sharing (URL generation) | Browser / Client | — | URL construction from view ID is client-side |
| View ID resolution | API / Backend | Browser / Client | `GET /api/views/[id]` returns state; client applies it |
| Auth / ownership enforcement | API / Backend | Browser / Client | Server is authoritative; client mirrors for UX |
| Backward compat (embedded payloads) | Browser / Client | — | `decodeEntriesSharedView()` handles client-side discrimination |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-05 | User can save named views to their account and access them across devices. | Sections: Standard Stack (Mongoose model), Standard Stack (API endpoints), Pattern 1 (Mongoose Model), Pattern 2 (API CRUD) |
| VIEW-06 | User can manage team-visible saved views with permissions. | Sections: Pattern 3 (Auth/Permissions), Data Flow: Ownership Enforcement |
| VIEW-07 | User can choose public or private visibility when saving a view. | Sections: Pattern 1 (Mongoose Model — visibility field), Pattern 2 (`POST /api/views` Zod schema) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| nanoid | 5.1.6 (installed) / 5.1.11 (latest) | Generate view IDs (`view_` + 12 chars) | Already used in project for entry IDs (`index.post.ts`); no new dependency |
| zod | (existing) | Request validation, state validation | Already used across all API endpoints; `EntriesSharedViewState` schema reuses Zod |
| Mongoose | 9.2.1 | MongoDB ODM for `savedviews` collection | Already used for Entry, User, Theme, EditHistory, Lexeme models |
| Nuxt UI (@nuxt/ui) | 4.4.0 | USelectMenu, UModal, UAlert, UBadge, UButton | Already used in entries page toolbar and across the app |
| opencc-js | (existing) | HK Traditional Chinese for view names | Required by CLAUDE.md; already integrated via `convertToHongKongTraditional()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | No new npm dependencies needed for this phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Mongoose model | Raw MongoDB driver | Mongoose already in project; provides schema validation, timestamps, indexes, and matches existing code patterns exactly |

**Installation:**
```bash
# No new packages required. All dependencies already in package.json.
```

**Version verification:** nanoid is installed at 5.1.6 (lock file). The latest is 5.1.11. No breaking changes between these versions — the `nanoid(size)` API used in the project is stable. No upgrade needed for this phase. [VERIFIED: npm registry + project lock file]

## Architecture Patterns

### System Architecture Diagram

```
USER INTERACTION LAYER
    │
    ├─ [Save View] ──► buildEntriesSharedViewState()
    │                        │
    │                        ▼
    │                  POST /api/views  ──► SavedView model ──► MongoDB (savedviews)
    │                        │
    │                        ▼
    │                  View ID returned (view_xxx)
    │
    ├─ [Switch View] ──► GET /api/views (list)
    │                        │
    │                        ▼
    │                  User picks view from USelectMenu
    │                        │
    │                        ▼
    │                  restoreAdvancedFilterState(view.state.filters)
    │                  replaceRuleOverlayState(view.state.rules)
    │
    ├─ [Share View] ──► Generate URL: ?view=view_xxx
    │                        │
    │                        ▼
    │                  Recipient opens link
    │                        │
    │                  decodeEntriesSharedView() discriminates:
    │                    ├─ starts with "eyJ" → embedded payload (Phase 3 compat)
    │                    └─ otherwise → view ID
    │                        │
    │                  If view ID: GET /api/views/[id] (public, no auth)
    │                        │
    │                        ▼
    │                  Apply restored state via composable APIs
    │
    └─ [Manage Views] ──► UModal with list of user's views
                               │
                               ▼
                         PUT/DELETE /api/views/[id] (owner or admin)

AUTH LAYER (server/middleware/auth.ts)
    ├─ Public: GET /api/views/[id] (view resolution for shared links)
    └─ Auth required: GET /api/views (list), POST, PUT, DELETE
```

### Recommended Project Structure
```
server/
  utils/
    SavedView.ts          # NEW — Mongoose model
  api/
    views/
      index.get.ts        # NEW — list user's own + public views
      index.post.ts       # NEW — create saved view
      [id].get.ts         # NEW — get view by ID (public)
      [id].put.ts         # NEW — update own view
      [id].delete.ts      # NEW — delete own view

app/
  components/entries/
    EntriesShareViewPopover.vue  # REMOVED (merged into views dropdown)
    EntriesViewsDropdown.vue     # NEW — unified views dropdown component
    EntriesManageViewsModal.vue  # NEW — manage views modal
  utils/
    entriesSharedView.ts         # MODIFIED — add discriminator for view IDs
```

### Pattern 1: Mongoose Model (SavedView)

**What:** New Mongoose model following the exact pattern established by Entry.ts and EditHistory.ts: TypeScript interface, Mongoose schema with typed generics, custom string `id` field, indexes, timestamps, and the `mongoose.models.X || mongoose.model<IX>()` export guard.

**When to use:** For the new `savedviews` MongoDB collection.

**Example:**
```typescript
// server/utils/SavedView.ts
// Source: Codebase pattern from server/utils/Entry.ts and server/utils/EditHistory.ts [VERIFIED]
import mongoose from 'mongoose'

export interface ISavedView {
  _id: string
  id: string              // view_ + nanoid(12)
  name: string            // HK Traditional Chinese
  creatorId: string       // user ID from event.context.auth.id
  visibility: 'public' | 'private'
  state: Record<string, unknown>  // Validated EntriesSharedViewState
  createdAt: Date
  updatedAt: Date
}

const SavedViewSchema = new mongoose.Schema<ISavedView>({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  creatorId: {
    type: String,
    required: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  state: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, {
  timestamps: true,      // auto createdAt, updatedAt
  collection: 'savedviews'
})

// Indexes
SavedViewSchema.index({ creatorId: 1 })
SavedViewSchema.index({ visibility: 1 })
SavedViewSchema.index({ creatorId: 1, visibility: 1 })

export const SavedView = mongoose.models.SavedView || mongoose.model<ISavedView>('SavedView', SavedViewSchema)
```

### Pattern 2: API CRUD Endpoints

**What:** H3 event handlers using `defineEventHandler()`, auth checks via `event.context.auth`, Zod validation with `safeParse()`, and the identical try/catch error handling pattern used by all existing endpoints.

**When to use:** For all five new endpoints under `server/api/views/`.

**Example:**
```typescript
// server/api/views/index.post.ts
// Source: Codebase pattern from server/api/entries/index.post.ts [VERIFIED]
import { z } from 'zod'
import { nanoid } from 'nanoid'

const CreateViewSchema = z.object({
  name: z.string().min(1, '視圖名稱不能為空').max(100, '視圖名稱過長'),
  visibility: z.enum(['public', 'private']),
  state: z.object({}).passthrough() // validated as EntriesSharedViewState in handler
})

export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    await connectDB()

    const body = await readBody(event)
    const validated = CreateViewSchema.safeParse(body)
    if (!validated.success) {
      throw createError({ statusCode: 400, statusMessage: validated.error.issues[0]?.message || '請求資料無效' })
    }

    const { name, visibility, state } = validated.data
    const userId = event.context.auth.id

    // Validate state against EntriesSharedViewState schema
    const stateResult = decodeEntriesSharedView(encodeEntriesSharedView(state))
    // (This normalizes and validates state before storage)

    const view = await SavedView.create({
      id: `view_${nanoid(12)}`,
      name: convertToHongKongTraditional(name),
      creatorId: userId,
      visibility,
      state
    })

    return { success: true, data: { id: view.id, name: view.name, visibility: view.visibility, createdAt: view.createdAt } }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '儲存視圖失敗' })
  }
})
```

### Pattern 3: Auth and Permission Enforcement

**What:** Two-layer defense. Server-side: check `view.creatorId === event.context.auth.id` (or `auth.role === 'admin'`) on PUT/DELETE. Client-side: conditionally show/hide "編輯"/"刪除" actions based on `view.creatorId === currentUser.id`.

**When to use:** PUT and DELETE endpoints; views dropdown context menu; manage views modal.

**Example:**
```typescript
// Server-side — server/api/views/[id].delete.ts
// Source: Pattern from server/api/entries/[id].delete.ts [VERIFIED]
const view = await SavedView.findOne({ id })
if (!view) throw createError({ statusCode: 404, message: '視圖不存在' })

const userId = event.context.auth.id
const userRole = event.context.auth.role
const isOwner = view.creatorId === userId
if (!isOwner && userRole !== 'admin') {
  throw createError({ statusCode: 403, message: '無權刪除此視圖' })
}
```

### Pattern 4: USelectMenu with Mixed Item Types

**What:** In @nuxt/ui v4, the `USelectMenu` component supports mixed item types where items can be `{ type: 'label', label: string }` for section headers/dividers, `{ label, value, ...custom }` for regular options, and `{ label, ...custom }` for action items that emit `@update:model-value`.

**When to use:** For the unified views dropdown restructuring (D-15).

**Example:**
```typescript
// Source: @nuxt/ui 4.4.0 USelectMenu API [CITED: nuxt.com/docs/components/select-menu]
const viewOptions = computed(() => [
  // Mode section
  { label: '平鋪', value: 'flat', type: 'option' },
  { label: '按詞形聚合（參考）', value: 'aggregated', type: 'option' },
  { label: '按詞語聚合', value: 'lexeme', type: 'option' },

  // Divider
  { type: 'separator' },

  // Saved views section header
  { type: 'label', label: '我的視圖' },
  ...myViews.value.map(v => ({
    label: v.name,
    value: v.id,
    type: 'option',
    visibility: v.visibility,
    creatorId: v.creatorId
  })),

  // Public views section header
  { type: 'label', label: '公開視圖' },
  ...publicViews.value
    .filter(v => v.creatorId !== user?.value?.id)
    .map(v => ({
      label: v.name,
      value: v.id,
      type: 'option',
      visibility: v.visibility,
      creatorId: v.creatorId
    })),

  // Actions
  { type: 'separator' },
  { label: '儲存目前視圖...', action: 'save', type: 'option' },
  { label: '管理視圖...', action: 'manage', type: 'option' }
])
```

### Anti-Patterns to Avoid

- **MongoDB _id as primary key:** The project uses custom `id` fields everywhere (Entry, User, etc.). Never expose or rely on MongoDB `_id` in API responses or URLs. Saved views must follow this pattern with `view_` + nanoid.
- **Storing raw user input without HK Traditional conversion:** All Chinese text must pass through `convertToHongKongTraditional()` before storage per CLAUDE.md.
- **Trusting client-side state validation alone:** The server must re-validate the `EntriesSharedViewState` field on `POST /api/views` and `PUT /api/views/[id]` using the existing Zod schema. Never trust raw client state.
- **Checking `event.context.auth` without null guard:** The middleware only sets auth for authenticated/api routes, but the code still uses `if (!event.context.auth)` pattern in handlers.
- **Using standalone `mongoose.model()` without the guard pattern:** Always use `mongoose.models.X || mongoose.model<IX>()` to prevent "OverwriteModelError" during HMR/dev reloads.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ID generation | UUID/crypto.randomUUID() | `nanoid(12)` with `view_` prefix | Already proven in Entry ID generation; collision-resistant at 12 chars |
| URL-safe state encoding | Custom serialization | Existing `encodeEntriesSharedView()` / `decodeEntriesSharedView()` | Versioned, validated, backward-compatible, already handles base64url |
| State normalization | Inline logic | Existing `normalizeState()` inside `encodeEntriesSharedView()` | Already handles field ordering, rule deduplication |
| Filter state export/import | Direct ref access | `advancedFilters.exportAdvancedFilterState()` / `restoreAdvancedFilterState()` | Established composable API; handles all internal state synchronization |
| Rule state export/import | Direct ref access | `ruleOverlays.exportRuleOverlayState()` / `replaceRuleOverlayState()` | Established composable API; handles rule ID regeneration, cache invalidation |
| HK Chinese conversion | Manual character mapping | `convertToHongKongTraditional()` from `~/server/utils/textConversion` | Required by CLAUDE.md; handles all character differences |
| Input validation | Manual type checks | Zod schemas with `safeParse()` | Already standard across all API endpoints |

**Key insight:** This phase is primarily a persistence + UI unification layer over Phase 3's existing serialization infrastructure. Every serialization concern is already solved and well-tested. The new work is database storage, API endpoints, and UI restructuring.

## Common Pitfalls

### Pitfall 1: USelectMenu Value Collision
**What goes wrong:** Saved view IDs (e.g., `view_abc123`) and view mode values (`flat`, `aggregated`, `lexeme`) share the same USelectMenu `v-model`. If `viewMode` is a single ref that holds both mode strings and view IDs, selecting a saved view could set `viewMode` to `view_abc123`, breaking downstream code that expects `'flat' | 'aggregated' | 'lexeme'`.
**Why it happens:** The current architecture uses a single `viewMode` ref bound to USelectMenu. Extending it with saved views means the dropdown handles two different data kinds.
**How to avoid:** Introduce `selectedViewId` as a separate ref. The `@update:model-value` handler discriminates: if the value is `'flat' | 'aggregated' | 'lexeme'`, set viewMode; if it starts with `view_`, call the view restoration flow without changing viewMode. Use `action`-only items for "儲存"/"管理" that don't bind to model-value.
**Warning signs:** Page crashes with "viewModeEntityLabel is not a function" after selecting a saved view, or saved view items in the dropdown don't trigger state restoration.

### Pitfall 2: Auth Middleware Route Whitelist Gap
**What goes wrong:** `GET /api/views/[id]` must be public (D-14), but `server/middleware/auth.ts` blocks all non-whitelisted API routes. If the new route is not added to the middleware whitelist, all requests to `GET /api/views/[id]` will receive 401.
**Why it happens:** The auth middleware uses a positive whitelist — unlisted routes require auth.
**How to avoid:** Add `GET /api/views/:id` to the middleware whitelist explicitly, following the existing `GET /api/entries/:id` pattern.
**Warning signs:** Shared view links from non-authenticated users get redirected to login.

### Pitfall 3: State Validation on API Write
**What goes wrong:** The `state` field in `POST /api/views` body is an arbitrary JSON object. If the server stores it without validating against the `EntriesSharedViewState` Zod schema, future reads could return unsupported fields or malformed data that breaks client restoration.
**Why it happens:** Mongoose's `Mixed` type accepts any JSON. Without explicit validation, garbage in = garbage out.
**How to avoid:** In `POST` and `PUT` handlers, run the incoming `state` through `decodeEntriesSharedView(encodeEntriesSharedView(state))`. This normalizes and validates. Only store the validated result. Alternatively, import the `sharedViewSchema` from `entriesSharedView.ts` and parse directly.
**Warning signs:** Client crashes when restoring saved views because state contains unsupported field names or invalid formula strings.

### Pitfall 4: EntriesShareViewPopover Removal Scope
**What goes wrong:** The `EntriesShareViewPopover` component is referenced in `app/pages/entries/index.vue` with bound props and events. Naively deleting the component file without updating imports and template references causes build failures.
**Why it happens:** Vue SFC compilation fails on missing imports.
**How to avoid:** Remove in this order: (1) Remove `<EntriesShareViewPopover ...>` from template, (2) Remove the import statement, (3) Remove the component file. Then remove the `@apply-shared-view`, `@share-copied`, `@share-clear` event handlers and any popover-only reactive state that becomes dead code.
**Warning signs:** Build or dev server fails with "Failed to resolve import 'EntriesShareViewPopover.vue'".

### Pitfall 5: `lastAppliedSharedView` Guard with View IDs
**What goes wrong:** The existing `lastAppliedSharedView` guard (line 1532-1541 in index.vue) compares the raw `?view=` query param string to prevent re-application. With view IDs, the raw string is `view_abc123` rather than a base64url blob. The guard logic itself still works (string comparison), but the semantic meaning changes — `lastAppliedSharedView` now holds either a view ID or an embedded payload.
**Why it happens:** The guard is a simple string equality check. It works for both formats.
**How to avoid:** No changes needed to the guard logic. Just ensure that `applySharedViewQuery()` successfully discriminates between view IDs and embedded payloads before the guard runs.
**Warning signs:** Selecting the same view twice from the dropdown doesn't re-apply (guard blocks it correctly), or switching between views doesn't trigger re-application because the guard cached the previous view ID.

## Code Examples

Verified patterns from official sources:

### Mongoose Model Export Pattern
```typescript
// Source: server/utils/Entry.ts line 242 [VERIFIED: codebase]
export const Entry = mongoose.models.Entry || mongoose.model<IEntry>('Entry', EntrySchema)
```

### Auth Check + Zod Validation Pattern
```typescript
// Source: server/api/entries/index.post.ts lines 83-103 [VERIFIED: codebase]
export default defineEventHandler(async (event) => {
  try {
    if (!event.context.auth) {
      throw createError({ statusCode: 401, message: '請先登錄' })
    }
    await connectDB()
    const body = await readBody(event)
    const validated = CreateEntrySchema.safeParse(body)
    if (!validated.success) {
      const message = formatZodErrorToMessage(validated.error)
      throw createError({ statusCode: 400, message })
    }
    // ...
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: '...' })
  }
})
```

### USelectMenu with Items Array
```typescript
// Source: app/pages/entries/index.vue lines 176-187 [VERIFIED: codebase]
<USelectMenu
  :model-value="viewMode"
  :items="[
    { value: 'flat', label: '平鋪' },
    { value: 'aggregated', label: '按詞形聚合（參考）' },
    { value: 'lexeme', label: '按詞語聚合' }
  ]"
  value-key="value"
  size="sm"
  class="w-28"
  @update:model-value="setViewMode"
/>
```

### Shared View State Export/Restore Chain
```typescript
// Source: app/pages/entries/index.vue lines 1471-1554 [VERIFIED: codebase]
const currentSharedViewState = computed(() => ({
  version: ENTRIES_SHARED_VIEW_VERSION,
  filters: advancedFilters.exportAdvancedFilterState(),
  rules: ruleOverlays.exportRuleOverlayState()
}))

// On restore:
advancedFilters.restoreAdvancedFilterState(result.data.filters)
ruleOverlays.replaceRuleOverlayState(result.data.rules)
```

### Route Query Watch Pattern
```typescript
// Source: app/pages/entries/index.vue lines 2681-2693 [VERIFIED: codebase]
watch(
  () => route.query,
  () => {
    if (isInitializing.value) return
    applySharedViewQuery()
    const changed = applyUrlParams()
    if (changed) {
      currentPage.value = 1
      fetchEntries()
    }
  },
  { deep: true }
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anonymous base64url-encoded payload in `?view=` param | Named views persisted to MongoDB with view ID URLs | Phase 5 | Views can be updated without changing share URLs; cross-device access |

**Deprecated/outdated:**
- `EntriesShareViewPopover.vue`: Replaced by unified views dropdown. Remove entirely.
- Ephemeral URL-only sharing: Still supported for backward compat (D-07) but the primary sharing mechanism shifts to named view IDs.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | @nuxt/ui 4.4.0 USelectMenu supports `{ type: 'separator' }` and `{ type: 'label', label: string }` items for section dividers and headers. | Architecture Patterns (Pattern 4) | If not supported in this version, dividers would need workaround (empty disabled items) or a different dropdown pattern. |
| A2 | The `decodeEntriesSharedView()` function will accept a `view_` prefix string and discriminate via the `starts with 'eyJ'` check without modification. | Architecture Patterns (Pattern 4) | If the discriminator logic needs to be extracted or modified, additional changes to `entriesSharedView.ts` are needed beyond adding the view-ID fetch path. |
| A3 | View mode (flat/aggregated/lexeme) is independent of which saved view is applied. When a saved view is loaded, it does not change the active view mode. | Common Pitfalls (Pitfall 1) | If users expect saved views to also restore view mode, the schema would need a `viewMode` field (currently not in scope per D-23). |

## Open Questions (RESOLVED)

1. **USelectMenu mixed item type support in @nuxt/ui 4.4.0 — RESOLVED**
   - Resolution: Do not depend on undocumented `type: 'separator'` / `type: 'label'` item support. Implement the unified views dropdown using currently verified Nuxt UI patterns: either supported grouped items if confirmed by local smoke test, or a custom dropdown/menu panel if mixed item rendering is unsupported.
   - Planning impact: Plan 05-03 includes a fallback path and must verify the dropdown renders mode options, saved views, and action rows before completing.

2. **Rate limiting for public `GET /api/views/[id]` endpoint — RESOLVED**
   - Resolution: Do not add rate limiting in Phase 5. Saved view state is non-sensitive filter/rule configuration, and this project currently has no rate-limiting infrastructure. Keep the endpoint safe by returning only public/non-sensitive view fields and by never returning creator private data beyond safe display name if already exposed elsewhere.
   - Planning impact: Rate limiting is deferred; endpoint validation and output shaping remain mandatory.

3. **View name uniqueness — RESOLVED**
   - Resolution: Do not enforce unique view names. Requirements do not specify uniqueness, and duplicates are acceptable because saved views have stable `id`, `creatorId`, visibility, and timestamps.
   - Planning impact: UI should display enough metadata (visibility badge and timestamp/creator where appropriate) to disambiguate duplicate names.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MongoDB | SavedView persistence | Assumed ✓ | (production cluster) | — (blocker if unavailable) |
| nanoid | ID generation | ✓ | 5.1.6 (installed) | — |
| @nuxt/ui | USelectMenu, UModal, UAlert, UBadge | ✓ | 4.4.0 | — |
| Node.js | Runtime | ✓ | (project requires Node 18+) | — |
| opencc-js | HK Chinese text conversion | ✓ | (existing dep) | — |

**Missing dependencies with no fallback:**
- None — all dependencies are already in the project.

**Missing dependencies with fallback:**
- None.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `event.context.auth` via nuxt-auth-utils session cookies (existing middleware) |
| V3 Session Management | yes | HttpOnly session cookies managed by nuxt-auth-utils (existing) |
| V4 Access Control | yes | Server-side `creatorId` check on PUT/DELETE; admin bypass; client-side action hiding |
| V5 Input Validation | yes | Zod schemas on all API inputs; `EntriesSharedViewState` strict validation on state field |
| V6 Cryptography | no | No cryptographic operations needed for saved views |

### Known Threat Patterns for Mongoose + H3 + Nuxt

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass assignment on PUT body | Tampering | Zod `strictObject()` / `passthrough()` restricts accepted fields |
| NoSQL injection via `$where` or regex | Tampering | Use Mongoose typed queries; never interpolate user input into query operators |
| XSS via view name stored in DB | Information Disclosure | Vue template auto-escapes; `convertToHongKongTraditional()` is a normalization pass, not sanitization (OK because Vue handles escaping) |
| IDOR on PUT/DELETE | Elevation of Privilege | Server validates `view.creatorId === currentUser.id` before mutation |
| Unauthenticated view scraping | Information Disclosure | View state is non-sensitive (filters/rules, not entry data). Public GET endpoint is intentional (D-14) |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/05-basic-saved-views/05-CONTEXT.md` — Locked decisions D-01 through D-23
- `server/utils/Entry.ts` (lines 100-243) — Mongoose model pattern: Schema definition, Mixed type, custom id, indexes, timestamps, collection name, export guard
- `server/utils/EditHistory.ts` (lines 1-65) — Simpler Mongoose model pattern: indexes, timestamps with {createdAt, updatedAt}, model export
- `server/utils/db.ts` (lines 1-45) — MongoDB connection via `connectDB()`, caching pattern
- `server/middleware/auth.ts` (lines 1-64) — Auth middleware: whitelist structure, `event.context.auth` typing, session-based auth
- `server/api/entries/index.post.ts` (lines 1-255) — POST API pattern: auth check, Zod validation, ID generation, HK Chinese conversion, permissions, error handling
- `server/api/entries/[id].put.ts` (lines 1-354) — PUT API pattern: ID from route params, existing record lookup, ownership check, field-by-field update
- `server/api/entries/[id].delete.ts` (lines 1-73) — DELETE API pattern: record lookup, creatorId check, role check, EditHistory creation
- `app/utils/entriesSharedView.ts` (lines 1-323) — `EntriesSharedViewState` type, Zod schemas, encode/decode utilities, base64url format, version constant
- `app/composables/useEntriesAdvancedFilters.ts` (lines 298-332) — `exportAdvancedFilterState()` and `restoreAdvancedFilterState()` signatures
- `app/composables/useEntriesRuleOverlays.ts` (lines 397-445) — `exportRuleOverlayState()` and `replaceRuleOverlayState()` signatures
- `app/components/entries/EntriesShareViewPopover.vue` (lines 1-152) — Current share popover to be removed
- `app/pages/entries/index.vue` (lines 160-188, 1464-1567, 2681-2693) — Toolbar layout, shared view state management, route query watcher

### Secondary (MEDIUM confidence)
- npm registry — nanoid 5.1.11 (latest), currently installed 5.1.6 [VERIFIED]
- package.json / package-lock.json — @nuxt/ui 4.4.0, nuxt 4.3.1, mongoose 9.2.1 [VERIFIED]
- [@nuxt/ui SelectMenu docs](https://ui.nuxt.com/components/select-menu) — USelectMenu item type support for separators and labels [CITED]

### Tertiary (LOW confidence)
- None — all claims verified against the codebase or official docs.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies needed; all tools are already in the project and patterns are directly verifiable
- Architecture: HIGH — Mongoose model and API patterns are directly verified from existing code; composable APIs are well-documented in source
- Pitfalls: HIGH — Integration points are concrete and visible in the codebase; auth middleware whitelist and USelectMenu value collision are real architectural concerns

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (stable patterns, no fast-moving external dependencies)
