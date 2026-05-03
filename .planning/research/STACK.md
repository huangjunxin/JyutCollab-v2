# Stack Research: Entries Table Excel Tools

## Context

This is a brownfield feature inside the existing JyutCollab Nuxt 4 / Vue 3 / TypeScript app. The entries table already has page-level orchestration, composables for table editing/list fetching, localStorage preferences, and Nuxt UI components.

## Recommended Stack

- **Vue 3 Composition API**: Use composables for formula parsing/evaluation state, regex filter state, and conditional formatting application.
- **TypeScript**: Define explicit rule/filter/view types so formulas, regexes, target columns, highlight styles, and validation severity are constrained.
- **Nuxt UI + Tailwind**: Reuse current UI system for rule panels, popovers, badges, and cell highlight classes.
- **URL query/hash state**: Use encoded view state for v1 shareable views without introducing backend persistence.
- **localStorage optional cache**: Keep recent rule drafts locally if needed, following existing table preference patterns.

## Avoid

- Do not use `eval`, `new Function`, or raw JavaScript execution for formulas.
- Do not introduce a heavyweight spreadsheet grid replacement in v1; integrate with the current table.
- Do not add backend saved views until shareable URL views prove insufficient.

## Confidence

High. The current stack already supports client-side table state, URL-driven filters, and Nuxt UI-based controls.
