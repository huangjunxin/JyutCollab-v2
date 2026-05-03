# Pitfalls Research: Entries Table Excel Tools

## Pitfall: Unsafe formula evaluation

**Warning signs:** Implementation uses `eval`, `new Function`, or accepts arbitrary JavaScript-like code.

**Prevention:** Implement or adopt a constrained parser/interpreter with an explicit function/operator whitelist.

**Phase mapping:** Phase 1.

## Pitfall: Rules silently change data

**Warning signs:** Rule matches feed directly into save/update endpoints or bulk edit actions.

**Prevention:** Keep v1 rule engine read-only and separate from mutation workflows.

**Phase mapping:** All phases.

## Pitfall: Existing table interactions regress

**Warning signs:** Keyboard navigation, inline editing, grouping, AI suggestions, or local drafts behave differently after rule application.

**Prevention:** Integrate rules as derived display/filter state, not as replacements for entry data or table identity.

**Phase mapping:** Phase 2 and Phase 4.

## Pitfall: Regex and formula performance problems

**Warning signs:** Typing into search or editing rules freezes the table on large datasets.

**Prevention:** Compile rules once, debounce input, evaluate against normalized display values, and avoid unnecessary recomputation.

**Phase mapping:** Phase 1 and Phase 2.

## Pitfall: Shareable views become brittle

**Warning signs:** Old shared links break after field names or rule schema changes.

**Prevention:** Version serialized state and validate decoded payloads with safe fallbacks.

**Phase mapping:** Phase 3.

## Pitfall: Non-HK Chinese UI text

**Warning signs:** New labels or errors use Simplified Chinese or Taiwan Traditional variants.

**Prevention:** Write UI copy in Hong Kong Traditional Chinese and use existing conversion utilities where server-side text is generated.

**Phase mapping:** All UI phases.
