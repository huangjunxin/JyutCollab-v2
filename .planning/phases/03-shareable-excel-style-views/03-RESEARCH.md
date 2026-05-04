# Phase 3: Shareable Excel-Style Views - Research

**Researched:** 2026-05-04 [VERIFIED: currentDate]
**Domain:** Nuxt 4 client-side URL/query state serialization, Vue composable state restore, schema validation, clipboard UI [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue; CITED: nuxt.com/docs/4.x/api/composables/use-route]
**Confidence:** HIGH [VERIFIED: codebase reads; VERIFIED: Context7 Nuxt/Vue/Zod docs; CITED: MDN Clipboard/URLSearchParams]

## User Constraints

- Phase description: Users can copy a link that restores formula filters, regex settings, conditional formatting rules, and validation rules. [VERIFIED: user prompt]
- Phase requirement IDs: VIEW-01, VIEW-02, VIEW-03, VIEW-04. [VERIFIED: user prompt; VERIFIED: .planning/REQUIREMENTS.md]
- All Chinese UI/copy must use Hong Kong Traditional Chinese. [VERIFIED: user prompt; VERIFIED: CLAUDE.md]
- Shared view state should be local UI/query state only; do not persist to backend/localStorage. [VERIFIED: user prompt]
- Invalid/unsupported shared payloads must fail safely with clear feedback and not block table use. [VERIFIED: user prompt; VERIFIED: .planning/ROADMAP.md]
- Serialized state must include an explicit version. [VERIFIED: user prompt; VERIFIED: .planning/ROADMAP.md]
- Use existing Nuxt UI and entries toolbar/panel patterns; do not introduce unnecessary new libraries. [VERIFIED: user prompt; VERIFIED: 03-UI-SPEC.md]
- Phase 2 overlays are local-only and apply to currently loaded/rendered entries. [VERIFIED: user prompt; VERIFIED: 02-VERIFICATION.md]

## Project Constraints (from CLAUDE.md)

- Use Hong Kong Traditional Chinese for UI labels, buttons, placeholders, error messages, validation text, Chinese comments, AI prompts/system messages, and database enum values. [VERIFIED: CLAUDE.md]
- Project stack is Nuxt 4 with Vue 3 Composition API, @nuxt/ui, Tailwind CSS/Radix or Reka primitives, MongoDB/Mongoose, nuxt-auth-utils, Pinia, Zod, Cloudinary, and opencc-js. [VERIFIED: CLAUDE.md; VERIFIED: 03-UI-SPEC.md]
- Entry table lives in `app/pages/entries/index.vue` and already owns inline editing, keyboard navigation, localStorage draft recovery, AI suggestions, grouping modes, column resizing, and search/filter controls. [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue]
- Use focused composables for reusable logic. [VERIFIED: CLAUDE.md]
- Use `<script setup lang="ts">` for Vue components. [VERIFIED: CLAUDE.md]
- Preserve `id` as the entry identifier convention and `lexemeId` for cross-dialect grouping; Phase 3 must not serialize entry data or IDs because shared views are configuration-only. [VERIFIED: CLAUDE.md; VERIFIED: 03-UI-SPEC.md]
- Column widths and sidebar state currently persist via localStorage, but shared view state must not use localStorage in this phase. [VERIFIED: CLAUDE.md; VERIFIED: user prompt]
- Testing considerations include keyboard navigation, AI suggestion behavior, concurrent edits, status workflow, and permission boundaries; Phase 3 planning should verify those are not disrupted by share UI focus/route handling. [VERIFIED: CLAUDE.md; VERIFIED: 03-UI-SPEC.md]

## Summary

Phase 3 should be planned as a browser/client-owned feature that serializes existing Phase 1 and Phase 2 local UI configuration into a single versioned query parameter, validates it strictly on restore, and applies it atomically to existing composable state without backend persistence. [VERIFIED: .planning/ROADMAP.md; VERIFIED: user prompt; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts] The current entries page already uses `useRoute()` and watches `route.query` for `search` and `filter=mine`, so the lowest-risk integration is to extend route/query handling rather than create a new page or server endpoint. [VERIFIED: app/pages/entries/index.vue; CITED: nuxt.com/docs/4.x/api/composables/use-route]

The core implementation gap is not the UI; the accepted UI spec already defines the share trigger, copy popover, feedback copy, and placement. [VERIFIED: 03-UI-SPEC.md] The planning-critical work is to add a small serialization/restore module plus explicit setter/import APIs to `useEntriesAdvancedFilters` and `useEntriesRuleOverlays`, because those composables currently expose mutable state and add/clear/toggle methods but do not expose a safe “replace from validated payload” path. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]

