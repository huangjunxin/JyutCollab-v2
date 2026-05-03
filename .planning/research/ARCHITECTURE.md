# Architecture Research: Entries Table Excel Tools

## Suggested Component Boundaries

### Formula Engine

A client-side TypeScript utility/composable parses Excel-style formulas into a constrained AST and evaluates them against a normalized row/cell context. It should expose parse errors and evaluation errors separately.

### Rule State

A composable owns active formula filters, regex filters, validation rules, and conditional formatting rules. It should derive filtered rows and per-cell rule matches without mutating entries.

### View Serialization

A small serializer encodes/decodes rule state for shareable URLs. It should version the payload so future rule formats can migrate safely.

### UI Controls

Nuxt UI components or entries-specific components render:

- Formula filter input and error display
- Regex toggle/options for search and column filters
- Conditional formatting rule panel
- Validation result indicators
- Share/copy view action

### Table Integration

The existing entries page should apply derived filtering before rendering rows and pass cell formatting metadata to editable cell rendering. Existing edit/save/AI/grouping flows remain authoritative for data mutation.

## Build Order

1. Define rule/view types and safe formula/regex evaluation primitives.
2. Apply formula and regex filtering to derived table rows.
3. Add cell-level conditional formatting and validation indicators.
4. Add rule management UI and shareable view serialization.
5. Verify existing table behavior and edge cases.

## Key Risks

- Existing entries page is large; extract focused composables rather than adding unrelated logic inline.
- Regex and formula evaluation can become expensive; cache compiled rules and debounce user input.
- Shared URLs can become long; v1 should keep state compact and validate decoded payloads.
