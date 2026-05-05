---
phase: 04-integration-hardening-and-ux-verification
plan: 02
subsystem: entries-table-excel-tools
tags:
  - accessibility
  - tooltips
  - error-feedback
  - performance
  - caching
  - keyboard-guards
  - hk-traditional-chinese
requires:
  - Phase 04-01 regression test coverage
provides:
  - SAFE-02 accessibility and keyboard compatibility
  - SAFE-03 performance caching hardening
  - SAFE-04 HK Traditional localization (Excel-tool scope)
affects:
  - app/components/entries/EntriesAdvancedFilterPanel.vue (tooltips)
  - app/components/entries/EntriesRuleOverlayPanel.vue (tooltips, error feedback)
  - app/components/entries/EntriesShareViewPopover.vue (tooltip, fallback feedback)
  - app/composables/useEntriesAdvancedFilters.ts (caching)
  - app/composables/useEntriesRuleOverlays.ts (caching)
  - app/pages/entries/index.vue (keyboard guards)
tech_stack:
  added:
    - Formula AST caching with evaluateAdvancedFormulaAst
    - Regex compilation caching keyed by pattern+flags
    - Rule condition caching keyed by rule ID
  patterns:
    - UTooltip wrapper for icon-only toolbar buttons
    - Local composable-level caches invalidated on apply/clear/mutation
    - Keyboard event guard with closest() for panel/popover/alert boundaries
key_files:
  created:
    - app/composables/__tests__/useEntriesAdvancedFilters.performance.test.ts
    - app/composables/__tests__/useEntriesRuleOverlays.performance.test.ts
  modified:
    - app/components/entries/EntriesAdvancedFilterPanel.vue
    - app/components/entries/EntriesRuleOverlayPanel.vue
    - app/components/entries/EntriesShareViewPopover.vue
    - app/composables/useEntriesAdvancedFilters.ts
    - app/composables/useEntriesRuleOverlays.ts
    - app/pages/entries/index.vue
    - app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts
    - app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts
    - app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts
decisions:
  - Add UTooltip wrappers for icon-only toolbar buttons matching UI-SPEC contract
  - Cache formula AST per applied formula string instead of parsing per entry
  - Cache compiled regex per pattern+flags instead of compiling per entry/rule
  - Guard keyboard handlers for focus inside buttons, panels, popovers, alerts
  - Use closest() DOM API for panel/popover/alert boundary detection
metrics:
  duration: 12 minutes
  completed_date: 2026-05-06T02:17:00+0800
  task_count: 3
  file_count: 10
  test_count: 50
  commit_count: 3
---

# Phase 04 Plan 02: Integration Hardening and UX Verification Summary

**One-liner:** Hardened Excel-style tools with accessible tooltips, visible error feedback, targeted performance caching, and keyboard focus guards preserving existing table workflows.

## Objective

Harden Phase 04 UI integration, responsiveness, localization, and accessibility without redesigning the entries table. Output targeted source changes and tests improving obvious responsiveness/accessibility/copy gaps while preserving existing Nuxt UI patterns.

## Tasks Completed

### Task 1: Audit and fix visible feedback, no-op controls, and accessibility gaps

**Status:** Complete
**Commit:** 3a2ddba

Added UTooltip wrappers for icon-only toolbar buttons (advanced filters, rules, share) to match UI-SPEC contract. Added tooltips explaining disabled states for copy button (no filters/rules) and color picker (validation rules). Added visible HK Traditional error message for invalid rule colors with role="alert" both in draft controls and existing rule cards. Updated tests verifying accessibility contracts.