**Primary recommendation:** Build a dedicated `app/utils/entriesSharedView.ts` utility with strict Zod validation, version `1`, maximum encoded length, base64url UTF-8 JSON encoding, and pure serialize/deserialize/apply-data helpers; wire it into `app/pages/entries/index.vue` with a compact Nuxt UI share popover and query parameter restore guard. [VERIFIED: package.json/CLAUDE.md stack; VERIFIED: npm registry zod 4.4.3; CITED: zod strictObject/safeParse docs; CITED: MDN btoa Unicode docs; CITED: MDN URLSearchParams docs]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Capture current formula and regex filter configuration | Browser / Client | — | The relevant state is held in `useEntriesAdvancedFilters` refs/reactive objects and is explicitly client-side over loaded entries. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: .planning/STATE.md] |
| Capture current formatting and validation rule configuration | Browser / Client | — | Phase 2 overlays are local-only and rule state lives in `useEntriesRuleOverlays.rules`. [VERIFIED: 02-VERIFICATION.md; VERIFIED: app/composables/useEntriesRuleOverlays.ts] |
| Encode/decode share payload in URL query | Browser / Client | Frontend Server (SSR) | Query handling is in the Nuxt page via `useRoute`; decoding should run only where browser globals are available for clipboard/URL creation, while route data itself is available through Nuxt composables. [VERIFIED: app/pages/entries/index.vue; CITED: nuxt.com/docs/4.x/api/composables/use-route] |
| Copy generated link to clipboard | Browser / Client | — | `navigator.clipboard.writeText()` is a browser Clipboard API that requires secure context and returns a Promise. [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText] |
| Validate shared payload schema and reject unsupported versions/fields/rules | Browser / Client | — | No backend persistence is allowed, and existing Zod dependency supports `safeParse()` and strict object schemas for data validation without throwing. [VERIFIED: user prompt; VERIFIED: npm registry zod 4.4.3; CITED: zod safeParse/strictObject docs] |
| Apply restored view state to visible entries table | Browser / Client | — | Advanced filters and rule overlays compute against currently loaded/rendered entries, so applying state should update local refs and computed overlays only. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: 02-VERIFICATION.md] |
| Clear only share URL parameter | Browser / Client | Nuxt Router | Nuxt `navigateTo()` supports route-object navigation and a `replace` option; clearing the share parameter should replace the current URL without clearing in-memory filters/rules. [CITED: nuxt.com/docs/4.x/api/utils/navigate-to; VERIFIED: 03-UI-SPEC.md] |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | User can create a shareable view link that restores formula filters, regex settings, conditional formatting rules, and validation rules. [VERIFIED: .planning/REQUIREMENTS.md] | Serialize `appliedFormula`, regex state, and `rules` into versioned query payload; use Clipboard API with fallback preview. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; CITED: MDN Clipboard writeText] |
| VIEW-02 | User can open a shared view and see the restored rules applied to the entries table. [VERIFIED: .planning/REQUIREMENTS.md] | Decode query once, validate fully, then atomically assign advanced filter applied/input state and replace overlay rule list before or alongside first table render. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts] |
| VIEW-03 | User sees safe feedback when a shared view payload is invalid, unsupported, or too old. [VERIFIED: .planning/REQUIREMENTS.md] | Use strict schema, maximum encoded length, version gate, and formula/regex validators before applying; display `UAlert`, not browser `alert()`. [VERIFIED: 03-UI-SPEC.md; CITED: zod strictObject/safeParse docs] |
| VIEW-04 | Shareable view state is versioned so future rule schema changes can be handled deliberately. [VERIFIED: .planning/REQUIREMENTS.md] | Payload root should be `{ version: 1, filters, rules }`; unsupported/too-old versions are blocking errors in Phase 3. [VERIFIED: 03-UI-SPEC.md] |

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| Nuxt | Installed build: 4.3.1; registry latest: 4.4.4 published/modified 2026-04-29 [VERIFIED: npm run build; VERIFIED: npm registry] | Route/query handling and page integration. [VERIFIED: app/pages/entries/index.vue] | Project framework is Nuxt 4, and Nuxt provides `useRoute`, `useRouter`, and `navigateTo` for route/query state. [VERIFIED: CLAUDE.md; CITED: nuxt.com/docs/4.x/api/composables/use-route; CITED: nuxt.com/docs/4.x/api/utils/navigate-to] |
| Vue | Installed build: 3.5.28; registry latest: 3.5.33 modified 2026-04-22 [VERIFIED: npm run build; VERIFIED: npm registry] | Reactive refs, computed state, watchers, and composable restore APIs. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Existing implementation uses Vue Composition API refs/reactive/computed/watch patterns. [VERIFIED: app/pages/entries/index.vue; CITED: vuejs/docs watchers] |
| @nuxt/ui | UI spec version: 4.4.0; registry latest: 4.7.1 modified 2026-04-28 [VERIFIED: 03-UI-SPEC.md; VERIFIED: npm registry] | `UButton`, `UTooltip`, `UBadge`, `UAlert`, `UPopover`, `UInput`. [VERIFIED: 03-UI-SPEC.md] | Existing Phase 1/2 controls use Nuxt UI and UI spec forbids new UI registry/components. [VERIFIED: app/components/entries/EntriesAdvancedFilterPanel.vue; VERIFIED: app/components/entries/EntriesRuleOverlayPanel.vue; VERIFIED: 03-UI-SPEC.md] |
| Zod | Registry latest 4.4.3 modified 2026-05-04; project dependency present per CLAUDE.md [VERIFIED: npm registry; VERIFIED: CLAUDE.md] | Strict runtime schema validation for decoded share payload. [CITED: zod strictObject/safeParse docs] | Project already standardizes on Zod validation, and `safeParse()` returns non-throwing success/error result. [VERIFIED: CLAUDE.md; CITED: zod safeParse docs] |
| Clipboard API | Baseline widely available since March 2020 [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText] | Copy generated share link. [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText] | Native browser API avoids adding a clipboard library and returns Promise success/failure for UI feedback. [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText; VERIFIED: user constraint no unnecessary libraries] |
| URLSearchParams / URL | Baseline widely available since April 2018 for URLSearchParams [CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams] | Build/remove share query parameter safely. [CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams] | Native Web APIs handle percent-encoding and query mutation; `set()` replaces duplicate parameter values and `delete()` removes a parameter. [CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams] |

