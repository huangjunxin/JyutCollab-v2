---
phase: 04
slug: integration-hardening-and-ux-verification
status: approved
shadcn_initialized: false
preset: none
created: 2026-05-05
reviewed_at: 2026-05-05
---

# Phase 04 — UI Design Contract

## Phase Goal and UI Boundary

Harden the existing Excel-style entries table tools so formula filters, regex filters, conditional formatting rules, validation rules, and shared views remain read-only, responsive, visibly recoverable from errors, and localized in Hong Kong Traditional Chinese.

This is not a redesign. Phase 04 may add targeted visible feedback, accessibility fixes, toolbar/panel consistency fixes, and manual verification UI/UX expectations. It must not change the entries table information architecture, introduce a new grid, or add new product workflows.

## Design System

| Property | Contract |
|----------|----------|
| UI stack | Nuxt UI primitives with Tailwind utilities |
| shadcn | None; do not initialize shadcn |
| Registry | No third-party UI registries or blocks |
| Icons | Preserve existing Iconify Heroicons patterns |
| Color system | Preserve existing Nuxt UI/Tailwind colors; do not add a custom palette |
| Chinese text | All user-facing Chinese copy must be Hong Kong Traditional Chinese |

## Existing Visual Contracts to Preserve

1. Icon-only toolbar buttons for advanced filters, rules, share, or utility actions use exactly this density contract: `h-8 w-8 justify-center p-0` with Nuxt UI button sizing/variants already used in prior phases.
2. Expanded advanced filter, rule, and hardening feedback panels render below the toolbar row, not inline inside the toolbar flex row.
3. Use existing Nuxt UI primitives: `UButton`, `UTooltip`, `UAlert`, `UBadge`, `UInput`, `USelectMenu`, `UPopover`, and existing panel/card shells.
4. Do not introduce a custom color palette. Preserve existing conditional-format colors and the existing `UColorPicker` for rule color choice.
5. Invalid shared-view payloads must show a visible alert below the toolbar or near the affected table area. The user must not need to open the share popover to discover the failure.
6. Controls that are visible must either perform their action, be disabled with a readable reason, or be removed. No hidden/no-op interactions.

## Spacing and Typography

Preserve prior phase density. Primary visual anchor is the affected toolbar/panel error or verification status region; the existing entries table remains the dominant working surface.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/text gaps, inline status gaps |
| sm | 8px | Toolbar gaps, compact form row gaps |
| md | 16px | Panel padding, alert padding |
| lg | 24px | Stacked panel sections only |
| xl | 32px | Empty/checklist section spacing only |

Typography uses exactly the existing four-size contract: 12px label, 14px body, 18px section heading, 24px page display; weights 400 and 600 only. 14px body text uses the existing Nuxt UI/Tailwind default line-height; do not introduce custom line-height tokens. Do not add new font families or weights.

## Color Contract

| Role | Contract |
|------|----------|
| Dominant 60% | Existing white / dark gray table and toolbar surfaces |
| Secondary 30% | Existing neutral gray borders, cards, helper panels, and metadata blocks |
| Accent 10% | Existing Nuxt UI primary only for primary CTAs, active/restored badges, and focus rings |
| Error | Existing Nuxt UI error/red for invalid formula, invalid regex, invalid shared payload, unsupported version, too-large payload, and invalid rule color |
| Warning | Existing warning/amber for validation warnings only |

Accent is reserved for active filter/rule/share state, primary copy/apply actions, and focus styling. Do not use accent for all helper text, all toolbar icons, or validation warnings.

## Required Hong Kong Traditional Chinese Copy

Use these exact user-facing strings unless interpolation is required.

