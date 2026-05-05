# Phase 4 Discussion Log: Integration Hardening and UX Verification

**Date:** 2026-05-05
**Mode:** auto
**Chain requested:** yes

## Inputs Loaded

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-safe-formula-and-regex-filtering-foundation/01-CONTEXT.md`
- `.planning/phases/02-conditional-formatting-and-validation-ui/02-CONTEXT.md`
- `.planning/phases/03-shareable-excel-style-views/03-01-SUMMARY.md`
- `.planning/phases/03-shareable-excel-style-views/03-03-SUMMARY.md`
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/CONCERNS.md`
- `.planning/codebase/CONVENTIONS.md`
- `.planning/codebase/TESTING.md`

## Auto-Selected Gray Areas

All Phase 4 gray areas were auto-selected because `--auto` was active.

### 1. Safety regression scope

**Decision:** Lock Phase 4 to read-only hardening and regression coverage. Formula/regex/rule/shared-view code must not call mutation APIs, localStorage persistence for views/rules, backend saved-view routes, or bulk actions.

**Rationale:** This directly satisfies `SAFE-01` and preserves v1 scope. Prior phases intentionally kept Excel-style tools local and inspection-only.

### 2. Compatibility coverage

**Decision:** Verification must cover existing entries table workflows with rules enabled: flat/aggregated/lexeme modes, inline editing, save/submit/delete, local draft recovery, AI suggestions, keyboard navigation, column resizing, route search/filter behavior, and shared-view query clearing.

**Rationale:** `app/pages/entries/index.vue` is a fragile high-traffic page with many workflows in one component. Compatibility is the main value of Phase 4, not new UI scope.

### 3. Performance and responsiveness

**Decision:** Optimize targeted rule evaluation paths only. Prefer memoization/caching of row context, formula parsing, and regex compilation where needed. Do not redesign data fetching or implement full database filtering.

**Rationale:** Advanced filters/rules are scoped to currently loaded entries. Phase 4 should prevent UI freezes in typical loaded datasets without changing product scope.

### 4. Localization and visible feedback

**Decision:** Audit new Excel-tool UI copy for Hong Kong Traditional Chinese and ensure invalid states are visible outside hidden popovers when they block restore or rule application.

**Rationale:** The user previously caught UI consistency and hidden/no-op interaction issues. `SAFE-04` requires language correctness, and Phase 3 review found a hidden invalid-payload error state.

### 5. Verification deliverable

**Decision:** Phase 4 should produce a concrete manual browser verification matrix plus targeted automated checks and build verification.

**Rationale:** Automated tests do not cover the full entries table browser experience. Manual verification is explicitly in roadmap success criteria and should be repeatable.

## Deferred Ideas

- Backend/account saved views.
- Team-visible shared views.
- Full database advanced filtering.
- Formula/regex bulk edits.
- Broad entries page refactor.
- New full E2E test framework unless planning determines it is essential and low-risk.

## Output

Created `04-CONTEXT.md` with downstream implementation decisions, canonical references, existing code insights, and deferred ideas.

## Next Step

Because `--chain` is active, proceed to Phase 4 planning with `/gsd-plan-phase 4 --auto`.
