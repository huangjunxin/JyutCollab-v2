# Feature Research: Entries Table Excel Tools

## Table Stakes for v1

### Formula Filtering

- Excel-style formula input for filtering visible entries.
- Safe supported subset with documented functions and operators.
- Clear parse/runtime errors that do not break the table.
- Formula result must evaluate to a boolean for filtering rules.

### Regular Expressions

- Global search can run in regex mode across searchable text fields.
- Single-column filters can use regex against that column's display value.
- Conditional formatting can use regex as a match condition.
- Validation rules can use regex to flag invalid or suspicious cell values.

### Conditional Formatting

- Rules target one or more columns.
- Matching cells get visual highlighting.
- Rules can be enabled/disabled and ordered.
- Rule names should be visible so users understand why a cell is highlighted.

### Shareable Views

- A configured set of filters/rules can be encoded into a URL or shareable view string.
- Opening the shared view restores formula filters, regex settings, and conditional formatting rules.
- Invalid shared state should fail safely and show a clear message.

## Differentiators Deferred

- Account-synced saved views.
- Team-owned named views with permissions.
- Full Excel formula compatibility.
- Bulk edits from matched results.
- Rule templates library.

## Anti-Features

- Formula-driven writes to entry data in v1.
- Arbitrary JavaScript formulas.
- Spreadsheet replacement that discards existing entries table behavior.
