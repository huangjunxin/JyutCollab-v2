import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const componentPath = resolve(process.cwd(), 'app/components/entries/EntriesRuleOverlayPanel.vue')
const source = readFileSync(componentPath, 'utf8')

describe('EntriesRuleOverlayPanel', () => {
  it('defines local-only typed props, emits, and accessible trigger shell', () => {
    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain('EntriesRuleDraft')
    expect(source).toContain('EntriesRuleOverlay')
    expect(source).toContain('EntriesRuleOverlayErrors')
    expect(source).toContain('update:expanded')
    expect(source).toContain('update:draftRule')
    expect(source).toContain('apply')
    expect(source).toContain('clear')
    expect(source).toContain('toggle-rule')
    expect(source).toContain('remove-rule')
    expect(source).toContain('move-rule')
    expect(source).toContain('aria-label="規則"')
    expect(source).toContain('aria-expanded')
    expect(source).toContain('aria-controls')
    expect(source).toContain('<Teleport')
  })

  it('keeps the component presentational and free from entry mutations', () => {
    expect(source).not.toMatch(/\$fetch|save|delete|review|bulk|col\.set|_isDirty/)
  })
})
