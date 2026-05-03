# Codebase Concerns

**Analysis Date:** 2026-04-29

## Tech Debt

**Oversized entries spreadsheet page:**
- Issue: The main entries workspace combines data loading, keyboard navigation, inline editing, row hints, AI suggestion handling, lexeme grouping, selection, local draft persistence, save/delete operations, pagination, and route-query syncing in one 2,439-line Vue page.
- Files: `app/pages/entries/index.vue`, `app/composables/useEntriesList.ts`, `app/composables/useEntriesRowHints.ts`, `app/composables/useEntriesAISuggestions.ts`
- Impact: Small changes to table behaviour can affect unrelated workflows such as AI suggestions, grouped views, local drafts, and keyboard focus. Merge conflicts are likely because feature work concentrates in one file.
- Fix approach: Extract feature-level controllers from `app/pages/entries/index.vue`: save orchestration, grouped/lexeme view actions, keyboard focus/navigation, draft restore/persist, and row-hint orchestration. Keep the page as composition wiring plus template only.

**Duplicated and drifting entry/auth types:**
- Issue: Client types and server types duplicate the same domain models but do not match exactly. `app/types/index.ts` defines the current frontend `EditHistory` as `beforeSnapshot`/`afterSnapshot`, while `server/utils/types.ts` still defines history with `changes`, `snapshot`, `editedBy`, and `editedAt`. `server/utils/Entry.ts` also declares `IHeadword.search`, but `HeadwordSchema` omits `search`.
- Files: `app/types/index.ts`, `server/utils/types.ts`, `server/utils/Entry.ts`, `server/utils/EditHistory.ts`
- Impact: Refactors can compile on one side while silently breaking the other. Migration code may assume fields that are not present in MongoDB documents.
- Fix approach: Move shared entry/auth/history DTOs into `shared/` and generate or infer API response types from Zod schemas. Remove unused legacy fields such as `IHeadword.search` or reintroduce them consistently with migrations.

**Legacy compatibility fields obscure the canonical data model:**
- Issue: API responses carry both new nested fields and legacy flat fields such as `text`, `region`, `themeIdL1`, `definition`, `usageNotes`, `formalityLevel`, `phoneticNotation`, and `contributorId`.
- Files: `server/api/entries/index.get.ts`, `server/api/entries/[id].get.ts`, `app/types/index.ts`, `server/utils/types.ts`
- Impact: New code can accidentally write or depend on compatibility fields rather than canonical fields (`headword`, `dialect`, `theme`, `senses`, `phonetic`). This increases migration and UI-state bugs.
- Fix approach: Treat `server/api/entries/index.get.ts` and `server/api/entries/[id].get.ts` as boundary adapters only. Do not add new business logic against compatibility fields. Introduce a versioned API response when removing legacy fields.

