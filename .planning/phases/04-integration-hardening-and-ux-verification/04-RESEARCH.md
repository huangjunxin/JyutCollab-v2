# Phase 4: Integration Hardening and UX Verification - Research

**Researched:** 2026-05-05 [VERIFIED: currentDate]
**Domain:** Nuxt 4/Vue 3 entries-table safety, compatibility, performance hardening, localization, and verification strategy [VERIFIED: CLAUDE.md; VERIFIED: .planning/ROADMAP.md; VERIFIED: app/pages/entries/index.vue]
**Confidence:** HIGH [VERIFIED: codebase reads; VERIFIED: existing tests; VERIFIED: npm registry; CITED: github.com/vuejs/vue; CITED: github.com/vitest-dev/vitest]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Safety and Mutation Boundaries
- **D-01:** Treat all formula, regex, formatting, validation, and shared-view logic as inspection-only client behavior for v1. It must not call save, submit, delete, review, bulk, history, AI, upload, or admin mutation APIs.
- **D-02:** Add or strengthen regression coverage around read-only behavior where practical. Coverage should assert that rule evaluation/export/restore does not mutate `Entry` objects, dirty markers, local drafts, selected rows, route-backed server filters, or backend/localStorage persistence.
- **D-03:** Shared-view validation remains the trust boundary for URL payloads. Do not move untrusted payload application into page or component code before `decodeEntriesSharedView()` succeeds.
- **D-04:** Do not implement bulk modification, destructive rule actions, saved-view persistence, backend sync, or localStorage persistence for rule/view configuration in this phase.

### Existing Entries Table Workflow Compatibility
- **D-05:** Compatibility verification must cover flat, aggregated, and lexeme modes with advanced filters/rules enabled and disabled.
- **D-06:** Inline editing must preserve existing cell identity and edit state: selected/focused cell, Enter/Tab/Escape keyboard behavior, dirty state, draft recovery, save indicators, duplicate checks, AI suggestion accept/dismiss, and column resize persistence should keep working with active rules.
- **D-07:** Server-backed route params such as normal search/filter/pagination remain owned by existing entries-list flow. The `view` query parameter must stay separate and must not cause unnecessary `fetchEntries()` calls by itself.
- **D-08:** Clear-share-query behavior must continue to remove only the shared `view` parameter and must not clear in-memory filters, rules, entries, drafts, or table preferences.

### Performance and Responsiveness
- **D-09:** Optimize only measured or obviously repeated client-side rule work. Prefer small memoization/caching around row context construction, formula parsing, and regex compilation over broad refactors of `app/pages/entries/index.vue`.
- **D-10:** Performance hardening should target typical loaded table datasets, not full-database filtering. Phase 1 explicitly scoped advanced filters/rules to currently loaded entries.
- **D-11:** Rule evaluation must not freeze common interactions: typing in filter inputs, editing cells, switching view modes, toggling rules, reordering rules, and restoring a shared view.
- **D-12:** If debouncing is added, it must not make applied filter/rule state confusing. Prefer debouncing expensive preview/evaluation work while keeping explicit Apply/Restore actions deterministic.

### Localization and UX Feedback
- **D-13:** Audit all user-facing Chinese strings introduced by Excel-style tools and convert to Hong Kong Traditional Chinese. This includes labels, validation errors, alerts, helper text, empty states, tooltips, and test fixture text.
- **D-14:** Invalid formula, invalid regex, invalid shared-view payload, unsupported shared-view version, too-large payload, and invalid rule color feedback must be visible without requiring users to open a hidden popover.
- **D-15:** Manual verification copy and examples should use Hong Kong Traditional Chinese and realistic Cantonese dictionary content such as `檢查`, `香港`, `廣州`, `粵語詞條`, and dictionary-entry definitions.

### Verification Strategy
- **D-16:** Phase 4 should produce a concrete manual browser verification matrix covering golden path and edge cases for formula filters, regex filters, conditional formatting, validation warnings, shared views, rule ordering, invalid formula/regex, invalid/too-old/too-large shared payloads, and existing table workflows.
- **D-17:** Automated verification should reuse existing Vitest/source-level patterns already added in Phases 1-3. Add focused tests only where they lock safety/performance/compatibility behavior without requiring a full E2E framework.
- **D-18:** `npm run build` remains the minimum whole-app verification gate. Targeted Vitest commands should run for changed utils/composables/components/page-wiring tests.
- **D-19:** Manual browser verification should include starting the dev server and using `/entries` directly. If environment credentials prevent full AI/upload/backend validation, record that limitation explicitly rather than claiming full coverage.

### Claude's Discretion
- Exact test file boundaries, performance instrumentation method, memoization keys, and source-level assertion wording are left to planning/implementation, provided the phase remains within hardening/verification scope.
- Planner may split work into safety tests, performance hardening, localization audit, and manual verification tasks in whichever order minimizes regression risk.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Backend account-synced saved views and team-visible saved views remain v2 (`VIEW-05`, `VIEW-06`).
- Formula/regex-driven bulk modifications remain v2 and require preview, permission, and edit-history safeguards (`BULK-01`, `BULK-02`).
- Full database search/filtering remains out of Phase 4; current advanced filters/rules apply to currently loaded entries.
- Replacing the entries table with a spreadsheet/grid library remains out of scope.
- Broad refactor of the oversized entries page is useful tech debt work but should not be bundled into this hardening phase unless required for a targeted fix.
- New E2E framework adoption can be recommended, but Phase 4 should not depend on introducing Playwright/Cypress unless planning finds it low-risk and essential.
</user_constraints>

## Project Constraints (from CLAUDE.md)

- All Chinese text in UI labels, buttons, placeholders, error messages, validation text, Chinese comments, AI prompts/system messages, and database enum values must use Hong Kong Traditional Chinese. [VERIFIED: CLAUDE.md]
- Use `convertToHongKongTraditional()` from `~/server/utils/textConversion` for Chinese text conversion when server-side normalization is needed. [VERIFIED: CLAUDE.md]
- The project stack is Nuxt 4, Vue 3 Composition API, @nuxt/ui, MongoDB/Mongoose, nuxt-auth-utils, Pinia, Zod, Cloudinary, and opencc-js. [VERIFIED: CLAUDE.md]
- The entries page owns flat, aggregated, and lexeme view modes plus inline editing, keyboard navigation, AI suggestions, local drafts, column resizing, save indicators, batch selection, and search/filter controls. [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue]
- Use focused composables for reusable state/logic and `<script setup lang="ts">` for Vue components. [VERIFIED: CLAUDE.md; VERIFIED: .planning/codebase/CONVENTIONS.md]
- Use public `Entry.id` as the browser/API identity convention and `lexemeId` for cross-dialect grouping. [VERIFIED: CLAUDE.md]
- Create `EditHistory` records for all CRUD operations, but Phase 4 rule/filter/share behavior must remain read-only and therefore must not create new entry CRUD operations. [VERIFIED: CLAUDE.md; VERIFIED: 04-CONTEXT.md]
- Always check dialect permissions through existing mutation flows; Phase 4 must not add mutation bypasses or client-only permission shortcuts. [VERIFIED: CLAUDE.md; VERIFIED: .planning/codebase/CONVENTIONS.md]
- Column widths currently persist in localStorage under `jyutcollab-column-widths`; Phase 4 must not add localStorage persistence for rule/view configuration. [VERIFIED: CLAUDE.md; VERIFIED: app/composables/useColumnResize.ts; VERIFIED: 04-CONTEXT.md]
- Existing testing considerations include dialect permission boundaries, status transitions, AI suggestion acceptance/rejection, edit history snapshot accuracy, revert functionality, concurrent edits, and keyboard navigation. [VERIFIED: CLAUDE.md]

