---
phase: 02-conditional-formatting-and-validation-ui
fixed_at: 2026-05-04T07:20:00Z
review_path: .planning/phases/02-conditional-formatting-and-validation-ui/02-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-04T07:20:00Z
**Source review:** .planning/phases/02-conditional-formatting-and-validation-ui/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

## Fixed Issues

### CR-01: Saved entries keep `_tempId`, breaking later edits and Save All

**Files modified:** `app/pages/entries/index.vue`
**Commit:** e2f36f6
**Applied fix:** Removed `_tempId` preservation for newly saved entries and migrated temp-id keyed transient UI state, input refs, pending suggestions, and hint maps to the server id before replacing the row. Status: fixed; requires human verification for the entry-identity state migration logic.

### WR-01: Invalid applied filter errors remain visible after disabling or clearing the invalid filter

**Files modified:** `app/composables/useEntriesAdvancedFilters.ts`
**Commit:** 0d52f3d
**Applied fix:** Added cleanup for inactive applied filter error slots during filter application and computed matching, and cleared stale runtime errors after successful formula/regex evaluation.

### WR-02: `updateDraft()` silently discards patched nested conditions

**Files modified:** `app/components/entries/EntriesRuleOverlayPanel.vue`
**Commit:** 25ae443
**Applied fix:** Updated `updateDraft()` to preserve patched `condition` values while cloning nested regex state, falling back to the current draft condition only when no condition patch is supplied.

---

_Fixed: 2026-05-04T07:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
