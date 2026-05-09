import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('EntriesViewsDropdown contract', () => {
  const source = readSource('app/components/entries/EntriesViewsDropdown.vue')

  it('renders unified mode, saved-view, and action copy', () => {
    for (const copy of ['平鋪', '按詞形聚合（參考）', '按詞語聚合', '我的視圖', '公開視圖', '公開', '私人', '儲存目前視圖...', '管理視圖...', '分享']) {
      expect(source).toContain(copy)
    }
  })

  it('keeps saved view selection separate from viewMode', () => {
    expect(source).toContain('selectedViewId')
    expect(source).toContain('update:viewMode')
    expect(source).toContain('select-saved-view')
    expect(source).toContain("String(item.value).startsWith('view_')")
    const updateIndex = source.indexOf("emit('update:viewMode'")
    const savedViewIndex = source.indexOf("String(item.value).startsWith('view_')")
    expect(updateIndex).toBeGreaterThan(-1)
    expect(savedViewIndex).toBeGreaterThan(updateIndex)
    expect(source.slice(updateIndex, savedViewIndex)).not.toContain('view_')
  })
})

describe('entries page saved views integration contract', () => {
  const source = readSource('app/pages/entries/index.vue')

  it('uses unified views dropdown and no longer renders the standalone share popover', () => {
    expect(source).toContain('EntriesViewsDropdown')
    expect(source).not.toContain('EntriesShareViewPopover')
    expect(source).toContain('EntriesSaveViewModal')
    expect(source).toContain('EntriesManageViewsModal')
    expect(source).toContain('EntriesSharedViewBanner')
  })

  it('wires saved-view CRUD through useEntriesSavedViews and current shared state', () => {
    expect(source).toContain('useEntriesSavedViews')
    expect(source).toContain('savedViews.createView')
    expect(source).toContain('savedViews.updateView')
    expect(source).toContain('savedViews.deleteView')
    expect(source).toContain('savedViews.getViewById')
    expect(source).toContain('advancedFilters.exportAdvancedFilterState')
    expect(source).toContain('ruleOverlays.exportRuleOverlayState')
  })

  it('saves and restores view mode through the shared-view state without mutating entries', () => {
    expect(source).toMatch(/viewMode:\s*viewMode\.value/)
    expect(source).toMatch(/if \(state\.viewMode\) setViewMode\(state\.viewMode\)/)
    expect(source).toMatch(/advancedFilters\.restoreAdvancedFilterState\([\s\S]*\.filters\)/)
    expect(source).toMatch(/ruleOverlays\.replaceRuleOverlayState\([\s\S]*\.rules\)/)
    expect(source).not.toMatch(/applySavedView[\s\S]{0,500}\$fetch\(['"]\/api\/entries/)
    expect(source).not.toMatch(/applyNamedSharedView[\s\S]{0,500}\$fetch\(['"]\/api\/entries/)
  })

  it('supports view-ID query links and embedded payload compatibility', () => {
    expect(source).toContain("sharedViewParam.startsWith('eyJ')")
    expect(source).toContain('decodeEntriesSharedView(sharedViewParam)')
    expect(source).toMatch(/savedViews\.getViewById\(sharedViewParam\)/)
    expect(source).toContain('lastAppliedSharedView.value === sharedViewParam')
    expect(source).toContain("sharedViewBanner.value = { kind: 'not-found' }")
    expect(readSource('app/components/entries/EntriesSharedViewBanner.vue')).toContain('視圖不存在或已被刪除')
  })

  it('clears only the shared view query parameter with replace navigation', () => {
    expect(source).toContain('function clearSharedViewQuery')
    expect(source).toMatch(/const query = \{ \.\.\.route\.query \}/)
    expect(source).toMatch(/delete query\[ENTRIES_SHARED_VIEW_QUERY_PARAM\]/)
    expect(source).toMatch(/navigateTo\(\{ path: route\.path, query \}, \{ replace: true \}\)/)
  })

  it('does not assign saved view IDs into viewMode', () => {
    expect(source).not.toMatch(/viewMode\.value\s*=\s*['"]view_/)
    expect(source).not.toMatch(/setViewMode[\s\S]{0,160}view_/)
  })
})