### Supporting

| Library / API | Version | Purpose | When to Use |
|---------------|---------|---------|-------------|
| TextEncoder/TextDecoder + btoa/atob | Browser Web APIs [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa] | UTF-8-safe base64/base64url encoding for JSON containing Hong Kong Traditional Chinese text. [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa] | Use because `btoa()` alone throws `InvalidCharacterError` for characters outside one byte, including Chinese text. [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa] |
| Existing `entriesAdvancedFilter` helpers | Local utility [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Validate restored formulas and regex patterns with the same whitelist and limits as Phase 1. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Use before applying shared payload so links cannot bypass formula/regex safety. [VERIFIED: 03-UI-SPEC.md; VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Existing `useEntriesAdvancedFilters` | Local composable [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Source of formula/regex state and target for restored filter state. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Extend with export/import state methods rather than duplicating state in the page. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] |
| Existing `useEntriesRuleOverlays` | Local composable [VERIFIED: app/composables/useEntriesRuleOverlays.ts] | Source and target for formatting/validation rule state. [VERIFIED: app/composables/useEntriesRuleOverlays.ts] | Extend with replace/import method that validates IDs/order/kinds before setting `rules.value`. [VERIFIED: app/composables/useEntriesRuleOverlays.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native JSON + base64url in one query param | Raw JSON in query string | Raw JSON is more readable but produces longer URLs and more escaping edge cases for characters like `&`, `?`, `=`. [CITED: MDN encodeURIComponent; CITED: MDN URLSearchParams] |
| Zod strict schema | Hand-written nested `typeof` checks | Hand-written checks are easier to under-specify; Zod `strictObject()` rejects unknown keys and `safeParse()` avoids thrown validation flow. [CITED: zod strictObject/safeParse docs] |
| Native Clipboard API | `clipboard.js` or other clipboard library | Native API is baseline/widely available and project constraint says do not add unnecessary libraries; still needs manual-copy fallback for denied/unavailable clipboard. [CITED: MDN Clipboard writeText; VERIFIED: user prompt] |
| Query parameter | Backend saved-view token | Backend persistence/account/team sharing is explicitly out of scope for v1/Phase 3. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 03-UI-SPEC.md] |
| Existing page integration | Separate share-view page | The feature restores `/entries` table configuration; creating a new page would increase route/auth/table-state regression surface. [VERIFIED: .planning/ROADMAP.md; VERIFIED: app/pages/entries/index.vue] |

**Installation:**
```bash
# No new runtime library should be installed for Phase 3.
# Existing stack already includes Nuxt/Vue/Nuxt UI/Zod per project conventions.
```
[VERIFIED: CLAUDE.md; VERIFIED: user prompt; VERIFIED: 03-UI-SPEC.md]

**Version verification:**
- `npm view vue version time.modified` → `3.5.33`, `2026-04-22T07:21:27.019Z`. [VERIFIED: npm registry]
- `npm view nuxt version time.modified` → `4.4.4`, `2026-04-29T23:49:58.454Z`. [VERIFIED: npm registry]
- `npm view @nuxt/ui version time.modified` → `4.7.1`, `2026-04-28T13:42:15.135Z`. [VERIFIED: npm registry]
- `npm view zod version time.modified` → `4.4.3`, `2026-05-04T07:07:58.854Z`. [VERIFIED: npm registry]
- `npm run build` reports current installed build uses Nuxt 4.3.1, Vue 3.5.28, Vite 7.3.1, and Nitro 2.13.1. [VERIFIED: npm run build]

## Architecture Patterns

### System Architecture Diagram

```text
User on /entries configures filters/rules
        |
        v
Existing state owners
  - useEntriesAdvancedFilters (formula + regex)
  - useEntriesRuleOverlays (formatting + validation rules)
        |
        v
Share trigger in entries toolbar
        |
        v
serializeSharedViewState(version=1)
  - collect only supported UI config
  - validate outbound payload shape
  - JSON stringify
  - UTF-8 bytes -> base64url
  - enforce query length cap
        |
        v
Generated URL: /entries?view=<payload>
        |
        v
Clipboard API writeText()
  | success                         | failure / unavailable
  v                                 v
Inline success feedback             Readonly/selectable URL preview

Opening /entries?view=<payload>
        |
        v
Route/query watcher + initial onMounted handling
        |
        v
validateAndDeserializeSharedView()
  - enforce max encoded length before decode
  - decode errors caught
  - strict schema safeParse
  - version gate
  - allowed fields/kinds/flags/styles
  - formula/regex validation using Phase 1 helpers
        |
        +-- invalid --> UAlert error + table stays usable + no state apply
        |
        v
Atomic apply to existing composables
  - set filter input/applied state
  - replace overlay rules
  - do not write backend/localStorage
  - do not mark entries dirty
        |
        v
Computed filtered rows + overlay metadata update for loaded/rendered entries
```
[VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; CITED: MDN Clipboard writeText; CITED: zod safeParse docs]

### Recommended Project Structure

```text
app/
├── utils/
│   └── entriesSharedView.ts        # versioned schema, encode/decode, validate, summarize helpers
├── composables/
│   ├── useEntriesAdvancedFilters.ts # add export/import methods for formula/regex state
│   └── useEntriesRuleOverlays.ts    # add export/import/replace methods for rule state
├── components/entries/
│   └── EntriesShareViewPopover.vue  # compact Nuxt UI share trigger/popover/status/fallback UI
└── pages/entries/index.vue          # route/query integration and toolbar placement
```
[VERIFIED: CLAUDE.md directory structure; VERIFIED: app/pages/entries/index.vue; VERIFIED: 03-UI-SPEC.md]

### Pattern 1: Versioned Payload Boundary

**What:** Use a root object with an explicit version and only supported configuration fields. [VERIFIED: 03-UI-SPEC.md]

**When to use:** Always for share links; never serialize entry data, user/session data, draft data, selected row IDs, or localStorage state. [VERIFIED: 03-UI-SPEC.md; VERIFIED: user prompt]

**Recommended v1 shape:**
```typescript
// Source: 03-UI-SPEC.md + current composable state names
export interface EntriesSharedViewV1 {
  version: 1
  filters: {
    formula: { input: string; applied: string }
    globalRegex: { enabled: boolean; input: string; applied: string; flags: string }
    columnRegex: { field: AdvancedFilterFieldKey | ''; pattern: string; flags: string }
  }
  rules: Array<{
    name: string
    kind: 'formatting' | 'validation'
    enabled: boolean
    targetFields: AdvancedFilterFieldKey[]
    condition: {
      kind: 'formula' | 'regex'
      formula: string
      regex: { pattern: string; flags: string; field: AdvancedFilterFieldKey | 'any' }
    }
    stylePreset: 'green' | 'blue' | 'purple' | 'amber'
    colorHex: string
  }>
}
```
[VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: 03-UI-SPEC.md]

**Planning note:** Do not serialize rule IDs as durable state; restored rules can receive fresh local IDs because Phase 2 rule IDs are UI-local and only used for toggling/removing/reordering during the current session. [VERIFIED: app/composables/useEntriesRuleOverlays.ts]

### Pattern 2: Strict Decode Before Apply

**What:** Decode the query payload into unknown data, validate with `z.strictObject`, reject unknown keys and unsupported versions, then run semantic validation through existing formula/regex helpers before applying. [CITED: zod strictObject/safeParse docs; VERIFIED: app/utils/entriesAdvancedFilter.ts]

**When to use:** On initial `/entries?view=...` load and whenever the share query parameter changes to a different value while already on `/entries`. [VERIFIED: 03-UI-SPEC.md; VERIFIED: app/pages/entries/index.vue]

**Example:**
```typescript
// Source: Context7 Zod safeParse/strictObject docs + Phase 1 helper API
const parsed = sharedViewSchema.safeParse(decodedUnknown)
if (!parsed.success) {
  return { ok: false, reason: '分享視圖資料格式無效，無法安全還原。' }
}

for (const rule of parsed.data.rules) {
  if (rule.condition.kind === 'formula') {
    const formula = parseAdvancedFormula(rule.condition.formula)
    if (!formula.ok) return { ok: false, reason: `分享視圖中的公式無法套用：${formula.error.message}` }
  }
  if (rule.condition.kind === 'regex') {
    const regex = compileAdvancedRegex(rule.condition.regex.pattern, rule.condition.regex.flags)
    if (!regex.ok) return { ok: false, reason: `分享視圖中的正則表達式無法套用：${regex.error.message}` }
  }
}
```
[VERIFIED: app/utils/entriesAdvancedFilter.ts; CITED: zod safeParse docs]

### Pattern 3: Atomic Restore Through Composable Methods

**What:** Add methods such as `exportAdvancedFilterState()`, `restoreAdvancedFilterState(state)`, `exportRuleOverlayState()`, and `replaceRuleOverlayState(rules)` to composables. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]

**When to use:** The page should not reach deeply into internal refs/reactive objects for restore logic because it would duplicate validation/application rules and increase route watcher bugs. [VERIFIED: app/pages/entries/index.vue]

**Implementation facts:** `useEntriesAdvancedFilters` currently has `formulaInput`, `appliedFormula`, `globalRegexEnabled`, `globalRegexInput`, `appliedGlobalRegex`, `globalRegexFlags`, `columnRegex`, and `appliedColumnRegex`; `useEntriesRuleOverlays` currently has `rules` and uses local generated IDs. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]

