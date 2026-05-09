import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(__dirname, '../../../..')
const readSource = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('saved views client composable contract', () => {
  it('exposes saved-view API state and actions without entry or route mutation coupling', () => {
    const source = readSource('app/composables/useEntriesSavedViews.ts')

    expect(source).toContain('export type SavedViewVisibility')
    expect(source).toContain('export interface SavedViewRecord')
    expect(source).toContain('export interface SaveViewInput')
    expect(source).toContain('export interface UpdateViewInput')
    expect(source).toContain('export function useEntriesSavedViews')
    for (const name of ['views', 'myViews', 'publicViews', 'isLoading', 'error', 'fetchViews', 'createView', 'updateView', 'deleteView', 'getViewById']) {
      expect(source).toContain(name)
    }
    expect(source).toContain("$fetch('/api/views'")
    expect(source).toContain("$fetch(`/api/views/${id}`")
    expect(source).toContain('useAuth()')
    expect(source).not.toMatch(/localStorage|navigateTo|router\.push|router\.replace|_isDirty|\/api\/entries/)
  })

  it('uses locked HK Traditional error messages from the UI spec', () => {
    const source = readSource('app/composables/useEntriesSavedViews.ts')

    expect(source).toContain('儲存視圖失敗，請稍後再試')
    expect(source).toContain('更新視圖失敗，請稍後再試')
    expect(source).toContain('刪除視圖失敗，請稍後再試')
    expect(source).toContain('視圖不存在或已被刪除')
  })
})

describe('saved views modal and banner source contracts', () => {
  it('locks save modal copy, visibility enum values, validation, and typed emits', () => {
    const source = readSource('app/components/entries/EntriesSaveViewModal.vue')

    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain('儲存目前視圖')
    expect(source).toContain('視圖名稱')
    expect(source).toContain('為此視圖命名（例如：廣州話口語詞條、待審查詞條）')
    expect(source).toContain('可見性')
    expect(source).toContain('公開（所有用戶可見）')
    expect(source).toContain('私人（僅自己可見）')
    expect(source).toContain('儲存')
    expect(source).toContain('取消')
    expect(source).toContain('視圖名稱不能為空')
    expect(source).toContain("'public'")
    expect(source).toContain("'private'")
    expect(source).toMatch(/save:\s*\[/)
    expect(source).toMatch(/cancel:\s*\[/)
    expect(source).not.toMatch(/\$fetch|\/api\/entries|_isDirty|confirm\(/)
  })

  it('locks manage modal owner/non-owner actions and delete confirmation behavior', () => {
    const source = readSource('app/components/entries/EntriesManageViewsModal.vue')

    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain('管理視圖')
    expect(source).toContain('尚未儲存任何視圖')
    expect(source).toContain('儲存目前篩選和規則設定為命名視圖，方便日後快速切換或與團隊分享。')
    expect(source).toContain('編輯')
    expect(source).toContain('刪除')
    expect(source).toContain('檢視')
    expect(source).toContain('複製為我的視圖')
    expect(source).toContain('此操作無法還原。')
    expect(source).toContain('view.creatorId === currentUserId')
    expect(source).toMatch(/apply:\s*\[/)
    expect(source).toMatch(/edit:\s*\[/)
    expect(source).toMatch(/delete:\s*\[/)
    expect(source).toMatch(/'copy-as-own':\s*\[/)
    expect(source).toMatch(/close:\s*\[/)
    expect(source).not.toMatch(/confirm\(|\$fetch|\/api\/entries|_isDirty/)
  })

  it('locks shared-view banner states, copy, and presentational boundary', () => {
    const source = readSource('app/components/entries/EntriesSharedViewBanner.vue')

    expect(source).toContain('defineProps')
    expect(source).toContain('defineEmits')
    expect(source).toContain("'named' | 'anonymous' | 'not-found'")
    expect(source).toContain('你正在檢視「')
    expect(source).toContain('此視圖由')
    expect(source).toContain('建立。篩選和規則已套用，不會修改詞條資料。')
    expect(source).toContain('你正在檢視分享的視圖')
    expect(source).toContain('篩選和規則已套用，不會修改詞條資料。')
    expect(source).toContain('視圖不存在或已被刪除')
    expect(source).toContain('套用視圖')
    expect(source).toContain('儲存為我的視圖')
    expect(source).toContain('關閉')
    expect(source).toMatch(/apply:\s*\[/)
    expect(source).toMatch(/'save-as-own':\s*\[/)
    expect(source).toMatch(/close:\s*\[/)
    expect(source).not.toMatch(/\$fetch|navigateTo|router\.replace|restoreAdvancedFilterState|replaceRuleOverlayState|\/api\/entries|_isDirty/)
  })

  it('does not introduce deferred bulk, template, or analytics features', () => {
    const combined = [
      readSource('app/composables/useEntriesSavedViews.ts'),
      readSource('app/components/entries/EntriesSaveViewModal.vue'),
      readSource('app/components/entries/EntriesManageViewsModal.vue'),
      readSource('app/components/entries/EntriesSharedViewBanner.vue')
    ].join('\n')

    expect(combined).not.toMatch(/bulk|analytics|批量|分析/)
  })
})