## Summary

Phase 4 should be planned as a hardening and verification phase over already-delivered client-side Excel-style tools, not as a feature-expansion phase. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 04-CONTEXT.md] The implementation should concentrate on regression tests and tiny targeted changes in `useEntriesAdvancedFilters`, `useEntriesRuleOverlays`, `entriesSharedView`, `EntriesEditableCell`, entries toolbar/page wiring, and manual verification artifacts. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/utils/entriesSharedView.ts; VERIFIED: app/components/entries/EntriesEditableCell.vue; VERIFIED: app/pages/entries/index.vue]

The highest-risk boundary is accidental mutation coupling: filters and overlays must never call `$fetch`, set `_isDirty`, mutate selected rows, write rule/view state to localStorage, or trigger server-backed `fetchEntries()` merely because the shared `view` query changes. [VERIFIED: 04-CONTEXT.md; VERIFIED: app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts; VERIFIED: app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts] The second highest-risk area is responsiveness, because current filtering and overlay metadata recompute row context and compile/evaluate formulas/regexes across visible/loaded entries and rules. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]

**Primary recommendation:** Plan four parallel-safe workstreams: (1) read-only and route/localStorage safety tests, (2) targeted performance memoization for row contexts, parsed formulas, and compiled regexes, (3) HK Traditional Chinese/visible feedback audit, and (4) a concrete manual browser verification matrix for `/entries` golden paths and edge cases. [VERIFIED: 04-CONTEXT.md; VERIFIED: existing Vitest tests; CITED: github.com/vuejs/vue; CITED: github.com/vitest-dev/vitest]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Formula and regex filtering over loaded entries | Browser / Client | — | `useEntriesAdvancedFilters` computes filtered entries/groups locally from currently loaded `entries`, `aggregatedGroups`, and `lexemeGroups`; Phase 4 explicitly must not add full-database filtering. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: 04-CONTEXT.md] |
| Conditional formatting and validation overlays | Browser / Client | — | `useEntriesRuleOverlays` computes cell metadata maps locally and `EntriesEditableCell` renders `cellMeta` without owning mutations. [VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/components/entries/EntriesEditableCell.vue] |
| Shared-view payload validation and restore | Browser / Client | Nuxt Router | `decodeEntriesSharedView()` is the trust boundary and `app/pages/entries/index.vue` applies decoded state from the `view` query parameter. [VERIFIED: app/utils/entriesSharedView.ts; VERIFIED: app/pages/entries/index.vue; VERIFIED: 04-CONTEXT.md] |
| Entry create/update/delete/submit workflows | API / Backend | Browser / Client | Mutations go through `/api/entries` endpoints called by entries page actions; Phase 4 must prove rules/filters/share code does not call those paths. [VERIFIED: app/pages/entries/index.vue; VERIFIED: .planning/codebase/ARCHITECTURE.md; VERIFIED: 04-CONTEXT.md] |
| Inline editing, focus, keyboard navigation, AI suggestions, drafts | Browser / Client | API / Backend for AI/save/dedup | Editing state, `focusedCell`, `editingCell`, local draft persistence, and AI suggestion maps are page/composable-owned; save/AI/dedup calls remain explicit user/edit workflows. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesLocalStorage.ts; VERIFIED: CLAUDE.md] |
| Column resizing | Browser / Client | localStorage | `useColumnResize` persists widths to `jyutcollab-column-widths`; rule/view hardening must not change this key or couple overlays to width state. [VERIFIED: app/composables/useColumnResize.ts; VERIFIED: CLAUDE.md] |
| Manual UX verification | Browser / Client | External services only where configured | Keyboard, popovers, clipboard fallback, localStorage drafts, AI, and authenticated `/entries` behavior require browser UAT; environment credentials may limit full backend/AI coverage. [VERIFIED: 04-CONTEXT.md; VERIFIED: CLAUDE.md] |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SAFE-01 | Formula, regex, formatting, and validation rules are read-only overlays and cannot bulk-modify entry data in v1. [VERIFIED: .planning/REQUIREMENTS.md] | Existing composable/component tests already assert no `_isDirty`, no rule localStorage/backend coupling, no serialized entry data, and no mutation-like methods; Phase 4 should add broader regression coverage around export/restore, selected rows, drafts, and source-level mutation API absence. [VERIFIED: app/composables/__tests__/useEntriesRuleOverlays.test.ts; VERIFIED: app/utils/__tests__/entriesSharedView.test.ts; VERIFIED: 04-CONTEXT.md] |
| SAFE-02 | Existing inline editing, save/submit/delete, local draft recovery, AI suggestions, keyboard navigation, column resizing, and view modes continue to work with rules enabled. [VERIFIED: .planning/REQUIREMENTS.md] | The main integration seams are `tableRows`, `currentPageEntries`, `allLoadedPageEntries`, `visibleRuleOverlayEntries`, `focusedCell`, `editingCell`, `saveCellEdit`, `handleTableKeydown`, `saveEntryChanges`, `deleteEntry`, draft watcher, and `useColumnResize`. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useColumnResize.ts; VERIFIED: app/composables/useEntriesLocalStorage.ts] |
| SAFE-03 | Rule evaluation remains responsive on typical entries table datasets and does not freeze typing or editing interactions. [VERIFIED: .planning/REQUIREMENTS.md] | Current hotspots are per-entry `buildRowContext()`, repeated `evaluateAdvancedFormula()` parsing, repeated `compileAdvancedRegex()` in filter matching/rule matching, and computed overlay metadata over `visibleEntries × rules`. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| SAFE-04 | New Chinese UI labels, errors, and help text use Hong Kong Traditional Chinese. [VERIFIED: .planning/REQUIREMENTS.md] | Audit newly introduced Excel-tool strings in components, utilities, page alerts, visible error states, and test fixtures; specific watchwords include Simplified/standard Traditional variants such as `搜索`, `添加`, `當前`, `默認`, and any new copy introduced by Phase 4. [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue; VERIFIED: 04-CONTEXT.md] |
</phase_requirements>

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|----------------|---------|---------|--------------|
| Nuxt | Project declares `^4.3.1`; registry latest `4.4.4`. [VERIFIED: package.json; VERIFIED: npm registry] | Page routing, production build, app runtime. [VERIFIED: CLAUDE.md] | The project is already a Nuxt 4 app and Phase 4 must preserve existing `/entries` wiring. [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue] |
| Vue | Project declares `^3.5.28`; registry latest `3.5.33`. [VERIFIED: package.json; VERIFIED: npm registry] | Composition API refs/computed/watchers for filter/rule/page state. [VERIFIED: app/pages/entries/index.vue] | Existing implementation uses Vue computed caching and watchers; Vue docs show computed values are cached based on dependencies and watchers can react to state changes. [VERIFIED: codebase; CITED: github.com/vuejs/vue] |
| @nuxt/ui | Project declares `^4.4.0`; registry latest `4.7.1`. [VERIFIED: package.json; VERIFIED: npm registry] | Existing toolbar controls, buttons, popovers, alerts, badges, inputs. [VERIFIED: app/components/entries/EntriesAdvancedFilterPanel.vue; VERIFIED: app/components/entries/EntriesRuleOverlayPanel.vue; VERIFIED: app/components/entries/EntriesShareViewPopover.vue] | The project already standardizes on Nuxt UI; Phase 4 should fix feedback/UX with existing components rather than new UI libraries. [VERIFIED: CLAUDE.md; VERIFIED: .planning/codebase/CONVENTIONS.md] |
| Vitest | Project dev dependency `^4.1.5`; registry latest `4.1.5`. [VERIFIED: package.json; VERIFIED: npm registry] | Focused unit/source-level regression tests. [VERIFIED: app/**/__tests__] | Existing Phase 1-3 tests use Vitest; Vitest supports mocks and fake timers for debounce/performance-related assertions. [VERIFIED: existing tests; CITED: github.com/vitest-dev/vitest] |
| Zod | Project declares `^4.3.6`; registry latest `4.4.3`. [VERIFIED: package.json; VERIFIED: npm registry] | Shared-view strict schema validation. [VERIFIED: app/utils/entriesSharedView.ts] | Existing `decodeEntriesSharedView()` uses Zod strict schemas for query payload trust boundary. [VERIFIED: app/utils/entriesSharedView.ts] |
| opencc-js | Project declares `^1.0.5`; registry latest `1.3.0`. [VERIFIED: package.json; VERIFIED: npm registry] | HK Traditional Chinese conversion where server-side normalization is needed. [VERIFIED: CLAUDE.md] | CLAUDE.md requires HK Traditional Chinese across UI/messages/comments and names opencc-js conversion utility. [VERIFIED: CLAUDE.md] |