**Weak typing under strict TypeScript:**
- Issue: The project enables strict TypeScript but many core files use `any`, index signatures, and casts for entry mutation, API response transformation, and baseline/draft handling.
- Files: `nuxt.config.ts`, `app/pages/entries/index.vue`, `app/composables/useEntryBaseline.ts`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntriesLocalStorage.ts`, `app/types/index.ts`, `server/utils/Entry.ts`, `server/api/entries/index.get.ts`, `server/api/entries/[id].put.ts`
- Impact: Strict mode gives limited safety in the most change-prone areas. Shape changes to entries can pass compilation but fail at runtime or corrupt draft/save state.
- Fix approach: Replace `any`-heavy transformations with typed DTO helpers. Add `EntryDraft`, `EntryRow`, `GroupedEntryRow`, and API response types in `shared/` or `app/types/entries.ts`.

**Hardcoded domain taxonomies:**
- Issue: Large dialect and theme mappings are hardcoded in source files. AI categorization also embeds the full theme list directly into the prompt string.
- Files: `shared/dialects.ts`, `server/utils/themeMapping.ts`, `server/utils/ai.ts`, `app/composables/useThemeData.ts`
- Impact: Taxonomy updates require code deploys and increase prompt/token size. ID/label mismatches can appear across UI, stats, and imported data.
- Fix approach: Keep IDs and labels in a validated data file or database seed with schema checks. Load theme lists for AI from the same source as `server/utils/Theme.ts` or cache a normalized prompt fragment.

**Notification model exists but review actions do not create notifications:**
- Issue: Notification utilities are defined but approval/rejection routes create edit history only; they do not call notification creation helpers.
- Files: `server/utils/Notification.ts`, `server/api/reviews/[id]/approve.post.ts`, `server/api/reviews/[id]/reject.post.ts`, `app/composables/useNotifications.ts`
- Impact: Contributors may not learn that entries were approved or rejected unless they manually inspect review/history pages.
- Fix approach: Call `createApprovedNotification()` and `createRejectedNotification()` from review routes after successful atomic status updates. Include entry IDs and reviewer notes.

## Known Bugs

**Dialect coverage stats use labels to read ID-keyed data:**
- Symptoms: Dialect coverage can under-report or omit entries when stored entries use dialect IDs such as `hongkong` while stats lookup uses labels such as `香港`.
- Files: `server/api/stats/dialects.get.ts`, `shared/dialects.ts`, `server/utils/Entry.ts`
- Trigger: Create entries with `dialect.name` set to a dialect ID, then request `/api/stats/dialects`; `dialectMap.get(name)` uses `DIALECT_LABELS[id]` rather than the stored ID.
- Workaround: Query entry counts directly from `/api/entries` filters when verifying coverage. Fix by consistently storing and querying dialect IDs, and only using `DIALECT_LABELS` for display.

**Contributors can self-grant dialect contribution permissions through profile updates:**
- Symptoms: A logged-in contributor can submit `dialects` in their profile update and overwrite their own `dialectPermissions` with any valid dialect IDs.
- Files: `server/api/auth/me.patch.ts`, `server/utils/auth.ts`, `shared/dialects.ts`, `app/pages/profile.vue`
- Trigger: Send `PATCH /api/auth/me` with a different `dialects` array; the route maps it to `allowed.dialectPermissions` without admin approval.
- Workaround: Restrict profile UI, but server still accepts the payload. Fix server-side by making contribution dialect changes admin-only or storing requested dialects separately from granted permissions.

**Entry create route can accept approved/rejected status from clients:**
- Symptoms: New entries can be created with arbitrary valid workflow status when the client includes `status`, including `approved` or `rejected`.
- Files: `server/api/entries/index.post.ts`, `app/pages/entries/index.vue`, `server/utils/Entry.ts`
- Trigger: Authenticated contributor sends `POST /api/entries` with `status: 'approved'` if their dialect permission passes.
- Workaround: Frontend intends contributors to save as `pending_review`, but server should enforce role-based initial status. Fix by normalizing contributor-created statuses to `draft` or `pending_review` and allowing `approved` only for reviewer/admin.

**Contributor edit permission ignores current dialect permission when dialect is unchanged:**
- Symptoms: A contributor can edit their own existing entries even if their dialect permission has been revoked or if the session still contains old permissions.
- Files: `server/api/entries/[id].put.ts`, `server/middleware/auth.ts`, `server/utils/auth.ts`
- Trigger: Contributor owns an entry and sends `PUT /api/entries/:id` without `data.dialect`; `canEdit` checks ownership only and skips `canContributeToDialect()` for the existing dialect.
- Workaround: Admin must review suspicious edits manually. Fix by checking `canContributeToDialect(event.context.auth, existingEntry.dialect.name)` for contributor edits, even when `data.dialect` is omitted.

**Open redirect risk after login:**
- Symptoms: The login page pushes `route.query.redirect` directly after authentication.
- Files: `app/pages/login.vue`, `app/middleware/auth.ts`, `app/composables/useAuth.ts`
- Trigger: Visit `/login?redirect=<external-or-malformed-target>` and authenticate; router receives the unchecked redirect target.
- Workaround: Avoid linking untrusted redirect query strings. Fix by allowing only internal paths beginning with `/` and rejecting protocol-relative values such as `//host`.

