import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')

const panelPath = resolve(process.cwd(), 'app/components/entries/EntriesRuleOverlayPanel.vue')
const panelSource = readFileSync(panelPath, 'utf8')

describe('entries page rule overlay wiring', () => {
  it('imports the rule overlay panel and composable', () => {
    expect(source).toContain('EntriesRuleOverlayPanel')
    expect(source).toContain('useEntriesRuleOverlays')
  })

  it('renders the rules panel near advanced filters with a dedicated toolbar host', () => {
    expect(source).toMatch(/teleport-to="#entries-rule-overlay-host"/)
    expect(source).toContain('id="entries-rule-overlay-host"')
    expect(source).toContain('v-model:expanded="ruleOverlays.ruleOverlayExpanded.value"')
    expect(source).toContain(':draft-rule="ruleOverlays.draftRule"')
    expect(source).toContain('@update:draft-rule="updateRuleOverlayDraft"')
    expect(source).toContain('@update-rule-color="ruleOverlays.updateRuleColor"')
    expect(source).toContain(':active-rule-count="ruleOverlays.activeRuleCount.value"')
  })

  it('instantiates overlays with rendered entries and advanced filter row context', () => {
    expect(source).toContain('visibleRuleOverlayEntries')
    expect(source).toContain('useEntriesRuleOverlays({')
    expect(source).toContain('visibleEntries: visibleRuleOverlayEntries')
    expect(source).toContain('buildRowContext: advancedFilters.buildRowContext')
  })

  it('writes draft updates back into the reactive overlay draft instead of replacing the composable return property', () => {
    expect(source).toContain('function updateRuleOverlayDraft(nextDraft: EntriesRuleDraft)')
    expect(source).toContain('Object.assign(ruleOverlays.draftRule')
    expect(source).toContain('targetFields: [...nextDraft.targetFields]')
    expect(source).toContain('regex: { ...nextDraft.condition.regex }')
    expect(source).toContain('colorHex: nextDraft.colorHex')
  })

  it('passes per-cell overlay metadata without rule persistence or data mutation coupling', () => {
    expect(source).toContain(':cell-meta="isAdvancedFilterFieldKey(col.key) ? ruleOverlays.getCellOverlayMeta')
    expect(source).toContain('isAdvancedFilterFieldKey')
    expect(source).not.toMatch(/localStorage.*rule|\$fetch.*rule|save.*rule|delete.*rule|review.*rule|bulk.*rule/i)
  })

  it('provides accessible icon-only toolbar button with tooltip and aria-label', () => {
    expect(panelSource).toContain('UTooltip text="規則"')
    expect(panelSource).toContain('aria-label="規則"')
    expect(panelSource).toContain('aria-expanded')
    expect(panelSource).toContain('aria-controls')
    expect(panelSource).toContain('class="h-8 w-8 justify-center p-0"')
  })

  it('provides visible HK Traditional invalid color feedback with role="alert"', () => {
    expect(panelSource).toContain('規則顏色無效。請使用色彩選擇器重新選擇顏色。')
    expect(panelSource).toContain('role="alert"')
    expect(panelSource).toContain('v-if="errors.colorHex"')
    expect(panelSource).toContain('id="entries-rule-color-error"')
    expect(panelSource).toContain('v-if="rule.colorHex && !/^#[0-9a-fA-F]{6}$/.test(rule.colorHex)"')
    expect(panelSource).toContain('id="entries-rule-existing-color-error"')
  })

  it('provides tooltip explaining disabled color picker for validation rules', () => {
    expect(panelSource).toMatch(/UTooltip[\s\S]*:text.*draftKind !== 'formatting'[\s\S]*驗證警告規則不支援自訂顏色/)
  })
})
