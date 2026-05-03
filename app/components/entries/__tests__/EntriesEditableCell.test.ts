import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const componentPath = resolve(process.cwd(), 'app/components/entries/EntriesEditableCell.vue')
const source = readFileSync(componentPath, 'utf8')

describe('EntriesEditableCell overlay metadata rendering', () => {
  it('accepts typed optional cell overlay metadata without data mutation coupling', () => {
    expect(source).toContain('EntryCellOverlayMeta')
    expect(source).toContain('cellMeta?: EntryCellOverlayMeta')
    expect(source).toContain('props.cellMeta?.classNames ?? []')
    expect(source).not.toMatch(/\$fetch|col\.set|_isDirty|selectedEntryIds|batch|localStorage/)
  })

  it('merges overlay class names and titles with existing display cell classes', () => {
    expect(source).toContain('overlayClassNames')
    expect(source).toContain('overlayTitle')
    expect(source).toMatch(/cellClass[\s\S]*overlayClassNames/)
    expect(source).toContain(':title="overlayTitle"')
  })

  it('renders a non-color validation warning cue with accessible HK Traditional label', () => {
    expect(source).toContain('hasValidationMatches')
    expect(source).toContain('validationOverlayTitle')
    expect(source).toContain('i-heroicons-exclamation-triangle')
    expect(source).toContain('aria-label="驗證警告"')
    expect(source).toContain(':title="validationOverlayTitle"')
  })
})
