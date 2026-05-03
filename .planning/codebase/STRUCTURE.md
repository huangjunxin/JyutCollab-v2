# Codebase Structure

**Analysis Date:** 2026-04-29

## Directory Layout

```
/Users/trenton/Projects/JyutCollab-v2/
├── app/                         # Nuxt 4 frontend application source
│   ├── app.vue                  # Global app shell and auth initialization
│   ├── app.config.ts            # Nuxt UI app configuration
│   ├── assets/css/              # Global CSS imported by `nuxt.config.ts`
│   ├── components/              # Feature and layout Vue components
│   │   ├── admin/               # User-management table/modals
│   │   ├── entries/             # Dictionary entry table/detail/modal/reference UI
│   │   └── layout/              # Header, color mode, global layout widgets
│   ├── composables/             # Vue/Nuxt composables for client state and workflows
│   ├── layouts/                 # Nuxt layouts (`default`, `blank`)
│   ├── middleware/              # Client route guards
│   ├── pages/                   # Nuxt page routes
│   │   ├── admin/               # Admin-only pages
│   │   ├── entries/             # Main entries editor route
│   │   ├── histories/           # Edit-history route
│   │   └── review/              # Review queue route
│   ├── types/                   # Frontend TypeScript contracts
│   └── utils/                   # Frontend pure helpers and constants
├── server/                      # Nitro/H3 backend source
│   ├── api/                     # File-based API routes
│   │   ├── ai/                  # AI generation endpoints
│   │   ├── auth/                # Login/register/session/profile endpoints
│   │   ├── entries/             # Entry CRUD, grouping, duplicate, morpheme, lexeme APIs
│   │   ├── external-etymons/    # External etymon update/delete endpoints
│   │   ├── histories/           # Edit-history list/per-entry/revert APIs
│   │   ├── jyutdict/            # Jyutdict proxy endpoints
│   │   ├── jyutjyu/             # Jyutjyu proxy endpoints
│   │   ├── lexemes/             # Lexeme external-etymon endpoints
│   │   ├── notifications/       # Notification list/read endpoints
│   │   ├── reviews/             # Reviewer queue and decision endpoints
│   │   ├── stats/               # User/reviewer/dialect stats endpoints
│   │   ├── upload/              # Image upload endpoints
│   │   └── users/               # Admin user-management endpoints
│   ├── middleware/              # Server-side API middleware
│   └── utils/                   # Mongoose models, auth, DB, AI, Cloudinary, validation
├── shared/                      # Isomorphic shared constants and types
├── public/                      # Static public assets
├── .planning/codebase/          # Codebase map documents
├── nuxt.config.ts               # Nuxt modules, aliases, runtime config, TypeScript settings
├── package.json                 # npm scripts and dependency manifest
├── package-lock.json            # npm lockfile
├── tsconfig.json                # TypeScript/Nuxt type configuration
└── CLAUDE.md                    # Project-specific coding and domain instructions
```

## Directory Purposes

**`app/`:**
- Purpose: Nuxt frontend application code that can run in the browser and SSR context.
- Contains: Vue pages, layouts, components, composables, frontend types, utilities, CSS, and app config.
- Key files: `app/app.vue`, `app/pages/entries/index.vue`, `app/composables/useAuth.ts`, `app/types/index.ts`.

**`app/pages/`:**
- Purpose: File-based browser routes.
- Contains: Route-level Vue components with `definePageMeta`, page orchestration, page-local state, and route-specific API calls.
- Key files: `app/pages/index.vue`, `app/pages/entries/index.vue`, `app/pages/review/index.vue`, `app/pages/histories/index.vue`, `app/pages/admin/users.vue`, `app/pages/login.vue`, `app/pages/register.vue`, `app/pages/profile.vue`.

**`app/pages/entries/`:**
- Purpose: Main dictionary entry management UI.
- Contains: The large editable entries table route.
- Key files: `app/pages/entries/index.vue`.

**`app/pages/review/`:**
- Purpose: Reviewer/admin workflow for pending entries.
- Contains: Review queue page and approve/reject UI.
- Key files: `app/pages/review/index.vue`.

**`app/pages/histories/`:**
- Purpose: Audit trail and revert UI.
- Contains: History list, filters, client-side diff computation, revert modal.
- Key files: `app/pages/histories/index.vue`.