### Supporting

| Library / Tool | Version | Purpose | When to Use |
|----------------|---------|---------|-------------|
| Node.js | Local environment `v24.14.1`. [VERIFIED: shell] | Build/dev/test commands. [VERIFIED: shell] | Required for `npm run build`, `npm run dev`, and `npx vitest`. [VERIFIED: package.json; VERIFIED: shell] |
| npm/npx | Local environment `11.11.0`. [VERIFIED: shell] | Running scripts, package version checks, targeted Vitest commands. [VERIFIED: shell] | Use `npx vitest run ...` because package scripts do not currently define `test`. [VERIFIED: package.json; VERIFIED: existing tests] |
| Existing `entriesAdvancedFilter` utility | Local module. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Formula parsing/evaluation and regex compilation/testing. [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Reuse for safety and shared-view semantic validation; do not create a second formula/regex evaluator. [VERIFIED: app/utils/entriesSharedView.ts; VERIFIED: 04-CONTEXT.md] |
| Existing `useEntriesAdvancedFilters` composable | Local module. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Advanced filter state, row context creation, exported/restored filter state. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts] | Add small memoization/caching here if profiling/tests show repeated row context or formula/regex work. [VERIFIED: 04-CONTEXT.md] |
| Existing `useEntriesRuleOverlays` composable | Local module. [VERIFIED: app/composables/useEntriesRuleOverlays.ts] | Formatting/validation rule lifecycle and per-cell overlay metadata. [VERIFIED: app/composables/useEntriesRuleOverlays.ts] | Add small memoization/caching here for parsed/compiled rules or context reuse; avoid page refactor. [VERIFIED: 04-CONTEXT.md] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Focused Vitest/source-level tests | Full Playwright/Cypress E2E adoption | E2E would better cover keyboard/browser behavior but is explicitly not required and would add setup risk to a hardening phase. [VERIFIED: 04-CONTEXT.md] |
| Memoizing parser/regex/context inside composables/utilities | Replacing entries table with a grid library | Replacement is explicitly out of scope and would risk existing editing/AI/grouping workflows. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 04-CONTEXT.md] |
| Source-level tests for page wiring | Mounting the 2000+ line entries page in Vitest | Source-level tests are already used for page wiring because mounting this page would require extensive Nuxt/browser/API mocks. [VERIFIED: app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts; VERIFIED: app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts] |
| Client-only loaded-entry performance hardening | Backend search/filter/rule execution | Full database filtering is out of Phase 4 and current tools apply to loaded entries only. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md] |

**Installation:**
```bash
# No new runtime packages should be installed for Phase 4.
# Use existing dependencies and run targeted tests through npx:
npx vitest run app/utils/__tests__/entriesSharedView.test.ts
```
[VERIFIED: package.json; VERIFIED: 04-CONTEXT.md]

**Version verification:**
- `npm view nuxt version` → `4.4.4`. [VERIFIED: npm registry]
- `npm view vue version` → `3.5.33`. [VERIFIED: npm registry]
- `npm view vitest version` → `4.1.5`. [VERIFIED: npm registry]
- `npm view zod version` → `4.4.3`. [VERIFIED: npm registry]
- `npm view @nuxt/ui version` → `4.7.1`. [VERIFIED: npm registry]
- `npm view opencc-js version` → `1.3.0`. [VERIFIED: npm registry]

## Architecture Patterns

### System Architecture Diagram

```text
User opens /entries or /entries?view=<payload>
        |
        v
Nuxt entries page route/query handling
  - applySharedViewQuery()
  - applyUrlParams()
  - fetchEntries() only for server-backed params
        |
        +-- invalid view payload --> visible UAlert + no filter/rule apply + no fetchEntries
        |
        v
Loaded entries from useEntriesList
  - entries
  - aggregatedGroups
  - lexemeGroups
        |
        v
Client-only Excel tool state
  - useEntriesAdvancedFilters: formula/global regex/column regex
  - useEntriesRuleOverlays: formatting/validation rules
        |
        v
Derived display state
  - filteredEntries / filteredAggregatedGroups / filteredLexemeGroups
  - tableRows / visibleRuleOverlayEntries
  - cellOverlayMetaByEntryKey
        |
        v
EntriesEditableCell display overlay
  - classNames/style/title/validation icon only
  - no col.set(), no _isDirty, no $fetch
        |
        v
Existing table workflows continue independently
  - inline editing + save/submit/delete
  - local draft persistence
  - AI suggestions and duplicate/reference checks
  - keyboard navigation
  - column width localStorage
  - flat/aggregated/lexeme modes
```
[VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/components/entries/EntriesEditableCell.vue]

### Recommended Project Structure

```text
app/
├── composables/
│   ├── useEntriesAdvancedFilters.ts              # add measured caching/memoization and safety tests if needed
│   ├── useEntriesRuleOverlays.ts                 # add rule parse/regex/context caching if needed
│   └── __tests__/
│       ├── useEntriesAdvancedFilters.safety.test.ts     # likely new
│       ├── useEntriesAdvancedFilters.performance.test.ts # likely new or merged
│       └── useEntriesRuleOverlays.performance.test.ts    # likely new or merged
├── utils/
│   ├── entriesAdvancedFilter.ts                  # reuse; avoid semantic expansion unless fixing performance
│   ├── entriesSharedView.ts                      # keep trust-boundary validation here
│   └── __tests__/entriesSharedView.test.ts       # extend for safety regressions if needed
├── components/entries/
│   ├── EntriesAdvancedFilterPanel.vue            # localization/visible feedback audit only
│   ├── EntriesRuleOverlayPanel.vue               # localization/color feedback/safety audit only
│   ├── EntriesShareViewPopover.vue               # visible shared-view feedback audit only
│   ├── EntriesEditableCell.vue                   # preserve overlay-render-only contract
│   └── __tests__/                               # extend current source-level component/page wiring tests
└── pages/entries/index.vue                       # minimal page wiring/tests; avoid broad refactor
```
[VERIFIED: current file tree; VERIFIED: existing tests; VERIFIED: 04-CONTEXT.md]

