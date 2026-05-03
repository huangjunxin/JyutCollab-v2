import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')

describe('entries page rule overlay wiring', () => {
  it('imports the rule overlay panel and composable', () => {
    expect(source).toContain('EntriesRuleOverlayPanel')
    expect(source).toContain('useEntriesRuleOverlays')
  })

  it('renders the rules panel near advanced filters with a dedicated toolbar host', () => {
    expect(source).toContain('teleport-to="#entries-rule-overlay-host"')
    expect(source).toContain('id="entries-rule-overlay-host"')
    expect(source).toContain('v-model:expanded="ruleOverlays.ruleOverlayExpanded.value"')
    expect(source).toContain('v-model:draft-rule="ruleOverlays.draftRule"')
    expect(source).toContain(':active-rule-count="ruleOverlays.activeRuleCount.value"')
  })

  it('instantiates overlays with rendered entries and advanced filter row context', () => {
    expect(source).toContain('visibleRuleOverlayEntries')
    expect(source).toContain('useEntriesRuleOverlays({')
    expect(source).toContain('visibleEntries: visibleRuleOverlayEntries')
    expect(source).toContain('buildRowContext: advancedFilters.buildRowContext')
  })

  it('passes per-cell overlay metadata without rule persistence or data mutation coupling', () => {
    expect(source).toContain(':cell-meta="ruleOverlays.getCellOverlayMeta')
    expect(source).toContain('isAdvancedFilterFieldKey')
    expect(source).not.toMatch(/localStorage.*rule|\$fetch.*rule|save.*rule|delete.*rule|review.*rule|bulk.*rule/i)
  })
})
