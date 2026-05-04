---
phase: 02-conditional-formatting-and-validation-ui
fixed_at: 2026-05-04T05:25:10Z
review_path: .planning/phases/02-conditional-formatting-and-validation-ui/02-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-04T05:25:10Z
**Source review:** .planning/phases/02-conditional-formatting-and-validation-ui/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: Grouped-view keyboard focus uses entry indices as table row indices

**Files modified:** `app/pages/entries/index.vue`
**Commit:** 6696fbb
**Applied fix:** Kept keyboard focus coordinates aligned with rendered table rows, added helpers to resolve entry rows, and skipped group header rows during arrow/tab navigation and cell activation.

### WR-02: Advanced filters can hide dirty rows from unsaved-change detection and Save All

**Files modified:** `app/pages/entries/index.vue`
**Commit:** a9db220
**Applied fix:** Split visible filtered entries from persistence state and made unsaved-change detection plus Save All scan all loaded page entries, including rows hidden by advanced filters.

### WR-03: Unsaved rows can be duplicated in grouped views and are excluded from filter counts

**Files modified:** `app/pages/entries/index.vue`, `app/composables/useEntriesAdvancedFilters.ts`
**Commit:** c619a5c
**Applied fix:** De-duplicated local new rows against grouped entries before rendering standalone groups and updated grouped advanced-filter counts to include the same ungrouped new rows rendered by the table.

### WR-04: Rule overlay metadata is keyed only by entry id and can collide for local rows

**Files modified:** `app/pages/entries/index.vue`, `app/composables/useEntriesRuleOverlays.ts`
**Commit:** 17c2051
**Applied fix:** Generated collision-resistant local entry ids with `crypto.randomUUID()` fallback and keyed overlay metadata with the shared entry key helper instead of an id-only path.

---

_Fixed: 2026-05-04T05:25:10Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
