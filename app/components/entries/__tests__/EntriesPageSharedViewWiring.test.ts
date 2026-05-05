import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pagePath = resolve(process.cwd(), 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')

describe('EntriesPageSharedViewWiring', () => {
  it('imports the share popover and shared-view utility helpers', () => {
    expect(source).toContain('EntriesShareViewPopover')
    expect(source).toContain('~/utils/entriesSharedView')
    expect(source).toContain('ENTRIES_SHARED_VIEW_VERSION')
    expect(source).toContain('ENTRIES_SHARED_VIEW_QUERY_PARAM')
    expect(source).toContain('ENTRIES_SHARED_VIEW_MAX_ENCODED_LENGTH')
    expect(source).toContain('buildEntriesSharedViewUrl')
    expect(source).toContain('decodeEntriesSharedView')
    expect(source).toContain('summarizeEntriesSharedView')
  })

  it('renders share popover beside advanced filters and rule overlays with route-safe events', () => {
    expect(source).toContain('<EntriesAdvancedFilterPanel')
    expect(source).toContain('<EntriesRuleOverlayPanel')
    expect(source).toContain('<EntriesShareViewPopover')
    expect(source).toContain(':version="ENTRIES_SHARED_VIEW_VERSION"')
    expect(source).toContain(':generated-url="generatedSharedViewUrl"')
    expect(source).toContain(':can-share="canShareEntriesView"')
    expect(source).toContain(':filter-count="sharedViewSummary.filterCount"')
    expect(source).toContain(':rule-count="sharedViewSummary.ruleCount"')
    expect(source).toContain(':restored="sharedViewRestored"')
    expect(source).toContain(':restored-summary="sharedViewRestoredSummary"')
    expect(source).toContain(':shared-view-error="sharedViewError"')
    expect(source).toContain(':copy-status="sharedViewCopyStatus"')
    expect(source).toContain(':show-fallback-url="showSharedViewFallbackUrl"')
    expect(source).toContain('@copy="copySharedViewLink"')
    expect(source).toContain('@clear-share-query="clearSharedViewQuery"')
  })

  it('exports and restores supported local filter and rule state only through composable APIs', () => {
    expect(source).toContain('advancedFilters.exportAdvancedFilterState')
    expect(source).toContain('advancedFilters.restoreAdvancedFilterState')
    expect(source).toContain('ruleOverlays.exportRuleOverlayState')
    expect(source).toContain('ruleOverlays.replaceRuleOverlayState')
    expect(source).toContain('copySharedViewLink')
    expect(source).toContain('sharedViewError')
    expect(source).toContain('sharedViewRestored')
    expect(source).toContain('lastAppliedSharedView')
  })

  it('keeps shared-view route restore separate from server-backed URL param fetching', () => {
    expect(source).toContain('function applySharedViewQuery')
    expect(source).toContain('route.query[ENTRIES_SHARED_VIEW_QUERY_PARAM]')
    expect(source).toContain('decodeEntriesSharedView(sharedViewParam)')
    expect(source).toContain('lastAppliedSharedView.value === sharedViewParam')
    expect(source).toMatch(/applySharedViewQuery\(\)[\s\S]*const changed = applyUrlParams\(\)[\s\S]*if \(changed\) \{[\s\S]*fetchEntries\(\)/)
    expect(source).not.toMatch(/function applyUrlParams\(\): boolean \{[\s\S]*ENTRIES_SHARED_VIEW_QUERY_PARAM[\s\S]*changed = true[\s\S]*return changed\n\}/)
  })

  it('fails invalid shared-view payloads safely with HK Traditional feedback before applying state', () => {
    expect(source).toContain('分享視圖無法套用：${result.reason}。已保留目前表格，請清除網址中的分享參數或重新複製視圖。')
    expect(source).toMatch(/<UAlert\s+v-if="sharedViewError"[\s\S]*:description="sharedViewError"[\s\S]*@click="clearSharedViewQuery"/)
    expect(source).toMatch(/if \(!result\.ok\) \{[\s\S]*sharedViewError\.value[\s\S]*sharedViewRestored\.value = false[\s\S]*return false[\s\S]*\}/)
    expect(source).toMatch(/advancedFilters\.restoreAdvancedFilterState\(result\.data\.filters\)[\s\S]*ruleOverlays\.replaceRuleOverlayState\(result\.data\.rules\)/)
  })

  it('resets stale shared-view feedback and guard when the query disappears', () => {
    expect(source).toMatch(/if \(typeof sharedViewParam !== 'string'\) \{[\s\S]*sharedViewError\.value = ''[\s\S]*lastAppliedSharedView\.value = null[\s\S]*return false[\s\S]*\}/)
    expect(source).toMatch(/function clearSharedViewQuery\(\)[\s\S]*sharedViewError\.value = ''[\s\S]*lastAppliedSharedView\.value = null[\s\S]*navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
  })

  it('clears only the shared-view query parameter with router replace', () => {
    expect(source).toContain('function clearSharedViewQuery')
    expect(source).toMatch(/const query = \{ \.\.\.route\.query \}/)
    expect(source).toMatch(/delete query\[ENTRIES_SHARED_VIEW_QUERY_PARAM\]/)
    expect(source).toMatch(/navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
  })

  it('does not introduce backend, localStorage, saved-view, entry-mutation, or UI-library scope creep for shared views', () => {
    expect(source).not.toMatch(/localStorage.*shared|\$fetch.*shared|save.*shared|deleteSharedView|review.*shared|bulk.*shared|saved view|savedView/i)
    expect(source).not.toMatch(/shared[\s\S]{0,120}_isDirty|_isDirty[\s\S]{0,120}shared/i)
    expect(source).not.toMatch(/from ['"](?:@radix-ui|shadcn|antd|element-plus|vuetify)/)
  })
})