| State / Label | Copy |
|---------------|------|
| Phase verification label | UX 驗證清單 |
| Verification status: passed | 已通過 |
| Verification status: failed | 未通過 |
| Verification status: blocked | 受環境限制 |
| Verification limitation label | 限制／備註 |
| Read-only helper | 公式、正則、格式和驗證規則只會標示或篩選目前已載入的詞條，不會修改資料。 |
| Invalid formula | 公式無法套用：{message} 請檢查公式語法、欄位名稱或函數參數。 |
| Invalid regex | 正則表達式無法套用：{message} 請檢查括號、轉義符號或旗標。 |
| Invalid shared view | 分享視圖無法套用：{reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。 |
| Unsupported shared version | 此分享視圖版本未受支援。請使用較新的連結，或重新複製目前視圖。 |
| Too-old shared version | 此分享視圖版本太舊，無法安全還原。請重新建立分享連結。 |
| Too-large shared payload | 分享視圖資料太長，無法安全還原。請減少規則數量後再試。 |
| Invalid rule color | 規則顏色無效。請使用色彩選擇器重新選擇顏色。 |
| Clear share parameter | 清除分享參數 |
| Clear share helper | 只會移除網址中的分享參數，不會清除目前表格資料。 |
| Clipboard fallback | 無法複製連結。請手動複製下方網址。 |
| No-op prevention tooltip | 此操作目前不可用，請先完成必要設定。 |
| Manual test data hint | 可使用「檢查」、「香港」、「廣州」、「粵語詞條」作為測試內容。 |
| Destructive confirmation | 無。Phase 04 不新增任何破壞性操作。 |

## Error Feedback Contract

1. Invalid formula, invalid regex, invalid shared-view payload, unsupported shared-view version, too-large shared payload, and invalid rule color must be visible without opening a hidden popover.
2. Use `UAlert color="error" variant="subtle"` or an equivalent existing Nuxt UI alert pattern for page/panel-level errors.
3. Inline field errors appear directly below the affected input and must not clear existing valid table results.
4. Invalid shared-view restore fails before applying state. Existing table data, drafts, selected rows, route-backed filters, and local preferences remain intact.
5. Error actions must be explicit: clear only the invalid `view` query parameter when the action says `清除分享參數`.

## Accessibility Requirements

- Error alerts for failed apply/restore use `role="alert"` or assertive live-region behavior.
- Icon-only buttons must have Hong Kong Traditional Chinese `aria-label` values and matching tooltips.
- Expanded panels expose `aria-expanded` and `aria-controls` where the trigger controls a panel.
- Clipboard fallback URL remains readable and selectable by mouse and keyboard; use a readonly input or selectable bordered text block, not truncated-only text.
- Do not rely on color alone: validation warnings need icon/text/title; active shared state needs badge text; errors need written copy.
- Existing table keyboard handlers must not intercept typing, selection, Tab, Enter, Escape, or arrow keys while focus is inside toolbar, panel, popover, alert action, or fallback URL controls.
- Preserve focus outlines and existing Nuxt UI focus rings.

## Toolbar and Panel Interaction Contract

1. Toolbar trigger order remains consistent with Phases 01-03: search/server filters first, Excel-style tool triggers grouped together, utility controls after them where practical.
2. Opening one expanded panel must not push toolbar icons sideways. Panels render below the toolbar in the established seam.
3. Apply/restore actions are deterministic and immediate. Do not debounce explicit Apply, Restore, Copy, or Clear actions.
4. Debounce only expensive live validation/preview if needed; visible state must not feel delayed after an explicit user action.
5. Disabled controls show a tooltip or helper reason. No click target may silently do nothing.
6. Copy failure keeps the share popover/panel usable and reveals the selectable fallback URL.

## Read-Only Safety Contract

The Excel-style tools must not:

- mutate `Entry` fields,
- mark entries dirty,
- create or overwrite local drafts,
- change selected rows,
- call save, submit, delete, review, history, AI, upload, admin, or bulk mutation APIs,
- write rule/view configuration to backend or localStorage,
- serialize entry data, draft data, selected row IDs, user/session data, tokens, API responses, or secrets into URLs.

Cell overlays remain metadata passed into rendering. Do not store overlay metadata on entry objects.

## Manual Browser Verification Matrix Contract

Phase 04 must include or produce a manual browser verification matrix with these columns:

| Column | Required content |
|--------|------------------|
| ID | Stable ID such as `UAT-FORM-01` |
| Area | Formula, regex, rules, share, keyboard, editing, or view modes |
| Setup | Required browser route, data, auth, and environment state |
| Steps | Concrete user steps in `/entries` |
| Expected Result | Visible UI behavior and safety outcome |
| Status | `已通過`, `未通過`, or `受環境限制` |
| Limitations | Missing credentials/session/data/AI/clipboard notes |

Minimum required rows:

| ID | Area | Contract |
|----|------|----------|
| UAT-FORM-01 | Formula golden path | Apply a valid formula against loaded entries; table filters without mutation. |
| UAT-FORM-02 | Invalid formula | Invalid formula shows visible HK Traditional error and table remains usable. |
| UAT-REGX-01 | Global regex | Regex search matches loaded entry display text consistently. |
| UAT-REGX-02 | Column regex | Column regex affects only the selected field. |
| UAT-REGX-03 | Invalid/unsafe regex | Invalid or unsafe regex shows visible error without freezing. |
| UAT-RULE-01 | Conditional formatting | Matching cells highlight without dirty state or save indicator. |
| UAT-RULE-02 | Validation warning | Warning styling is distinct from formatting and includes icon/text/title. |
| UAT-RULE-03 | Rule ordering | Reorder/toggle/delete rules updates overlays and does not change entry data. |
| UAT-RULE-04 | Invalid color | Invalid rule color shows visible error and can be corrected via `UColorPicker`. |
| UAT-SHARE-01 | Copy/restore | Copied link restores supported filters/rules after validation. |
| UAT-SHARE-02 | Invalid payload | `/entries?view=not-valid` shows visible alert and does not apply state. |
| UAT-SHARE-03 | Too-old/unsupported/too-large | Each payload failure has specific visible HK Traditional copy. |
| UAT-SHARE-04 | Clipboard fallback | When copy fails, fallback URL is readable, selectable, and keyboard accessible. |
| UAT-KEY-01 | Keyboard navigation | Arrow, Enter, Tab, Escape table behavior works with rules enabled. |
| UAT-EDIT-01 | Inline editing | Edit, cancel, save one row, save all, duplicate checks, and dirty state match baseline with rules enabled. |
| UAT-EDIT-02 | Draft recovery | Local draft recovery survives active rules and clearing the share query. |
| UAT-VIEW-01 | Flat mode | Flat mode works with advanced filters/rules enabled and disabled. |
| UAT-VIEW-02 | Aggregated mode | Aggregated groups expand/edit correctly with active filters/rules. |
| UAT-VIEW-03 | Lexeme mode | Lexeme groups expand/edit correctly with active filters/rules. |
| UAT-AI-01 | AI compatibility | AI suggestion accept/dismiss remains unchanged with rules enabled; record `受環境限制` if credentials are missing. |
| UAT-PERF-01 | Responsiveness | Typing in filters, editing cells, switching modes, toggling/reordering rules, and restoring shared views show no visible freeze on typical loaded data. |
| UAT-LOC-01 | Localization | New Excel-tool labels, errors, helper text, tooltips, alerts, and verification copy use Hong Kong Traditional Chinese. |

## Out of Scope

Do not build:

- saved views,
- backend persistence or account/team sync for views,
- localStorage persistence for rule/view configuration,
- bulk edits or formula/regex-driven mutation previews,
- new destructive rule actions,
- replacement spreadsheet/grid library,
- redesign of the entries table,
- changes to moderation, review workflow, dialect permissions, or entry schemas.

## Source Decisions Used

| Source | Decisions Used |
|--------|----------------|
| `04-CONTEXT.md` | Phase boundary, read-only safety, compatibility, visible feedback, HK Traditional copy, manual verification requirements, deferred scope. |
| `04-RESEARCH.md` | Nuxt UI stack, performance/UX risks, manual verification matrix structure, safety boundaries, no new packages. |
| `.planning/ROADMAP.md` | Phase 04 goal, success criteria, implementation focus. |
| `.planning/REQUIREMENTS.md` | SAFE-01 through SAFE-04 and v2/out-of-scope separation. |
| Prior UI specs | Toolbar density, below-toolbar panels, Nuxt UI primitives, color/typography/spacing contracts, shared-view feedback behavior. |
| `CLAUDE.md` | Nuxt/Vue/@nuxt/ui stack and Hong Kong Traditional Chinese requirement. |

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: pending
- [ ] Dimension 2 Visuals: pending
- [ ] Dimension 3 Color: pending
- [ ] Dimension 4 Typography: pending
- [ ] Dimension 5 Spacing: pending
- [ ] Dimension 6 Registry Safety: pending

**Approval:** pending checker review
