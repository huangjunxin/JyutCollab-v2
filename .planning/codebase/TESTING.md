# Testing Patterns

**Analysis Date:** 2026-04-29

## Test Framework

**Runner:**
- Not detected. No Vitest, Jest, Playwright, Cypress, or Nuxt test configuration is present in `/Users/trenton/Projects/JyutCollab-v2/`.
- No `vitest.config.*`, `jest.config.*`, or `playwright.config.*` file is present.
- No `*.test.*`, `*.spec.*`, or `*.cy.*` files are present under `app/`, `server/`, or `shared/`.

**Assertion Library:**
- Not detected.
- No assertion/test dependency is listed in `package.json`.

**Run Commands:**
```bash
npm run build        # Current minimum verification: Nuxt production build and TypeScript checks through Nuxt
npm run dev          # Manual verification server on port 3100
npm run preview      # Preview production build after npm run build
```

**Unavailable Commands:**
```bash
npm test             # Not configured in package.json
npm run lint         # Not configured in package.json
npm run typecheck    # Not configured in package.json
npm run format       # Not configured in package.json
```

## Test File Organization

**Location:**
- Not detected. There is no existing test file organization.
- When tests are added, use co-located unit tests next to focused composables/utilities and route-level tests near API behavior, while keeping fixtures isolated from production code.

**Naming:**
- Not detected in current code.
- Recommended naming for future tests:
  - `*.test.ts` for unit and integration tests for composables/utilities/API handlers.
  - `*.spec.ts` or `*.spec.tsx` only if a future test runner convention requires it.
  - `*.e2e.ts` under an E2E directory only when an E2E runner is introduced.

**Structure:**
```text
app/composables/
├── useEntriesTableColumns.ts
└── useEntriesTableColumns.test.ts       # Future unit tests for parsing/setters

server/utils/
├── textConversion.ts
├── validation.ts
└── validation.test.ts                   # Future unit tests for shared helpers

server/api/entries/
├── index.get.ts
├── index.post.ts
└── index.get.test.ts                    # Future API behavior tests if server test harness is added
```

## Test Structure

**Suite Organization:**
```typescript
// No current test suite exists. Use this structure when a runner such as Vitest is introduced.
describe('formatZodErrorToMessage', () => {
  it('returns the first validation issue with a field label', () => {
    // Arrange: create a Zod validation error
    // Act: call formatZodErrorToMessage(error, labels)
    // Assert: expect Hong Kong Traditional Chinese message text
  })
})
```

**Patterns:**
- Setup pattern: Not detected.
- Teardown pattern: Not detected.
- Assertion pattern: Not detected.
- Future tests should follow Arrange/Act/Assert and keep database/network dependencies isolated behind mocks or test fixtures.
- Future tests that touch MongoDB should call `connectDB()` and `disconnectDB()` from `server/utils/db.ts` through a test harness, not by duplicating connection logic.
- Future tests that touch authentication should seed session/auth context equivalent to `event.context.auth` from `server/middleware/auth.ts`.

## Mocking

**Framework:** Not detected

**Patterns:**
```typescript
// No current mocking pattern exists. Use dependency boundaries already present in the app:
// - Mock $fetch for frontend composables such as app/composables/useEntriesList.ts
// - Mock OpenAI client calls for server/utils/ai.ts
// - Mock Mongoose models for server/api route unit tests, or use an isolated test database for integration tests
```

**What to Mock:**
- Mock OpenRouter/OpenAI requests from `server/utils/ai.ts`; never call real AI services in automated tests.
- Mock Cloudinary upload calls from `server/utils/cloudinary.ts` and `server/api/upload/image.post.ts`; never upload real files in automated tests.
- Mock `$fetch` in frontend composable tests for `app/composables/useEntriesList.ts`, `app/composables/useEntriesAISuggestions.ts`, `app/composables/useNotifications.ts`, `app/composables/useJyutdict.ts`, and `app/composables/useEntriesRowHints.ts`.
- Mock browser APIs for composables that use DOM/localStorage: `app/composables/useEntriesLocalStorage.ts`, `app/composables/useColumnResize.ts`, `app/composables/useImageCompress.ts`, and `app/components/entries/EntrySensesExpand.vue`.
- Mock `useUserSession()` for tests around `app/composables/useAuth.ts`, `app/middleware/auth.ts`, `app/middleware/admin.ts`, and `app/middleware/reviewer.ts`.

