<!-- refreshed: 2026-04-29 -->
# Architecture

**Analysis Date:** 2026-04-29

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Nuxt 4 Vue Application Shell               │
│  `app/app.vue` → `app/layouts/default.vue`                  │
├──────────────────────┬──────────────────┬───────────────────┤
│   Route Pages        │ Feature UI       │ Layout / Nav       │
│  `app/pages/**`      │ `app/components` │ `app/components`   │
└──────────┬───────────┴────────┬─────────┴──────────┬────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                Vue Composables + Client State               │
│  `app/composables/**`, `app/utils/**`, `app/types/**`       │
│  auth session, table editing, AI suggestions, cache, drafts │
└──────────────────────────┬──────────────────────────────────┘
                           │ `$fetch` / `fetch`
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nitro / H3 API Boundary                  │
│ `server/middleware/auth.ts` + `server/api/**`               │
│ auth, entries, reviews, histories, users, ai, uploads       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Server Domain Utilities + Mongoose Models       │
│ `server/utils/db.ts`, `server/utils/Entry.ts`,              │
│ `server/utils/User.ts`, `server/utils/EditHistory.ts`,      │
│ `server/utils/Theme.ts`, `server/utils/Lexeme.ts`           │
└───────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
┌─────────────────────────────┐   ┌────────────────────────────┐
│ MongoDB                     │   │ External APIs / Storage     │
│ `entries`, `users`,         │   │ OpenRouter, Cloudinary,     │
│ `edit_histories`, themes    │   │ Jyutdict, Jyutjyu           │
└─────────────────────────────┘   └────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Nuxt config | Registers Nuxt UI, Pinia, auth utilities, aliases, runtime config, strict TypeScript, and port 3100 | `nuxt.config.ts` |
| Application shell | Wrap every page in `UApp`, apply the selected layout, keep selected high-traffic pages alive, and initialize the auth session on mount | `app/app.vue` |
| Default layout | Provides persistent header and page padding for authenticated application pages | `app/layouts/default.vue` |
| Header/navigation | Shows primary route navigation, role-gated review/admin links, auth menu, notifications dropdown, and color mode toggle | `app/components/layout/AppHeader.vue` |
| Entries page | Owns the main editable table, search/filter UI, view modes, keyboard navigation, inline editing orchestration, bulk delete, draft recovery, AI controls, lexeme actions, and save flows | `app/pages/entries/index.vue` |
| Entries list composable | Fetches `/api/entries`, builds flat/headword/lexeme list state, applies cached responses, and merges local draft data | `app/composables/useEntriesList.ts` |
| Entries edit composable | Converts entry values into editable table display text, options, and textarea sizing behavior | `app/composables/useEntriesTableEdit.ts` |
| Entries AI composable | Debounces inline AI generation, manages abort controllers, stores pending definition/theme suggestions, and calls `/api/ai/*` | `app/composables/useEntriesAISuggestions.ts` |
| Entries components | Render reusable entry UI cells, detail cards, action menus, duplicate checks, reference rows, lexeme modals, and expanded sense/theme editors | `app/components/entries/*.vue` |
| Review page | Lists pending-review entries and invokes approve/reject actions | `app/pages/review/index.vue` |
| History page | Lists edit history, computes diff views, filters history access, and invokes revert actions | `app/pages/histories/index.vue` |
| Admin users page | Lists users and delegates role, active-state, and dialect-permission management to admin components | `app/pages/admin/users.vue` |
| Client auth | Wraps `nuxt-auth-utils`, exposes `user`, `isAuthenticated`, role checks, login/register/logout, and profile-updated session state | `app/composables/useAuth.ts` |
| Route middleware | Gates client routes by authenticated, guest, reviewer, admin, and home redirect rules | `app/middleware/*.ts` |
| Server auth middleware | Adds `event.context.auth` for protected API routes and leaves explicit public endpoints open | `server/middleware/auth.ts` |
| Entry APIs | Implements public listing/detail plus protected create/update/delete/submit/duplicate/morpheme/lexeme operations | `server/api/entries/**` |
| Review APIs | Implements reviewer/admin queue, approval, and rejection operations | `server/api/reviews/**` |
| History APIs | Implements edit-history listing, per-entry history, and snapshot revert | `server/api/histories/**` |
| User APIs | Implements admin-only user list, role changes, active-state changes, and dialect permissions | `server/api/users/**` |
| AI APIs | Validates AI requests and delegates categorization, definitions, and examples to the OpenRouter utility | `server/api/ai/**`, `server/utils/ai.ts` |
| Upload APIs | Accepts authenticated image multipart upload and delegates Cloudinary upload/optimization | `server/api/upload/image.post.ts`, `server/utils/cloudinary.ts` |
| Domain models | Define MongoDB schemas, indexes, and collection names for entries, users, themes, histories, notifications, lexemes, external etymons, and AI suggestions | `server/utils/*.ts` |
| Shared dialect catalog | Provides the single source of truth for dialect ids, labels, region codes, colors, and select options | `shared/dialects.ts` |