**`app/pages/admin/`:**
- Purpose: Admin-only UI.
- Contains: User-management page.
- Key files: `app/pages/admin/users.vue`.

**`app/components/`:**
- Purpose: Reusable Vue components organized by feature.
- Contains: Layout, entry, and admin presentation components. Components receive data through props and communicate with parent pages through emitted events.
- Key files: `app/components/layout/AppHeader.vue`, `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/EntryRowActions.vue`, `app/components/entries/EntrySensesExpand.vue`, `app/components/entries/EntryThemeExpand.vue`, `app/components/admin/UserTable.vue`.

**`app/components/entries/`:**
- Purpose: Entry-specific UI primitives for the editable table and detailed dictionary-card views.
- Contains: Editable cells, row action menu, AI suggestion row, duplicate check row, Jyutdict/Jyutjyu/reference rows, detail cards/modals, lexeme modals, expanded sense/theme editors.
- Key files: `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/EntryDetailCard.vue`, `app/components/entries/EntryModal.vue`, `app/components/entries/EntryRowActions.vue`, `app/components/entries/LexemeMergeModal.vue`, `app/components/entries/LexemeExternalEtymonsModal.vue`.

**`app/components/admin/`:**
- Purpose: Admin user-management building blocks.
- Contains: User table, role editor modal, dialect-permissions modal.
- Key files: `app/components/admin/UserTable.vue`, `app/components/admin/EditRoleModal.vue`, `app/components/admin/ManageDialectsModal.vue`.

**`app/components/layout/`:**
- Purpose: Global layout UI.
- Contains: Header/nav, color-mode button.
- Key files: `app/components/layout/AppHeader.vue`, `app/components/layout/ColorModeButton.vue`.

**`app/composables/`:**
- Purpose: Reusable Composition API logic for frontend state and workflows.
- Contains: Auth, cached data, stats, notifications, entries list/editing/selection/localStorage, AI suggestions, themes, dialect coverage, image compression, Jyutdict lookup.
- Key files: `app/composables/useAuth.ts`, `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntriesTableEdit.ts`, `app/composables/useEntriesLocalStorage.ts`, `app/composables/useDataCache.ts`, `app/composables/useNotifications.ts`, `app/composables/useThemeData.ts`, `app/composables/useJyutdict.ts`.

**`app/layouts/`:**
- Purpose: Nuxt route layouts.
- Contains: `default` layout with persistent header and `blank` layout for standalone pages.
- Key files: `app/layouts/default.vue`, `app/layouts/blank.vue`.

**`app/middleware/`:**
- Purpose: Client-side route guards.
- Contains: Authenticated-only, guest-only, reviewer-only, admin-only, and home redirect middleware.
- Key files: `app/middleware/auth.ts`, `app/middleware/guest.ts`, `app/middleware/reviewer.ts`, `app/middleware/admin.ts`, `app/middleware/home-redirect.ts`.

**`app/types/`:**
- Purpose: Frontend TypeScript data contracts.
- Contains: Entry, User, EditHistory, Theme, API response, Jyutdict, and auth types.
- Key files: `app/types/index.ts`, `app/types/auth.ts`, `app/types/jyutdict.ts`.

**`app/utils/`:**
- Purpose: Frontend pure helpers and constants.
- Contains: Dialect adapters, entry key helpers, table constants.
- Key files: `app/utils/dialects.ts`, `app/utils/entryKey.ts`, `app/utils/entriesTableConstants.ts`.

**`server/`:**
- Purpose: Server-only Nuxt/Nitro code.
- Contains: API route handlers, API middleware, database models, service utilities, validation, and external integration clients.
- Key files: `server/middleware/auth.ts`, `server/utils/db.ts`, `server/utils/Entry.ts`, `server/utils/auth.ts`, `server/utils/ai.ts`.

**`server/api/`:**
- Purpose: File-based HTTP API surface.
- Contains: H3 `defineEventHandler` route files whose names map to paths and methods.
- Key files: `server/api/entries/index.get.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/auth/login.post.ts`, `server/api/reviews/index.get.ts`, `server/api/histories/index.get.ts`, `server/api/users/index.get.ts`.

**`server/api/auth/`:**
- Purpose: Session and profile endpoints.
- Contains: Login, logout, register, current user, profile update.
- Key files: `server/api/auth/login.post.ts`, `server/api/auth/logout.post.ts`, `server/api/auth/register.post.ts`, `server/api/auth/me.get.ts`, `server/api/auth/me.patch.ts`.