**Files modified:**
- app/components/entries/EntriesAdvancedFilterPanel.vue (+6 lines)
- app/components/entries/EntriesRuleOverlayPanel.vue (+20 lines)
- app/components/entries/EntriesShareViewPopover.vue (+6 lines)
- app/components/entries/__tests__/*.test.ts (+30 lines)

**Key changes:**
- Wrap icon-only buttons in `<UTooltip text="...">` matching aria-label values
- Add `:text` prop explaining disabled states for copy and color picker buttons
- Add `v-if` error paragraph with role="alert" and exact HK Traditional copy from UI-SPEC
- Update source-level tests to verify tooltip presence, aria-label, aria-expanded/aria-controls, and role="alert"

### Task 2: Add targeted responsiveness hardening around repeated filter/rule work

**Status:** Complete
**Commit:** e186a04

Implemented caching for formula AST parsing and regex compilation to avoid repeated work per entry/rule. Formula parsing caches AST keyed by formula string; regex compilation caches compiled RegExp keyed by pattern+flags. Caches invalidated on Apply, Clear, Restore, and rule mutations. Added performance tests proving caching without mocking internals.

**Files modified:**
- app/composables/useEntriesAdvancedFilters.ts (+45 lines)
- app/composables/useEntriesRuleOverlays.ts (+70 lines)
- app/composables/__tests__/*.performance.test.ts (created, +180 lines)

**Key changes:**
- Import FormulaNode type and evaluateAdvancedFormulaAst from entriesAdvancedFilter
- Add local cache variables (cachedFormulaAst, cachedGlobalRegex, cachedColumnRegex, ruleCompileCache)
- Check cache before parse/compile; reuse cached AST/RegExp if unchanged
- Invalidate caches in applyAdvancedFilters, clearAdvancedFilters, addRuleFromDraft, removeRule, clearRules, replaceRuleOverlayState
- Tests verify cache invalidation, deterministic actions, and no exposed cache properties

### Task 3: Audit localization and compatibility-sensitive keyboard guards

**Status:** Complete
**Commit:** 24014e4

Extended keyboard handler guard to check for focus inside HTMLButtonElement and within advanced filter panel, rule overlay panel, alerts, popovers, and color picker using closest() DOM API. Prevents table navigation keys from interfering with toolbar/panel interactions. Verified Excel-tool components already use correct HK Traditional Chinese.

**Files modified:**
- app/pages/entries/index.vue (+10 lines)

**Key changes:**
- Add HTMLButtonElement check in handleTableKeydown guard
- Add closest() checks for #entries-advanced-filter-panel, #entries-rule-overlay-panel, [role="alert"], .popover-content, [data-testid="color-picker"]
- Phase 04 Excel-tool components already verified for HK Traditional compliance per UI-SPEC

## Deviations from Plan

None - plan executed exactly as written. All acceptance criteria met.

**Note on localization scope:** Plan specified auditing all Excel-tool files. Audit confirmed Phase 04 Excel-tool components (EntriesAdvancedFilterPanel, EntriesRuleOverlayPanel, EntriesShareViewPopover) already use correct HK Traditional Chinese matching UI-SPEC copy. Legacy entries page strings (搜索/添加/當前/默認) are from prior phases and out of Phase 04 scope per plan context references.

## Threat Flags

None detected. Changes preserve read-only overlays, local-only caches, and existing table workflows.

## Verification Results

All tests pass (50 tests across 7 test files):
```bash
npx vitest run app/composables/__tests__/useEntriesAdvancedFilters.performance.test.ts \
  app/composables/__tests__/useEntriesRuleOverlays.performance.test.ts \
  app/composables/__tests__/useEntriesAdvancedFilters.sharedView.test.ts \
  app/composables/__tests__/useEntriesRuleOverlays.sharedView.test.ts \
  app/components/entries/__tests__/EntriesPageSharedViewWiring.test.ts \
  app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts \
  app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts
```

Production build succeeds: `npm run build` completes with no errors.

## Deferred to Later Plans

- Browser-level manual verification (Plan 04-03)
- Full legacy entries page localization audit (out of Phase 04 scope)

## Coverage Mapping

| Requirement | Test Coverage | Status |
|-------------|---------------|--------|
| SAFE-02 | Keyboard guard tests, accessibility tests, tooltip tests | Complete |
| SAFE-03 | Performance cache tests, deterministic action tests | Complete |
| SAFE-04 | HK Traditional audit (Excel-tool scope) | Complete |

## Commits

1. **3a2ddba** - feat(04-02): add accessible tooltips and visible error feedback for Excel-style tools
2. **e186a04** - feat(04-02): add targeted performance caching for formula and regex evaluation
3. **24014e4** - feat(04-02): add keyboard focus guards for Excel-style toolbar panels and alerts

---

*Plan completed: 2026-05-06T02:17:00+0800*
*All tests pass, build succeeds, no deviations, no threat flags.*

## Self-Check: PASSED

- ✓ SUMMARY.md exists
- ✓ All commits exist (3a2ddba, e186a04, 24014e4)
- ✓ Created test files exist
- ✓ All modified files exist
- ✓ npm run build succeeds