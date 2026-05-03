# Research Summary: Entries Table Excel Tools

## Stack

Build the feature inside the existing Nuxt 4 / Vue 3 / TypeScript entries table architecture. Use focused client-side utilities/composables for rule parsing, evaluation, formatting metadata, and shareable view serialization. Avoid backend persistence and heavyweight grid replacement in v1.

## Table Stakes

- Safe Excel-style formula filtering using a whitelist of functions/operators.
- Regex support in global search, single-column filtering, conditional formatting, and validation.
- Cell-level conditional formatting with understandable rule labels/errors.
- Shareable views that restore formula, regex, validation, and formatting state.
- Read-only rule behavior: filter, highlight, validate; no bulk mutation.

## Recommended Build Order

1. Rule model and safe evaluation foundation.
2. Filtering integration for formulas and regex.
3. Conditional formatting and validation indicators.
4. Shareable view serialization and restoration.
5. End-to-end verification against existing table workflows.

## Watch Out For

- Never evaluate formulas as arbitrary JavaScript.
- Keep rule state separate from entry mutation/save state.
- Preserve existing editing, grouping, AI suggestion, local draft, and keyboard behaviors.
- Cache compiled regex/formulas and debounce inputs to avoid table lag.
- Version shared view payloads so future schema changes do not break links silently.
