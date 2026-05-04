---
phase: 02-conditional-formatting-and-validation-ui
reviewed: 2026-05-04T06:53:43Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - app/components/entries/__tests__/EntriesEditableCell.test.ts
  - app/components/entries/__tests__/EntriesPageRuleOverlayWiring.test.ts
  - app/components/entries/__tests__/EntriesRuleOverlayPanel.test.ts
  - app/components/entries/EntriesAdvancedFilterPanel.vue
  - app/components/entries/EntriesEditableCell.vue
  - app/components/entries/EntriesRuleOverlayPanel.vue
  - app/composables/__tests__/useEntriesRuleOverlays.test.ts
  - app/composables/useEntriesAdvancedFilters.ts
  - app/composables/useEntriesRuleOverlays.ts
  - app/pages/entries/index.vue
  - package.json
  - vitest.config.ts
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-04T06:53:43Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the reworked conditional-formatting and validation overlay UI, advanced-filter composable, entries-page wiring, tests, and Vitest configuration. The previous grouped-row navigation, hidden dirty-row, new-row count, and local ID collision issues are partially or fully addressed, but the current implementation introduces a data-loss regression for newly saved rows and leaves stale filter errors visible after users clear invalid applied filters. There are also robustness gaps around color validation and the panel draft update helper.

## Critical Issues

### CR-01: Saved entries keep `_tempId`, breaking later edits and Save All

**File:** `app/pages/entries/index.vue:2202-2208`

**Issue:** After saving a new row, the server response is stored with the real `id`, but the old `_tempId` is deliberately preserved. `getEntryKey()` always returns `id` before `_tempId`, so rendering/focus now keys the row by the real id, while `setInputRef()` and `editingCell.entryId` can still use the preserved `_tempId` on existing input refs and blur handlers from before the save. A subsequent edit/save path can fail to find the row or remove the wrong local-storage draft key, leaving a visually saved row with unsaved local state that cannot be reliably persisted. This is a data-loss risk after creating a new entry and immediately continuing inline edits.

**Fix:** Do not preserve `_tempId` once the server id exists. If DOM key stability is still needed during the replacement, add a separate render-only key that is not used by `getEntryKey()`/persistence identity, and migrate any maps that still reference the temp id to the real id before dropping `_tempId`:

```ts
const saved = { ...response.data, _isNew: false, _isDirty: false } as unknown as Entry
// migrate temp-id keyed transient maps here
entries.value[index] = saved
removeEntryFromLocalStorage(prev?._tempId || '')
setBaselineForEntry(saved)
```

## Warnings

### WR-01: Invalid applied filter errors remain visible after disabling or clearing the invalid filter

**File:** `app/composables/useEntriesAdvancedFilters.ts:82-110,190-199`

**Issue:** `matchEntry()` mutates `advancedFilterErrors` when an already-applied formula/regex becomes invalid at runtime, but `applyAdvancedFilters()` only clears errors before validation and never clears errors produced during subsequent computed filtering. For example, an applied global regex error can remain displayed after the user disables global regex and applies a valid formula/column filter, because `validateAdvancedFilterInputs()` skips disabled global regex without resetting `advancedFilterErrors.globalRegex`. The UI can show stale blocking-looking errors for filters that are no longer active.

**Fix:** Clear inactive/applied error slots as part of applying and evaluating filters. For example, after copying applied values, explicitly null each error whose corresponding applied filter is inactive, and avoid leaving stale errors from `matchEntry()`:

```ts
appliedFormula.value = formulaInput.value
appliedGlobalRegex.value = globalRegexInput.value
appliedColumnRegex.field = columnRegex.field
appliedColumnRegex.pattern = columnRegex.pattern
appliedColumnRegex.flags = columnRegex.flags

if (!hasAppliedFormula.value) advancedFilterErrors.formula = null
if (!hasAppliedGlobalRegex.value) advancedFilterErrors.globalRegex = null
if (!hasAppliedColumnRegex.value) advancedFilterErrors.columnRegex = null
```

### WR-02: `updateDraft()` silently discards patched nested conditions

**File:** `app/components/entries/EntriesRuleOverlayPanel.vue:714-724`

**Issue:** `updateDraft()` spreads the caller's `patch`, then unconditionally overwrites `condition` with `props.draftRule.condition`. Current condition controls happen to use `updateDraftCondition()`/`updateDraftRegex()`, but this helper is a public local abstraction used by multiple computed setters. A future call such as `updateDraft({ condition: nextCondition })` will appear to succeed at the call site while silently dropping the condition change, producing incorrect rules or saving a stale formula/regex.

**Fix:** Preserve a patched condition when present and deep-clone nested regex fields:

```ts
function updateDraft(patch: Partial<EntriesRuleDraft>) {
  const condition = patch.condition
    ? { ...patch.condition, regex: { ...patch.condition.regex } }
    : {
        kind: props.draftRule.condition.kind,
        formula: props.draftRule.condition.formula,
        regex: { ...props.draftRule.condition.regex }
      }

  emit('update:draftRule', {
    ...props.draftRule,
    ...patch,
    targetFields: [...(patch.targetFields ?? props.draftRule.targetFields)],
    condition
  })
}
```

## Info

### IN-01: Rule color strings are not validated at the composable boundary

**File:** `app/composables/useEntriesRuleOverlays.ts:144-150,325-327`; `app/components/entries/EntriesRuleOverlayPanel.vue:223,570`

**Issue:** `updateRuleColor()` accepts and stores any string, and `createCellOverlayMeta()` interpolates that value into inline CSS color properties. The normal UI path uses `UColorPicker`, but the composable API does not enforce the expected hex format, so future callers or malformed emitted values can produce invalid or unexpected styles.

**Fix:** Validate colors before storing or emitting them. Accept only `#[0-9a-fA-F]{6}` and fall back to the preset/default color for invalid values.

### IN-02: Scoped test command cannot run through package scripts

**File:** `package.json:5-11`

**Issue:** The repository includes Vitest tests and `vitest.config.ts`, but `package.json` has no `test` script. Running the scoped review tests with `npm test -- --run ...` fails with `Missing script: "test"`, which makes the new tests less discoverable for maintainers and CI configuration.

**Fix:** Add a script that delegates to Vitest, for example:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

---

_Reviewed: 2026-05-04T06:53:43Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