**`server/api/entries/`:**
- Purpose: Entry data API.
- Contains: List/create, detail/update/delete, submit, lexeme assignment, duplicate check, morpheme search.
- Key files: `server/api/entries/index.get.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].get.ts`, `server/api/entries/[id].put.ts`, `server/api/entries/[id].delete.ts`, `server/api/entries/[id]/submit.post.ts`, `server/api/entries/[id]/lexeme.patch.ts`, `server/api/entries/check-duplicate.get.ts`, `server/api/entries/search-morphemes.get.ts`.

**`server/api/reviews/`:**
- Purpose: Review workflow API.
- Contains: Pending queue and approve/reject actions.
- Key files: `server/api/reviews/index.get.ts`, `server/api/reviews/[id]/approve.post.ts`, `server/api/reviews/[id]/reject.post.ts`.

**`server/api/histories/`:**
- Purpose: Edit-history API.
- Contains: Paginated history, per-entry history, revert.
- Key files: `server/api/histories/index.get.ts`, `server/api/histories/[entryId].get.ts`, `server/api/histories/[id].revert.post.ts`.

**`server/api/users/`:**
- Purpose: Admin user management API.
- Contains: User list, role patch, dialect permission patch, active-state patch.
- Key files: `server/api/users/index.get.ts`, `server/api/users/[id]/role.patch.ts`, `server/api/users/[id]/dialect-permissions.patch.ts`, `server/api/users/[id]/toggle-active.patch.ts`.

**`server/api/ai/`:**
- Purpose: Server-side AI generation API.
- Contains: Theme categorization, definition generation, example generation.
- Key files: `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, `server/api/ai/examples.post.ts`.

**`server/api/jyutdict/` and `server/api/jyutjyu/`:**
- Purpose: Third-party dictionary/search proxy endpoints.
- Contains: Jyutdict detail/sheet proxy and Jyutjyu search proxy.
- Key files: `server/api/jyutdict/general.get.ts`, `server/api/jyutdict/sheet.get.ts`, `server/api/jyutjyu/search.get.ts`.

**`server/api/lexemes/` and `server/api/external-etymons/`:**
- Purpose: Lexeme-scoped external etymon management.
- Contains: List/create external etymons by lexeme and update/delete by etymon id.
- Key files: `server/api/lexemes/[lexemeId]/external-etymons.get.ts`, `server/api/lexemes/[lexemeId]/external-etymons.post.ts`, `server/api/external-etymons/[id].put.ts`, `server/api/external-etymons/[id].delete.ts`.

**`server/api/notifications/`:**
- Purpose: User notification API.
- Contains: Notification list, mark one read, mark all read.
- Key files: `server/api/notifications/index.get.ts`, `server/api/notifications/[id]/read.put.ts`, `server/api/notifications/read-all.put.ts`.

**`server/api/stats/` and `server/api/stats.get.ts`:**
- Purpose: Site, user, reviewer, and dialect statistics.
- Contains: Public site stats plus authenticated/enhanced stat endpoints.
- Key files: `server/api/stats.get.ts`, `server/api/stats/mine.get.ts`, `server/api/stats/reviewer.get.ts`, `server/api/stats/dialects.get.ts`, `server/api/stats/mine/enhanced.get.ts`, `server/api/stats/reviewer/enhanced.get.ts`.

**`server/api/upload/`:**
- Purpose: Server-side file upload.
- Contains: Authenticated image upload endpoint.
- Key files: `server/api/upload/image.post.ts`.

**`server/middleware/`:**
- Purpose: Server request middleware.
- Contains: API auth middleware that injects `event.context.auth`.
- Key files: `server/middleware/auth.ts`.

**`server/utils/`:**
- Purpose: Server-only domain and integration utilities.
- Contains: Mongoose models, DB connection, auth helpers, AI service, Cloudinary service, text conversion, theme mapping, dialect utilities, validation helpers.
- Key files: `server/utils/db.ts`, `server/utils/Entry.ts`, `server/utils/User.ts`, `server/utils/EditHistory.ts`, `server/utils/Theme.ts`, `server/utils/Lexeme.ts`, `server/utils/ExternalEtymon.ts`, `server/utils/Notification.ts`, `server/utils/auth.ts`, `server/utils/ai.ts`, `server/utils/cloudinary.ts`, `server/utils/textConversion.ts`, `server/utils/validation.ts`.

**`shared/`:**
- Purpose: Code that is safe to import from both frontend and server.
- Contains: Dialect constants and helpers.
- Key files: `shared/dialects.ts`.

**`public/`:**
- Purpose: Static files served directly by Nuxt.
- Contains: Public assets.
- Key files: Not detected in the reviewed architecture files.

**`.planning/codebase/`:**
- Purpose: Generated codebase maps consumed by planning/execution tools.
- Contains: Architecture, structure, stack, convention, testing, and concern documents as generated.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`.