## Pattern Overview

**Overall:** Full-stack Nuxt monolith with feature-organized Vue pages/components, composable-driven client state, file-based Nitro API routes, and Mongoose domain models.

**Key Characteristics:**
- Use Nuxt file-based routing for browser pages under `app/pages/**` and HTTP endpoints under `server/api/**`.
- Keep page-level orchestration in route components such as `app/pages/entries/index.vue`; move reusable state machines and helpers into focused composables under `app/composables/**`.
- Treat `server/api/**` as the API boundary: handlers validate input, enforce authorization, convert Hong Kong Traditional Chinese text, mutate Mongoose models, and return frontend-shaped DTOs.
- Store persistent domain data in MongoDB via Mongoose schemas in `server/utils/*.ts`; do not query MongoDB directly from `app/**`.
- Use `shared/dialects.ts` for all dialect ids and labels across frontend and server.
- Use `nuxt-auth-utils` sessions for browser authentication and `event.context.auth` as the server-side identity contract.

## Layers

**Application Shell:**
- Purpose: Initialize global UI and user session, choose layout, and preserve selected page instances.
- Location: `app/app.vue`, `app/layouts/default.vue`, `app/layouts/blank.vue`.
- Contains: `UApp`, `NuxtLayout`, `NuxtPage`, keepalive list, global header placement.
- Depends on: `app/composables/useAuth.ts`, Nuxt UI.
- Used by: Every route under `app/pages/**`.

**Page / Route Layer:**
- Purpose: Own page-specific orchestration, route metadata, top-level state, and calls into composables/APIs.
- Location: `app/pages/index.vue`, `app/pages/entries/index.vue`, `app/pages/review/index.vue`, `app/pages/histories/index.vue`, `app/pages/admin/users.vue`, `app/pages/login.vue`, `app/pages/register.vue`, `app/pages/profile.vue`.
- Contains: `definePageMeta`, page templates, route-driven filters, modal state, page-level watchers, `$fetch` calls for page-owned actions.
- Depends on: `app/composables/**`, `app/components/**`, `app/types/**`, `app/utils/**`.
- Used by: Nuxt router and navigation links in `app/components/layout/AppHeader.vue`.

**Feature Component Layer:**
- Purpose: Render reusable UI fragments and emit events to parent pages instead of owning cross-page workflows.
- Location: `app/components/entries/**`, `app/components/admin/**`, `app/components/layout/**`.
- Contains: Editable table cells, detail cards, action menus, expanded senses/themes, reference rows, admin modals, header/dropdowns.
- Depends on: Props/events, Nuxt UI components, small helpers such as `app/composables/useThemeData.ts`.
- Used by: Route pages, especially `app/pages/entries/index.vue`, `app/pages/review/index.vue`, and `app/pages/admin/users.vue`.

**Composable / Client State Layer:**
- Purpose: Package reusable client-side state, API calls, cache policy, localStorage persistence, and table-editing behavior.
- Location: `app/composables/**`.
- Contains: `useAuth`, `useEntriesList`, `useEntriesAISuggestions`, `useEntriesTableEdit`, `useColumnResize`, `useEntriesLocalStorage`, `useDataCache`, `useNotifications`, `useStats`, `useJyutdict`, `useThemeData`.
- Depends on: Vue refs/computed/watchers, `$fetch`, `useAsyncData`, `useNuxtApp().payload.data`, localStorage, `app/types/**`, `app/utils/**`.
- Used by: Pages and layout components.

