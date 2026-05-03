# Requirements: Entries Table Excel Tools

**Defined:** 2026-05-03
**Core Value:** Users can reliably surface the exact entries or cells that need attention using safe, expressive table rules without risking accidental data mutation.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Formula Filtering

- [ ] **FORM-01**: User can enter an Excel-style formula that filters visible entries by evaluating each row to true or false.
- [ ] **FORM-02**: User sees clear validation feedback when a formula has unsupported syntax, unsupported functions, or evaluation errors.
- [ ] **FORM-03**: Formula evaluation only supports a documented whitelist of functions and operators and never executes arbitrary JavaScript.
- [ ] **FORM-04**: User can reference supported entry fields in formulas using stable field names documented in the UI.

### Regex Filtering

- [ ] **REGX-01**: User can enable regex mode in global search to match searchable entry text fields.
- [ ] **REGX-02**: User can apply a regex filter to a single table column without affecting other column filters.
- [ ] **REGX-03**: User sees clear validation feedback when a regex pattern is invalid.
- [ ] **REGX-04**: Regex matching works consistently for formula filtering, column filtering, conditional formatting, and validation rules.

### Conditional Formatting

- [ ] **COND-01**: User can create a conditional formatting rule that targets one or more table columns.
- [ ] **COND-02**: Matching cells are visually highlighted without changing the underlying entry data.
- [ ] **COND-03**: User can name rules so highlighted cells can indicate why they matched.
- [ ] **COND-04**: User can enable, disable, reorder, and remove conditional formatting rules.

### Validation Rules

- [ ] **VALD-01**: User can create a validation rule that flags cells or rows matching a formula or regex condition.
- [ ] **VALD-02**: User can distinguish validation warnings from normal conditional formatting highlights.
- [ ] **VALD-03**: Validation results update when table data, filters, or rule definitions change.

### Shareable Views

- [ ] **VIEW-01**: User can create a shareable view link that restores formula filters, regex settings, conditional formatting rules, and validation rules.
- [ ] **VIEW-02**: User can open a shared view and see the restored rules applied to the entries table.
- [ ] **VIEW-03**: User sees safe feedback when a shared view payload is invalid, unsupported, or too old.
- [ ] **VIEW-04**: Shareable view state is versioned so future rule schema changes can be handled deliberately.

### Integration and Safety

- [ ] **SAFE-01**: Formula, regex, formatting, and validation rules are read-only overlays and cannot bulk-modify entry data in v1.
- [ ] **SAFE-02**: Existing inline editing, save/submit/delete, local draft recovery, AI suggestions, keyboard navigation, column resizing, and view modes continue to work with rules enabled.
- [ ] **SAFE-03**: Rule evaluation remains responsive on typical entries table datasets and does not freeze typing or editing interactions.
- [ ] **SAFE-04**: New Chinese UI labels, errors, and help text use Hong Kong Traditional Chinese.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Saved Views

- **VIEW-05**: User can save named views to their account and access them across devices.
- **VIEW-06**: User can manage team-visible saved views with permissions.

### Advanced Spreadsheet Features

- **FORM-05**: User can use a broader Excel-compatible formula function set.
- **COND-05**: User can apply richer formatting styles beyond the v1 highlight set.
- **TEMP-01**: User can start from reusable rule templates for common dictionary cleanup checks.

### Bulk Operations

- **BULK-01**: User can preview formula/regex-matched bulk edits before applying them.
- **BULK-02**: Authorized users can apply reviewed bulk edits through existing permission and edit-history flows.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Arbitrary JavaScript formula execution | Unsafe and unnecessary for table filtering; v1 uses a whitelist interpreter. |
| Direct formula/regex bulk modification | High risk of accidental dictionary data corruption; v1 is inspection-only. |
| Replacing the entries table with a spreadsheet grid library | Would risk regressions in existing editing, AI, grouping, and review workflows. |
| Backend account-sync for saved views | User chose shareable views for v1; server-side persistence can follow after validation. |
| Changing review workflow or entry permissions | This project improves table analysis, not moderation policy. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FORM-01 | Phase 1 | Pending |
| FORM-02 | Phase 1 | Pending |
| FORM-03 | Phase 1 | Pending |
| FORM-04 | Phase 1 | Pending |
| REGX-01 | Phase 1 | Pending |
| REGX-02 | Phase 1 | Pending |
| REGX-03 | Phase 1 | Pending |
| REGX-04 | Phase 1 | Pending |
| COND-01 | Phase 2 | Pending |
| COND-02 | Phase 2 | Pending |
| COND-03 | Phase 2 | Pending |
| COND-04 | Phase 2 | Pending |
| VALD-01 | Phase 2 | Pending |
| VALD-02 | Phase 2 | Pending |
| VALD-03 | Phase 2 | Pending |
| VIEW-01 | Phase 3 | Pending |
| VIEW-02 | Phase 3 | Pending |
| VIEW-03 | Phase 3 | Pending |
| VIEW-04 | Phase 3 | Pending |
| SAFE-01 | Phase 4 | Pending |
| SAFE-02 | Phase 4 | Pending |
| SAFE-03 | Phase 4 | Pending |
| SAFE-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after roadmap creation*
