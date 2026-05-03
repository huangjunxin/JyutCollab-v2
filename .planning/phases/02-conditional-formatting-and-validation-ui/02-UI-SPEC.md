---
phase: 02-conditional-formatting-and-validation-ui
status: ready
created: "2026-05-04T00:00:00.000Z"
requirements:
  - COND-01
  - COND-02
  - COND-03
  - COND-04
  - VALD-01
  - VALD-02
  - VALD-03
---

# Phase 02 UI Spec: Conditional Formatting and Validation UI

## Design Goal

Add a read-only rule overlay UI to the entries table so users can create named conditional formatting and validation rules, see matching cells highlighted or flagged, and manage rule order/status without changing entry data.

## Placement

- Add the rule trigger near the existing advanced filter trigger in the search/filter toolbar.
- The trigger should be compact and visually secondary to primary search/filter actions.
- Expanded rule management content should render below the whole toolbar row, not inside the flex row that contains toolbar buttons.
- Reuse the Phase 1 advanced-filter host/teleport pattern where practical so expanded content does not push later toolbar icons sideways.

## Rule Management Panel

The panel should support:

1. Creating a rule.
2. Naming a rule.
3. Choosing rule type:
   - Conditional formatting
   - Validation warning
4. Choosing condition mode:
   - Formula
   - Regex
5. Targeting one or more supported fields:
   - headword
   - dialect
   - phonetic
   - entryType
   - theme
   - definition
   - register
   - status
6. Enabling/disabling each rule.
7. Reordering rules.
8. Removing rules.

## Visual Treatment

### Conditional Formatting

- Matching cells receive a soft highlight background and border/ring treatment.
- Highlight should not obscure existing text, inline editing focus, dirty-state indicators, AI suggestion controls, or selection affordances.
- Highlighted cells should expose the matching rule name in a tooltip/title or compact metadata affordance.

### Validation Warnings

- Validation matches must look distinct from ordinary formatting highlights.
- Use warning color, border/ring, icon, and tooltip/title; do not rely on color alone.
- Validation cells should communicate that the issue is an inspection warning, not a save blocker unless future scope explicitly changes that.

## Accessibility

- Icon-only triggers need Hong Kong Traditional Chinese `aria-label` text.
- Expanded panels need stable IDs and `aria-controls`/`aria-expanded` wiring.
- Formula/regex validation errors should use `role="alert"`.
- Rule controls should have labels or accessible names.
- Warning icons should have accessible text or be hidden if duplicate text is already present.

## Copy Standard

All Chinese UI copy must use Hong Kong Traditional Chinese.

Suggested copy:

- 規則
- 條件格式
- 驗證警告
- 新增規則
- 規則名稱
- 規則類型
- 條件模式
- 公式
- 正則表達式
- 目標欄位
- 已啟用
- 已停用
- 上移
- 下移
- 移除
- 套用規則
- 清除規則
- 此規則只會標示目前已載入的詞條，不會修改資料。
- 條件格式無法套用：請檢查公式語法、欄位名稱或函數參數。
- 正則表達式無法套用：請檢查括號、轉義符號或旗標。

## Responsive Behavior

- On small screens, rule inputs stack vertically.
- On wider screens, rule type/mode/targets can sit in compact rows.
- Rule list items should remain usable on narrow screens without horizontal scrolling.

## Read-Only Contract

The UI must not:

- mutate entry fields,
- mark entries dirty,
- call save/delete/review APIs,
- trigger bulk actions,
- change backend query parameters,
- persist server-side state.

Rules are local table overlays for v1 Phase 2. Phase 3 handles shareable/restorable view state.

## Integration Contract

- Reuse Phase 1 safe formula/regex evaluation utilities.
- Evaluate against the same normalized row context used by advanced filtering.
- Pass cell-level metadata into editable cell rendering rather than altering entry objects.
- Rule results should recompute when loaded table data, relevant entry values, view mode, or rule definitions change.
- Existing plain search, advanced filtering, grouping modes, pagination, selection, inline editing, AI suggestions, and dirty-state tracking must continue working when no rules are active.