**Client Domain Types and Utilities:**
- Purpose: Define frontend data contracts and shared presentation helpers.
- Location: `app/types/index.ts`, `app/types/auth.ts`, `app/types/jyutdict.ts`, `app/utils/dialects.ts`, `app/utils/entryKey.ts`, `app/utils/entriesTableConstants.ts`.
- Contains: `Entry`, `User`, `EditHistory`, paginated response types, dialect select options, stable key helpers, table constants.
- Depends on: `shared/dialects.ts` for dialect ids.
- Used by: `app/pages/**`, `app/components/**`, and `app/composables/**`.

**Server Auth / Middleware Layer:**
- Purpose: Protect API routes before route handlers run and attach authenticated user data to H3 events.
- Location: `server/middleware/auth.ts`.
- Contains: Public route allowlist, session lookup through `getUserSession(event)`, `H3EventContext.auth` typing.
- Depends on: `nuxt-auth-utils`, H3 error utilities.
- Used by: Every protected endpoint under `server/api/**`.

**API Handler Layer:**
- Purpose: Expose HTTP contracts, validate input, enforce role/dialect permissions, shape responses, and coordinate domain model updates.
- Location: `server/api/**`.
- Contains: H3 `defineEventHandler` endpoints for auth, entries, reviews, histories, AI, users, stats, notifications, uploads, external references, Jyutdict, and Jyutjyu.
- Depends on: `server/utils/db.ts`, Mongoose models in `server/utils/**`, Zod, H3 request helpers, runtime config.
- Used by: `$fetch` and `fetch` calls from `app/**`.

**Server Domain Utility Layer:**
- Purpose: Provide durable domain models and reusable services.
- Location: `server/utils/**`.
- Contains: Mongoose schemas/models, DB connection cache, auth/password helpers, dialect bridge, AI service, Cloudinary service, text conversion, validation formatting, theme mappings.
- Depends on: MongoDB via Mongoose, OpenRouter via `openai`, Cloudinary SDK, `opencc-js`, runtime config.
- Used by: `server/api/**` handlers.

**Shared Catalog Layer:**
- Purpose: Keep dialect constants identical between browser and server bundles.
- Location: `shared/dialects.ts`.
- Contains: `DIALECT_IDS`, `DIALECT_LABELS`, `DIALECT_REGION_CODES`, select options, colors, label helpers.
- Depends on: No project-local imports.
- Used by: `app/utils/dialects.ts`, `server/api/entries/index.post.ts`, `server/api/auth/register.post.ts`, and type declarations.

**Persistence and External Service Layer:**
- Purpose: Store domain data and proxy third-party systems through server-only code.
- Location: `server/utils/db.ts`, `server/utils/Entry.ts`, `server/utils/User.ts`, `server/utils/EditHistory.ts`, `server/utils/Theme.ts`, `server/utils/Lexeme.ts`, `server/utils/ExternalEtymon.ts`, `server/utils/Notification.ts`, `server/utils/ai.ts`, `server/utils/cloudinary.ts`, `server/api/jyutdict/**`, `server/api/jyutjyu/**`.
- Contains: MongoDB collections, OpenRouter calls, Cloudinary uploads, Jyutdict/Jyutjyu fetch proxies.
- Depends on: Runtime config and external networks.
- Used by: API handler layer only.

## Data Flow

### Primary Entries List Path

1. User opens `/entries`; Nuxt renders `app/pages/entries/index.vue`, which declares `middleware: ['auth']` at `app/pages/entries/index.vue:867`.
2. Route middleware fetches the session and redirects unauthenticated users at `app/middleware/auth.ts:0`.
3. The page calls `useEntriesList(...)` at `app/pages/entries/index.vue:1081`.
4. `useEntriesList.fetchFromAPI()` builds query params for page, search, filters, sort, and group mode at `app/composables/useEntriesList.ts:56`.
5. The browser requests `/api/entries` with `$fetch` at `app/composables/useEntriesList.ts:73`.
6. `server/api/entries/index.get.ts` validates query params at `server/api/entries/index.get.ts:2`, connects to MongoDB at `server/api/entries/index.get.ts:27`, builds filters at `server/api/entries/index.get.ts:64`, and returns flat or grouped DTOs at `server/api/entries/index.get.ts:242`.
7. `useEntriesList.processResponse()` normalizes entries/groups, sets baselines, merges localStorage drafts, and updates pagination at `app/composables/useEntriesList.ts:76`.

### Entry Create / Edit / Save Path