**View counts increase for every detail fetch:**
- Symptoms: Internal UI restores, previews, bots, repeated refreshes, and template fetches all increment `viewCount`.
- Files: `server/api/entries/[id].get.ts`, `app/pages/entries/index.vue`
- Trigger: Any `GET /api/entries/:id` request increments the document before returning it.
- Workaround: Treat `viewCount` as request count, not user view count. Fix by separating read endpoint from analytics endpoint, throttling per session/IP, or incrementing only from explicit public detail-page views.

## Security Considerations

**Session-stored roles and permissions can become stale:**
- Risk: API authorization trusts `event.context.auth` from the `nuxt-auth-utils` session, including role and `dialectPermissions`.
- Files: `server/middleware/auth.ts`, `server/utils/auth.ts`, `server/api/users/[id]/role.patch.ts`, `server/api/users/[id]/toggle-active.patch.ts`, `server/api/users/[id]/dialect-permissions.patch.ts`
- Current mitigation: Login only includes active users, and admin routes update database state.
- Recommendations: Re-check `User.isActive`, `role`, and `dialectPermissions` from MongoDB for sensitive writes, or maintain a session version/revocation timestamp and invalidate sessions after role/permission/active-state changes.

**No brute-force or rate limiting on auth and costly endpoints:**
- Risk: Login, registration, AI generation, image upload, search proxies, and public entry search can be abused for credential attacks, cost amplification, or upstream API pressure.
- Files: `server/api/auth/login.post.ts`, `server/api/auth/register.post.ts`, `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, `server/api/ai/examples.post.ts`, `server/api/upload/image.post.ts`, `server/api/jyutdict/general.get.ts`, `server/api/jyutdict/sheet.get.ts`, `server/api/jyutjyu/search.get.ts`, `server/api/entries/index.get.ts`
- Current mitigation: Input validation and authentication for most write/AI/upload endpoints.
- Recommendations: Add per-IP and per-user rate limits, lockout/backoff for auth failures, AI quota counters, and upstream proxy caching.

**Image upload trusts client-provided MIME type:**
- Risk: The upload route accepts files based on multipart `file.type` and size only before sending bytes to Cloudinary.
- Files: `server/api/upload/image.post.ts`, `server/utils/cloudinary.ts`, `app/components/entries/EntrySensesExpand.vue`
- Current mitigation: 5MB limit and MIME allowlist (`image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/heic`, `image/heif`).
- Recommendations: Verify magic bytes/server-side image decoding, reject polyglot files, set Cloudinary resource type and transformations explicitly, and add per-user upload quotas.

**AI prompts include untrusted user/reference text:**
- Risk: User-entered expressions, contexts, definitions, and reference entries are interpolated directly into prompts. Prompt injection can influence structured output or produce unsafe/incorrect lexicographic content.
- Files: `server/utils/ai.ts`, `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, `server/api/ai/examples.post.ts`, `app/composables/useEntriesAISuggestions.ts`
- Current mitigation: Zod validates JSON response shape; output Chinese is converted to Hong Kong Traditional Chinese.
- Recommendations: Add prompt-injection boundaries, explicit instruction hierarchy, content length limits on reference expressions, model timeout/retry policy, and audit fields for accepted AI suggestions.

**Public endpoints expose draft/rejected entry data:**
- Risk: Public list/detail routes return entries regardless of status unless the client filters by status.
- Files: `server/middleware/auth.ts`, `server/api/entries/index.get.ts`, `server/api/entries/[id].get.ts`
- Current mitigation: `GET /api/entries` and `GET /api/entries/:id` are intentionally public; status can be filtered.
- Recommendations: Decide whether drafts/rejections are public. If not, default public requests to `status: 'approved'` and expose other statuses only to authenticated owners/reviewers/admins.

