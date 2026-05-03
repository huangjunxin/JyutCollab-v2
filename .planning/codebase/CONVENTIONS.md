# Coding Conventions

**Analysis Date:** 2026-04-29

## Naming Patterns

**Files:**
- Use Nuxt file routing conventions for server endpoints: `server/api/entries/index.get.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/users/[id]/role.patch.ts`.
- Use `use*.ts` names for composables in `app/composables/`, such as `app/composables/useAuth.ts`, `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, and `app/composables/useColumnResize.ts`.
- Use PascalCase for Vue single-file components in `app/components/`, such as `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/EntrySensesExpand.vue`, and `app/components/admin/UserTable.vue`.
- Use PascalCase for Mongoose model files in `server/utils/`, such as `server/utils/Entry.ts`, `server/utils/User.ts`, `server/utils/EditHistory.ts`, `server/utils/Notification.ts`, `server/utils/Lexeme.ts`, and `server/utils/Theme.ts`.
- Use lower camelCase for utility modules in `server/utils/` and `app/utils/`, such as `server/utils/textConversion.ts`, `server/utils/validation.ts`, `server/utils/cloudinary.ts`, `app/utils/entryKey.ts`, and `app/utils/entriesTableConstants.ts`.
- Keep route middleware filenames short and role-oriented: `app/middleware/auth.ts`, `app/middleware/admin.ts`, `app/middleware/reviewer.ts`, `app/middleware/guest.ts`, and `app/middleware/home-redirect.ts`.

**Functions:**
- Use camelCase for functions and methods: `convertToHongKongTraditional()` in `server/utils/textConversion.ts`, `formatZodErrorToMessage()` in `server/utils/validation.ts`, `canContributeToDialect()` in `server/utils/auth.ts`, and `saveEntriesToLocalStorage()` in `app/composables/useEntriesLocalStorage.ts`.
- Use action-oriented names for event handlers and UI actions: `handleSubmit()` in `app/pages/login.vue`, `handleSave()` in `app/components/admin/EditRoleModal.vue`, `handleTableKeydown()` in `app/pages/entries/index.vue`, and `saveEntryChanges()` in `app/pages/entries/index.vue`.
- Use `get*` names for pure display/lookup helpers: `getRoleLabel()` in `app/components/admin/UserTable.vue`, `getDialectLabel()` in `app/components/admin/UserTable.vue`, `getCellDisplay()` from `app/composables/useEntriesTableEdit.ts`, and `getOptimizedImageUrl()` in `server/utils/cloudinary.ts`.
- Use `is*`/`can*` names for boolean checks: `isEntrySaving()` and `canEditEntry()` in `app/pages/entries/index.vue`, `canContributeToDialect()` in `server/utils/auth.ts`, and `isHeifFile()` in `app/components/entries/EntrySensesExpand.vue`.

**Variables:**
- Use camelCase for local variables, refs, and computed values: `searchQuery`, `currentPage`, `pagination`, `editingCell`, `focusedCell`, `expandedGroupKeys`, and `currentPageEntries` in `app/pages/entries/index.vue`.
- Use uppercase `const` names for shared constants: `STORAGE_KEY` and `DEBOUNCE_MS` in `app/composables/useEntriesLocalStorage.ts`, `MAX_SIZE` and `ALLOWED_TYPES` in `server/api/upload/image.post.ts`, `CACHE_TTL` in `app/composables/useDataCache.ts`, and `DEFAULT_MODEL` in `server/utils/ai.ts`.
- Use explicit `Map`/`Set` names that include the stored entity: `entryBaselineById`, `pendingAISuggestions`, `themeAISuggestions`, `definitionAISuggestions`, and `selectedEntryIds` in `app/pages/entries/index.vue` and related composables.
- Use `_isNew`, `_isDirty`, and `_tempId` only as client-side entry state markers on `Entry` objects in `app/types/index.ts`, `app/pages/entries/index.vue`, and `app/composables/useEntriesLocalStorage.ts`.

**Types:**
- Use PascalCase interfaces/types for domain models: `Entry`, `Headword`, `Dialect`, `Sense`, `Example`, `User`, `DialectPermission`, and `APIResponse` in `app/types/index.ts`.
- Use `I*` names for Mongoose model interfaces in `server/utils/Entry.ts`, such as `IEntry`, `IHeadword`, `ISense`, and `IExample`.
- Use literal union types for finite domain values: `EntryStatus`, `EntryType`, and `Register` in `app/types/index.ts`.
- Prefer typed `defineProps` and typed `defineEmits` in Vue components, as shown in `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/AISuggestionRow.vue`, `app/components/admin/EditRoleModal.vue`, and `app/components/admin/UserTable.vue`.

## Code Style

**Formatting:**
- Tool used: Not detected. No `.prettierrc`, `.eslintrc*`, `eslint.config.*`, or `biome.json` file is present at `/Users/trenton/Projects/JyutCollab-v2/`.
- Use the existing style visible in `app/composables/useAuth.ts`, `server/api/entries/index.post.ts`, and `server/utils/textConversion.ts`:
  - Two-space indentation.
  - No semicolons.
  - Single quotes for strings.
  - Trailing commas are generally omitted in object literals and arrays.
  - Prefer concise early returns for guard clauses.
- Keep `<script setup lang="ts">` in Vue components, as used in `app/pages/login.vue`, `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/EntrySensesExpand.vue`, and `app/components/admin/UserTable.vue`.
- Keep scoped component CSS inside the SFC when styles are component-specific, as in `app/pages/entries/index.vue`; keep global theme/CSS imports in `app/assets/css/main.css`.
- Use Tailwind/Nuxt UI utility classes directly in templates, as in `app/pages/login.vue`, `app/components/admin/UserTable.vue`, and `app/components/entries/EntriesEditableCell.vue`.

**Linting:**
- Tool used: Not detected.
- No `lint`, `format`, or `typecheck` scripts are defined in `package.json`.
- Because `nuxt.config.ts` enables TypeScript strict mode, keep new TypeScript narrow and explicit even without a lint script.
- Minimize new `any` usage. Existing `any` appears in high-churn compatibility areas such as `app/pages/entries/index.vue`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntryBaseline.ts`, `server/api/entries/[id].put.ts`, and `server/api/entries/index.get.ts`; do not use those files as permission to add broad `any` elsewhere.