1. Inline edits are captured by the table and component events in `app/pages/entries/index.vue` plus `app/components/entries/EntriesEditableCell.vue`.
2. Cell display and edit behavior is delegated to `useEntriesTableEdit()` at `app/composables/useEntriesTableEdit.ts:13`.
3. Unsaved entries are kept in component state and persisted to `localStorage` through `app/composables/useEntriesLocalStorage.ts:10`.
4. New entries are saved by page logic at `app/pages/entries/index.vue:2022` through POST `/api/entries`; existing entries are saved at `app/pages/entries/index.vue:2191` through PUT `/api/entries/:id`.
5. Create handler validates payload with Zod at `server/api/entries/index.post.ts:6`, checks `event.context.auth` at `server/api/entries/index.post.ts:84`, converts text to Hong Kong Traditional Chinese at `server/api/entries/index.post.ts:108`, checks dialect permission at `server/api/entries/index.post.ts:134`, writes `Entry` at `server/api/entries/index.post.ts:216`, and writes `EditHistory` at `server/api/entries/index.post.ts:219`.
6. Update handler validates payload at `server/api/entries/[id].put.ts:4`, checks ownership/reviewer/admin permissions at `server/api/entries/[id].put.ts:119`, updates only provided domain fields, saves at `server/api/entries/[id].put.ts:268`, writes `EditHistory` at `server/api/entries/[id].put.ts:272`, and synchronizes morpheme-linked headwords at `server/api/entries/[id].put.ts:282`.

### Review Workflow Path

1. User opens `/review`; `app/pages/review/index.vue` requires `middleware: ['reviewer']` at `app/pages/review/index.vue:148`.
2. Client middleware checks `useAuth().canReview` and redirects non-reviewers at `app/middleware/reviewer.ts:2`.
3. The page calls `/api/reviews` through `useCachedAsyncData` at `app/pages/review/index.vue:185`.
4. `server/api/reviews/index.get.ts` requires `event.context.auth` at `server/api/reviews/index.get.ts:15`, checks reviewer/admin role at `server/api/reviews/index.get.ts:22`, filters `Entry` documents with status `pending_review`, and returns reviewer-facing DTOs at `server/api/reviews/index.get.ts:94`.
5. Approve/reject buttons call `/api/reviews/:id/approve` at `app/pages/review/index.vue:223` or `/api/reviews/:id/reject` at `app/pages/review/index.vue:250`.
6. Approval/rejection handlers require reviewer/admin role, perform atomic `findOneAndUpdate` from `pending_review`, and record `EditHistory` at `server/api/reviews/[id]/approve.post.ts:64` and `server/api/reviews/[id]/reject.post.ts:73`.

### Edit History / Revert Path

1. User opens `/histories`; `app/pages/histories/index.vue` renders history filters, diff modals, and revert confirmation.
2. The page fetches `/api/histories` through `useCachedAsyncData` at `app/pages/histories/index.vue:419`.
3. `server/api/histories/index.get.ts` requires auth at `server/api/histories/index.get.ts:4`, limits contributors to their own `userId` at `server/api/histories/index.get.ts:29`, joins user display data at `server/api/histories/index.get.ts:49`, and returns paginated history DTOs at `server/api/histories/index.get.ts:77`.
4. The page computes field diffs client-side at `app/pages/histories/index.vue:477`.
5. Revert calls `/api/histories/:id/revert` at `app/pages/histories/index.vue:640`; server handler checks permission at `server/api/histories/[id].revert.post.ts:47`, restores selected snapshot fields at `server/api/histories/[id].revert.post.ts:75`, marks the history reverted at `server/api/histories/[id].revert.post.ts:91`, and records a revert history row at `server/api/histories/[id].revert.post.ts:97`.

### Authentication Path

1. Login/register pages use blank layout and guest middleware at `app/pages/login.vue:133` and `app/pages/register.vue`.
2. `useAuth.login()` posts to `/api/auth/login` at `app/composables/useAuth.ts:30`; `useAuth.register()` posts to `/api/auth/register` at `app/composables/useAuth.ts:49`.
3. `server/api/auth/login.post.ts` validates credentials at `server/api/auth/login.post.ts:3`, calls `loginUser()` at `server/api/auth/login.post.ts:26`, and sets the user session at `server/api/auth/login.post.ts:35`.
4. `server/api/auth/register.post.ts` normalizes dialect selection at `server/api/auth/register.post.ts:34`, validates dialects against `shared/dialects.ts` at `server/api/auth/register.post.ts:5`, calls `registerUser()` at `server/api/auth/register.post.ts:59`, and sets the session at `server/api/auth/register.post.ts:69`.
5. `server/utils/auth.ts` hashes/verifies passwords with bcrypt at `server/utils/auth.ts:12`, maps Mongoose users to session-safe `AuthUser` at `server/utils/auth.ts:158`, and provides role/dialect permission helpers at `server/utils/auth.ts:173`.