### Pattern 1: Safety Regression by Boundary, Not by UI Guessing

**What:** Add tests at each boundary proving rule/filter/share behavior does not mutate entries, dirty flags, draft storage, selection, route-backed fetch state, or backend APIs. [VERIFIED: 04-CONTEXT.md]

**When to use:** Use composable unit tests for entry mutation/local state, utility tests for shared-view validation, and source-level page/component tests for absence of `$fetch`, localStorage, `_isDirty`, and mutation calls in the new Excel-tool paths. [VERIFIED: existing tests]

**Example assertions to plan:**
```typescript
// Source: existing Vitest/source-level patterns in app/**/__tests__
expect(entry._isDirty).toBeUndefined()
expect(entry).not.toHaveProperty('__ruleOverlayMeta')
expect(Object.keys(advancedFilters).some(key => /save|delete|bulk|fetch/i.test(key))).toBe(false)
expect(source).not.toMatch(/localStorage.*rule|\$fetch.*shared|_isDirty[\s\S]{0,120}shared/i)
```
[VERIFIED: app/composables/__tests__/useEntriesRuleOverlays.test.ts; VERIFIED: app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts]

### Pattern 2: Performance Hardening with Tiny Stable Caches

**What:** Cache obvious repeat work: row context per entry/key and column/display dependencies, parsed formula AST by formula string, compiled regex by `pattern flags`, and rule condition evaluation by rule ID + context source where safe. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/utils/entriesAdvancedFilter.ts]

**When to use:** Use only if a test, manual profiling, or code inspection confirms repeated work across rows/rules; avoid a broad `app/pages/entries/index.vue` rewrite. [VERIFIED: 04-CONTEXT.md]

**Implementation guidance:** Prefer local helper functions/maps inside composables over global caches, because entry contents and editable column display values are reactive and page-specific. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; ASSUMED]

**Recommended cache keys:**
- Formula parse cache key: trimmed formula string. [VERIFIED: app/utils/entriesAdvancedFilter.ts]
- Regex cache key: `${pattern} ${flags}`. [ASSUMED]
- Row context cache key: `getEntryKey(entry)` plus a lightweight signature from editable display fields or recompute when computed dependencies rerun. [VERIFIED: app/utils/entryKey.ts; ASSUMED]

### Pattern 3: Explicit Apply/Restore Must Stay Deterministic

**What:** Keep `applyAdvancedFilters()` and `restoreAdvancedFilterState()` immediate and deterministic; debounce only expensive live preview/evaluation if new live preview is added. [VERIFIED: 04-CONTEXT.md; VERIFIED: app/composables/useEntriesAdvancedFilters.ts]

**When to use:** If adding debounce to reduce typing lag, do not delay explicit button actions or shared-view restore. [VERIFIED: 04-CONTEXT.md]

**Why:** Phase 4 decisions say debouncing must not make applied filter/rule state confusing. [VERIFIED: 04-CONTEXT.md]

### Pattern 4: Manual Browser Verification Matrix as a Phase Artifact

**What:** Plan a checklist table with stable IDs, setup data, steps, expected result, automated coverage reference, and environment limitation column. [VERIFIED: 04-CONTEXT.md]

**When to use:** Use after targeted tests/build because keyboard navigation, popovers, clipboard fallback, localStorage drafts, and real AI/backend behavior are not fully covered by current Vitest tests. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/codebase/TESTING.md]

**Recommended matrix categories:**
- Golden path formula filter, regex filter, formatting rule, validation rule, shared link copy/restore. [VERIFIED: .planning/ROADMAP.md; VERIFIED: 04-CONTEXT.md]
- Invalid formula, invalid regex, unsafe regex, invalid shared payload, unsupported version, too-old version, too-large payload, invalid color. [VERIFIED: app/utils/entriesSharedView.ts; VERIFIED: 04-CONTEXT.md]
- Existing workflows with rules enabled/disabled: flat/aggregated/lexeme, inline edit, save one, save all, delete, local draft recovery, AI accept/dismiss, keyboard arrows/Enter/Tab/Escape, column resize, clear share query. [VERIFIED: app/pages/entries/index.vue; VERIFIED: 04-CONTEXT.md]

### Anti-Patterns to Avoid