## Key File Locations

**Entry Points:**
- `app/app.vue`: Global Nuxt app shell and auth initialization.
- `app/layouts/default.vue`: Primary application layout with header.
- `app/pages/index.vue`: Home/dashboard route.
- `app/pages/entries/index.vue`: Main entry table route.
- `app/pages/review/index.vue`: Review queue route.
- `app/pages/histories/index.vue`: Edit history route.
- `app/pages/admin/users.vue`: Admin users route.
- `server/middleware/auth.ts`: API auth gate.
- `server/api/entries/index.get.ts`: Public entries listing API.
- `server/api/entries/index.post.ts`: Authenticated entry creation API.

**Configuration:**
- `nuxt.config.ts`: Modules (`@nuxt/ui`, `@pinia/nuxt`, `nuxt-auth-utils`), `~shared` alias, runtime config, app metadata, TypeScript strict mode, dev server port.
- `package.json`: npm scripts and runtime dependencies.
- `tsconfig.json`: TypeScript project configuration generated/extended by Nuxt.
- `app/app.config.ts`: Nuxt UI app config.
- `app/assets/css/main.css`: Global CSS imported by `nuxt.config.ts`.

**Core Logic:**
- `app/pages/entries/index.vue`: Main table orchestration, inline editing, keyboard navigation, local draft integration, lexeme operations.
- `app/composables/useEntriesList.ts`: Entries fetching, cache, grouping response normalization.
- `app/composables/useEntriesAISuggestions.ts`: AI suggestion client state and API calls.
- `app/composables/useEntriesTableEdit.ts`: Editable cell display/option/textarea behavior.
- `app/composables/useEntriesSelection.ts`: Entry row selection and batch delete behavior.
- `app/composables/useEntriesLocalStorage.ts`: Unsaved entry draft persistence.
- `app/composables/useColumnResize.ts`: Column width state and localStorage persistence.
- `app/composables/useAuth.ts`: Auth session wrapper and role helpers.
- `server/utils/db.ts`: Cached MongoDB connection.
- `server/utils/auth.ts`: Password, session-user mapping, role hierarchy, dialect permission helpers.
- `server/utils/ai.ts`: OpenRouter AI service.
- `server/utils/textConversion.ts`: Hong Kong Traditional Chinese conversion.
- `server/utils/cloudinary.ts`: Cloudinary upload and URL generation.

**Domain Models:**
- `server/utils/Entry.ts`: Entry Mongoose schema, nested sense/example/theme/meta fields, indexes.
- `server/utils/User.ts`: User schema with roles and dialect permissions.
- `server/utils/EditHistory.ts`: Before/after snapshot history schema.
- `server/utils/Theme.ts`: Three-level theme schema.
- `server/utils/Lexeme.ts`: Lexeme grouping schema.
- `server/utils/ExternalEtymon.ts`: External etymology/etymon schema.
- `server/utils/Notification.ts`: Notification schema and helper creators.
- `server/utils/AISuggestion.ts`: AI suggestion persistence model.

**API Boundaries:**
- `server/api/auth/*.ts`: Public auth/session/profile endpoints.
- `server/api/entries/**/*.ts`: Entry CRUD, grouping, lexeme, duplicate, morpheme endpoints.
- `server/api/reviews/**/*.ts`: Review list and decision endpoints.
- `server/api/histories/**/*.ts`: History listing/revert endpoints.
- `server/api/users/**/*.ts`: Admin-only user-management endpoints.
- `server/api/ai/*.ts`: Authenticated AI generation endpoints.
- `server/api/upload/image.post.ts`: Authenticated image upload endpoint.
- `server/api/jyutdict/*.ts`: Jyutdict proxy endpoints.
- `server/api/jyutjyu/search.get.ts`: Jyutjyu search proxy endpoint.