## Import Organization

**Order:**
1. External package imports first: `import { z } from 'zod'` in `server/api/entries/index.post.ts`, `import OpenAI from 'openai'` in `server/utils/ai.ts`, `import mongoose from 'mongoose'` in `server/utils/Entry.ts`.
2. Type imports from framework/packages and app modules: `import type { Ref, ComputedRef } from 'vue'` in `app/composables/useEntriesTableColumns.ts`, `import type { Entry } from '~/types'` in `app/composables/useEntriesTableColumns.ts`.
3. App/server utility imports next: `import { canContributeToDialect } from '../../utils/auth'` and `import { formatZodErrorToMessage } from '../../utils/validation'` in `server/api/entries/[id].put.ts`.
4. Shared constants/data imports after local utilities when needed: `import { DIALECT_IDS } from '../../../shared/dialects'` in `server/api/entries/index.post.ts` and `import { DIALECT_LABELS } from '~shared/dialects'` in `app/components/admin/UserTable.vue`.
5. Vue component imports in pages after composable/type imports, as in `app/pages/entries/index.vue`.

**Path Aliases:**
- Use `~/` for app-root and Nuxt-resolved imports in frontend and server code: `~/composables/useThemeData`, `~/types`, `~/utils/entryKey`, and `~/server/utils/textConversion`.
- Use `~shared` for shared dialect data via the alias configured in `nuxt.config.ts`; examples include `app/types/index.ts` and `app/components/admin/UserTable.vue`.
- Existing server API files also use relative imports such as `../../utils/validation` and `../../../shared/dialects`; when modifying nearby files, match the file’s existing import style rather than mixing styles unnecessarily.

## Error Handling