- **Adding backend saved-view routes or localStorage persistence for rules/views:** This is explicitly out of scope and would violate the v1 local-only design. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md]
- **Adding bulk modification actions from rules:** Bulk formula/regex-driven modifications are v2 and require separate preview/permission/edit-history safeguards. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md]
- **Broad refactor of `app/pages/entries/index.vue`:** The page is already large and fragile; Phase 4 should use focused tests and targeted edits. [VERIFIED: .planning/codebase/CONCERNS.md; VERIFIED: 04-CONTEXT.md]
- **Moving shared-view trust boundary into page/component code:** Decode/validation must remain in `decodeEntriesSharedView()` before applying state. [VERIFIED: 04-CONTEXT.md; VERIFIED: app/utils/entriesSharedView.ts]
- **Debouncing explicit Apply/Restore:** This would make user actions feel non-deterministic and contradict the phase decisions. [VERIFIED: 04-CONTEXT.md]
- **Adding more browser `alert()`/`confirm()` for new Excel-tool feedback:** Existing guidance prefers visible Nuxt UI feedback and Phase 4 specifically requires visible error feedback. [VERIFIED: .planning/codebase/CONVENTIONS.md; VERIFIED: 04-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Formula parsing/evaluation | A second parser, `eval`, `new Function`, or executable payload logic | `parseAdvancedFormula()`, `evaluateAdvancedFormulaAst()`, and existing whitelist helpers | The existing utility defines supported functions/fields and avoids arbitrary JavaScript execution. [VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Regex validation and execution | Raw `new RegExp()` scattered through UI/page code | `compileAdvancedRegex()` and `testAdvancedRegex()` | Existing helper enforces flags, pattern length, unsafe-pattern check, and input slicing. [VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Shared-view payload validation | Ad-hoc checks inside `app/pages/entries/index.vue` | `decodeEntriesSharedView()` and Zod strict schemas | Current utility already centralizes version gates, max length, strict schema, semantic validation, and normalized output. [VERIFIED: app/utils/entriesSharedView.ts] |
| Browser interaction test harness | A full E2E framework as a hard dependency | Manual browser verification matrix plus focused Vitest/source-level tests | Phase 4 decisions explicitly prefer current Vitest/source patterns and manual browser verification without making E2E adoption mandatory. [VERIFIED: 04-CONTEXT.md] |
| Performance optimization | Virtualized grid rewrite or backend rule execution | Small memoization/caching in composables/utilities | Phase 4 targets typical loaded datasets and forbids broad table/library replacement. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md] |
| Localization conversion in UI audit | Manual guesswork only | CLAUDE.md HK Traditional rules plus `convertToHongKongTraditional()` when server-side conversion is needed | Project instructions list required HK Traditional variants and conversion utility. [VERIFIED: CLAUDE.md] |

**Key insight:** Phase 4 succeeds by proving the new Excel-style tools are overlays over existing table state, not new data workflows. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 04-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Rule evaluation mutates entry data indirectly
**What goes wrong:** Overlay or filter evaluation writes metadata onto `Entry` objects, sets `_isDirty`, or alters selected/draft state. [VERIFIED: 04-CONTEXT.md]
**Why it happens:** It is tempting to cache cell metadata on row objects instead of returning separate maps. [ASSUMED]
**How to avoid:** Keep overlay metadata in `Map<entryKey, Map<field, meta>>` as currently implemented and assert entries do not gain `__ruleOverlayMeta`, `_isDirty`, or shared-view properties. [VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: existing tests]
**Warning signs:** Dirty-row highlighting appears after only adding/toggling rules, or local draft storage changes after restore. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesLocalStorage.ts]

### Pitfall 2: Shared `view` query triggers server fetch
**What goes wrong:** Opening, applying, or clearing a shared view causes unnecessary `/api/entries` refetches. [VERIFIED: 04-CONTEXT.md]
**Why it happens:** The entries page watches `route.query` and calls `fetchEntries()` when server-backed URL params change. [VERIFIED: app/pages/entries/index.vue]
**How to avoid:** Preserve the current separation where `applySharedViewQuery()` runs before `applyUrlParams()`, and only `applyUrlParams()` returning `changed` triggers `fetchEntries()`. [VERIFIED: app/pages/entries/index.vue]
**Warning signs:** Network panel shows `/api/entries` after only clearing `view`, or source-level test no longer matches the route watcher guard. [VERIFIED: app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts]

### Pitfall 3: Performance fixes hide state changes or stale overlays
**What goes wrong:** Caches return old row contexts after editing a cell, accepting an AI suggestion, restoring a draft, or switching modes. [ASSUMED]
**Why it happens:** Entry objects are mutated in place during editing, so identity-only caches can become stale. [VERIFIED: app/pages/entries/index.vue]
**How to avoid:** Use cache keys that include display-field signatures or clear caches inside computed recomputation; prefer parsed formula/compiled regex caches over entry-context caches unless invalidation is clear. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; ASSUMED]
**Warning signs:** Cell display changes but formula/filter/overlay match state does not update until refresh or rule toggle. [ASSUMED]

### Pitfall 4: Regex compilation happens inside every row/rule loop
**What goes wrong:** Typing/filtering/reordering feels slow on typical loaded data because the same regex pattern compiles repeatedly. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]
**Why it happens:** `matchEntry()` and `ruleMatchesContext()` call `compileAdvancedRegex()` in per-entry loops. [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts]
**How to avoid:** Compile applied global/column regex once per computed pass and compile rule regexes once per rule version. [ASSUMED]
**Warning signs:** Performance timing shows large time in regex compilation rather than row display extraction. [ASSUMED]

### Pitfall 5: Formula parsing happens inside every row/rule loop
**What goes wrong:** Formula filters/rules reparse the same formula for each row. [VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: app/composables/useEntriesAdvancedFilters.ts]
**Why it happens:** `evaluateAdvancedFormula(input, context)` parses every call. [VERIFIED: app/utils/entriesAdvancedFilter.ts]
**How to avoid:** Parse once with `parseAdvancedFormula()` and evaluate with `evaluateAdvancedFormulaAst()` for each row context. [VERIFIED: app/utils/entriesAdvancedFilter.ts]
**Warning signs:** CPU profile shows repeated tokenizer/parser calls for one applied formula. [ASSUMED]

### Pitfall 6: Localization audit misses test fixtures or hidden error states
**What goes wrong:** New UI strings, hidden popover errors, or test fixture copy use non-HK wording. [VERIFIED: 04-CONTEXT.md]
**Why it happens:** Strings are spread across utilities, page template, components, and tests. [VERIFIED: codebase reads]
**How to avoid:** Audit `app/components/entries/*Filter*`, `*Rule*`, `*Share*`, `entriesAdvancedFilter.ts`, `entriesSharedView.ts`, `app/pages/entries/index.vue`, and all related tests. [VERIFIED: current file tree]
**Warning signs:** New copy contains Simplified characters or standard Traditional variants flagged in CLAUDE.md, or error only appears inside a closed popover. [VERIFIED: CLAUDE.md; VERIFIED: 04-CONTEXT.md]

### Pitfall 7: Manual verification claims coverage when environment is incomplete
**What goes wrong:** UAT says AI/upload/backend workflows passed even though no credentials/session/data were available. [VERIFIED: 04-CONTEXT.md]
**Why it happens:** `/entries` requires auth and AI/upload require external credentials. [VERIFIED: CLAUDE.md; VERIFIED: app/pages/entries/index.vue]
**How to avoid:** Matrix must include an “Environment/Limitations” column and record blocked checks explicitly. [VERIFIED: 04-CONTEXT.md]
**Warning signs:** Verification report lacks MongoDB/session/OpenRouter status but claims AI golden path passed. [VERIFIED: 04-CONTEXT.md]

## Code Examples

Verified patterns from current code and official docs:

### Parse formula once, evaluate many contexts
```typescript
// Source: app/utils/entriesAdvancedFilter.ts
const parsed = parseAdvancedFormula(appliedFormula)
if (!parsed.ok) return parsed.error
for (const context of rowContexts) {
  const result = evaluateAdvancedFormulaAst(parsed.ast, context)
  // use result.ok/result.value without reparsing the formula
}
```
[VERIFIED: app/utils/entriesAdvancedFilter.ts]

### Use Vitest fake timers for debounce tests
```typescript
// Source: Vitest docs via Context7
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('waits for debounce before writing drafts', () => {
  const callback = vi.fn()
  setTimeout(callback, 500)
  expect(callback).not.toHaveBeenCalled()
  vi.advanceTimersByTime(500)
  expect(callback).toHaveBeenCalledTimes(1)
})
```
[CITED: github.com/vitest-dev/vitest]

### Source-level no-scope-creep test pattern
```typescript
// Source: existing app/components/entries/__tests__ source-level tests
expect(source).not.toMatch(/localStorage.*shared|\$fetch.*shared|save.*shared|deleteSharedView|review.*shared|bulk.*shared|savedView/i)
expect(source).not.toMatch(/shared[\s\S]{0,120}_isDirty|_isDirty[\s\S]{0,120}shared/i)
```
[VERIFIED: app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts]