**State and Cache:**
- `app/composables/useDataCache.ts`: TTL-based `useAsyncData` caching and cache clearing.
- `app/composables/useEntriesList.ts`: Entries payload cache with cache keys for filters/sort/page/view mode.
- `app/composables/useEntriesLocalStorage.ts`: `jyutcollab-entries-draft` localStorage key.
- `app/composables/useColumnResize.ts`: `jyutcollab-column-widths` localStorage key.
- `app/composables/useNewEntryDialect.ts`: New-entry dialect localStorage key.
- `server/utils/db.ts`: Global Mongoose connection cache.

**Testing:**
- No test directories or test config files are detected in the architecture scan.
- No `*.test.*` or `*.spec.*` files are part of the reviewed structure.

## Naming Conventions

**Files:**
- Vue route files use Nuxt file-based routing names: `app/pages/entries/index.vue`, `app/pages/admin/users.vue`.
- Vue components use PascalCase filenames: `app/components/entries/EntriesEditableCell.vue`, `app/components/layout/AppHeader.vue`.
- Composables use `useX.ts`: `app/composables/useEntriesList.ts`, `app/composables/useAuth.ts`, `app/composables/useDataCache.ts`.
- API route files encode dynamic params and HTTP methods: `server/api/entries/[id].put.ts`, `server/api/reviews/[id]/approve.post.ts`, `server/api/notifications/[id]/read.put.ts`.
- Mongoose model files use PascalCase domain names: `server/utils/Entry.ts`, `server/utils/User.ts`, `server/utils/EditHistory.ts`, `server/utils/ExternalEtymon.ts`.
- Utility files use camelCase: `server/utils/textConversion.ts`, `server/utils/themeMapping.ts`, `app/utils/entryKey.ts`.
- Shared constants use lower-case descriptive filenames: `shared/dialects.ts`.

**Directories:**
- Feature directories use lower-case plural names: `app/components/entries`, `server/api/entries`, `server/api/reviews`, `server/api/histories`.
- Route group directories mirror URL segments: `app/pages/admin`, `app/pages/review`, `server/api/auth`, `server/api/users`.
- Cross-cutting helper directories use framework conventions: `app/composables`, `app/middleware`, `server/middleware`, `server/utils`.

## Where to Add New Code

**New Browser Page:**
- Primary code: `app/pages/<route>.vue` or `app/pages/<feature>/index.vue`.
- Route guard: add or reuse middleware in `app/middleware/*.ts` through `definePageMeta({ middleware: [...] })`.
- Shared page UI: `app/components/<feature>/` if it becomes reusable.
- Types: `app/types/index.ts` or feature-specific type file in `app/types/`.

**New Entry Table Feature:**
- Primary orchestration: `app/pages/entries/index.vue` only when it is table-wide page behavior.
- Reusable state machine: new `app/composables/useEntries<Feature>.ts`.
- Reusable UI: new `app/components/entries/<FeatureName>.vue`.
- Constants/helpers: `app/utils/entriesTableConstants.ts` or a new focused file in `app/utils/`.
- Server support: new or extended endpoint under `server/api/entries/**`.

**New Entry Field:**
- Frontend type: update `Entry`, `EntryFormData`, and related nested types in `app/types/index.ts`.
- Backend type/schema: update `server/utils/Entry.ts` and, if needed, `server/utils/types.ts`.
- Create/update validation: update `server/api/entries/index.post.ts` and `server/api/entries/[id].put.ts`.
- List DTO transformation: update `server/api/entries/index.get.ts` and `server/api/entries/[id].get.ts`.
- Table UI: update `app/composables/useEntriesTableColumns.ts`, `app/composables/useEntriesTableEdit.ts`, and `app/pages/entries/index.vue` if the field is editable.
- History: ensure mutating handlers add the field to `changedFields` and snapshots.

**New Server API Endpoint:**
- Implementation: `server/api/<resource>/<route>.<method>.ts`.
- Auth: rely on `server/middleware/auth.ts`; update its public allowlist only for intentional public GET/auth endpoints.
- Validation: define a local Zod schema near the top of the route file.
- Database: call `await connectDB()` from `server/utils/db.ts` before Mongoose queries.
- Permissions: use `event.context.auth`, `hasPermission()`, or `canContributeToDialect()` from `server/utils/auth.ts`.
- Response DTO: return frontend-safe fields; do not expose `passwordHash` or raw credentials.

