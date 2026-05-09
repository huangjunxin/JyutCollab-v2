import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const pagePath = resolve(root, 'app/pages/entries/index.vue')
const source = readFileSync(pagePath, 'utf8')
const bannerPath = resolve(root, 'app/components/entries/EntriesSharedViewBanner.vue')
const bannerSource = readFileSync(bannerPath, 'utf8')

describe('EntriesPageSharedViewWiring', () => {
  it('imports unified shared-view helpers and banner instead of the old share popover', () => {
    expect(source).not.toContain('EntriesShareViewPopover')
    expect(source).toContain('EntriesSharedViewBanner')
    expect(source).toContain('~/utils/entriesSharedView')
    expect(source).toContain('ENTRIES_SHARED_VIEW_VERSION')
    expect(source).toContain('ENTRIES_SHARED_VIEW_QUERY_PARAM')
    expect(source).toContain('decodeEntriesSharedView')
    expect(source).toContain('summarizeEntriesSharedView')
  })

  it('renders the unified dropdown, advanced filters, rule overlays, and shared-view banner', () => {
    expect(source).toContain('<EntriesAdvancedFilterPanel')
    expect(source).toContain('<EntriesRuleOverlayPanel')
    expect(source).toContain('<EntriesViewsDropdown')
    expect(source).toContain('<EntriesSharedViewBanner')
    expect(source).toContain('@apply="applySharedViewBannerState"')
    expect(source).toContain('@save-as-own="saveSharedViewBannerAsOwn"')
    expect(source).toContain('@close="clearSharedViewQuery"')
  })

  it('exports and restores supported local filter and rule state only through composable APIs', () => {
    expect(source).toContain('advancedFilters.exportAdvancedFilterState')
    expect(source).toContain('advancedFilters.restoreAdvancedFilterState')
    expect(source).toContain('ruleOverlays.exportRuleOverlayState')
    expect(source).toContain('ruleOverlays.replaceRuleOverlayState')
    expect(source).toContain('shareSavedView')
    expect(source).toContain('sharedViewBanner')
    expect(source).toContain('lastAppliedSharedView')
  })

  it('supports embedded payloads and server-backed saved view IDs in the same query flow', () => {
    expect(source).toContain('async function applySharedViewQuery')
    expect(source).toContain('route.query[ENTRIES_SHARED_VIEW_QUERY_PARAM]')
    expect(source).toContain("sharedViewParam.startsWith('eyJ')")
    expect(source).toContain('decodeEntriesSharedView(sharedViewParam)')
    expect(source).toContain('savedViews.getViewById(sharedViewParam)')
    expect(source).toContain('lastAppliedSharedView.value === sharedViewParam')
    expect(source).toMatch(/void applySharedViewQuery\(\)[\s\S]*const changed = applyUrlParams\(\)[\s\S]*if \(changed\) \{[\s\S]*fetchEntries\(\)/)
    expect(source).not.toMatch(/function applyUrlParams\(\): boolean \{[\s\S]*ENTRIES_SHARED_VIEW_QUERY_PARAM[\s\S]*changed = true[\s\S]*return changed\n\}/)
  })

  it('fails invalid embedded payloads and missing view IDs safely before applying state', () => {
    expect(source).toMatch(/if \(!result\.ok\) \{[\s\S]*sharedViewBanner\.value = \{ kind: 'not-found' \}[\s\S]*return false[\s\S]*\}/)
    expect(source).toMatch(/catch \{[\s\S]*sharedViewBanner\.value = \{ kind: 'not-found' \}[\s\S]*return false[\s\S]*\}/)
    expect(source).toMatch(/advancedFilters\.restoreAdvancedFilterState\(state\.filters\)[\s\S]*ruleOverlays\.replaceRuleOverlayState\(state\.rules\)/)
    expect(bannerSource).toContain('視圖不存在或已被刪除')
  })

  it('resets stale shared-view feedback and guard when the query disappears', () => {
    expect(source).toMatch(/if \(typeof sharedViewParam !== 'string'\) \{[\s\S]*sharedViewBanner\.value = null[\s\S]*lastAppliedSharedView\.value = null[\s\S]*return false[\s\S]*\}/)
    expect(source).toMatch(/function clearSharedViewQuery\(\)[\s\S]*sharedViewBanner\.value = null[\s\S]*lastAppliedSharedView\.value = null[\s\S]*navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
  })

  it('clears only the shared-view query parameter with router replace', () => {
    expect(source).toContain('function clearSharedViewQuery')
    expect(source).toMatch(/const query = \{ \.\.\.route\.query \}/)
    expect(source).toMatch(/delete query\[ENTRIES_SHARED_VIEW_QUERY_PARAM\]/)
    expect(source).toMatch(/navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
  })

  it('does not introduce entry mutation or UI-library scope creep for shared view application', () => {
    expect(source).not.toMatch(/shared[\s\S]{0,120}_isDirty|_isDirty[\s\S]{0,120}shared/i)
    expect(source).not.toMatch(/applySharedView(?:Query|BannerState)?[\s\S]{0,600}\$fetch\(['"]\/api\/entries/)
    expect(source).not.toMatch(/from ['"](?:@radix-ui|shadcn|antd|element-plus|vuetify)/)
  })

  it('keeps shared-view banner accessible and locked to HK Traditional copy', () => {
    expect(bannerSource).toContain('你正在檢視「')
    expect(bannerSource).toContain('你正在檢視分享的視圖')
    expect(bannerSource).toContain('篩選和規則已套用，不會修改詞條資料。')
    expect(bannerSource).toContain('套用視圖')
    expect(bannerSource).toContain('儲存為我的視圖')
    expect(bannerSource).toContain('關閉')
  })
})
