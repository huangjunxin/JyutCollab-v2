# Phase 4: Integration Hardening and UX Verification - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 hardens the Excel-style entries table tools delivered in Phases 1-3. It verifies that formula filters, regex filters, conditional formatting rules, validation rules, and shareable views remain read-only, responsive, localized in Hong Kong Traditional Chinese, and compatible with the existing `/entries` table workflows. This phase may add targeted tests, safeguards, memoization/debouncing, small UI feedback fixes, and verification artifacts, but it must not add new product scope such as backend saved views, account persistence, or formula-driven bulk edits.

</domain>

<decisions>
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

</decisions>

<specifics>
## Specific Ideas

- The user has been manually testing each phase and wants practical browser test cases. Phase 4 should turn that into a repeatable checklist rather than vague “UX verification”.
- Prior user feedback emphasized UI consistency and visible feedback. Hidden error states, mismatched toolbar icon sizes, and controls that appear clickable but do nothing should be treated as regression risks.
- Current shared-view fixes already addressed hidden invalid payload errors, stale `lastAppliedSharedView`, applied-vs-draft column regex export, strict `colorHex`, and removal of a local secrets file. Phase 4 should verify these stay fixed rather than reimplement them.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product requirements and scope
- `.planning/PROJECT.md` — Project vision, core safety value, and out-of-scope boundaries for Excel-style entries table tools.
- `.planning/REQUIREMENTS.md` — Phase 4 requirements `SAFE-01` through `SAFE-04` and v1/v2 scope separation.
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and implementation focus.

### Prior phase decisions and outputs
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md` — Phase 1 decisions for safe formula/regex language, client-side scope, row context, and read-only rule foundation.
- `.planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md` — Phase 2 rule overlay constraints, local-only/read-only UI scope, and compatibility requirements.
- `.planning/phases/03-shareable-excel-style-views/03-01-SUMMARY.md` — Shared-view serialization boundary, strict validation, and composable export/restore behavior.
- `.planning/phases/03-shareable-excel-style-views/03-02-SUMMARY.md` — Share popover UI contract and presentational behavior.
- `.planning/phases/03-shareable-excel-style-views/03-03-SUMMARY.md` — Entries page shared-view route/query wiring, copy behavior, clear-query behavior, and verification commands.

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` — Entries page data flow, API boundaries, client state, editing/save/review/AI paths.
- `.planning/codebase/CONCERNS.md` — Fragile entries-table workflows, performance bottlenecks, security concerns, and testing gaps.
- `.planning/codebase/CONVENTIONS.md` — Nuxt/Vue conventions, Hong Kong Traditional Chinese requirement, frontend composable guidance, and safety conventions.
- `.planning/codebase/TESTING.md` — Current and future testing patterns plus manual verification checklist.

### Source integration points
- `app/pages/entries/index.vue` — Main entries table orchestration, advanced filter/rule/share wiring, route watcher, keyboard/edit/save/AI integration.
- `app/composables/useEntriesAdvancedFilters.ts` — Formula/global regex/column regex state, validation, filtering, export/restore APIs.
- `app/composables/useEntriesRuleOverlays.ts` — Conditional formatting and validation rule state, evaluation, export/replace APIs, overlay style metadata.
- `app/utils/entriesAdvancedFilter.ts` — Safe parser/interpreter and regex helper boundary used by filters and rules.
- `app/utils/entriesSharedView.ts` — Versioned shared-view encode/decode/validation trust boundary.
- `app/components/entries/EntriesAdvancedFilterPanel.vue` — Advanced formula/regex UI and user-facing copy.
- `app/components/entries/EntriesRuleOverlayPanel.vue` — Rule management UI, target fields, condition mode, ordering, color picker, and validation copy.
- `app/components/entries/EntriesShareViewPopover.vue` — Share UI behavior and hidden/visible feedback considerations.
- `app/components/entries/EntriesEditableCell.vue` — Cell rendering contract for formatting/validation overlays and inline editing compatibility.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/utils/entriesAdvancedFilter.ts`: Existing whitelist formula parser/evaluator and regex compiler should remain the only formula/regex semantics path.
- `app/composables/useEntriesAdvancedFilters.ts`: Already centralizes filter state, validation, row context building, derived filtered entries/groups, and shared-view export/restore.
- `app/composables/useEntriesRuleOverlays.ts`: Already centralizes local rule lifecycle, condition evaluation, overlay metadata, rule ordering, and shared-view export/replace.
- `app/utils/entriesSharedView.ts`: Already provides strict Zod schemas, version gates, max length, base64url encoding, semantic validation, and normalized output.
- Existing Vitest tests under `app/**/__tests__`: Provide patterns for utility/composable unit tests and source-level Vue page wiring tests.

### Established Patterns
- Keep new entries-table behavior in focused composables/components rather than expanding `app/pages/entries/index.vue` unless the work is page wiring.
- Use Nuxt UI components and existing toolbar icon-only sizing patterns for any small UX fixes.
- Use Hong Kong Traditional Chinese for all Chinese UI/test strings.
- Use source-level tests sparingly for page wiring contracts that are hard to mount with the current test setup.
- Avoid adding backend routes, localStorage keys, saved-view APIs, or broad `any` casts for this phase.

### Integration Points
- The route watcher in `app/pages/entries/index.vue` is the key boundary between shared-view restore and server-backed `useEntriesList` fetch behavior.
- `buildRowContext()` and rule overlay evaluation are the likely performance hotspots because they run across currently loaded entries/rules.
- `EntriesEditableCell.vue` must continue to receive formatting metadata without mutating entry data or interfering with editing events.
- Manual verification must exercise the actual browser UI because keyboard navigation, popovers, clipboard fallback, color picker behavior, localStorage drafts, and AI suggestions are not fully covered by automated tests.

</code_context>

<deferred>
## Deferred Ideas

- Backend account-synced saved views and team-visible saved views remain v2 (`VIEW-05`, `VIEW-06`).
- Formula/regex-driven bulk modifications remain v2 and require preview, permission, and edit-history safeguards (`BULK-01`, `BULK-02`).
- Full database search/filtering remains out of Phase 4; current advanced filters/rules apply to currently loaded entries.
- Replacing the entries table with a spreadsheet/grid library remains out of scope.
- Broad refactor of the oversized entries page is useful tech debt work but should not be bundled into this hardening phase unless required for a targeted fix.
- New E2E framework adoption can be recommended, but Phase 4 should not depend on introducing Playwright/Cypress unless planning finds it low-risk and essential.

</deferred>

---

*Phase: 04-integration-hardening-and-ux-verification*
*Context gathered: 2026-05-05*