**What NOT to Mock:**
- Do not mock pure transformation/parsing logic in `app/composables/useEntriesTableColumns.ts`, `app/composables/useEntrySenses.ts`, `app/composables/useEntryBaseline.ts`, `server/utils/validation.ts`, or `server/utils/textConversion.ts`; test these directly.
- Do not mock the permission rules in `server/utils/auth.ts`; call `canContributeToDialect()` and `hasPermission()` directly with representative roles/permissions.
- Do not mock domain constants from `shared/dialects.ts` or theme helpers from `app/composables/useThemeData.ts` unless a test needs a tiny fixture to avoid loading the full catalog.

## Fixtures and Factories

**Test Data:**
```typescript
// Future Entry fixture shape should match app/types/index.ts and server/utils/Entry.ts.
const entryFixture = {
  id: 'entry-1',
  headword: {
    display: '詞條',
    normalized: '詞條',
    isPlaceholder: false,
    variants: []
  },
  dialect: { name: 'hongkong' },
  phonetic: { jyutping: ['ci4 tiu4'] },
  entryType: 'word',
  senses: [{ definition: '釋義', examples: [] }],
  theme: {},
  meta: { register: '口語' },
  status: 'draft',
  createdBy: 'user-1',
  viewCount: 0,
  likeCount: 0
}
```

**Location:**
- Not detected.
- Future shared fixtures should live under a test-specific directory such as `test/fixtures/` or be kept inside test files when only used once.
- Keep fixtures free of secrets and real credentials. Do not read `.env` in tests.
- Use Hong Kong Traditional Chinese fixture strings for UI text, validation messages, entries, definitions, comments, and enum values.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not available. No coverage tool is configured.
```

**Coverage Priorities When Added:**
- High priority: server validation and authorization flows in `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, `server/api/reviews/[id]/approve.post.ts`, `server/api/users/[id]/role.patch.ts`, and `server/middleware/auth.ts`.
- High priority: entry transformation and editing helpers in `app/composables/useEntriesTableColumns.ts`, `app/composables/useEntrySenses.ts`, `app/composables/useEntryBaseline.ts`, and `app/utils/entryKey.ts`.
- High priority: Hong Kong Traditional Chinese conversion utilities in `server/utils/textConversion.ts` and validation message formatting in `server/utils/validation.ts`.
- Medium priority: localStorage draft persistence in `app/composables/useEntriesLocalStorage.ts` and column-width persistence in `app/composables/useColumnResize.ts`.
- Medium priority: AI fallback and schema parsing behavior in `server/utils/ai.ts` with mocked OpenAI responses.
- Medium priority: upload validation in `server/api/upload/image.post.ts` with mocked Cloudinary.

## Test Types

**Unit Tests:**
- Not currently implemented.
- Best immediate candidates:
  - `server/utils/validation.ts`: first Zod issue selection, field labels, fallback messages.
  - `server/utils/textConversion.ts`: empty string passthrough, conversion behavior, fallback behavior if converter throws.
  - `server/utils/auth.ts`: `hasPermission()` role hierarchy and `canContributeToDialect()` reviewer/admin/contributor behavior.
  - `app/composables/useEntriesTableColumns.ts`: headword parsing with variants, phonetic splitting on `;`, `,`, `，`, `；`, register setter handling of `__none__`, and theme setter behavior.
  - `app/composables/useEntrySenses.ts`: add/remove sense/example/sub-sense behavior and `_isDirty` marking.
  - `app/composables/useEntriesLocalStorage.ts`: saves only `_isNew`/`_isDirty`, merges drafts by `id`/`_tempId`, handles corrupt JSON.
  - `app/composables/useColumnResize.ts`: loads defaults, merges stored widths, enforces minimum column width, cleans document listeners.