### Pattern 4: Route Query Without Watcher Loops

**What:** Track the last applied share payload string and only restore when the share query value changes; clear share query via Nuxt navigation with `replace: true`. [VERIFIED: app/pages/entries/index.vue; CITED: nuxt.com/docs/4.x/api/utils/navigate-to]

**When to use:** Existing `route.query` watcher already calls `applyUrlParams()` and may fetch entries when search/filter change, so shared-view restore must not return `changed = true` for purely local overlay changes that do not need server fetch. [VERIFIED: app/pages/entries/index.vue]

**Example:**
```typescript
// Source: Nuxt navigateTo docs + existing applyUrlParams pattern
const lastAppliedSharedView = ref<string | null>(null)

function applySharedViewQuery(): void {
  const raw = typeof route.query.view === 'string' ? route.query.view : ''
  if (!raw || raw === lastAppliedSharedView.value) return
  lastAppliedSharedView.value = raw
  const result = decodeAndValidateSharedView(raw)
  if (!result.ok) {
    sharedViewError.value = result.reason
    return
  }
  advancedFilters.restoreAdvancedFilterState(result.data.filters)
  ruleOverlays.replaceRuleOverlayState(result.data.rules)
}

async function clearSharedViewQuery() {
  const query = { ...route.query }
  delete query.view
  await navigateTo({ path: route.path, query }, { replace: true })
}
```
[CITED: nuxt.com/docs/4.x/api/utils/navigate-to; VERIFIED: app/pages/entries/index.vue]