### Computed values should own derived filtering/overlay state
```typescript
// Source: Vue docs via Context7 + current composable patterns
const filteredEntries = computed(() => {
  if (!hasActiveAdvancedFilters.value) return entries.value
  return entries.value.filter(matchEntry)
})
```
[VERIFIED: app/composables/useEntriesAdvancedFilters.ts; CITED: github.com/vuejs/vue]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No detected test runner/scripts in older codebase map | Vitest config and `app/**/__tests__` files now exist, but `package.json` still lacks a `test` script | After `.planning/codebase/TESTING.md` was generated and before this Phase 4 research [VERIFIED: .planning/codebase/TESTING.md; VERIFIED: package.json; VERIFIED: vitest.config.ts; VERIFIED: app/**/__tests__] | Planner should use `npx vitest run ...` targeted commands unless adding scripts is explicitly planned. [VERIFIED: package.json] |
| Re-evaluate formulas via string API for every row | Prefer parsing once and evaluating AST repeatedly where hot | Phase 4 hardening recommendation based on current helper exports [VERIFIED: app/utils/entriesAdvancedFilter.ts] | Reduces repeated parser/tokenizer work without changing formula semantics. [VERIFIED: app/utils/entriesAdvancedFilter.ts; ASSUMED] |
| Compile regex inside every row/rule loop | Prefer compile-once per pattern/flags per computed pass | Phase 4 hardening recommendation based on current loops [VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts] | Reduces repeated `RegExp` construction while preserving existing safety checks. [VERIFIED: app/utils/entriesAdvancedFilter.ts; ASSUMED] |
| Hidden popover-only shared-view error feedback | Page-level visible `UAlert` plus popover feedback | Already implemented in current entries page and share popover [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/components/entries/EntriesShareViewPopover.vue] | Phase 4 should verify this remains visible for invalid payloads. [VERIFIED: 04-CONTEXT.md] |

**Deprecated/outdated:**
- Treating `.planning/codebase/TESTING.md` as current for test infrastructure is outdated because the repo now has `vitest.config.ts`, `vitest` dev dependency, and existing `app/**/__tests__`. [VERIFIED: .planning/codebase/TESTING.md; VERIFIED: package.json; VERIFIED: vitest.config.ts; VERIFIED: app/**/__tests__]
- Adding backend saved views, rule localStorage persistence, or bulk rule actions is out of scope for Phase 4/v1. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md]
- Broad table/grid replacement remains out of scope. [VERIFIED: 04-CONTEXT.md; VERIFIED: .planning/REQUIREMENTS.md]

## Files Guidance for Planner

### Likely to modify or extend

| File | Why |
|------|-----|
| `app/composables/useEntriesAdvancedFilters.ts` | Likely place for formula AST cache, regex compile cache, row context safety/performance tests, and export/restore safety assertions. [VERIFIED: codebase] |
| `app/composables/useEntriesRuleOverlays.ts` | Likely place for rule condition caching and overlay metadata performance/safety tests. [VERIFIED: codebase] |
| `app/utils/entriesAdvancedFilter.ts` | Only modify if adding reusable parse/evaluate/compile cache helpers without changing supported semantics. [VERIFIED: codebase; VERIFIED: 04-CONTEXT.md] |
| `app/utils/entriesSharedView.ts` | Extend tests or tiny validation messages only; keep this as trust boundary. [VERIFIED: codebase; VERIFIED: 04-CONTEXT.md] |
| `app/components/entries/EntriesAdvancedFilterPanel.vue` | Audit visible invalid formula/regex feedback and HK Traditional copy. [VERIFIED: codebase; VERIFIED: 04-CONTEXT.md] |
| `app/components/entries/EntriesRuleOverlayPanel.vue` | Audit rule ordering, invalid color/regex/formula feedback, HK Traditional copy, and presentational-only contract. [VERIFIED: codebase] |
| `app/components/entries/EntriesShareViewPopover.vue` | Audit visible copy/fallback/error behavior and HK Traditional copy. [VERIFIED: codebase] |
| `app/components/entries/EntriesEditableCell.vue` | Only if overlay rendering interferes with editing/focus; preserve no-mutation contract. [VERIFIED: codebase; VERIFIED: existing tests] |
| `app/pages/entries/index.vue` | Minimal page wiring for route/query/visibility/manual fixes; avoid broad refactor. [VERIFIED: codebase; VERIFIED: 04-CONTEXT.md] |
| Existing `app/**/__tests__` and new colocated tests | Reuse Vitest/source-level patterns for safety/performance/compatibility locks. [VERIFIED: app/**/__tests__] |

### Avoid unless a targeted bug requires it