**Patterns:**
- Server API route handlers use `defineEventHandler(async (event) => { ... })` with `try/catch`, authentication guards, Zod validation, and `createError()` for most protected APIs. Follow `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/reviews/[id]/approve.post.ts`, and `server/api/upload/image.post.ts`.
- For Zod validation in APIs, define a route-local schema and call `safeParse()`. Format validation failures through `formatZodErrorToMessage()` from `server/utils/validation.ts` when returning a single human-readable message.
- Auth login/register endpoints use a different response convention: `server/api/auth/login.post.ts` and `server/api/auth/register.post.ts` return `{ success: false, error }` instead of throwing `createError()` for validation and credential failures. Preserve that convention when changing auth endpoints.
- Most protected API endpoints return HTTP errors with Hong Kong Traditional Chinese `message` strings via `createError()`. Examples: `server/api/entries/index.post.ts`, `server/api/users/[id]/role.patch.ts`, `server/api/upload/image.post.ts`, and `server/middleware/auth.ts`.
- API catch blocks log server-side details and return safe user-facing messages. Follow `server/api/entries/index.post.ts` for unknown create failures and `server/api/reviews/[id]/approve.post.ts` for review failures.
- Frontend composables usually catch `$fetch` errors and derive `e?.data?.message || e?.message`. Examples appear in `app/composables/useAuth.ts`, `app/composables/useNotifications.ts`, `app/pages/entries/index.vue`, and `app/composables/useEntriesAISuggestions.ts`.
- Use Nuxt UI `toast.add()` for admin/history user feedback where the pattern already exists, such as `app/components/admin/EditRoleModal.vue`, `app/components/admin/ManageDialectsModal.vue`, `app/pages/admin/users.vue`, and `app/pages/histories/index.vue`.
- The entries table still uses browser `alert()`/`confirm()` in `app/pages/entries/index.vue`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntriesSelection.ts`, and `app/components/entries/EntrySensesExpand.vue`. When touching these flows, prefer migrating the local area to a Nuxt UI toast/modal pattern instead of adding more browser dialogs.

## Logging

**Framework:** console

**Patterns:**
- Server utilities and API routes use `console.error()` for operational failures: `server/utils/ai.ts`, `server/utils/textConversion.ts`, `server/utils/auth.ts`, `server/api/entries/index.get.ts`, and `server/api/upload/image.post.ts`.
- Use contextual prefixes for logs where available: `[AI]` in `server/utils/ai.ts`, `[登錄]` in `server/api/auth/login.post.ts`, `[註冊]` in `server/api/auth/register.post.ts`, and `[Entries API]` in `server/api/entries/index.get.ts`.
- Client-side errors are logged when they help debugging non-critical UI operations: `app/composables/useEntriesList.ts`, `app/composables/useEntriesLocalStorage.ts`, `app/composables/useNotifications.ts`, and `app/composables/useJyutdict.ts`.
- Do not log secrets, session cookies, passwords, raw Cloudinary credentials, MongoDB URIs, OpenRouter API keys, or uploaded file buffers. Runtime secret names are configured in `nuxt.config.ts`; log only whether a required service is configured.

## Comments

**When to Comment:**
- Use comments for domain-specific rules, workflow constraints, and non-obvious UI behavior. Good examples include dialect permission comments in `server/api/entries/index.post.ts`, morpheme synchronization comments in `server/api/entries/[id].put.ts`, keyboard navigation comments in `app/pages/entries/index.vue`, and localStorage merge comments in `app/composables/useEntriesLocalStorage.ts`.
- Use comments to preserve compatibility context for legacy fields, as in `server/api/entries/index.post.ts`, `server/api/entries/index.get.ts`, and `app/types/index.ts`.
- Avoid comments that restate simple code. Prefer comments for Cantonese dictionary domain terms, review workflow behavior, and browser interaction edge cases.
- All Chinese comments must use Hong Kong Traditional Chinese. The project instruction in `CLAUDE.md` applies to code comments, UI text, validation messages, and AI prompts.

**JSDoc/TSDoc:**
- Use TSDoc for reusable utilities and composables. Examples: `server/utils/textConversion.ts`, `server/utils/validation.ts`, `app/composables/useImageCompress.ts`, `app/composables/useEntriesLocalStorage.ts`, and `app/composables/useSenseImageUrl.ts`.
- Include parameter and return documentation for cross-cutting utilities, especially text conversion, validation formatting, image processing, and storage helpers.
- Keep inline domain notes on interface fields where they affect storage semantics, as in `app/types/index.ts` for `Headword`, `Entry`, `Sense`, and `morphemeRefs`.

## Function Design

**Size:**
- Prefer small composable/helper functions for reusable UI state, as in `app/composables/useColumnResize.ts`, `app/composables/useEntriesSelection.ts`, `app/composables/useEntrySenses.ts`, and `app/composables/useImageCompress.ts`.
- Keep API handlers focused on one route action. Existing large handlers such as `server/api/entries/[id].put.ts` combine validation, authorization, persistence, history, text conversion, and morpheme sync; avoid adding unrelated responsibilities to these handlers.
- `app/pages/entries/index.vue` is a large orchestration page. New reusable behavior for entries should go into `app/composables/useEntries*.ts`, `app/composables/useEntry*.ts`, or `app/components/entries/*.vue` rather than extending the page further.

**Parameters:**
- Pass reactive dependencies into composables as `Ref`, `ComputedRef`, or callbacks, following `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, and `app/composables/useEntriesSelection.ts`.
- Keep route input validation at API boundaries with Zod schemas in the route file. Examples: `server/api/entries/index.get.ts`, `server/api/entries/index.post.ts`, `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`, `server/api/users/[id]/role.patch.ts`, and `server/api/reviews/[id]/approve.post.ts`.
- Use typed event payloads for Vue emits. Follow `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/AISuggestionRow.vue`, and `app/components/admin/EditRoleModal.vue`.

**Return Values:**
- API endpoints generally return `{ success: true, data }` for mutations and object/list payloads for reads. Examples: `server/api/entries/index.post.ts`, `server/api/reviews/[id]/approve.post.ts`, and `server/api/upload/image.post.ts`.
- Listing endpoints return pagination metadata: `server/api/entries/index.get.ts` returns `data`, `total`, `page`, `perPage`, and `totalPages`; grouped responses additionally include `grouped: true`.
- Composables return named state and actions from an object, as in `app/composables/useAuth.ts`, `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useNotifications.ts`, and `app/composables/useColumnResize.ts`.

## Module Design

**Exports:**
- Use named exports for reusable composables and utilities: `useAuth()` in `app/composables/useAuth.ts`, `useEntriesList()` in `app/composables/useEntriesList.ts`, `convertToHongKongTraditional()` in `server/utils/textConversion.ts`, and `connectDB()` in `server/utils/db.ts`.
- Use default exports for Nuxt route middleware and API handlers: `app/middleware/auth.ts`, `app/middleware/admin.ts`, `server/api/entries/index.get.ts`, and `server/api/upload/image.post.ts`.
- Export Mongoose models as named constants from `server/utils/*.ts`, such as `Entry` from `server/utils/Entry.ts` and `User` from `server/utils/User.ts`.

**Barrel Files:**
- `app/types/index.ts` acts as a type barrel and re-exports `app/types/auth.ts` and `app/types/jyutdict.ts`.
- No broad component/composable barrel file is detected. Import composables and components directly by file path, as in `app/pages/entries/index.vue`.

## Frontend Implementation Patterns

**Vue Components:**
- Use `<script setup lang="ts">` with typed props/emits. Follow `app/components/entries/EntriesEditableCell.vue`, `app/components/entries/AISuggestionRow.vue`, `app/components/admin/EditRoleModal.vue`, and `app/components/admin/UserTable.vue`.
- Keep feature components under feature directories: entry UI in `app/components/entries/`, admin UI in `app/components/admin/`, and layout UI in `app/components/layout/`.
- Prefer child components for table rows, modals, and expandable panels. Existing examples include `app/components/entries/DuplicateCheckRow.vue`, `app/components/entries/JyutdictSuggestionRow.vue`, `app/components/entries/EntryThemeExpand.vue`, `app/components/entries/LexemeMergeModal.vue`, and `app/components/entries/LexemeExternalEtymonsModal.vue`.
- Avoid untyped `defineEmits([...])` for new components. `app/components/entries/EntrySensesExpand.vue` is the only detected untyped emits array; use typed emit signatures for new code.

**Composables:**
- Put shared stateful UI logic in composables under `app/composables/`. Examples: `useEntriesList.ts` for fetching/caching, `useEntriesAISuggestions.ts` for AI suggestion workflow, `useEntriesLocalStorage.ts` for draft persistence, `useEntriesSelection.ts` for selection/delete state, and `useColumnResize.ts` for table column widths.
- Keep composables framework-aware but domain-focused. For example, `app/composables/useEntriesList.ts` owns the entries API query and Nuxt payload cache, while `app/composables/useEntriesTableColumns.ts` owns editable column parsing/setters.
- For localStorage, guard browser-only access with `typeof window !== 'undefined'` or `typeof localStorage === 'undefined'`, as in `app/composables/useEntriesLocalStorage.ts` and `app/composables/useColumnResize.ts`.

**State:**
- Use `ref`, `reactive`, `computed`, and `watch` from Vue Composition API in pages/composables. Examples: `app/pages/entries/index.vue`, `app/composables/useEntriesList.ts`, `app/composables/useNotifications.ts`, and `app/composables/useColumnResize.ts`.
- Use Nuxt `useState()` for shared client/session-adjacent state, as in `useProfileUpdatedUser()` in `app/composables/useAuth.ts`.
- Use Pinia only where a store is actually needed. `nuxt.config.ts` points Pinia to `app/stores/**`.

## Backend Implementation Patterns

**API Handlers:**
- Start protected handlers by checking `event.context.auth` even though `server/middleware/auth.ts` guards most API routes. Examples: `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/reviews/[id]/approve.post.ts`, and `server/api/upload/image.post.ts`.
- Call `await connectDB()` before Mongoose operations. Examples: `server/api/entries/index.post.ts`, `server/api/entries/index.get.ts`, `server/api/users/[id]/role.patch.ts`, and `server/api/entries/check-duplicate.get.ts`.
- Use `getRouterParam(event, 'id')` for dynamic route IDs, as in `server/api/entries/[id].put.ts`, `server/api/reviews/[id]/approve.post.ts`, and `server/api/users/[id]/role.patch.ts`.
- Use method-suffixed route filenames (`.get.ts`, `.post.ts`, `.put.ts`, `.patch.ts`, `.delete.ts`) for API actions under `server/api/`.

**Validation:**
- Define route-local Zod schemas near the top of API files. Follow `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`, `server/api/entries/index.get.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/api/users/[id]/role.patch.ts`.
- Validate both body and query input at the API boundary. Use `readBody(event)` for bodies and `getQuery(event)` for queries, as shown in `server/api/entries/index.post.ts` and `server/api/entries/index.get.ts`.
- For constrained domain values, use Zod enums that mirror model/type unions: statuses in `server/api/entries/index.get.ts`, entry types in `server/api/entries/index.post.ts`, user roles in `server/api/users/[id]/role.patch.ts`, and register values in `server/api/entries/[id].put.ts`.

**Persistence:**
- Use Mongoose models from `server/utils/`. Entry persistence goes through `server/utils/Entry.ts`; users go through `server/utils/User.ts`; edit history goes through `server/utils/EditHistory.ts`; notifications go through `server/utils/Notification.ts`.
- Maintain edit history for entry mutations. `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/api/reviews/[id]/approve.post.ts` create `EditHistory` records.
- Use the custom `Entry.id` string field for client/API identity, not MongoDB `_id`, per conventions in `app/types/index.ts`, `server/utils/Entry.ts`, and `app/pages/entries/index.vue`.

## Security-Relevant Conventions

**Authentication and Authorization:**
- Use `nuxt-auth-utils` sessions via `getUserSession()`, `setUserSession()`, and `useUserSession()`. Server session enforcement lives in `server/middleware/auth.ts`; client auth state lives in `app/composables/useAuth.ts`.
- Public API exceptions are explicit in `server/middleware/auth.ts`: auth routes, Nuxt internal routes, `GET /api/entries`, `GET /api/entries/:id`, and `GET /api/stats`.
- Enforce role checks server-side, not only in route middleware or UI. Examples: reviewer/admin checks in `server/api/reviews/[id]/approve.post.ts` and admin-only checks in `server/api/users/[id]/role.patch.ts`.
- Enforce dialect permissions with `canContributeToDialect()` from `server/utils/auth.ts` before entry create/update. Examples: `server/api/entries/index.post.ts` and `server/api/entries/[id].put.ts`.
- Use bcrypt password hashing with `SALT_ROUNDS = 12` in `server/utils/auth.ts`.
- Do not expose password hashes in auth/session payloads. `toAuthUser()` in `server/utils/auth.ts` returns only safe user fields.

**Input and Output Safety:**
- Keep user-facing Chinese text in Hong Kong Traditional Chinese. Convert dictionary content with `convertToHongKongTraditional()` from `server/utils/textConversion.ts` before persistence. Existing create/update conversion is in `server/api/entries/index.post.ts` and `server/api/entries/[id].put.ts`.
- Validate uploaded image MIME type and size before Cloudinary upload, following `server/api/upload/image.post.ts`; current limits are 5MB and JPG/PNG/GIF/WebP/HEIC/HEIF MIME types.
- Keep Cloudinary credentials server-only through `runtimeConfig` in `nuxt.config.ts`. Client image rendering should use only the public cloud name through `app/composables/useSenseImageUrl.ts`.
- Do not read, log, or write secret values from `.env`. `.env` and `.env.example` exist at the repository root; only `.env.example` should be used as documentation/template material.

**Known Security/Quality Gaps to Avoid Expanding:**
- Raw user search input is used as MongoDB regex in `server/api/entries/index.get.ts`. New search code should escape regex input or use safer indexed search.
- No rate limiting is detected on auth endpoints in `server/api/auth/login.post.ts`, AI endpoints in `server/api/ai/*.post.ts`, upload endpoint `server/api/upload/image.post.ts`, or write endpoints in `server/api/entries/`.
- Browser localStorage stores unsaved entry drafts in `app/composables/useEntriesLocalStorage.ts`; do not store credentials, session data, API keys, or private moderation notes there.
- Several frontend flows display backend error text in browser alerts, especially `app/pages/entries/index.vue` and `app/composables/useEntriesAISuggestions.ts`. Avoid surfacing raw exception strings to end users in new code.

## Hong Kong Traditional Chinese Requirement

- All Chinese UI labels, validation messages, comments, AI prompts, enum labels, and stored dictionary text must use Hong Kong Traditional Chinese.
- Use `convertToHongKongTraditional()` from `server/utils/textConversion.ts` for server-side normalization of entry text, definitions, examples, usage notes, and generated AI text.
- Preserve intentionally user-entered variants where the domain requires raw input. `app/types/index.ts` documents `Headword.variants` as not converted automatically, and `server/api/entries/index.post.ts` stores `headword.variants` directly.
- Use the project’s register enum values exactly: `口語`, `書面`, `粗俗`, `文雅`, `中性`. These are defined in `app/types/index.ts`, `server/utils/Entry.ts`, `server/api/entries/index.post.ts`, and `server/api/entries/[id].put.ts`.
- Use locale-aware formatting for Hong Kong where applicable. `app/components/admin/UserTable.vue` formats dates with `toLocaleDateString('zh-HK', ...)`.

## Quality Gaps and Prescriptive Guidance

- Do not add more responsibilities to `app/pages/entries/index.vue`; it is already 2,439 lines and coordinates view modes, keyboard editing, persistence, AI, duplicate checks, pagination, localStorage, lexeme operations, and modals.
- Prefer extracting new entries-table behavior into `app/composables/useEntries*.ts`, `app/composables/useEntry*.ts`, or `app/components/entries/*.vue`.
- Do not add broad `any` unless it is isolating legacy compatibility. If `any` is needed, confine it to a small adapter function near the boundary, as `server/api/entries/index.get.ts` does in `transformEntry()`.
- Keep model/type definitions aligned. `server/utils/Entry.ts` contains schema fields and interfaces that require care when adding `headword` fields; `app/types/index.ts` is the frontend type source for entries.
- Prefer typed emits for new Vue components. Use `app/components/entries/AISuggestionRow.vue` and `app/components/admin/EditRoleModal.vue` as examples.
- Prefer Nuxt UI toast/modal feedback over `alert()` and `confirm()` for new or touched UI flows. Existing toast patterns are in `app/components/admin/EditRoleModal.vue`, `app/components/admin/ManageDialectsModal.vue`, and `app/pages/histories/index.vue`.
- Use `npm run build` as the minimum verification command after convention-sensitive code changes because no dedicated lint/typecheck/test scripts are configured in `package.json`.

---

*Convention analysis: 2026-04-29*