### Anti-Patterns to Avoid

- **Persisting shared view to backend/localStorage:** Phase 3 scope is URL/query UI state only, and backend saved views are out of scope. [VERIFIED: user prompt; VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 03-UI-SPEC.md]
- **Applying partial state on unsupported fields/kinds:** UI spec says version 1 unsupported fields or rule kinds are blocking errors, not partial apply. [VERIFIED: 03-UI-SPEC.md]
- **Using `eval`, `new Function`, dynamic imports, or executable payload code:** UI spec forbids arbitrary JavaScript execution, and Phase 1 formulas already use a whitelist parser. [VERIFIED: 03-UI-SPEC.md; VERIFIED: app/utils/entriesAdvancedFilter.ts]
- **Calling mutation APIs during restore:** Shared view restore must not trigger save/delete/review APIs or mark entries dirty. [VERIFIED: 03-UI-SPEC.md; VERIFIED: user prompt]
- **Using `btoa(JSON.stringify(payload))` directly for Chinese text:** `btoa()` only accepts one-byte binary strings and throws `InvalidCharacterError` for broader Unicode, so encode JSON as UTF-8 bytes first. [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa]
- **Treating copied link as current-route mutation:** UI spec says copying must not automatically mutate the current route; only opening the copied URL restores state. [VERIFIED: 03-UI-SPEC.md]
- **Showing browser `alert()` for shared-view errors:** UI spec requires inline Nuxt UI alert feedback and no browser alert for invalid shared payloads. [VERIFIED: 03-UI-SPEC.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime schema validation | Nested ad-hoc `typeof` validator | Zod `strictObject` + `safeParse` | Strict schemas reject unknown keys and `safeParse()` returns a non-throwing result union. [CITED: zod strictObject/safeParse docs] |
| Formula and regex validation | New formula/regex parser for share payloads | Existing `parseAdvancedFormula` and `compileAdvancedRegex` | Existing helpers define supported fields/functions, regex flags, max pattern length, and unsafe pattern rejection. [VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Clipboard integration | Third-party clipboard package | `navigator.clipboard.writeText()` plus manual URL preview fallback | Native API is widely available, Promise-based, and may reject with `NotAllowedError`, which maps directly to fallback UI. [CITED: MDN Clipboard writeText] |
| Query string manipulation | Manual string concatenation/splitting | `URL` / `URLSearchParams` or Nuxt route object query | URLSearchParams handles percent-encoding, `set()` removes duplicate values for a key, and `delete()` removes parameters. [CITED: MDN URLSearchParams; CITED: Nuxt navigateTo docs] |
| Base64 Unicode conversion | Plain `btoa`/`atob` over JavaScript strings | TextEncoder/TextDecoder byte conversion before base64/base64url | Plain `btoa()` throws for characters outside one byte, which includes common Chinese characters. [CITED: MDN btoa] |
| Share UI | New modal framework/sidebar/grid library | Existing Nuxt UI `UButton`, `UTooltip`, `UPopover`, `UBadge`, `UAlert`, `UInput` | UI spec and project stack require existing Nuxt UI toolbar/panel patterns. [VERIFIED: 03-UI-SPEC.md; VERIFIED: CLAUDE.md] |

**Key insight:** The hard part is safe state boundaries, not visual components; using existing validators, route patterns, and Nuxt UI prevents a read-only share feature from accidentally becoming a persistence, execution, or mutation feature. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: 03-UI-SPEC.md]

## Common Pitfalls

### Pitfall 1: Restoring UI input but not applied filter state
**What goes wrong:** The panel shows restored formula/regex text but the table does not filter because `appliedFormula`, `appliedGlobalRegex`, or `appliedColumnRegex` were not updated. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
**Why it happens:** Current composable separates input state from applied state. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
**How to avoid:** Restore both input and applied state for shared filters, or call a restore method that assigns both after validation. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
**Warning signs:** `hasActiveAdvancedFilters` remains false after opening a valid shared link. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts]

### Pitfall 2: Invalid shared payload partially mutates state
**What goes wrong:** Some filters/rules apply before a later rule fails validation, leaving the table in a mixed state. [VERIFIED: 03-UI-SPEC.md]
**Why it happens:** Decode and apply are interleaved instead of validate-then-apply. [VERIFIED: 03-UI-SPEC.md]
**How to avoid:** Deserialize into a temporary object, run full schema + semantic validation, then assign composable state in one restore step. [CITED: zod safeParse docs; VERIFIED: 03-UI-SPEC.md]
**Warning signs:** Error alert appears but some restored badges/rules are visible. [VERIFIED: 03-UI-SPEC.md]

