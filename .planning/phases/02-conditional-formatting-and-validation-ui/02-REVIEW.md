---
phase: 02-conditional-formatting-and-validation-ui
reviewed: 2026-05-04T00:00:00Z
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
  critical: 0
  warning: 4
  info: 2
  total: 6
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-04T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

Reviewed the conditional formatting, validation warning, advanced filter UI, rule overlay composable, entry table wiring, and associated tests/configuration. No critical security issue was found, but there are functional defects in grouped-view keyboard focus handling and unsaved-change handling after filters are applied. There are also robustness gaps around grouped-view counts/new-row duplication and rule color validation.

## Warnings

### WR-01: Grouped-view keyboard focus uses entry indices as table row indices

**File:** `app/pages/entries/index.vue:450,501-562,1381-1382,1957-2047`

**Issue:** Rendering and inline hint rows compare `focusedCell.rowIndex` with the `tableRows` loop index (`rowIndex`), but keyboard navigation now treats the same value as an index into `visibleKeyboardEntries`, which excludes group header rows. In grouped or lexeme view, every expanded group inserts a `group` row into `tableRows`, so moving with Arrow/Tab/Enter can select or activate the wrong visual row, and AI/Jyutdict/duplicate/reference hint rows can appear under the wrong entry.

**Fix:** Store one row-index coordinate consistently. For example, keep keyboard navigation in table-row coordinates and skip non-entry rows when moving vertically:

```ts
function findNextEntryTableRow(startIndex: number, direction: -1 | 1): number {
  let nextIndex = startIndex
  while (nextIndex + direction >= 0 && nextIndex + direction < tableRows.value.length) {
    nextIndex += direction
    if (tableRows.value[nextIndex]?.type === 'entry') return nextIndex
  }
  return startIndex
}

const row = tableRows.value[rowIndex]
const currentEntry = row?.type === 'entry' ? row.entry : undefined
```

Then pass table-row indices to `handleCellClick`, or alternatively convert `visibleEntryRows` back to their original table row indices before assigning `focusedCell`.

### WR-02: Advanced filters can hide dirty rows from unsaved-change detection and Save All

**File:** `app/pages/entries/index.vue:1402-1406,1530-1531,2231-2235`

**Issue:** `currentPageEntries` is now derived from `filteredEntries`/`displayGroups`. `hasUnsavedChanges` and `saveAllChanges()` both depend on `currentPageEntries`, so a dirty row that does not match an active advanced filter disappears from the unsaved-change banner and is omitted from Save All. This creates a data-loss risk because users can make edits, apply a filter that hides them, then navigate away believing there are no unsaved changes.

**Fix:** Separate the list used for visible selection from the list used for persistence state. Keep selection on filtered rows if intended, but compute unsaved changes and Save All from all loaded page entries/groups:

```ts
const allLoadedPageEntries = computed(() => {
  if (viewMode.value === 'flat') return entries.value
  const groups = viewMode.value === 'lexeme' ? lexemeGroups.value : aggregatedGroups.value
  return [...entries.value.filter(e => (e as any)._isNew), ...groups.flatMap(g => g.entries)]
})

const hasUnsavedChanges = computed(() =>
  allLoadedPageEntries.value.some(e => e._isDirty || (e as any)._isNew)
)

const dirtyEntries = allLoadedPageEntries.value.filter(e => e._isDirty && !(e as any)._isNew)
```

### WR-03: Unsaved rows can be duplicated in grouped views and are excluded from filter counts

**File:** `app/pages/entries/index.vue:1349-1364`; `app/composables/useEntriesAdvancedFilters.ts:66-70,117-122`

**Issue:** Grouped display prepends `_isNew` rows from `filteredEntries` as standalone groups and then appends `filteredAggregatedGroups`/`filteredLexemeGroups`. If a new entry is also present in the grouped data source, it can appear twice. Separately, `loadedEntryCount` and `visibleEntryCount` in grouped modes count only grouped data, while `displayGroups` can add extra `_isNew` rows from `filteredEntries`; the advanced-filter badge and empty-state logic can therefore report stale counts or claim there are zero visible entries while an unsaved row is rendered.

**Fix:** Use one normalized grouped source for both rendering and counts. Either inject unsaved rows into the grouped data before filtering/counting, or de-duplicate `newOnes` against the base group entries by entry key:

```ts
const groupedEntryKeys = new Set(base.flatMap(group => group.entries.map(entry => String(getEntryKey(entry)))))
const newOnes = filteredEntries.value
  .filter(e => (e as any)._isNew && !groupedEntryKeys.has(String(getEntryKey(e))))
  .map(e => ({ /* group */ entries: [e] }))
```

Also compute `loadedEntryCount`/`visibleEntryCount` from the same display dataset that the table renders.

### WR-04: Rule overlay metadata is keyed only by entry id and can collide for local rows

**File:** `app/composables/useEntriesRuleOverlays.ts:239,334-336`; `app/pages/entries/index.vue:2051-2056`

**Issue:** `cellOverlayMetaByEntryKey` writes metadata with `metaByEntryKey.set(getEntryIdString(entry), fieldMetaMap)` and `getCellOverlayMeta()` reads by the same key. New rows are created with `id: new-${Date.now()}` and `_tempId: new-${Date.now()}`. Two rows created in the same millisecond, or any duplicated local/server ids in the visible list, will share one metadata map; the later row overwrites the earlier row and both cells can show the wrong formatting/validation result.

**Fix:** Ensure local ids are collision-resistant and use the same keying strategy throughout table state. Prefer `crypto.randomUUID()` for client-only rows and use `getEntryKey(entry)` or a key that includes `_tempId` fallback consistently:

```ts
const tempId = `new-${crypto.randomUUID()}`
const newEntry = {
  _tempId: tempId,
  id: tempId,
  // ...
}
```

For overlay metadata, avoid overwriting silently by keying from the exact rendered row identity or by retaining metadata on a per-row structure rather than a `Map` keyed only by id.

## Info

### IN-01: Rule color strings are not validated at the composable boundary

**File:** `app/composables/useEntriesRuleOverlays.ts:144-150,325-327`; `app/components/entries/EntriesRuleOverlayPanel.vue:727-729`

**Issue:** `updateRuleColor()` accepts any string and `createCellOverlayMeta()` interpolates that value into CSS colors. The normal UI path uses a color picker, but the composable API itself does not enforce the expected hex format, making invalid or unexpected styles possible from another caller or future UI change.

**Fix:** Validate before storing/emitting colors, for example accept only `#[0-9a-fA-F]{6}` and fall back to `DEFAULT_STYLE_COLOR` for invalid values.

### IN-02: `updateDraft()` silently discards patched nested conditions

**File:** `app/components/entries/EntriesRuleOverlayPanel.vue:714-724`

**Issue:** `updateDraft()` spreads `patch` and then unconditionally overwrites `condition` with the existing `props.draftRule.condition`. Current condition edits use `updateDraftCondition()`/`updateDraftRegex()`, so this is latent, but any future call to `updateDraft({ condition: ... })` will appear to work at the call site while silently dropping the nested update.

**Fix:** Preserve a patched condition if one is provided:

```ts
condition: patch.condition
  ? { ...patch.condition, regex: { ...patch.condition.regex } }
  : {
      kind: props.draftRule.condition.kind,
      formula: props.draftRule.condition.formula,
      regex: { ...props.draftRule.condition.regex }
    }
```

---

_Reviewed: 2026-05-04T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