## Performance Bottlenecks

**Regex search over unescaped user query:**
- Problem: Public entry search builds MongoDB `$regex` expressions directly from user input and searches `headword.display`, `headword.variants`, and `senses.definition`.
- Files: `server/api/entries/index.get.ts`, `server/utils/Entry.ts`
- Cause: `searchQuery` is not escaped or converted to a text-search strategy; `senses.definition` is not indexed for substring regex.
- Improvement path: Escape regex metacharacters, cap query length, add text indexes or Atlas Search, and separate exact headword lookup from full-text definition search.

**Grouped entries aggregate full documents:**
- Problem: Grouped headword/lexeme views use `$facet`, `$group`, and `$push: '$$ROOT'` before pagination.
- Files: `server/api/entries/index.get.ts`, `app/composables/useEntriesList.ts`, `app/pages/entries/index.vue`
- Cause: MongoDB must group and keep full entry documents for each group; large groups or large entry documents increase memory and latency.
- Improvement path: Group on slim projected fields first, paginate groups, then fetch group member entries by IDs. Add indexes for `lexemeId` and `headword.normalized`.

**Offset pagination becomes slow at high page numbers:**
- Problem: Flat and grouped list views use `skip = (page - 1) * perPage` with `.skip(skip)` or aggregation `$skip`.
- Files: `server/api/entries/index.get.ts`, `app/composables/useEntriesList.ts`, `app/pages/entries/index.vue`
- Cause: MongoDB must scan/skip all previous rows for large offsets.
- Improvement path: Use cursor pagination for high-volume views with stable sort keys such as `{ createdAt, _id }` or `{ headword.display, _id }`.

**Stats endpoints rely on repeated counts/aggregations:**
- Problem: Stats routes compute counts from live `entries`, users, and grouped aggregates.
- Files: `server/api/stats/dialects.get.ts`, `server/api/stats/mine/enhanced.get.ts`, `server/api/stats/reviewer.get.ts`, `server/api/stats/index.get.ts`
- Cause: Counts are derived on demand with `countDocuments()` and aggregation.
- Improvement path: Cache stats by short TTL, precompute contributor/reviewer counters, and invalidate caches on entry status changes.

**Missing indexes for new relationship fields:**
- Problem: `lexemeId` and `morphemeRefs.targetEntryId` are queried or grouped but are not indexed.
- Files: `server/utils/Entry.ts`, `server/api/entries/index.get.ts`, `server/api/entries/[id].put.ts`, `server/api/entries/search-morphemes.get.ts`, `server/api/entries/[id]/lexeme.patch.ts`
- Cause: Entry schema indexes predate lexeme grouping and morpheme-reference synchronization.
- Improvement path: Add indexes `{ lexemeId: 1 }`, `{ 'morphemeRefs.targetEntryId': 1 }`, and possibly `{ 'headword.normalized': 1, 'dialect.name': 1 }` with migration checks.

## Fragile Areas

**Save-all partial failure handling:**
- Files: `app/pages/entries/index.vue`, `server/api/entries/[id].put.ts`
- Why fragile: `saveAllChanges()` mutates each dirty entry status locally before sending `Promise.all()`. If one request fails, some entries may have saved on the server while all entries remain in a confusing local state.
- Safe modification: Use per-entry result collection (`Promise.allSettled()`), update baselines only for successful entries, keep failed rows dirty, and restore pre-save status for failed rows.
- Test coverage: No tests detected for batch save partial failures, save indicators, local draft cleanup, or status mutation rollback.