### AI Suggestion Path

1. Entry editing calls `useEntriesAISuggestions()` at `app/pages/entries/index.vue:1176`.
2. Inline suggestions are debounced and cancellable through `AbortController` at `app/composables/useEntriesAISuggestions.ts:57`.
3. The composable calls `/api/ai/definitions`, `/api/ai/categorize`, and `/api/ai/examples` at `app/composables/useEntriesAISuggestions.ts:86`, `app/composables/useEntriesAISuggestions.ts:91`, and `app/composables/useEntriesAISuggestions.ts:165`.
4. AI endpoints require auth through `server/middleware/auth.ts`, validate request bodies in `server/api/ai/*.post.ts`, and delegate to `server/utils/ai.ts`.
5. `server/utils/ai.ts` configures an OpenRouter-compatible OpenAI client at `server/utils/ai.ts:5`, validates model JSON with Zod at `server/utils/ai.ts:33`, converts generated Chinese to Hong Kong Traditional at `server/utils/ai.ts:300`, `server/utils/ai.ts:388`, and `server/utils/ai.ts:453`, then returns data to the composable for accept/dismiss workflows.

### Lexeme and External Etymon Path

1. The entries page supports `flat`, `aggregated`, and `lexeme` modes at `app/pages/entries/index.vue:1070`.
2. Lexeme grouping is requested from `/api/entries?groupBy=lexeme` by `app/composables/useEntriesList.ts:70` and implemented with MongoDB aggregation at `server/api/entries/index.get.ts:186`.
3. Reviewer/admin lexeme reassignment calls `/api/entries/:id/lexeme` from `app/pages/entries/index.vue:983` and `app/pages/entries/index.vue:1002`.
4. `server/api/entries/[id]/lexeme.patch.ts` requires reviewer/admin role at `server/api/entries/[id]/lexeme.patch.ts:15`, sets or creates `lexemeId`, and upserts `Lexeme` at `server/api/entries/[id]/lexeme.patch.ts:55`.
5. External etymons are managed under `/api/lexemes/:lexemeId/external-etymons` and `/api/external-etymons/:id` with the model in `server/utils/ExternalEtymon.ts`.

**State Management:**
- Global auth session state comes from `nuxt-auth-utils` and is wrapped by `app/composables/useAuth.ts`.
- A lightweight cross-page profile update override uses `useState('profileUpdatedUser')` in `app/composables/useAuth.ts:12`.
- Page-local state uses Vue `ref`, `reactive`, `computed`, and `watch` inside route components and composables.
- Client request caching uses `useNuxtApp().payload.data` with TTLs in `app/composables/useDataCache.ts` and `app/composables/useEntriesList.ts`.
- Draft edits and table preferences use localStorage keys managed by `app/composables/useEntriesLocalStorage.ts`, `app/composables/useColumnResize.ts`, and `app/composables/useNewEntryDialect.ts`.
- Pinia is registered in `nuxt.config.ts:21` and `nuxt.config.ts:75`, but no active store files are present under `app/stores/`.

## Key Abstractions

**Entry:**
- Purpose: Core dictionary entry for a headword in one dialect with phonetics, senses, examples, theme classification, status, ownership, and stats.
- Examples: `server/utils/Entry.ts`, `app/types/index.ts`.
- Pattern: Mongoose schema + frontend TypeScript interface; use custom `id` as public identifier and keep `_id` internal.

**Lexeme:**
- Purpose: Cross-dialect grouping for entries representing the same lexical item.
- Examples: `server/utils/Lexeme.ts`, `server/api/entries/[id]/lexeme.patch.ts`, `app/components/entries/LexemeMergeModal.vue`.
- Pattern: `lexemeId` stored on each `Entry`; lexeme mode groups by `lexemeId`, with `__unassigned__:*` synthetic keys for unlinked entries.