| File/Area | Why to avoid |
|-----------|--------------|
| `server/api/**` | Phase 4 is client-side hardening/verification; backend saved views and bulk operations are out of scope. [VERIFIED: 04-CONTEXT.md] |
| `server/utils/Entry.ts`, `EditHistory.ts`, database models | No schema/mutation changes should be needed for read-only overlays. [VERIFIED: 04-CONTEXT.md; VERIFIED: CLAUDE.md] |
| `shared/dialects.ts` | Dialect catalog is unrelated to Phase 4 except as existing display data. [VERIFIED: CLAUDE.md; VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| New grid/spreadsheet libraries | Explicitly out of scope and high regression risk. [VERIFIED: .planning/REQUIREMENTS.md; VERIFIED: 04-CONTEXT.md] |
| New E2E framework setup as a blocking dependency | Phase 4 decisions say automated verification should reuse existing Vitest/source-level patterns and manual browser checks. [VERIFIED: 04-CONTEXT.md] |

## Manual Browser Verification Matrix Structure

Use this structure for the Phase 4 manual verification artifact. [VERIFIED: 04-CONTEXT.md]

| ID | Area | Setup | Steps | Expected Result | Automated Coverage | Limitations |
|----|------|-------|-------|-----------------|--------------------|-------------|
| UAT-SAFE-01 | Read-only rules | Loaded `/entries`, at least one visible row | Add formatting and validation rules matching `檢查` / `香港`; do not press save | Cell highlights/warnings appear; no dirty-row state, no save indicator, no local draft change | `useEntriesRuleOverlays*.test.ts` | Requires authenticated data |
| UAT-SAFE-02 | Invalid formula | Advanced filter open | Enter `=UNKNOWN(definition)` and apply | Visible HK Traditional error without crash; table remains usable | `entriesAdvancedFilter`/advanced filter tests | — |
| UAT-SAFE-03 | Invalid regex | Advanced filter/rule panel | Enter `(` as regex and apply/add rule | Visible HK Traditional regex error without crash | utility/composable tests | — |
| UAT-SAFE-04 | Shared view invalid payload | Open `/entries?view=not-valid` | Observe page and share popover | Page-level alert visible; table usable; clear only removes `view` | `EntriesPageSharedViewWiring.test.ts`, `entriesSharedView.test.ts` | — |
| UAT-COMPAT-01 | Flat edit workflow | Flat view, rules enabled | Select cell, Enter edit, type, Tab, Escape, save one row | Focus/edit behavior and save indicator match baseline | Source tests only | Browser-only keyboard |
| UAT-COMPAT-02 | Aggregated mode | Aggregated view, group expanded, rules enabled | Expand group, edit child entry, save/cancel, resize column | Group rows and child row editing still work | Source tests only | Browser-only |
| UAT-COMPAT-03 | Lexeme mode | Lexeme view, group expanded, rules enabled | Expand group, edit child entry, use lexeme actions if permitted | Existing lexeme behavior remains unchanged | Source tests only | Requires reviewer/admin for some actions |
| UAT-COMPAT-04 | Draft recovery | Unsaved edit with active rules | Refresh page, restore drafts, clear/share query | Draft remains; share clear does not clear drafts | localStorage manual plus tests if added | Browser localStorage |
| UAT-PERF-01 | Typing responsiveness | Typical loaded dataset | Type in formula/regex input, edit cell, toggle/reorder rules | No visible freeze; Apply/Restore deterministic | performance unit tests if added | Subjective without profiler |
| UAT-LOC-01 | HK Traditional audit | Excel-tool UI visible | Review labels/errors/tooltips/examples | All new Chinese copy uses HK Traditional | source grep/test fixture audit | Human language review |
| UAT-AI-01 | AI compatibility | OpenRouter configured | Trigger AI suggestion with rules enabled; accept/dismiss | Existing AI suggestion workflow works | Manual only | Record if credentials missing |

[VERIFIED: 04-CONTEXT.md; VERIFIED: app/pages/entries/index.vue; VERIFIED: existing tests]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A lightweight row-context signature or cache invalidation inside computed recomputation will be sufficient for typical loaded datasets. [ASSUMED] | Architecture Patterns / Pitfalls | If datasets are larger or display getters are expensive, planner may need profiling-first tasks or avoid row-context caching. |
| A2 | Regex cache key `${pattern} ${flags}` is safe because patterns/flags are strings and ` ` is unlikely in user regex input. [ASSUMED] | Architecture Patterns | If NUL can appear in patterns, use tuple-keyed nested maps instead. |
| A3 | New E2E tooling is not essential for Phase 4 because existing Vitest/source-level tests plus manual browser matrix satisfy decisions. [ASSUMED based on 04-CONTEXT.md] | Standard Stack / Validation | If reviewers require automated browser coverage, planning must add Playwright/Cypress setup as a separate scoped task. |
| A4 | Current package-lock/node_modules installed versions are compatible with package.json declared ranges and local `npm run build`. [ASSUMED] | Environment Availability | If lockfile differs unexpectedly, planner should run `npm run build` before implementation. |

## Open Questions

1. **Should Phase 4 add an `npm test` script or keep using `npx vitest run`?**
   - What we know: Vitest exists in devDependencies and tests exist under `app/**/__tests__`, but `package.json` has no `test` script. [VERIFIED: package.json; VERIFIED: app/**/__tests__]
   - What's unclear: Whether adding a package script is acceptable in a hardening phase. [ASSUMED]
   - Recommendation: Keep plan focused on `npx vitest run ...` unless adding a script is explicitly desired. [ASSUMED]

2. **What is the representative “typical loaded dataset” size for responsiveness checks?**
   - What we know: Phase 4 targets typical loaded entries, not full database filtering. [VERIFIED: 04-CONTEXT.md]
   - What's unclear: The exact row count and rule count users expect locally. [ASSUMED]
   - Recommendation: Use deterministic fixture tests with small/medium counts and manual UAT on whatever `/entries` returns; avoid hard-coded performance pass/fail thresholds unless user supplies targets. [ASSUMED]

3. **How strict should the HK Traditional audit be for pre-existing strings not introduced by Excel tools?**
   - What we know: CLAUDE.md applies to all Chinese text, and Phase 4 specifically audits Excel-style tool strings. [VERIFIED: CLAUDE.md; VERIFIED: 04-CONTEXT.md]
   - What's unclear: Whether to fix unrelated pre-existing strings such as `搜索`/`添加` visible elsewhere in entries page. [VERIFIED: app/pages/entries/index.vue; ASSUMED]
   - Recommendation: Fix Excel-tool strings and any directly touched strings; report unrelated legacy copy separately if found. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/dev/Vitest | ✓ | v24.14.1 [VERIFIED: shell] | — |
| npm | Scripts and package checks | ✓ | 11.11.0 [VERIFIED: shell] | — |
| npx | Targeted Vitest commands | ✓ | 11.11.0 [VERIFIED: shell] | — |
| `node_modules` | Local build/tests without install | ✓ | Present [VERIFIED: shell] | Run `npm install` if missing. [ASSUMED] |
| `vitest.config.ts` | Test alias resolution | ✓ | Present [VERIFIED: vitest.config.ts] | Pass aliases manually only if config removed. [ASSUMED] |
| MongoDB/session credentials | Manual authenticated `/entries` UAT | Not verified in this session [VERIFIED: CLAUDE.md environment setup; VERIFIED: 04-CONTEXT.md] | Record limitation; run automated/source tests and build. [VERIFIED: 04-CONTEXT.md] |
| OpenRouter API key | Manual AI compatibility UAT | Not verified in this session [VERIFIED: CLAUDE.md environment setup] | Record limitation; do not claim AI UAT passed. [VERIFIED: 04-CONTEXT.md] |
| Browser Clipboard API | Shared-view copy UAT | Not CLI-testable here [ASSUMED] | Existing UI fallback shows readonly URL on copy error. [VERIFIED: app/components/entries/EntriesShareViewPopover.vue] |

**Missing dependencies with no fallback:**
- None blocking code/test planning, but full authenticated browser UAT requires configured `.env` and user session. [VERIFIED: CLAUDE.md; VERIFIED: 04-CONTEXT.md]

**Missing dependencies with fallback:**
- Clipboard failure can use existing manual URL fallback UI. [VERIFIED: app/components/entries/EntriesShareViewPopover.vue]
- AI/backend credential gaps can be recorded as manual verification limitations. [VERIFIED: 04-CONTEXT.md]

## Validation Architecture

Skipped because `.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`. [VERIFIED: .planning/config.json]

### Recommended non-Nyquist verification commands

| Scope | Command | Purpose |
|-------|---------|---------|
| Build gate | `npm run build` | Minimum whole-app Nuxt/TypeScript production build gate. [VERIFIED: package.json; VERIFIED: 04-CONTEXT.md] |
| Shared-view utility | `npx vitest run app/utils/__tests__/entriesSharedView.test.ts` | Validate query payload trust boundary and serialization safety. [VERIFIED: app/utils/__tests__/entriesSharedView.test.ts] |
| Advanced filters | `npx vitest run app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts` plus any new safety/performance tests | Validate filter restore/export and read-only behavior. [VERIFIED: existing tests] |
| Rule overlays | `npx vitest run app/composables/__tests__/useEntriesRuleOverlays.test.ts app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts` | Validate overlay metadata, lifecycle, shared-view restore, and read-only behavior. [VERIFIED: existing tests] |
| Component/page wiring | `npx vitest run app/components/entries/__tests__/EntriesEditableCell.test.ts app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts app/components/entries/__tests__/EntriesShareViewPopover.test.ts` | Lock presentational contracts, no-scope-creep source assertions, and route/query wiring. [VERIFIED: existing tests] |
| Manual browser | `npm run dev` then open `http://localhost:3100/entries` | Verify keyboard/popover/localStorage/AI/shared-view workflows in browser. [VERIFIED: package.json; VERIFIED: 04-CONTEXT.md] |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | indirectly | Use existing `/entries` auth middleware; Phase 4 must not add auth/session serialization or backend access. [VERIFIED: app/pages/entries/index.vue; VERIFIED: CLAUDE.md] |
| V3 Session Management | indirectly | Do not include session, user IDs, tokens, cookies, or secrets in shared-view payloads or tests. [VERIFIED: app/utils/__tests__/entriesSharedView.test.ts; VERIFIED: .planning/codebase/CONVENTIONS.md] |
| V4 Access Control | indirectly | Rules/filters must operate over entries already loaded through existing APIs and must not grant mutation or dialect permissions. [VERIFIED: 04-CONTEXT.md; VERIFIED: CLAUDE.md] |
| V5 Input Validation | yes | Keep formula/regex validation in `entriesAdvancedFilter` and shared-view schema/semantic validation in `decodeEntriesSharedView()`. [VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: app/utils/entriesSharedView.ts] |
| V6 Cryptography | no direct change | Do not add crypto/signing for v1 shared views; they are untrusted configuration payloads validated before use. [VERIFIED: app/utils/entriesSharedView.ts; ASSUMED] |
| V8 Data Protection | yes | Do not serialize entry data, local drafts, selected row IDs, API responses, secrets, or dirty state into URLs or localStorage for rules/views. [VERIFIED: app/utils/__tests__/entriesSharedView.test.ts; VERIFIED: 04-CONTEXT.md] |
| V10 Malicious Code | yes | Never execute formula strings as JavaScript; use whitelist parser/interpreter only. [VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: .planning/REQUIREMENTS.md] |

### Known Threat Patterns for Nuxt/Vue client-side rule overlays

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Formula payload attempts arbitrary JavaScript execution | Elevation of Privilege / Tampering | Use existing whitelist parser/evaluator; source tests should reject `eval`/`new Function` if touched. [VERIFIED: app/utils/entriesAdvancedFilter.ts; VERIFIED: .planning/REQUIREMENTS.md] |
| Regex denial of service | Denial of Service | Keep max pattern length, safe flag list, unsafe pattern check, and input slicing in `compileAdvancedRegex()`/`testAdvancedRegex()`. [VERIFIED: app/utils/entriesAdvancedFilter.ts] |
| Shared-view tampering with unsupported fields/rules/colors | Tampering | Keep strict Zod schema, version gates, semantic validation, and `colorHex` regex. [VERIFIED: app/utils/entriesSharedView.ts] |
| Secret or private data leakage through copied URL | Information Disclosure | Serialize only filter/rule configuration and assert no entries/tokens/session/draft/dirty state. [VERIFIED: app/utils/__tests__/entriesSharedView.test.ts] |
| Accidental mutation via overlay metadata | Tampering | Store metadata in separate maps and pass to `EntriesEditableCell` as props; assert no `_isDirty` or entry metadata writes. [VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: app/components/entries/EntriesEditableCell.vue; VERIFIED: existing tests] |
| Confused deputy via `view` query causing server fetch/filter changes | Spoofing / Access Control | Keep `view` separate from server-backed URL params and do not call `fetchEntries()` for `view` alone. [VERIFIED: app/pages/entries/index.vue; VERIFIED: existing shared-view wiring test] |

## Sources

### Primary (HIGH confidence)

- `CLAUDE.md` — project stack, HK Traditional Chinese rules, entries table architecture, mutation/auth conventions. [VERIFIED: Read]
- `.planning/phases/04-integration-hardening-and-ux-verification/04-CONTEXT.md` — locked Phase 4 decisions, scope, risks, and verification expectations. [VERIFIED: Read]
- `.planning/REQUIREMENTS.md` — SAFE-01 through SAFE-04 and v2/out-of-scope boundaries. [VERIFIED: Read]
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, implementation focus. [VERIFIED: Read]
- `.planning/STATE.md` — prior decisions about client-side filters, identity preservation, local draft persistence, and browser verification limitations. [VERIFIED: Read]
- `.planning/codebase/ARCHITECTURE.md`, `CONCERNS.md`, `CONVENTIONS.md`, `TESTING.md` — entries data flow, fragile workflows, conventions, testing/manual verification patterns. [VERIFIED: Read]
- `app/pages/entries/index.vue` — main integration target and current route/filter/rule/share/edit/save/draft/keyboard wiring. [VERIFIED: Read]
- `app/composables/useEntriesAdvancedFilters.ts` — advanced filter state/evaluation/export/restore. [VERIFIED: Read]
- `app/composables/useEntriesRuleOverlays.ts` — rule lifecycle/evaluation/export/restore/cell metadata. [VERIFIED: Read]
- `app/utils/entriesAdvancedFilter.ts` — formula parser/evaluator and regex helper safety boundary. [VERIFIED: Read]
- `app/utils/entriesSharedView.ts` — versioned shared-view trust boundary. [VERIFIED: Read]
- `app/components/entries/EntriesAdvancedFilterPanel.vue`, `EntriesRuleOverlayPanel.vue`, `EntriesShareViewPopover.vue`, `EntriesEditableCell.vue` — UI copy and render contracts. [VERIFIED: Read]
- Existing tests under `app/**/__tests__` — Vitest and source-level patterns for safety/page wiring. [VERIFIED: Read]
- `package.json`, `vitest.config.ts` — scripts/dependencies/test alias setup. [VERIFIED: Read]
- npm registry checks for Nuxt, Vue, Vitest, Zod, @nuxt/ui, @pinia/nuxt, Pinia, nuxt-auth-utils, opencc-js. [VERIFIED: npm registry]
- Context7 Vue docs — computed caching, watchers, and debounce examples. [CITED: github.com/vuejs/vue]
- Context7 Vitest docs — fake timers and timer advancement patterns. [CITED: github.com/vitest-dev/vitest]

### Secondary (MEDIUM confidence)

- `.planning/codebase/TESTING.md` for manual verification categories, with correction that current repo now has Vitest setup and tests. [VERIFIED: Read; VERIFIED: package.json; VERIFIED: vitest.config.ts; VERIFIED: app/**/__tests__]

### Tertiary (LOW confidence)

- Assumptions about cache key design, representative dataset size, and no need for mandatory E2E adoption are marked in the Assumptions Log. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified package.json, local environment, npm registry, existing tests, and project instructions. [VERIFIED: package.json; VERIFIED: shell; VERIFIED: npm registry; VERIFIED: CLAUDE.md]
- Architecture: HIGH — verified current entries page/composables/components and Phase 4 locked decisions. [VERIFIED: app/pages/entries/index.vue; VERIFIED: app/composables/useEntriesAdvancedFilters.ts; VERIFIED: app/composables/useEntriesRuleOverlays.ts; VERIFIED: 04-CONTEXT.md]
- Pitfalls: HIGH — pitfalls derive directly from current code loops, route watcher, localStorage behavior, and locked phase decisions. [VERIFIED: codebase; VERIFIED: 04-CONTEXT.md]
- Performance: MEDIUM-HIGH — hotspots are verified in code; exact responsiveness thresholds and dataset size are not specified. [VERIFIED: codebase; ASSUMED]
- Localization: MEDIUM-HIGH — HK Traditional requirement is verified; final language audit still needs human/source review during implementation. [VERIFIED: CLAUDE.md; ASSUMED]
- Security: HIGH for v1 safety boundaries — verified utility tests and schemas already cover many data-exclusion and input-validation controls. [VERIFIED: app/utils/entriesSharedView.ts; VERIFIED: existing tests]

**Research date:** 2026-05-05 [VERIFIED: currentDate]
**Valid until:** 2026-06-04 for current implementation guidance; re-check npm versions and current tests if package upgrades occur before implementation. [ASSUMED]