### Pitfall 3: Route watcher causes refetch loop or unnecessary server fetch
**What goes wrong:** Applying or clearing `view` query repeatedly triggers the route watcher and `fetchEntries()`. [VERIFIED: app/pages/entries/index.vue]
**Why it happens:** Existing watcher calls `applyUrlParams()` and fetches when URL-backed search/filter state changes. [VERIFIED: app/pages/entries/index.vue]
**How to avoid:** Keep shared-view restore side effects separate from server-backed `search`/`filter=mine` changes, track `lastAppliedSharedView`, and only set `changed = true` for server-backed params. [VERIFIED: app/pages/entries/index.vue]
**Warning signs:** Network requests repeat after clearing or restoring the same share parameter. [VERIFIED: app/pages/entries/index.vue]

### Pitfall 4: Clipboard failure path is not implemented
**What goes wrong:** Users on denied clipboard permission or unsupported/insecure contexts cannot copy or retrieve the URL. [CITED: MDN Clipboard writeText]
**Why it happens:** `navigator.clipboard.writeText()` requires secure contexts and can reject with `NotAllowedError`. [CITED: MDN Clipboard writeText]
**How to avoid:** Catch rejected promise and show the readonly/selectable URL preview with exact UI-spec failure copy. [VERIFIED: 03-UI-SPEC.md; CITED: MDN Clipboard writeText]
**Warning signs:** Button click silently fails or only logs to console. [CITED: MDN Clipboard writeText]

### Pitfall 5: Unicode payload corruption
**What goes wrong:** Rule names or formulas containing Chinese text fail to encode/decode. [CITED: MDN btoa]
**Why it happens:** `btoa()` expects each character to fit in one byte and throws on non-Latin Unicode. [CITED: MDN btoa]
**How to avoid:** JSON string → `TextEncoder` bytes → base64url; reverse with base64url → bytes → `TextDecoder`. [CITED: MDN btoa]
**Warning signs:** `InvalidCharacterError` during link generation. [CITED: MDN btoa]

### Pitfall 6: Unsupported fields silently ignored
**What goes wrong:** A future/modified link appears to apply but omits unknown rule fields, hiding data loss or ambiguity. [VERIFIED: 03-UI-SPEC.md]
**Why it happens:** Default Zod object behavior can allow extra keys unless strict schemas are used. [CITED: zod strictObject docs]
**How to avoid:** Use `z.strictObject()` at every nested object boundary and reject unknown fields with the UI spec copy. [CITED: zod strictObject docs; VERIFIED: 03-UI-SPEC.md]
**Warning signs:** Link with injected extra key still restores without an error. [CITED: zod strictObject docs]

### Pitfall 7: Rule IDs serialized as stable cross-link identifiers
**What goes wrong:** Restored local rule IDs collide or appear durable across sessions even though they only support current-session UI actions. [VERIFIED: app/composables/useEntriesRuleOverlays.ts]
**Why it happens:** Current rule IDs are generated locally by `crypto.randomUUID()` or timestamp/random fallback. [VERIFIED: app/composables/useEntriesRuleOverlays.ts]
**How to avoid:** Serialize rule order by array order and regenerate IDs during restore. [VERIFIED: app/composables/useEntriesRuleOverlays.ts]
**Warning signs:** Schema exposes `id` as a required external field. [VERIFIED: app/composables/useEntriesRuleOverlays.ts]

## Code Examples

Verified patterns from official/current sources:

### Clipboard copy with fallback state
```typescript
// Source: MDN Clipboard.writeText docs
async function copyShareLink(url: string) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard_unavailable')
    await navigator.clipboard.writeText(url)
    return { ok: true as const }
  } catch {
    return { ok: false as const, fallbackUrl: url }
  }
}
```
[CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText]

### Nuxt query parameter removal without adding history entry
```typescript
// Source: Nuxt navigateTo docs
async function clearSharedViewParam(route = useRoute()) {
  const query = { ...route.query }
  delete query.view
  await navigateTo({ path: route.path, query }, { replace: true })
}
```
[CITED: nuxt.com/docs/4.x/api/utils/navigate-to]

### Strict schema parse without throwing
```typescript
// Source: Zod safeParse + strictObject docs
const result = sharedViewSchema.safeParse(decoded)
if (!result.success) {
  return { ok: false as const, reason: '分享視圖資料格式無效，無法安全還原。' }
}
return { ok: true as const, data: result.data }
```
[CITED: zod safeParse/strictObject docs]

### URLSearchParams safe set/delete
```typescript
// Source: MDN URLSearchParams docs
const url = new URL(window.location.href)
url.searchParams.set('view', encodedPayload)
const shareUrl = url.toString()
url.searchParams.delete('view')
```
[CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams]