**MorphemeRef:**
- Purpose: Entry-local references from multi-syllable words to component character/word entries.
- Examples: `server/utils/types.ts:72`, `server/api/entries/search-morphemes.get.ts`, `app/composables/useEntryMorphemeRefs.ts`.
- Pattern: Store optional `targetEntryId`, `position`, `char`, `jyutping`, and `note`; synchronize dependent headwords when referenced entries change.

**ThemeClassification:**
- Purpose: Three-level semantic classification with level ids and names.
- Examples: `server/utils/Theme.ts`, `app/composables/useThemeData.ts`, `server/utils/themeMapping.ts`, `server/utils/ai.ts`.
- Pattern: Keep level names and numeric ids on each entry; AI categorization returns `themeId` in range 60-498.

**Dialect Catalog:**
- Purpose: Single source of truth for supported dialect points and labels.
- Examples: `shared/dialects.ts`, `app/utils/dialects.ts`, `server/utils/dialects.ts`.
- Pattern: Import constants from `~shared/dialects`; never duplicate dialect ids in page/component code.

**AuthUser / Permissions:**
- Purpose: Session-safe identity shape and permission checks.
- Examples: `server/utils/auth.ts`, `server/middleware/auth.ts`, `app/composables/useAuth.ts`, `app/middleware/*.ts`.
- Pattern: Roles are `contributor`, `reviewer`, `admin`; contributors are constrained by `dialectPermissions`; reviewer/admin bypass dialect contribution checks.

**EditHistory:**
- Purpose: Full before/after snapshots for creates, updates, deletes, status changes, and revert tracking.
- Examples: `server/utils/EditHistory.ts`, `server/api/histories/index.get.ts`, `app/pages/histories/index.vue`.
- Pattern: Write history rows inside mutating API handlers; restore selected fields from `beforeSnapshot` during revert.

**Notifications:**
- Purpose: Per-user notification inbox with read/unread state.
- Examples: `server/utils/Notification.ts`, `server/api/notifications/**`, `app/composables/useNotifications.ts`, `app/components/layout/AppHeader.vue`.
- Pattern: Fetch authenticated user notifications; mutate read state through dedicated endpoints.

**AISuggestion:**
- Purpose: AI-assisted definitions, examples, and categorization from OpenRouter.
- Examples: `app/composables/useEntriesAISuggestions.ts`, `server/api/ai/*.post.ts`, `server/utils/ai.ts`, `server/utils/AISuggestion.ts`.
- Pattern: Client stores pending suggestions in Maps keyed by entry/field; server returns validated JSON converted to Hong Kong Traditional Chinese.

## Entry Points

**Browser application:**
- Location: `app/app.vue`.
- Triggers: Nuxt app boot.
- Responsibilities: Wrap UI in Nuxt UI `UApp`, render `NuxtLayout`/`NuxtPage`, keep selected pages alive, initialize auth.

**Home / dashboard:**
- Location: `app/pages/index.vue`.
- Triggers: GET `/`.
- Responsibilities: Auth-aware landing/dashboard, route redirect behavior, stats/activity presentation.

**Entries editor:**
- Location: `app/pages/entries/index.vue`.
- Triggers: GET `/entries`.
- Responsibilities: Main dictionary management UI, editable table, search/filter/group, local drafts, AI suggestions, save/submit/delete, lexeme operations.

**Review queue:**
- Location: `app/pages/review/index.vue`.
- Triggers: GET `/review`.
- Responsibilities: Reviewer/admin pending-entry queue and status decisions.

**Edit history:**
- Location: `app/pages/histories/index.vue`.
- Triggers: GET `/histories`.
- Responsibilities: Audit trail, diff viewer, snapshot revert.

**Admin users:**
- Location: `app/pages/admin/users.vue`.
- Triggers: GET `/admin/users`.
- Responsibilities: Admin-only user listing, roles, active state, dialect permissions.

**Authentication pages:**
- Location: `app/pages/login.vue`, `app/pages/register.vue`, `app/pages/profile.vue`.
- Triggers: GET `/login`, `/register`, `/profile`.
- Responsibilities: Login/register/profile update flows.

**API middleware:**
- Location: `server/middleware/auth.ts`.
- Triggers: Every server request matching `/api/**`.
- Responsibilities: Public route allowlist, protected API session validation, `event.context.auth` injection.

**Entries API:**
- Location: `server/api/entries/**`.
- Triggers: `/api/entries`, `/api/entries/:id`, `/api/entries/:id/submit`, `/api/entries/:id/lexeme`, `/api/entries/check-duplicate`, `/api/entries/search-morphemes`.
- Responsibilities: Entry CRUD, filtering/grouping, duplicate checks, review submission, lexeme assignment, morpheme search.