**Morpheme headword synchronization is non-transactional:**
- Files: `server/api/entries/[id].put.ts`, `server/utils/Entry.ts`, `server/api/entries/search-morphemes.get.ts`
- Why fragile: When a referenced morpheme headword changes, affected entries are loaded and saved one by one after the source entry is saved. Failed affected saves are logged but not retried, not included in edit history, and not transactionally tied to the source change.
- Safe modification: Add an index on `morphemeRefs.targetEntryId`, use MongoDB transactions where available, create history records for affected entries, and surface partial-sync failures to reviewers/admins.
- Test coverage: No tests detected for position replacement, variable-length morpheme changes, partial sync failures, or history creation for affected entries.

**Edit history/revert restores only selected fields:**
- Files: `server/utils/EditHistory.ts`, `server/api/histories/[id].revert.post.ts`, `server/api/entries/[id].put.ts`
- Why fragile: Revert restores `headword`, `dialect`, `phonetic`, `entryType`, `senses`, `refs`, `theme`, `meta`, and `status`, but excludes `lexemeId`, `morphemeRefs`, `reviewedBy`, `reviewedAt`, `reviewNotes`, and counters. It also marks history as reverted after saving the entry.
- Safe modification: Define explicit revert policies by field class, require reviewer/admin for status-changing reverts, and perform entry save/history mark/new history insert in a transaction.
- Test coverage: No tests detected for reverting status changes, lexeme/morpheme changes, delete snapshots, or concurrent reverts.

**Local drafts are global to the browser, not scoped to user/account:**
- Files: `app/composables/useEntriesLocalStorage.ts`, `app/composables/useEntriesList.ts`, `app/pages/entries/index.vue`
- Why fragile: Drafts are saved under one key, `jyutcollab-entries-draft`, regardless of authenticated user. Multiple users on the same browser can see or overwrite each other's unsaved entry drafts.
- Safe modification: Scope storage key by user ID and environment, e.g. `jyutcollab-entries-draft:${user.id}`, and clear or migrate old drafts on logout/login switches.
- Test coverage: No tests detected for user switching, localStorage quota fallback, grouped-view draft restore, or orphan draft insertion.

**Client cache invalidation is manual and easy to miss:**
- Files: `app/composables/useEntriesList.ts`, `app/composables/useDataCache.ts`, `app/pages/entries/index.vue`, `app/composables/useStats.ts`, `app/composables/useEnhancedStats.ts`
- Why fragile: Entry list responses are stored in `nuxtApp.payload.data` with TTL. Mutations must explicitly clear affected keys; missing invalidation can show stale rows, stats, or grouped data.
- Safe modification: Centralize mutation functions and invalidate `entries-list`, stats, notifications, and per-entry detail keys after successful create/update/delete/review actions.
- Test coverage: No tests detected for post-mutation cache freshness or stale grouped views.

**Lexeme grouping lacks referential integrity:**
- Files: `server/utils/Lexeme.ts`, `server/utils/Entry.ts`, `server/api/entries/[id]/lexeme.patch.ts`, `server/api/lexemes/[lexemeId]/external-etymons.get.ts`, `server/api/lexemes/[lexemeId]/external-etymons.post.ts`
- Why fragile: Entries store `lexemeId` as a string. `Lexeme` has only `id` and `notes`; entries can reference missing lexemes, and deleting/moving entries does not cascade or validate external etymons.
- Safe modification: Add lexeme membership invariants, upsert lexemes for all referenced IDs, block deletion of referenced lexemes, and provide admin repair scripts.
- Test coverage: No tests detected for lexeme merge/split, orphan lexemes, or external etymon retention after entry deletion.