### UTF-8-safe base64 conversion direction
```typescript
// Source: MDN btoa Unicode guidance
function jsonToBytes(json: string) {
  return new TextEncoder().encode(json)
}

function bytesToJson(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes)
}
```
[CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw `btoa()` over JavaScript strings for JSON | UTF-8 bytes via `TextEncoder` before base64/base64url | MDN current guidance as read 2026-05-04 [CITED: MDN btoa] | Prevents Chinese text and emoji from throwing `InvalidCharacterError`. [CITED: MDN btoa] |
| Throwing validation with `.parse()` in UI route restore | Non-throwing `.safeParse()` and user-facing feedback | Zod current docs as read 2026-05-04 [CITED: zod safeParse docs] | Keeps invalid links from crashing or blocking table use. [VERIFIED: 03-UI-SPEC.md; CITED: zod safeParse docs] |
| Silent unknown-key acceptance | `z.strictObject()` for share payload boundaries | Zod current docs as read 2026-05-04 [CITED: zod strictObject docs] | Prevents unsupported future/foreign payloads from partially applying. [VERIFIED: 03-UI-SPEC.md; CITED: zod strictObject docs] |
| Third-party clipboard helpers | Native `navigator.clipboard.writeText()` with fallback | Clipboard API baseline since March 2020 [CITED: MDN Clipboard writeText] | Avoids adding dependencies while still requiring denied-permission fallback. [CITED: MDN Clipboard writeText; VERIFIED: user prompt] |

**Deprecated/outdated:**
- Raw JSON query values are not recommended for this phase because URL syntax characters require encoding and can create long, fragile URLs. [CITED: MDN encodeURIComponent; CITED: MDN URLSearchParams]
- Server-side saved views are out of scope for v1/Phase 3 and should not be planned. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 03-UI-SPEC.md]
- New spreadsheet/grid libraries are explicitly out of scope because the existing entries table must be preserved. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 03-UI-SPEC.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The share query parameter name should be `view`. [ASSUMED] | Architecture Patterns / examples | If user or team expects a different key such as `sharedView`, planner should rename consistently before implementation. |
| A2 | A 6,000-character maximum encoded share parameter is acceptable because the UI spec recommends that cap. [ASSUMED] | Architecture Patterns / Security Domain | If target deployment/proxy/browser constraints are stricter, large rule sets may need a lower cap or a future backend token design. |
| A3 | Rule IDs do not need to round-trip because they are local UI IDs generated for current-session actions. [ASSUMED based on code verification] | Architecture Patterns / Pitfalls | If future analytics/debugging expects stable IDs, schema would need an optional non-secret rule key. |

## Open Questions

1. **Exact query parameter name**
   - What we know: The UI spec says “share-view route/query parameter” but does not name the key. [VERIFIED: 03-UI-SPEC.md]
   - What's unclear: Whether the team prefers `view`, `share`, or `sharedView`. [ASSUMED]
   - Recommendation: Use `view` for compact URLs unless user/team specifies otherwise. [ASSUMED]

2. **Whether to include draft rule currently being edited**
   - What we know: Serialized scope includes Phase 2 conditional formatting and validation rules, and current rules are stored in `rules.value`; the draft rule is separate. [VERIFIED: 03-UI-SPEC.md; VERIFIED: app/composables/useEntriesRuleOverlays.ts]
   - What's unclear: Whether an unsaved draft in the rule panel should count as a shareable setting. [ASSUMED]
   - Recommendation: Do not serialize draft rule; only serialize applied/created rules to match “copy current view” behavior and avoid sharing incomplete invalid data. [ASSUMED]