**Integration Tests:**
- Not currently implemented.
- Best candidates:
  - `server/api/auth/register.post.ts` and `server/api/auth/login.post.ts`: validation, duplicate user handling, password hashing, and session creation with mocked/isolated DB.
  - `server/api/entries/index.post.ts`: auth required, Zod validation, dialect permission enforcement, duplicate detection, HK Traditional conversion, entry creation, and edit history creation.
  - `server/api/entries/[id].put.ts`: owner/reviewer/admin authorization, dialect permission, status transition restrictions, sense conversion, image limit behavior, edit history, and morpheme sync.
  - `server/api/entries/index.get.ts`: pagination defaults, filters, grouped views, sort behavior, and safe handling of search query.
  - `server/api/reviews/[id]/approve.post.ts` and `server/api/reviews/[id]/reject.post.ts`: reviewer/admin authorization and pending-review concurrency protection.
  - `server/api/upload/image.post.ts`: authentication, file presence, MIME allowlist, 5MB limit, Cloudinary success/failure mapping.

**E2E Tests:**
- Not used.
- Highest-value future E2E flows:
  - Registration/login/logout through `app/pages/register.vue`, `app/pages/login.vue`, `app/composables/useAuth.ts`, and `server/api/auth/*.ts`.
  - Contributor creates a new entry in `app/pages/entries/index.vue`, gets status `pending_review`, and sees local draft cleanup after save.
  - Reviewer approves/rejects entries through `app/pages/review/index.vue` and `server/api/reviews/*.ts`.
  - Entries table keyboard navigation in `app/pages/entries/index.vue`: select cell, Enter to edit, Tab to move/accept suggestions, Escape to dismiss/cancel.
  - Image upload through `app/components/entries/EntrySensesExpand.vue` and `server/api/upload/image.post.ts` with mocked Cloudinary or a fake upload service.

## Common Patterns

**Async Testing:**
```typescript
// Future pattern for async composables/API helpers.
it('sets loading false after fetch failure', async () => {
  // Arrange mocked $fetch rejection
  // Act await fetchEntries()
  // Assert loading.value is false and error/log behavior is expected
})
```

**Error Testing:**
```typescript
// Future pattern for API validation.
it('rejects invalid entry create payload', async () => {
  // Arrange event with event.context.auth and invalid body
  // Act call route handler through Nuxt/Nitro test harness
  // Assert statusCode 400 and Hong Kong Traditional Chinese message
})
```

**Permission Testing:**
```typescript
// Future direct unit test for server/utils/auth.ts.
it('allows reviewers and admins to contribute to any dialect', () => {
  expect(canContributeToDialect({ role: 'reviewer', dialectPermissions: [] }, 'hongkong')).toBe(true)
  expect(canContributeToDialect({ role: 'admin', dialectPermissions: [] }, 'guangzhou')).toBe(true)
})
```

**LocalStorage Testing:**
```typescript
// Future unit test for app/composables/useEntriesLocalStorage.ts.
it('persists dirty drafts without overwriting other stored drafts', () => {
  // Arrange localStorage with existing draft
  // Act saveEntriesToLocalStorage([dirtyEntry]) and advance debounce timer
  // Assert both old and new drafts remain by id/_tempId
})
```

## Manual Verification Checklist

Use this checklist because automated tests are absent.

**Build and Startup:**
```bash
npm run build
npm run dev
```
- Verify Nuxt starts on port `3100`, matching `package.json` and `nuxt.config.ts`.
- Verify required environment values from `.env.example` are configured in `.env` without exposing their values.

**Authentication:**
- Register through `app/pages/register.vue`; verify Zod messages from `server/api/auth/register.post.ts` are shown in Hong Kong Traditional Chinese.
- Login through `app/pages/login.vue`; verify `app/composables/useAuth.ts` redirects to `/entries` or the `redirect` query.
- Logout through `app/composables/useAuth.ts`; verify session clears and redirects to `/login`.
- Verify protected routes use `app/middleware/auth.ts`, `app/middleware/admin.ts`, and `app/middleware/reviewer.ts` correctly.

**Entry Create/Edit:**
- In `app/pages/entries/index.vue`, create a new entry and save it; contributor saves should become `pending_review`, reviewer/admin saves should become `approved`.
- Verify duplicate detection through `server/api/entries/check-duplicate.get.ts` appears after editing the headword of a new entry.
- Verify same headword + dialect duplicate fails with the unique index from `server/utils/Entry.ts` and the `409` handling in `app/pages/entries/index.vue`.
- Verify Hong Kong Traditional Chinese conversion on create/update through `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/utils/textConversion.ts`.
- Verify contributors cannot edit entries they do not own and cannot choose dialects outside `dialectPermissions`; server enforcement is in `server/api/entries/[id].put.ts` and `server/utils/auth.ts`.