**Browser dialogs are used for critical workflows:**
- Files: `app/pages/entries/index.vue`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useEntriesSelection.ts`, `app/components/entries/LexemeExternalEtymonsModal.vue`, `app/pages/review/index.vue`
- Why fragile: `alert()` and `confirm()` block the UI, are hard to test, and provide inconsistent UX for save failures, delete confirmations, AI errors, and lexeme operations.
- Safe modification: Replace browser dialogs with app-level toast/modal components from `@nuxt/ui`; route all mutation errors through a shared error presenter.
- Test coverage: No tests detected for user cancellation, error display, or accessibility of blocking dialogs.

## Scaling Limits

**Entry document size grows with full nested senses/examples/images/history snapshots:**
- Current capacity: MongoDB document limit is 16MB; practical UI performance will degrade earlier for entries with many senses, examples, images, refs, and history snapshots.
- Limit: `EditHistory` stores complete `beforeSnapshot` and `afterSnapshot` for each update, multiplying storage use by entry size.
- Scaling path: Store field-level diffs for common edits, archive old histories, move large image metadata/provenance to separate collections, and paginate history detail views.

**AI cost and concurrency are unbounded:**
- Current capacity: AI routes call OpenRouter synchronously for each request without per-user quotas, queueing, caching, or timeout control.
- Limit: Simultaneous table editing can trigger many definition/theme/example requests and continue server-side even if the browser aborts.
- Scaling path: Add quota counters by user/day, deduplicate requests by expression+dialect+field, introduce server-side AbortController/timeout, and cache accepted suggestions.

**Public search and external proxy endpoints can amplify traffic:**
- Current capacity: Public entry listing and authenticated Jyutdict/Jyutjyu proxies fetch live data on demand.
- Limit: Repeated searches can drive MongoDB scans and upstream API calls.
- Scaling path: Add query-length caps, rate limits, CDN/server cache for external API responses, and search-specific indexes.

## Dependencies at Risk

**No lint/test tooling in package scripts:**
- Risk: `package.json` defines `dev`, `build`, `generate`, `preview`, and `postinstall`, but no `test`, `lint`, `typecheck`, or formatting scripts.
- Impact: Regressions in permission checks, entry transformations, keyboard UX, and API validation can land without automated feedback.
- Migration plan: Add Vitest for composables/utils/API logic, `vue-tsc` or `nuxt typecheck`, ESLint/Biome, and CI scripts before large refactors.

**OpenRouter model identifier is embedded as a default in multiple places:**
- Risk: The default model `qwen/qwen3-235b-a22b-07-25` is configured in `nuxt.config.ts` and `server/utils/ai.ts`.
- Impact: Model deprecation or behaviour change affects categorization, definitions, and examples globally.
- Migration plan: Keep one runtime-config default, track model used in AI responses/edit history, and add model compatibility tests with fixture prompts.

**Mongoose 9 adoption with broad `any` casts:**
- Risk: Core APIs rely on Mongoose behaviour with many casts and lean transformations.
- Impact: Mongoose upgrades or schema changes can break overloaded calls, ObjectId fallback logic, or returned shape assumptions.
- Migration plan: Encapsulate model access in repository helpers and add integration tests around create/update/list/detail/history flows.

## Missing Critical Features

**Automated tests:**
- Problem: No app test files or test runner configuration were detected outside `node_modules`; `package.json` has no test script.
- Blocks: Safe refactoring of `app/pages/entries/index.vue`, permission enforcement, review workflow, revert logic, AI suggestion state, and MongoDB aggregation changes.

**Centralized authorization policy:**
- Problem: Permission logic is repeated across routes and partly duplicated between client UI checks and server checks.
- Blocks: Consistent handling of contributor ownership, dialect permissions, reviewer/admin privileges, status transitions, and self-service profile changes.

**Operational safeguards for AI and uploads:**
- Problem: No per-user quotas, request budgets, timeout policy, retry strategy, or audit trail for AI/upload side effects.
- Blocks: Production-safe rollout of AI-assisted bulk entry workflows.

**Data repair/migration scripts:**
- Problem: Dialect IDs/labels, missing `lexemeId`, orphan lexemes, orphan Cloudinary images, stale morpheme references, and old compatibility fields need repair paths.
- Blocks: Confident schema cleanup and canonicalization.

## Test Coverage Gaps

**Auth and permission boundaries:**
- What's not tested: Login/register throttling, stale sessions after admin changes, self-granting dialect permissions, contributor edits after permission revocation, role-based status transitions, reviewer/admin bypasses.
- Files: `server/middleware/auth.ts`, `server/utils/auth.ts`, `server/api/auth/me.patch.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/users/[id]/role.patch.ts`, `server/api/users/[id]/toggle-active.patch.ts`, `server/api/users/[id]/dialect-permissions.patch.ts`
- Risk: Unauthorized entry creation/editing/approval can occur unnoticed.
- Priority: High

**Entry CRUD and duplicate consistency:**
- What's not tested: Race between duplicate check and unique index, normalization/variants duplicate policy, create/update history creation, delete orphan cleanup, status initialization on create.
- Files: `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/entries/[id].delete.ts`, `server/api/entries/check-duplicate.get.ts`, `server/utils/Entry.ts`, `server/utils/EditHistory.ts`
- Risk: Duplicate entries, incorrect statuses, and incomplete audit records can enter production data.
- Priority: High

**Review workflow and notifications:**
- What's not tested: Atomic approve/reject conflicts, rejected notes, notification creation, contributor visibility, review counts.
- Files: `server/api/reviews/[id]/approve.post.ts`, `server/api/reviews/[id]/reject.post.ts`, `server/utils/Notification.ts`, `app/pages/review/index.vue`, `app/composables/useNotifications.ts`
- Risk: Review decisions may be lost, invisible, or counted incorrectly.
- Priority: High

**History and revert:**
- What's not tested: Field restore policy, status-changing reverts, concurrent reverts, delete snapshots, lexeme/morpheme fields, permission boundaries.
- Files: `server/api/histories/[id].revert.post.ts`, `server/utils/EditHistory.ts`, `app/pages/histories/index.vue`
- Risk: Reverts can corrupt entry state or bypass workflow rules.
- Priority: High

**Entries table UI state:**
- What's not tested: Keyboard navigation, IME enter handling, grouped/lexeme view focus, local draft restore, save-all partial failures, cancel edit rollback, cache invalidation.
- Files: `app/pages/entries/index.vue`, `app/composables/useEntriesList.ts`, `app/composables/useEntryBaseline.ts`, `app/composables/useEntriesLocalStorage.ts`, `app/composables/useEntriesTableEdit.ts`
- Risk: Users can lose edits or save unintended content.
- Priority: High

**AI integration:**
- What's not tested: Prompt output parsing, fallback behaviour, abort/cancel behaviour, accepted suggestion provenance, OpenRouter failures, quota handling.
- Files: `server/utils/ai.ts`, `server/api/ai/categorize.post.ts`, `server/api/ai/definitions.post.ts`, `server/api/ai/examples.post.ts`, `app/composables/useEntriesAISuggestions.ts`
- Risk: AI failures silently populate defaults or surprise users with cost/incorrect content.
- Priority: Medium

**External dictionary proxies:**
- What's not tested: Jyutdict/Jyutjyu upstream errors, slow responses, malformed JSON, rate limits, row-hint interactions.
- Files: `server/api/jyutdict/general.get.ts`, `server/api/jyutdict/sheet.get.ts`, `server/api/jyutjyu/search.get.ts`, `app/composables/useEntriesRowHints.ts`, `app/composables/useJyutdict.ts`
- Risk: External outages can degrade entry editing and produce confusing UI errors.
- Priority: Medium

**Stats and dialect consistency:**
- What's not tested: ID/label mismatches, coverage counts, user permission dialect stats, contributor/reviewer counters.
- Files: `server/api/stats/dialects.get.ts`, `server/api/stats/mine/enhanced.get.ts`, `server/api/stats/reviewer.get.ts`, `shared/dialects.ts`
- Risk: Dashboard and profile metrics mislead users and reviewers.
- Priority: Medium

---

*Concerns audit: 2026-04-29*