3. **Payload compression**
   - What we know: No new libraries should be introduced, and URL length cap is recommended at 6,000 characters. [VERIFIED: user prompt; VERIFIED: 03-UI-SPEC.md]
   - What's unclear: Whether expected rule counts could exceed compact JSON/base64url size. [ASSUMED]
   - Recommendation: Start without compression; reject over-cap payloads with exact UI-spec copy and defer saved/backend token views to v2. [VERIFIED: .planning/REQUIREMENTS.md; ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Nuxt build/dev and utility tests | ✓ | v24.14.1 [VERIFIED: shell] | — |
| npm | Package scripts and registry checks | ✓ | 11.11.0 [VERIFIED: shell] | — |
| Nuxt build | Phase validation | ✓ | Build reports Nuxt 4.3.1 [VERIFIED: npm run build] | — |
| Browser Clipboard API | Copy link UX | Not CLI-testable here [VERIFIED: environment limitation] | Browser-dependent; baseline widely available since March 2020 [CITED: MDN Clipboard writeText] | Readonly URL preview fallback required. [VERIFIED: 03-UI-SPEC.md] |
| MongoDB credentials/session | Browser loaded-row manual verification | Not verified in CLI [VERIFIED: environment limitation; VERIFIED: CLAUDE.md env setup] | — | Planner should keep build/unit-style validation separate from authenticated UAT. [VERIFIED: 02-VERIFICATION.md] |

**Missing dependencies with no fallback:**
- None for implementation/build planning; authenticated browser UAT may require `.env` and session setup outside this research environment. [VERIFIED: npm run build; VERIFIED: CLAUDE.md]

**Missing dependencies with fallback:**
- Clipboard permission/API availability has a UI fallback: selectable readonly URL preview. [CITED: MDN Clipboard writeText; VERIFIED: 03-UI-SPEC.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no direct change | Phase 3 uses the existing authenticated `/entries` page middleware and must not serialize auth/session data. [VERIFIED: app/pages/entries/index.vue; VERIFIED: 03-UI-SPEC.md] |
| V3 Session Management | no direct change | Do not include cookies, tokens, user IDs, auth state, or session data in the share payload. [VERIFIED: 03-UI-SPEC.md] |
| V4 Access Control | indirectly | Shared view only restores local filters/rules over whatever entries the current user can already load; it must not alter server-backed permissions or dialect access. [VERIFIED: 03-UI-SPEC.md; VERIFIED: CLAUDE.md] |
| V5 Input Validation | yes | Use Zod strict schema and existing formula/regex validators before applying query payload. [CITED: zod strictObject/safeParse docs; VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| V6 Cryptography | no | Do not encrypt/sign in Phase 3 because payload contains no secrets and is not trusted; validation and rejection are the controls. [VERIFIED: 03-UI-SPEC.md; ASSUMED] |

### Known Threat Patterns for Nuxt client-side query restore

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Query payload injection with unknown keys | Tampering | `z.strictObject()` and reject unsupported fields/kinds. [CITED: zod strictObject docs; VERIFIED: 03-UI-SPEC.md] |
| Arbitrary code execution through formulas | Elevation of Privilege / Tampering | Reuse whitelist formula parser; never use `eval`, `new Function`, dynamic imports, or executable payloads. [VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: 03-UI-SPEC.md] |
| Regex denial-of-service / UI freeze | Denial of Service | Reuse `ADVANCED_REGEX_MAX_PATTERN_LENGTH`, supported flags `i/m/u`, unsafe pattern rejection, and input slicing. [VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Oversized URL payload | Denial of Service | Enforce encoded payload length before decoding; UI spec recommends 6,000 URL characters for the share parameter. [VERIFIED: 03-UI-SPEC.md] |
| Secret/session leakage in copied URL | Information Disclosure | Serialize only formula/regex/rule configuration; explicitly exclude user/session/token/API/draft/entry data. [VERIFIED: 03-UI-SPEC.md] |
| Confused deputy via shared filter | Spoofing / Access Control | Shared view must not change auth state, dialect permissions, or server-backed filters except future schema versions. [VERIFIED: 03-UI-SPEC.md] |

## Validation Architecture

Skipped because `.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`. [VERIFIED: .planning/config.json]

Recommended non-Nyquist validation for planner:
- Run `npm run build` after implementation; current baseline build succeeds with warnings only. [VERIFIED: npm run build]
- Add focused utility tests if project test framework is introduced later; no existing test config was detected in the provided scope. [ASSUMED]
- Manual browser UAT should cover: no settings empty state, valid copy/restore, invalid decode, unsupported version, too-large payload, invalid formula, invalid regex, clear share parameter, clipboard-denied fallback, table keyboard navigation, and no dirty-entry changes after restore. [VERIFIED: 03-UI-SPEC.md; VERIFIED: CLAUDE.md]

## Sources

### Primary (HIGH confidence)

- `/websites/nuxt_4_x` Context7 docs — `useRoute`, `navigateTo`, `useRouter`, query/route navigation. [CITED: nuxt.com/docs/4.x/api/composables/use-route; CITED: nuxt.com/docs/4.x/api/utils/navigate-to]
- `/vuejs/docs` Context7 docs — Vue `watch`, immediate/deep watcher behavior. [CITED: github.com/vuejs/docs]
- `/colinhacks/zod` Context7 docs — `safeParse`, `z.strictObject`. [CITED: github.com/colinhacks/zod]
- MDN Clipboard `writeText()` — secure context, Promise, `NotAllowedError`, baseline availability. [CITED: developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText]
- MDN URLSearchParams — query parameter `set`, `delete`, `toString`, encoding behavior. [CITED: developer.mozilla.org/en-US/docs/Web/API/URLSearchParams]
- MDN `btoa()` — Unicode limitation and TextEncoder byte workaround. [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/btoa]
- MDN `encodeURIComponent()` — query component escaping and malformed URI exceptions. [CITED: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent]
- Project files: `CLAUDE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `03-UI-SPEC.md`, `02-VERIFICATION.md`, `app/pages/entries/index.vue`, `app/composables/useEntriesAdvancedFilters.ts`, `app/composables/useEntriesRuleOverlays.ts`, `app/components/entries/EntriesAdvancedFilterPanel.vue`, `app/components/entries/EntriesRuleOverlayPanel.vue`, `app/utils/entriesAdvancedFilter.ts`. [VERIFIED: Read/Bash]
- npm registry checks for `vue`, `nuxt`, `@nuxt/ui`, `zod`, `typescript`. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)

- None required; primary sources covered the implementation domain. [VERIFIED: source audit]

### Tertiary (LOW confidence)

- Assumptions in the Assumptions Log about query parameter naming, draft rule exclusion, and payload cap acceptance. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — project stack, UI spec, current build, npm registry, and official docs were verified. [VERIFIED: CLAUDE.md; VERIFIED: 03-UI-SPEC.md; VERIFIED: npm run build; VERIFIED: npm registry]
- Architecture: HIGH — state owners and route watcher patterns were verified in current code; Nuxt route APIs were verified in docs. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; CITED: Nuxt docs]
- Pitfalls: HIGH — major pitfalls derive directly from current separated applied/input state, route watcher code, UI spec safety requirements, and official Web API limitations. [VERIFIED: codebase; VERIFIED: 03-UI-SPEC.md; CITED: MDN]
- Security: MEDIUM-HIGH — input validation and data-exclusion controls are verified; exact ASVS mapping is architectural guidance rather than a project-specific compliance audit. [VERIFIED: 03-UI-SPEC.md; CITED: zod docs; ASSUMED]

**Research date:** 2026-05-04 [VERIFIED: currentDate]
**Valid until:** 2026-06-03 for project architecture; re-check npm package docs/versions if upgrading Nuxt UI/Nuxt before implementation. [ASSUMED]