**Review API:**
- Location: `server/api/reviews/**`.
- Triggers: `/api/reviews`, `/api/reviews/:id/approve`, `/api/reviews/:id/reject`.
- Responsibilities: Reviewer queue and atomic status transitions.

**History API:**
- Location: `server/api/histories/**`.
- Triggers: `/api/histories`, `/api/histories/:entryId`, `/api/histories/:id/revert`.
- Responsibilities: Audit history listing and revert.

**AI API:**
- Location: `server/api/ai/**`.
- Triggers: `/api/ai/categorize`, `/api/ai/definitions`, `/api/ai/examples`.
- Responsibilities: Authenticated AI generation with server-side OpenRouter credentials.

## Architectural Constraints

- **Threading:** The application uses the standard Nuxt/Nitro Node.js request model and Vue browser event loop. Long-running AI/network operations are asynchronous; no worker-thread architecture is present in `server/**` or `app/**`.
- **Global state:** MongoDB connection cache is module/global state in `server/utils/db.ts`; Jyutdict column cache is module-level state in `app/composables/useJyutdict.ts`; debounce timer is module-level state in `app/composables/useEntriesLocalStorage.ts`; Nuxt payload cache is app-instance state in `app/composables/useDataCache.ts`; browser preferences use localStorage in `app/composables/useColumnResize.ts`, `app/composables/useEntriesLocalStorage.ts`, and `app/composables/useNewEntryDialect.ts`.
- **Circular imports:** No explicit circular dependency chain is detected in the reviewed files. Keep dependencies one-way: pages/components → composables/utils/types → API boundary → server utils/models.
- **API boundary:** Frontend code under `app/**` must call `server/api/**`; it must not import `server/utils/**` or Mongoose models.
- **Auth boundary:** Protected API handlers should rely on `event.context.auth` from `server/middleware/auth.ts`; public endpoints must stay explicitly listed there.
- **Text standard:** Chinese text written by server mutations and AI output should be converted to Hong Kong Traditional Chinese through `server/utils/textConversion.ts`.
- **Dialect source:** Use `shared/dialects.ts` for dialect ids and display labels; new dialect-dependent code should import via `~shared/dialects` or `app/utils/dialects.ts`.
- **Entry identity:** Use public `Entry.id` for browser routes/actions and compatibility lookups; only use Mongo `_id` inside server models/history internals.
- **Role hierarchy:** Contributors can create/edit only within permitted dialects; reviewer/admin role checks are required for review, lexeme membership, external etymons, and admin user management.
- **Status workflow:** Keep `draft → pending_review → approved/rejected` transitions through submit/review endpoints; do not let ordinary contributor UI write approved/rejected directly.

## Anti-Patterns

### Direct Browser Access to Server Models

**What happens:** Importing `server/utils/Entry.ts`, `server/utils/User.ts`, or `server/utils/db.ts` from `app/**` would bypass the API boundary.
**Why it's wrong:** Server credentials, Mongoose models, and permission checks belong behind `server/api/**`; direct imports break Nuxt client/server separation and expose implementation details.
**Do this instead:** Add or extend an endpoint under `server/api/**`, validate with Zod, enforce `event.context.auth`, then call it from `app/composables/**` or a page with `$fetch`, following `app/composables/useEntriesList.ts` and `server/api/entries/index.get.ts`.

### Duplicating Dialect Lists

**What happens:** Hardcoding dialect option arrays in pages/components instead of using the shared catalog.
**Why it's wrong:** Dialect ids power validation, permissions, labels, Jyutjyu region codes, and UI filters; duplicated lists drift and reject valid data.
**Do this instead:** Import `DIALECT_IDS`, `DIALECT_OPTIONS`, and helpers from `shared/dialects.ts` via `app/utils/dialects.ts` for frontend code or `~shared/dialects` / relative shared imports in server routes such as `server/api/auth/register.post.ts`.

### Skipping Edit History on Mutations

**What happens:** Mutating entries without creating an `EditHistory` row.
**Why it's wrong:** The history page and revert feature depend on full before/after snapshots for create, update, delete, and status changes.
**Do this instead:** Capture `beforeSnapshot`, save the entry, and write `EditHistory.create(...)` as in `server/api/entries/[id].put.ts`, `server/api/entries/index.post.ts`, and `server/api/reviews/[id]/approve.post.ts`.

