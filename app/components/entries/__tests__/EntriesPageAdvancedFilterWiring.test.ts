import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')

describe('entries page advanced filter wiring', () => {
  it('imports the advanced filter panel and composable', () => {
    expect(source).toContain('EntriesAdvancedFilterPanel')
    expect(source).toContain('useEntriesAdvancedFilters')
  })

  it('renders the advanced filter panel with a dedicated toolbar host', () => {
    expect(source).toContain('teleport-to="#entries-advanced-filter-host"')
    expect(source).toContain('id="entries-advanced-filter-host"')
    expect(source).toContain('v-model:expanded="advancedFilters.advancedFilterExpanded.value"')
    expect(source).toContain('v-model:formula-input="advancedFilters.formulaInput.value"')
    expect(source).toContain('v-model:global-regex-enabled="advancedFilters.globalRegexEnabled.value"')
    expect(source).toContain('v-model:global-regex-input="advancedFilters.globalRegexInput.value"')
    expect(source).toContain('v-model:column-regex-field="advancedFilters.columnRegex.field"')
    expect(source).toContain('v-model:column-regex-pattern="advancedFilters.columnRegex.pattern"')
  })

  it('instantiates filters with entries, groups, view mode, columns, and display helpers', () => {
    expect(source).toContain('useEntriesAdvancedFilters({')
    expect(source).toContain('entries,')
    expect(source).toContain('aggregatedGroups,')
    expect(source).toContain('lexemeGroups,')
    expect(source).toContain('viewMode,')
    expect(source).toContain('editableColumns,')
    expect(source).toContain('getCellDisplay')
  })

  it('wires apply and clear handlers without mutation, persistence, or bulk operation coupling', () => {
    expect(source).toContain('@apply="advancedFilters.applyAdvancedFilters"')
    expect(source).toContain('@clear="advancedFilters.clearAdvancedFilters"')
    expect(source).not.toMatch(/localStorage.*advanced|\$fetch.*advanced|save.*advanced|delete.*advanced|submit.*advanced|review.*advanced|bulk.*advanced|history.*advanced|ai.*advanced/i)
  })

  it('uses filtered entries/groups for display and keeps unfiltered source intact', () => {
    expect(source).toContain('advancedFilters.filteredEntries')
    expect(source).toContain('advancedFilters.filteredAggregatedGroups')
    expect(source).toContain('advancedFilters.filteredLexemeGroups')
    expect(source).toContain('advancedFilters.buildRowContext')
    expect(source).not.toMatch(/advanced[\s\S]{0,120}save[\s\S]{0,120}entry|advanced[\s\S]{0,120}submit[\s\S]{0,120}entry|advanced[\s\S]{0,120}delete[\s\S]{0,120}entry/i)
  })

  it('does not expose backend, localStorage, saved-view, entry-mutation, or UI-library scope creep for advanced filters', () => {
    expect(source).not.toMatch(/localStorage\.setItem.*formula|localStorage\.setItem.*regex|localStorage\.getItem.*formula/i)
    expect(source).not.toMatch(/\$fetch.*\/api.*formula|\$fetch.*\/api.*regex/i)
    expect(source).not.toMatch(/advancedFilters[\s\S]{0,60}\.save|advancedFilters[\s\S]{0,60}\.submit|advancedFilters[\s\S]{0,60}\.delete|advancedFilters[\s\S]{0,60}\.review/i)
    expect(source).not.toMatch(/formula[\s\S]{0,60}localStorage|regex[\s\S]{0,60}localStorage|formula[\s\S]{0,60}\$fetch|regex[\s\S]{0,60}\$fetch/i)
    expect(source).not.toMatch(/from ['"](?:@radix-ui|shadcn|antd|element-plus|vuetify)/)
  })
})