**New Domain Model:**
- Schema/model: `server/utils/<DomainName>.ts`.
- Shared/server types: `server/utils/types.ts` if server-only or `app/types/index.ts` if consumed by frontend.
- APIs: `server/api/<resource>/**`.
- Client composable: `app/composables/use<Resource>.ts` if multiple components/pages consume it.

**New External Integration:**
- Server-only client/service: `server/utils/<integration>.ts`.
- Proxy/API boundary: `server/api/<integration>/**`.
- Runtime config: add non-secret public values and server-only secret names in `nuxt.config.ts`.
- Client access: call the local API through `$fetch` from an `app/composables/use<Integration>.ts`; do not call third-party secrets from browser code.

**New AI Feature:**
- Server service: extend `server/utils/ai.ts` with model call, Zod output schema, and Hong Kong Traditional conversion.
- API endpoint: add `server/api/ai/<feature>.post.ts` with auth and request validation.
- Client state: extend or create a composable under `app/composables/`, usually `app/composables/useEntriesAISuggestions.ts` for entry-table AI.
- UI: add controls to `app/components/entries/**` and orchestration in `app/pages/entries/index.vue`.

**New Review Workflow:**
- Queue/list behavior: `server/api/reviews/index.get.ts` and `app/pages/review/index.vue`.
- Decision endpoint: `server/api/reviews/[id]/<action>.post.ts`.
- Status/history: update `Entry.status` handling in `server/utils/Entry.ts` and write `EditHistory` rows in decision handlers.
- Notifications: use helpers in `server/utils/Notification.ts` and endpoints in `server/api/notifications/**` if users need alerts.

**New Admin User Feature:**
- Page orchestration: `app/pages/admin/users.vue` for user-management route behavior.
- Reusable admin UI: `app/components/admin/<FeatureName>.vue`.
- Server endpoint: `server/api/users/<route>.<method>.ts` with admin check.
- Types: update `app/types/index.ts` and `server/utils/User.ts` as needed.

**New Utility:**
- Frontend-only helper: `app/utils/<name>.ts`.
- Server-only helper: `server/utils/<name>.ts`.
- Isomorphic helper/constants: `shared/<name>.ts`.
- Vue stateful helper: `app/composables/use<Name>.ts`.

**New Static Asset:**
- Public URL asset: `public/`.
- Bundled CSS/image asset imported by Vue/CSS: `app/assets/`.

## Special Directories

**`shared/`:**
- Purpose: Code imported by both client and server bundles.
- Generated: No.
- Committed: Yes.
- Guidance: Keep this directory free of server-only dependencies such as Mongoose, `useRuntimeConfig()` secrets, and Node-only APIs. Use it for constants such as `shared/dialects.ts`.

**`server/utils/`:**
- Purpose: Server-only models and integration utilities.
- Generated: No.
- Committed: Yes.
- Guidance: Do not import these files from `app/**`. Access them through `server/api/**` endpoints.

**`server/api/`:**
- Purpose: Public/internal HTTP API boundary.
- Generated: No.
- Committed: Yes.
- Guidance: Match Nuxt/Nitro filename conventions: `[id].get.ts`, `[id].put.ts`, `index.post.ts`, nested route directories for subresources/actions.

**`app/composables/`:**
- Purpose: Reusable Composition API logic.
- Generated: No.
- Committed: Yes.
- Guidance: Place reusable client workflows here before adding more logic to large route components. Use `useX.ts` names.

**`app/components/entries/`:**
- Purpose: Entry UI components.
- Generated: No.
- Committed: Yes.
- Guidance: Prefer props/events. Keep cross-resource API orchestration in `app/pages/entries/index.vue` or composables.

**`.nuxt/`:**
- Purpose: Nuxt generated build/type artifacts.
- Generated: Yes.
- Committed: No.
- Guidance: Do not edit directly.

**`.output/`:**
- Purpose: Nuxt/Nitro production output.
- Generated: Yes.
- Committed: No.
- Guidance: Do not edit directly.

**`node_modules/`:**
- Purpose: Installed npm dependencies.
- Generated: Yes.
- Committed: No.
- Guidance: Do not inspect or modify for application behavior.

**`.planning/codebase/`:**
- Purpose: Planning and codebase map documents.
- Generated: Yes.
- Committed: Project-dependent.
- Guidance: Only mapping/planning workflows should update these docs.

---

*Structure analysis: 2026-04-29*