**Entries Table UX:**
- Verify flat, aggregated, and lexeme view modes in `app/pages/entries/index.vue`.
- Verify keyboard navigation in `app/pages/entries/index.vue`: Arrow keys, Enter, Tab, Shift+Tab, Escape, and direct typing into a selected cell.
- Verify grouped views because `handleTableKeydown()` in `app/pages/entries/index.vue` uses `entries.value` in some navigation paths while grouped display uses `tableRows.value`.
- Verify local draft persistence from `app/composables/useEntriesLocalStorage.ts` across page refresh, pagination, sort, filter, and grouped views.
- Verify column width persistence through `app/composables/useColumnResize.ts` and localStorage key `jyutcollab-column-widths`.

**AI and External References:**
- Verify AI definition/category/example calls through `app/composables/useEntriesAISuggestions.ts` and `server/api/ai/*.post.ts` with `OPENROUTER_API_KEY` configured.
- Verify AI failure states do not expose sensitive server details to users.
- Verify Jyutdict/Jyutjyu reference flows through `app/composables/useEntriesRowHints.ts`, `app/composables/useJyutdict.ts`, `server/api/jyutdict/*.get.ts`, and `server/api/jyutjyu/search.get.ts`.

**Review Workflow:**
- Submit a contributor entry and verify it appears in review pages/routes.
- Approve/reject as reviewer/admin through review UI and `server/api/reviews/[id]/approve.post.ts` / `server/api/reviews/[id]/reject.post.ts`.
- Verify non-reviewer users receive `403` from review endpoints.
- Verify edit history is created and visible through `server/api/histories/*.ts` and `app/pages/histories/index.vue`.

**Image Upload:**
- Upload JPG/PNG/WebP through `app/components/entries/EntrySensesExpand.vue`; verify `server/api/upload/image.post.ts` stores through Cloudinary and returns `public_id`.
- Verify HEIC/HEIF conversion path in `app/components/entries/EntrySensesExpand.vue` using dynamic `heic2any` import.
- Verify uploads above 5MB are rejected by `server/api/upload/image.post.ts`.
- Verify more than 3 images per sense are prevented by `app/components/entries/EntrySensesExpand.vue` and update route truncation in `server/api/entries/[id].put.ts`.

## Critical Coverage Gaps

- No automated regression tests exist for the 2,439-line entries table in `app/pages/entries/index.vue`, despite complex keyboard, localStorage, grouped-view, AI, and save behavior.
- No automated tests exist for authorization and dialect permissions in `server/middleware/auth.ts`, `server/utils/auth.ts`, `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/api/reviews/*.ts`.
- No automated tests exist for Zod validation messages or Hong Kong Traditional Chinese conversion in `server/utils/validation.ts`, `server/utils/textConversion.ts`, or API route schemas.
- No automated tests exist for edit history creation in `server/api/entries/index.post.ts`, `server/api/entries/[id].put.ts`, and `server/api/reviews/[id]/approve.post.ts`.
- No automated tests exist for upload validation and Cloudinary error handling in `server/api/upload/image.post.ts` and `server/utils/cloudinary.ts`.
- No automated tests exist for raw-regex search behavior in `server/api/entries/index.get.ts`; this is both a correctness and performance/security-sensitive area.
- No automated tests exist for admin user management constraints in `server/api/users/[id]/role.patch.ts`, including prevention of self-role modification and last-admin demotion.

## Recommended Verification Commands

```bash
npm run build        # Required before merging changes; catches Nuxt build and TypeScript issues
npm run dev          # Manual browser verification on http://localhost:3100
npm run preview      # Smoke-test production build after npm run build
```

Add these scripts before relying on automated quality gates:
```bash
npm run test         # Add after selecting/configuring a test runner
npm run lint         # Add after selecting/configuring ESLint or Biome
npm run typecheck    # Add if Nuxt typecheck is configured separately from build
npm run format       # Add after selecting/configuring Prettier or Biome
```

---

*Testing analysis: 2026-04-29*