### Writing Non-HK Chinese Text Directly

**What happens:** Storing generated or user-provided Chinese text without passing it through `convertToHongKongTraditional()`.
**Why it's wrong:** The project requires Hong Kong Traditional Chinese in UI strings, server messages, AI output, and persisted dictionary text.
**Do this instead:** Use `server/utils/textConversion.ts` in mutating handlers and AI service code, following `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/utils/ai.ts`.

### Letting Components Own API Workflows

**What happens:** Feature components perform unrelated cross-page data orchestration or persistence directly.
**Why it's wrong:** `app/components/entries/**` are reusable presentation/event components; hidden API workflows make the table difficult to reason about.
**Do this instead:** Emit events from components like `app/components/entries/EntriesEditableCell.vue`, keep page orchestration in `app/pages/entries/index.vue`, and extract reusable state machines into `app/composables/**`.

## Error Handling

**Strategy:** Use H3 `createError` with status codes in API handlers; return explicit `{ success, data/error/message }` for auth-style endpoints; catch and surface user-facing messages in pages/composables.

**Patterns:**
- Validate request bodies and query params with Zod before mutation, e.g. `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/users/index.get.ts`.
- Use `formatZodErrorToMessage()` for localized validation messages in `server/utils/validation.ts` and consumers such as `server/api/entries/index.post.ts`.
- Throw `createError({ statusCode, message })` for authorization, not-found, conflict, and server errors in `server/api/**`.
- Use role/dialect guard helpers such as `canContributeToDialect()` from `server/utils/auth.ts`.
- Log server errors with `console.error` inside catch blocks in `server/api/**` and `server/utils/**`.
- Client code catches `$fetch` failures and surfaces `error?.data?.message || error?.message` through alerts or Nuxt UI toasts, e.g. `app/pages/review/index.vue`, `app/pages/admin/users.vue`, and `app/composables/useEntriesAISuggestions.ts`.

## Cross-Cutting Concerns

**Logging:** API handlers and utilities log operational failures with `console.error`, e.g. `server/api/entries/index.get.ts`, `server/api/entries/[id].put.ts`, `server/utils/auth.ts`, and `server/utils/ai.ts`. Client composables/pages log recoverable failures with `console.error` or `console.warn`, e.g. `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, and `app/composables/useEntriesLocalStorage.ts`.

**Validation:** Server endpoints use Zod schemas close to handlers in `server/api/**`; frontend types live in `app/types/index.ts`; dialect validation uses `shared/dialects.ts`; validation message formatting lives in `server/utils/validation.ts`.

**Authentication:** Browser state uses `nuxt-auth-utils` through `app/composables/useAuth.ts`; client routes use `app/middleware/auth.ts`, `app/middleware/guest.ts`, `app/middleware/reviewer.ts`, and `app/middleware/admin.ts`; API routes use `server/middleware/auth.ts` and per-handler role checks.

**Authorization:** Contributors are constrained by owner checks and dialect permissions in entry mutations; reviewers/admins can review entries, manage lexemes/external etymons, and view broader histories; admins manage users through `server/api/users/**`.

**Caching:** `useCachedAsyncData()` caches stats/reviews/histories with TTLs in `app/composables/useDataCache.ts`; entries list uses a custom payload cache in `app/composables/useEntriesList.ts`; Jyutdict columns cache in `app/composables/useJyutdict.ts`; MongoDB connection cache lives in `server/utils/db.ts`.

**Persistence:** MongoDB is accessed only through Mongoose models in `server/utils/**`; local drafts and column widths use browser localStorage through composables; image public ids are stored on entry senses and uploaded through Cloudinary utilities.

**Internationalization / Text Standard:** UI and server messages are inline Hong Kong Traditional Chinese strings; persisted Chinese transformations use `server/utils/textConversion.ts`; date formatting uses `zh-HK` in `app/pages/histories/index.vue` and `app/components/layout/AppHeader.vue`.

**External Services:** AI calls are isolated in `server/utils/ai.ts`; Cloudinary upload/URL logic is isolated in `server/utils/cloudinary.ts`; Jyutdict and Jyutjyu calls are proxied by `server/api/jyutdict/**` and `server/api/jyutjyu/**`.

---

*Architecture analysis: 2026-04-29*
