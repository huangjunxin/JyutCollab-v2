/**
 * 共用搜索/篩選狀態管理
 *
 * 封裝詞條表格、審核隊列、編輯歷史三個頁面共用的：
 * - 搜索文字、篩選狀態（方言/狀態/主題/創建者）
 * - USelectMenu compatible computed wrappers
 * - 下拉選項 computed（方言、主題、用戶、狀態）
 * - 投稿者列表取得
 */

import { ALL_FILTER_VALUE } from '~/utils/entriesTableConstants'
import { dialectOptionsWithAll } from '~/utils/dialects'
import { getFlatThemeList, type ThemeWithPath } from '~/composables/useThemeData'
import { useAuth } from '~/composables/useAuth'

export interface SearchFiltersConfig {
  /** 狀態篩選預設值，預設 ALL_FILTER_VALUE */
  statusDefault?: string
  /** 用戶篩選「全部」標籤，預設 '全部詞條' */
  userFilterAllLabel?: string
  /** 是否顯示狀態篩選，預設 true */
  includeStatusFilter?: boolean
}

export function useSearchFilters(config: SearchFiltersConfig = {}) {
  const {
    statusDefault = ALL_FILTER_VALUE,
    userFilterAllLabel = '全部詞條',
    includeStatusFilter = true
  } = config

  const { user, isAuthenticated, isReviewer } = useAuth()

  const isReviewerOrAdmin = computed(() => isReviewer.value)

  // ---- 狀態 ----

  const searchQuery = ref('')

  const filters = reactive({
    dialect: ALL_FILTER_VALUE,
    status: statusDefault,
    theme: ALL_FILTER_VALUE,
    createdBy: '' as string | undefined
  })

  // ---- Computed wrappers（防止 USelectMenu/ComboboxItem 收到空字串） ----

  const filterDialect = computed({
    get: () => filters.dialect || ALL_FILTER_VALUE,
    set: (v) => { filters.dialect = (v === '' || v == null) ? ALL_FILTER_VALUE : v }
  })

  const filterStatus = computed({
    get: () => filters.status || ALL_FILTER_VALUE,
    set: (v) => { filters.status = (v === '' || v == null) ? statusDefault : v }
  })

  const filterTheme = computed({
    get: () => filters.theme ?? ALL_FILTER_VALUE,
    set: (v) => { filters.theme = (v === '' || v == null || v === ALL_FILTER_VALUE) ? ALL_FILTER_VALUE : v }
  })

  const filterUser = computed({
    get: () => filters.createdBy || ALL_FILTER_VALUE,
    set: (v) => { filters.createdBy = (v === '' || v == null || v === ALL_FILTER_VALUE) ? '' : v }
  })

  // ---- 下拉選項 ----

  const dialectOptions = dialectOptionsWithAll(ALL_FILTER_VALUE)

  const statusOptions = [
    { value: ALL_FILTER_VALUE, label: '全部狀態' },
    { value: 'draft', label: '草稿' },
    { value: 'pending_review', label: '待審核' },
    { value: 'approved', label: '已發佈' },
    { value: 'rejected', label: '已拒絕' }
  ]

  const themeOptions = getFlatThemeList().map((t: ThemeWithPath) => ({
    value: t.id,
    label: `${t.level3Name} (${t.level1Name} > ${t.level2Name})`
  }))

  const themeFilterOptions = [
    { value: ALL_FILTER_VALUE, label: '全部分類' },
    ...themeOptions
  ]

  // ---- 投稿者列表 ----

  const contributorsList = ref<Array<{ id: string; displayName: string; username: string }>>([])

  async function fetchContributors() {
    if (!isAuthenticated.value) return
    try {
      const res = await $fetch<{ data: Array<{ id: string; displayName: string; username: string }> }>('/api/entries/contributors')
      contributorsList.value = res.data || []
    } catch (e) {
      console.error('Failed to fetch contributors:', e)
    }
  }

  const userFilterOptions = computed(() => {
    const allOption = { value: ALL_FILTER_VALUE, label: userFilterAllLabel }
    if (!isReviewerOrAdmin.value) {
      return [
        allOption,
        { value: user.value?.id || '', label: '我的詞條' }
      ]
    }
    const contributorOptions = contributorsList.value
      .filter(c => c.id)
      .map(c => ({
        value: c.id,
        label: c.displayName || c.username
      }))
    return [allOption, ...contributorOptions]
  })

  return {
    // 常數
    ALL_FILTER_VALUE,
    // 狀態
    searchQuery,
    filters,
    // Computed wrappers
    filterDialect,
    filterStatus,
    filterTheme,
    filterUser,
    // 下拉選項
    dialectOptions,
    statusOptions,
    themeFilterOptions,
    userFilterOptions,
    // 投稿者
    contributorsList,
    fetchContributors,
    // 輔助
    isReviewerOrAdmin,
    includeStatusFilter
  }
}
