import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

const paths = {
  dropdown: 'app/components/entries/EntriesViewsDropdown.vue',
  saveModal: 'app/components/entries/EntriesSaveViewModal.vue',
  manageModal: 'app/components/entries/EntriesManageViewsModal.vue',
  banner: 'app/components/entries/EntriesSharedViewBanner.vue',
  savedViews: 'app/composables/useEntriesSavedViews.ts',
  page: 'app/pages/entries/index.vue',
  sharedView: 'app/utils/entriesSharedView.ts',
  viewUpdateApi: 'server/api/views/[id].put.ts',
  viewDeleteApi: 'server/api/views/[id].delete.ts'
} as const

const sources = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, readSource(path)])
) as Record<keyof typeof paths, string>

const phaseFiveCombinedSource = Object.values(sources).join('\n')

function stripComments(source: string) {
  return source
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

describe('VIEW-05 saved views source safety boundary', () => {
  it('VIEW-05 applies saved views through read-only filter and rule overlay APIs only', () => {
    const pageWithoutComments = stripComments(sources.page)

    expect(pageWithoutComments).toContain('advancedFilters.exportAdvancedFilterState')
    expect(pageWithoutComments).toContain('ruleOverlays.exportRuleOverlayState')
    expect(pageWithoutComments).toContain('if (state.viewMode) setViewMode(state.viewMode)')
    expect(pageWithoutComments).toContain('advancedFilters.restoreAdvancedFilterState(state.filters)')
    expect(pageWithoutComments).toContain('ruleOverlays.replaceRuleOverlayState(state.rules)')
    expect(pageWithoutComments).toContain('savedViews.createView')
    expect(pageWithoutComments).toContain('savedViews.updateView')
    expect(pageWithoutComments).toContain('savedViews.deleteView')
    expect(pageWithoutComments).toContain('savedViews.getViewById')
    expect(pageWithoutComments).toContain("sharedViewParam.startsWith('eyJ')")
    expect(pageWithoutComments).toContain('decodeEntriesSharedView(sharedViewParam)')

    const savedViewWorkflowFunctions = [
      'restoreSharedViewState',
      'applySavedView',
      'applySharedViewBannerState',
      'applySharedViewQuery',
      'saveSharedViewBannerAsOwn',
      'shareSavedView'
    ]

    for (const functionName of savedViewWorkflowFunctions) {
      const match = pageWithoutComments.match(new RegExp(`function ${functionName}\\([\\s\\S]*?(?=\\nfunction |\\nconst |\\nasync function |\\n/\\*|\\n\\})`))
      expect(match?.[0] ?? '').not.toMatch(/saveEntryChanges|deleteEntry|batchDeleteSelected|bulkDelete|\$fetch\(['"`]\/api\/entries|_isDirty\s*=/)
    }
  })

  it('VIEW-05 removes the obsolete standalone share popover from entries page wiring', () => {
    expect(sources.page).toContain('EntriesViewsDropdown')
    expect(sources.page).toContain('EntriesSharedViewBanner')
    expect(stripComments(sources.page)).not.toContain('EntriesShareViewPopover')
  })
})

describe('VIEW-06 saved views ownership and public/private management safety', () => {
  it('VIEW-06 locks owner and non-owner action labels without reviewer/admin public-view management UI', () => {
    expect(sources.manageModal).toContain('view.creatorId === currentUserId')
    for (const copy of ['管理視圖', '編輯', '刪除', '檢視', '複製為我的視圖']) {
      expect(sources.manageModal).toContain(copy)
    }
    expect(sources.viewUpdateApi).toContain('無權編輯此視圖')
    expect(sources.viewDeleteApi).toContain('無權刪除此視圖')

    const phaseFiveWithoutComments = stripComments(phaseFiveCombinedSource)
    expect(phaseFiveWithoutComments).not.toMatch(/reviewer[^\n]{0,80}(delete|update|manage)|admin[^\n]{0,80}public[^\n]{0,80}view/i)
    expect(phaseFiveWithoutComments).not.toMatch(/管理公開視圖|審核員.*刪除.*公開視圖|管理員.*刪除.*公開視圖/)
  })

  it('VIEW-06 preserves public/private visibility copy and saved-view list grouping', () => {
    for (const copy of ['公開', '私人', '公開視圖', '我的視圖', '公開（所有用戶可見）', '私人（僅自己可見）']) {
      expect(phaseFiveCombinedSource).toContain(copy)
    }
    expect(sources.savedViews).toContain("SavedViewVisibility = 'public' | 'private'")
    expect(sources.savedViews).toContain("visibility === 'public'")
    expect(sources.saveModal).toContain("value: 'private'")
    expect(sources.saveModal).toContain("value: 'public'")
  })
})

describe('VIEW-07 saved views localization, compatibility, and scope gates', () => {
  it('VIEW-07 locks exact HK Traditional UI-SPEC copy across saved-view components', () => {
    const requiredCopy = [
      '儲存',
      '取消',
      '關閉',
      '刪除',
      '套用視圖',
      '儲存為我的視圖',
      '尚未儲存任何視圖',
      '儲存目前篩選和規則設定為命名視圖，方便日後快速切換或與團隊分享。',
      '儲存目前視圖',
      '視圖名稱',
      '為此視圖命名（例如：廣州話口語詞條、待審查詞條）',
      '可見性',
      '公開（所有用戶可見）',
      '私人（僅自己可見）',
      '此操作無法還原。',
      '你正在檢視「',
      '此視圖由',
      '建立。篩選和規則已套用，不會修改詞條資料。',
      '編輯',
      '檢視',
      '複製為我的視圖',
      '視圖不存在或已被刪除',
      '儲存視圖失敗，請稍後再試',
      '更新視圖失敗，請稍後再試',
      '刪除視圖失敗，請稍後再試',
      '無權編輯此視圖',
      '無權刪除此視圖'
    ]

    const copySource = phaseFiveCombinedSource + sources.viewUpdateApi + sources.viewDeleteApi
    for (const copy of requiredCopy) {
      expect(copySource).toContain(copy)
    }

    for (const term of ['公開', '私人', '視圖', '篩選', '規則', '詞條']) {
      expect(phaseFiveCombinedSource).toContain(term)
    }
  })

  it('VIEW-07 rejects simplified Chinese drift in Phase 5 saved-view sources', () => {
    const simplifiedPhaseFiveTerms = /视图|筛选|规则|词条|储存|用户可见|仅自己可见|无法还原|创建|删除|权限/
    expect(stripComments(phaseFiveCombinedSource)).not.toMatch(simplifiedPhaseFiveTerms)
  })

  it('VIEW-07 preserves shared-view v1 compatibility and blocks deferred saved-view scope creep', () => {
    expect(sources.sharedView).toMatch(/export const ENTRIES_SHARED_VIEW_VERSION\s*=\s*1/)
    expect(stripComments(phaseFiveCombinedSource)).not.toMatch(/ENTRIES_SHARED_VIEW_VERSION\s*=\s*2|version\s*:\s*2/)
    expect(sources.page).toContain("sharedViewParam.startsWith('eyJ')")
    expect(sources.page).toContain('savedViews.getViewById(sharedViewParam)')
    expect(sources.sharedView).toContain('viewMode: viewModeSchema.optional()')

    const withoutComments = stripComments(phaseFiveCombinedSource)
    const deferredPatterns = [
      /bulk\s+view/i,
      /view\s+analytics/i,
      /bulk\s+import/i,
      /bulk\s+export/i,
      /schema\s+migration/i,
      /view\s+template/i,
      /view\s+folder/i,
      /批量.*視圖/,
      /視圖.*模板/,
      /視圖.*分析/,
      /視圖.*資料夾/,
      /視圖.*文件夾/
    ]

    for (const pattern of deferredPatterns) {
      expect(withoutComments).not.toMatch(pattern)
    }
  })
})
