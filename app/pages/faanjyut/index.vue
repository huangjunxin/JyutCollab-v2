<template>
  <!-- 通欄容器（2026-08-06 統一）：繼承 default.vue main 的 padding。
       2026-08-07 無限滾動（方案 A·頁面級滾動版）：內容自然高度，main 縱向滾動；
       篩選欄 + 矩陣列頭 sticky 吸頂，表格全頁展開不再有內部滾動框 -->
  <div class="fj-matrix-page" :style="{ '--fj-filterbar-h': `${filterBarHeight}px` }">
    <!-- 模塊內子導航（導入報告/導出收進泛粵模塊，見 AppHeader 註釋） -->
    <div class="fj-viewport-layer">
      <FaanjyutModuleNav />
    </div>
    <!-- 頁頭（§6.1） -->
    <div class="fj-viewport-layer flex flex-wrap items-start gap-4 mb-4">
      <div
        class="w-10 h-10 flex items-center justify-center shrink-0"
        style="background: var(--jc-accent-soft-strong); border: 1px solid var(--jc-accent)"
      >
        <UIcon name="i-heroicons-table-cells" class="w-6 h-6 text-[var(--jc-accent)]" />
      </div>
      <div class="flex-1 min-w-[280px]">
        <div class="flex items-center gap-2">
          <h1 class="jc-serif text-2xl font-bold text-[var(--jc-ink-strong)] dark:text-white">泛粵字表</h1>
          <UBadge v-if="matrixData && !matrixData.writeEnabled" color="neutral" variant="soft" size="xs">
            唯讀
          </UBadge>
        </div>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          來源 <span class="jc-mono">泛粵字表 21</span>
          <template v-if="matrixData && appliedSearchQuery">
            · 搜尋結果 <strong>{{ matrixData.pagination.total.toLocaleString() }}</strong> 詞條
          </template>
          <template v-else-if="matrixData">
            · <strong>{{ matrixData.pagination.total.toLocaleString() }}</strong> 詞條
          </template>
          <template v-if="allColumnsTotal > 0">
            · 全表 <strong>{{ allColumnsTotal }}</strong> 列
          </template>
          <template v-if="displayedColumns.length > 0">
            · 目前顯示 <strong>{{ displayedColumns.length }}</strong> 列
          </template>
        </p>
        <p class="text-[11px] text-gray-400 mt-1">
          <template v-if="matrixData?.writeEnabled">
            點擊可編輯格的格即可編輯，即改即存；輸入 <span class="jc-mono">_</span> 表「確定沒有」，清空表「已清空」，保存後 5 秒內可撤銷。
          </template>
          <template v-else>
            可編輯列頭為正常色並標「可編輯」；其餘列唯讀（列頭灰化帶鎖）。目前後台寫入旗標未開啟，全頁唯讀。
          </template>
        </p>
      </div>
      <!-- 右側：新建詞條 -->
      <div class="flex items-center gap-2 ml-auto">
        <UButton
          v-if="canCreateLexeme"
          size="sm"
          color="primary"
          icon="i-heroicons-plus"
          @click="createModalOpen = true"
        >
          新建詞條
        </UButton>
      </div>
    </div>

    <!-- 篩選欄（§6.1/6.5） -->
    <div
      ref="filterBarRef"
      class="fj-filter-dock dark:bg-[var(--jc-dark-bg)]"
    >
      <div class="jc-card p-3 flex flex-wrap items-center gap-2">
      <!-- 圖例入口（§6.3）：hover 彈出完整四態說明，不常駐佔位 -->
      <UPopover
        mode="hover"
        :content="{ side: 'bottom', sideOffset: 6, align: 'start' }"
        :ui="{ content: 'bg-default text-highlighted shadow-sm rounded-sm ring ring-default px-3 py-2 text-xs' }"
      >
        <button
          type="button"
          class="h-9 px-3 text-sm border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800 text-[var(--jc-body)] dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
        >
          <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
          圖例
        </button>
        <template #content>
          <div class="space-y-1.5">
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-10 h-5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-center leading-5 jc-mono text-[10px]">mai1</span>
              正常值
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-10 h-5 border border-gray-300 dark:border-gray-600 fj-legend-absent text-center leading-5 text-gray-400 text-[10px] jc-mono">_</span>
              <span class="jc-mono">_</span>（確定沒有）
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-10 h-5 border border-gray-300 dark:border-gray-600 fj-legend-cleared text-center leading-5 text-gray-400 text-[10px] jc-mono">∅</span>
              已清空
            </span>
            <span class="flex items-center gap-1.5">
              <span class="inline-block w-10 h-5 border border-gray-300 dark:border-gray-600 fj-legend-null"></span>
              空白（從未填寫）
            </span>
            <span class="h-px bg-gray-300 dark:bg-gray-600 my-1"></span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-heroicons-lock-closed" class="w-3.5 h-3.5 text-gray-400" />
              你沒有此列的編輯權限（唯讀可見）
            </span>
          </div>
        </template>
      </UPopover>
      <FaanjyutSearchFilter
        v-model="searchInput"
        :loading="loading"
        @submit="applySearchQuery"
      />
      <FaanjyutColumnPicker
        v-model="selectedColumnIds"
        :all-columns="allColumns"
        :displayed-count="displayedColumns.length"
        :loading="columnsLoading"
        @update:model-value="onColumnsChange"
      />
      <span class="h-5 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block"></span>
      <div class="flex items-center gap-1.5 text-xs">
        <button
          v-for="chip in cellFilterChips"
          :key="chip.value"
          type="button"
          class="fj-chip rounded-full"
          :class="[
            chip.mono ? 'jc-mono' : '',
            cellFilter === chip.value
              ? 'fj-chip-active'
              : 'bg-white dark:bg-slate-800 text-[var(--jc-body)] dark:text-gray-300 border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] hover:bg-black/5 dark:hover:bg-white/5'
          ]"
          :title="chip.title"
          @click="toggleCellFilter(chip.value)"
        >{{ chip.label }}</button>
      </div>
      <span v-if="matrixData" class="ml-auto text-xs text-gray-500 dark:text-gray-400">
        已顯示 <strong>{{ matrixData.rows.length.toLocaleString() }}</strong> / <strong>{{ matrixData.pagination.total.toLocaleString() }}</strong> 行
      </span>
      </div>
    </div>

    <!-- ?cell= 定位提示 -->
    <div
      v-if="locateNote"
      class="fj-viewport-layer border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950 px-4 py-2.5 mb-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2"
    >
      <UIcon name="i-heroicons-map-pin" class="w-4 h-4 shrink-0" />
      <span>{{ locateNote }}</span>
      <button type="button" class="ml-auto underline shrink-0" @click="locateNote = null">關閉</button>
    </div>

    <!-- 錯誤態 -->
    <div v-if="errorMessage" class="fj-viewport-layer jc-card p-6 mb-3 text-center">
      <p class="text-sm text-red-600 dark:text-red-400 mb-3">{{ errorMessage }}</p>
      <UButton size="sm" color="neutral" variant="soft" @click="fetchMatrixData">重試</UButton>
    </div>

    <div
      v-else-if="loading"
      class="fj-viewport-layer fj-matrix-state"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="fj-state-content">
        <span class="fj-state-icon fj-state-icon-loading" aria-hidden="true">
          <UIcon name="i-heroicons-arrow-path" class="h-6 w-6 animate-spin" />
        </span>
        <div>
          <p class="text-base font-semibold text-[var(--jc-ink-strong)] dark:text-white">{{ loadingStateTitle }}</p>
          <p class="mt-1 text-xs text-[var(--jc-muted)] dark:text-slate-400">正在整理詞條與方言列…</p>
        </div>
      </div>
    </div>

    <div
      v-else-if="!matrixData || matrixData.rows.length === 0"
      class="fj-viewport-layer fj-matrix-state"
      role="status"
      aria-live="polite"
    >
      <div class="fj-state-content fj-state-content-empty">
        <span class="fj-state-icon" aria-hidden="true">
          <UIcon name="i-heroicons-magnifying-glass-minus" class="h-6 w-6" />
        </span>
        <div class="max-w-xl">
          <p class="break-words text-base font-semibold text-[var(--jc-ink-strong)] [overflow-wrap:anywhere] dark:text-white">{{ emptyStateTitle }}</p>
          <p class="mt-1 break-words text-xs leading-5 text-[var(--jc-muted)] [overflow-wrap:anywhere] dark:text-slate-400">{{ emptyStateDescription }}</p>
        </div>
        <UButton
          v-if="hasActiveFilters"
          type="button"
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-heroicons-arrow-path"
          @click="resetTableFilters"
        >
          重設篩選
        </UButton>
      </div>
    </div>

    <!-- 矩陣表（頁面級滾動：表格自然高度，main 縱向滾動；列頭吸頂見篩選欄註釋） -->
    <FaanjyutMatrixTable
      v-else
      :columns="displayedColumns"
      :rows="matrixData.rows"
      :highlight-lexeme-id="highlightLexemeId"
      :highlight-source-cell="highlightSourceCell"
      :write-enabled="matrixData.writeEnabled"
      :cell-edit="cellEdit"
    />
    <!-- 2026-08-07 無限滾動（方案 A）：底部「載入更多」塊追加，替代分頁跳頁；
         已顯示行數 + 軟上限提示（全表 8 千+ 行 × 最多 101 列，全量渲染不可行）。
         定位（?q=/?cell=）單塊跳轉後 page 可能已在末塊：按「可追加 / 達上限 / 末塊」三態展示 -->
    <div v-if="matrixData && !loading && matrixData.rows.length > 0" class="fj-viewport-layer flex flex-col items-center gap-2 py-4">
      <template v-if="canLoadMore">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          :loading="loadingMore"
          @click="loadMore"
        >
          載入更多（已顯示 {{ matrixData.rows.length.toLocaleString() }} / {{ matrixData.pagination.total.toLocaleString() }} 行）
        </UButton>
      </template>
      <template v-else-if="matrixData.rows.length > 0">
        <p v-if="matrixData.rows.length >= MAX_ROWS" class="text-xs text-amber-600 dark:text-amber-400">
          已載入 {{ matrixData.rows.length.toLocaleString() }} 行（達到 {{ MAX_ROWS.toLocaleString() }} 行性能上限）。
        </p>
        <p v-else-if="page >= matrixData.pagination.totalPages" class="text-xs text-gray-500 dark:text-gray-400">
          已顯示全部 {{ matrixData.rows.length.toLocaleString() }} 行。
        </p>
        <p v-else class="text-xs text-gray-500 dark:text-gray-400">
          已載入 {{ matrixData.rows.length.toLocaleString() }} 行。
        </p>
      </template>
    </div>

    <!-- P5 新建詞條彈窗（§8：至少一列編輯權限 + 寫入旗標開啟時顯示按鈕） -->
    <FaanjyutCreateLexemeModal v-model:open="createModalOpen" :columns="allColumns" />
  </div>
</template>

<script setup lang="ts">
// 審計 M53：keepalive 緩存矩陣頁（app.vue cacheablePages 含 faanjyut-matrix）——
// 「返回矩陣」恢復頁碼與列集（§7 導航承諾），不再重新掛載回第 1 頁
defineOptions({ name: 'faanjyut-matrix' })
import {
  type FaanjyutCellState,
  type FaanjyutMatrixColumn,
  type FaanjyutMatrixData
} from '~/composables/useFaanjyutMatrix'

definePageMeta({
  layout: 'default',
  middleware: ['auth'],
  name: 'faanjyut-matrix'
})

useHead({
  title: '泛粵字表 · 矩陣',
  link: [
    { rel: 'stylesheet', href: '/fonts/jyutcollab-headword-rare.css' }
  ]
})

/** 2026-08-07 無限滾動（方案 A）：每塊追加行數 + DOM 軟上限（全表 8 千+ 行 × 101 列全量渲染不可行） */
const PER_PAGE = 200
const MAX_ROWS = 3000
const COLUMNS_STORAGE_KEY = 'faanjyut:matrix:columns'

const route = useRoute()
const router = useRouter()
const { fetchMatrix, fetchColumns, writeCells } = useFaanjyutMatrix()
/** loadMore 追加失敗用 toast（不替換已有視圖） */
const toast = useToast()

const filterBarRef = ref<HTMLElement | null>(null)
const filterBarHeight = ref(0)
let filterBarObserver: ResizeObserver | null = null

function syncFilterBarHeight() {
  const el = filterBarRef.value
  if (el) filterBarHeight.value = el.offsetHeight
}

/** 已加載的頁數（1-based，每塊 PER_PAGE 行）；翻頁語義改為「載入下一塊追加」 */
const page = ref(1)
const loadingMore = ref(false)

/** 是否還能追加：未到末頁且未達 DOM 軟上限 */
const canLoadMore = computed(() => {
  const m = matrixData.value
  if (!m || loading.value) return false
  return page.value < m.pagination.totalPages && m.rows.length < MAX_ROWS
})
/** 已選列 id；空數組 = 服務端默認列集（本人可編輯列＋穗港） */
const selectedColumnIds = ref<string[]>([])
const cellFilter = ref<FaanjyutCellState | null>(null)
const searchInput = ref('')
const appliedSearchQuery = ref('')

/** P5 新建詞條彈窗（§8：按鈕僅在寫入旗標開啟且至少一列可編輯時顯示） */
const createModalOpen = ref(false)
const canCreateLexeme = computed(() =>
  matrixData.value?.writeEnabled === true && allColumns.value.some((c) => c.canEdit)
)

const matrixData = ref<FaanjyutMatrixData | null>(null)
/** 初始即 true：首次 onMounted 請求完成前顯示載入態，避免閃「沒有符合條件的詞條」 */
const loading = ref(true)
const errorMessage = ref<string | null>(null)

/** P4 格編輯狀態機（§6.4 編輯微交互）；writeEnabled=false 時保持純只讀（§14.3） */
const cellEdit = useFaanjyutCellEdit({ matrixData, writeCells })

const allColumns = ref<FaanjyutMatrixColumn[]>([])
const allColumnsTotal = ref(0)
const columnsLoading = ref(false)

const highlightLexemeId = ref<string | null>(null)
const highlightSourceCell = ref<string | null>(null)
const locateNote = ref<string | null>(null)

const displayedColumns = computed(() => matrixData.value?.columns ?? [])

const cellFilterChips: Array<{ value: FaanjyutCellState; label: string; title: string; mono?: boolean }> = [
  { value: 'null', label: '未填', title: '只顯示所選列中有空白格的詞條' },
  { value: 'normal', label: '有值', title: '只顯示所選列中有正常值的詞條' },
  { value: 'absent', label: '_', title: '只顯示所選列中標記「確定沒有」的詞條', mono: true },
  { value: 'cleared', label: '已清空', title: '只顯示所選列中有已清空格的詞條' }
]

const activeCellFilterLabel = computed(() =>
  cellFilterChips.find((chip) => chip.value === cellFilter.value)?.label ?? ''
)
const hasActiveFilters = computed(() => Boolean(appliedSearchQuery.value || cellFilter.value))
const loadingStateTitle = computed(() =>
  hasActiveFilters.value ? '正在套用篩選' : '正在載入泛粵字表'
)
const emptyStateTitle = computed(() => {
  if (appliedSearchQuery.value && cellFilter.value) return '沒有符合全部篩選條件的詞條'
  if (appliedSearchQuery.value) return `沒有找到與「${appliedSearchQuery.value}」匹配的詞條`
  if (cellFilter.value) return `沒有符合「${activeCellFilterLabel.value}」狀態的詞條`
  return '字表目前沒有詞條'
})
const emptyStateDescription = computed(() => {
  if (appliedSearchQuery.value && cellFilter.value) {
    return `搜尋「${appliedSearchQuery.value}」與「${activeCellFilterLabel.value}」狀態篩選沒有共同結果。`
  }
  if (appliedSearchQuery.value) return '沒有詞條鍵、讀音、代表字、釋義或方音格內容與此字詞匹配。'
  if (cellFilter.value) return '目前所選方言列中沒有詞條符合此格狀態。'
  return '目前沒有可顯示的泛粵字表資料。'
})

/** 重置並載入第一塊（初始 / 篩選 / 列集變化 / 定位失敗兜底）；清空全部編輯態 */
let matrixRequestId = 0

async function fetchMatrixData() {
  const requestId = ++matrixRequestId
  loading.value = true
  errorMessage.value = null
  // 數據重載（翻頁/篩選/定位/列集變化）時清空全部編輯態（舊格可能已不在本視圖）
  cellEdit.resetAll()
  try {
    const data = await fetchMatrix({
      page: 1,
      perPage: PER_PAGE,
      columnIds: selectedColumnIds.value,
      cellFilter: cellFilter.value,
      q: appliedSearchQuery.value || undefined
    })
    if (requestId !== matrixRequestId) return
    matrixData.value = data
    page.value = 1
  } catch (error: any) {
    if (requestId !== matrixRequestId) return
    errorMessage.value = error?.data?.message || error?.message || '矩陣載入失敗'
  } finally {
    if (requestId === matrixRequestId) loading.value = false
  }
}

/**
 * 追加下一塊（「載入更多」）：rows 累加、不 reset 編輯態、不影響滾動位置。
 * 返回是否成功追加（false = 已到末頁 / 達上限 / 請求失敗）。
 * 初始載入期間按鈕由 v-if !loading 隱藏。
 */
async function loadMore(): Promise<boolean> {
  const m = matrixData.value
  if (!m || loadingMore.value) return false
  if (page.value >= m.pagination.totalPages || m.rows.length >= MAX_ROWS) return false
  const requestId = matrixRequestId
  loadingMore.value = true
  try {
    const data = await fetchMatrix({
      page: page.value + 1,
      perPage: PER_PAGE,
      columnIds: selectedColumnIds.value,
      cellFilter: cellFilter.value,
      q: appliedSearchQuery.value || undefined
    })
    if (requestId !== matrixRequestId) return false
    matrixData.value = {
      ...data,
      rows: [...matrixData.value.rows, ...data.rows]
    }
    page.value += 1
    return true
  } catch (error: any) {
    // 追加失敗不替換已有視圖（與初始載入失敗的整頁錯誤態區分）
    const msg = error?.data?.message || error?.message || '載入更多失敗'
    toast.add({ title: '載入更多失敗', description: msg, color: 'error' })
    return false
  } finally {
    loadingMore.value = false
  }
}

/**
 * 定位（?cell=）用：直接請求目標塊並替換視圖（2026-08-07 修復：
 * 原 ensureLoadedTo 逐塊串行追加，服務端每塊 pivot ~2.6s，跨 14 塊要 30s+ 才看到結果；
 * 定位本質是跳轉，單次請求秒級完成，目標塊之後可用「載入更多」繼續追加）。
 * 返回替換後的數據；請求失敗返回 null。
 */
async function jumpToBlock(targetPage: number): Promise<FaanjyutMatrixData | null> {
  if (!matrixData.value) return null
  try {
    const data = await fetchMatrix({
      page: targetPage,
      perPage: PER_PAGE,
      columnIds: selectedColumnIds.value,
      cellFilter: cellFilter.value,
      q: appliedSearchQuery.value || undefined
    })
    matrixData.value = data
    page.value = targetPage
    return data
  } catch (error: any) {
    toast.add({ title: '定位失敗', description: error?.data?.message || error?.message || '載入目標塊失敗', color: 'error' })
    return null
  }
}

function onColumnsChange(ids: string[]) {
  selectedColumnIds.value = ids
  persistColumnSelection(ids)
  fetchMatrixData()
}

function toggleCellFilter(value: FaanjyutCellState) {
  cellFilter.value = cellFilter.value === value ? null : value
  highlightLexemeId.value = null
  highlightSourceCell.value = null
  fetchMatrixData()
}

let persistColumnsTimeout: ReturnType<typeof setTimeout> | null = null

/** 列選擇持久化（審計 M52：服務端偏好 §6.2 + 本機 localStorage 兜底）
 *  審計 M53 修復：服務端 PUT debounce 500ms，快速切列合併為最後一次（避免亂序請求）；
 *  本機 localStorage 即時寫入，不影響客戶端列選擇響應性 */
function persistColumnSelection(ids: string[]) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(ids))
  } catch { /* 忽略存儲失敗 */ }
  if (persistColumnsTimeout) clearTimeout(persistColumnsTimeout)
  persistColumnsTimeout = setTimeout(() => {
    // 服務端記住（普通 user preference）；失敗靜默（下次仍可用本機/默認列集）
    $fetch('/api/faanjyut/preferences', { method: 'PUT', body: { matrixColumns: ids } })
      .catch(() => { /* 偏好保存失敗不阻塞使用 */ })
  }, 500)
}

/** 服務端列偏好（§6.2）；無偏好/失敗 → null（前端回退 localStorage） */
async function fetchServerColumnPreferences(): Promise<string[] | null> {
  if (!import.meta.client) return null
  try {
    const res = await $fetch<{ success: boolean; data: { matrixColumns: string[] } }>('/api/faanjyut/preferences')
    const cols = res?.data?.matrixColumns
    return Array.isArray(cols) && cols.length > 0 ? cols.filter((x): x is string => typeof x === 'string') : null
  } catch {
    return null
  }
}

function restoreColumnSelection(): string[] {
  if (!import.meta.client) return []
  try {
    const raw = localStorage.getItem(COLUMNS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * ?cell=<sourceCell> 定位（導入報告跳轉用，審計 M64）：已加載行內掃描優先；
 * 未命中 → locate-cell API 查所在塊並追加載入到該塊高亮（不再降級為「不在目前頁」）。
 */
async function applyCellHighlight(sourceCell: string) {
  highlightSourceCell.value = sourceCell
  const found = (matrixData.value?.rows ?? []).some((row) =>
    Object.values(row.cells).some((cell) => cell.sourceCell === sourceCell)
  )
  if (found) {
    locateNote.value = `已高亮原表格 ${sourceCell}。`
    return
  }
  try {
    const res = await $fetch<{ success: boolean; data: { page: number; sourceKey: string | null } }>(
      `/api/faanjyut/locate-cell?cell=${encodeURIComponent(sourceCell)}&perPage=${PER_PAGE}`
    )
    const targetPage = res.data.page
    if (targetPage > page.value) {
      await jumpToBlock(targetPage)
    }
    const nowFound = (matrixData.value?.rows ?? []).some((row) =>
      Object.values(row.cells).some((cell) => cell.sourceCell === sourceCell)
    )
    locateNote.value = nowFound
      ? `已定位原表格 ${sourceCell}：第 ${page.value} 塊，目標格已高亮。`
      : `已定位至第 ${page.value} 塊附近（${res.data.sourceKey ?? '未知詞條'}），目標格未顯示。`
  } catch {
    locateNote.value = `原表格 ${sourceCell} 定位失敗（找不到對應格或詞條）。`
  }
}

/**
 * 審計 M53 修復：?q=/?cell= query 參數處理（原 onMounted 內聯邏輯抽出）。
 * KeepAlive 返回矩陣時 route.query 可能已變化（如從導入報告/詳情頁
 * navigateTo({ path: '/faanjyut', query: { cell: 'xxx' } })），故首次掛載與重新激活共用。
 */
async function handleQueryParams() {
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  const cell = typeof route.query.cell === 'string' ? route.query.cell.trim() : ''

  appliedSearchQuery.value = q
  searchInput.value = q
  await fetchMatrixData()
  if (cell) {
    await applyCellHighlight(cell)
  }
}

async function applySearchQuery() {
  const nextQuery = searchInput.value.trim()
  if (nextQuery === appliedSearchQuery.value && matrixData.value && !errorMessage.value) return
  appliedSearchQuery.value = nextQuery
  highlightLexemeId.value = null
  highlightSourceCell.value = null
  locateNote.value = null

  const nextRouteQuery = { ...route.query }
  if (nextQuery) nextRouteQuery.q = nextQuery
  else delete nextRouteQuery.q
  router.replace({ query: nextRouteQuery }).catch(() => {})
  await fetchMatrixData()
}

async function resetTableFilters() {
  searchInput.value = ''
  appliedSearchQuery.value = ''
  cellFilter.value = null
  highlightLexemeId.value = null
  highlightSourceCell.value = null
  locateNote.value = null

  const nextRouteQuery = { ...route.query }
  delete nextRouteQuery.q
  router.replace({ query: nextRouteQuery }).catch(() => {})
  await fetchMatrixData()
}

/** 審計 M53 修復：KeepAlive 下首次掛載 onMounted/onActivated 都會觸發，flag 跳過首次 onActivated 避免重複請求 */
let mounted = false

/** 2026-08-08：頁面級滾動後，滾動位置在 layout 共享的 main 容器上（原 wrap 內部滾動由
 *  keepalive DOM 緩存自動保留）。離開矩陣頁時記下 main.scrollTop，返回時恢復。 */
let savedMainScroll = 0
let savedMainScrollLeft = 0

onDeactivated(() => {
  const main = document.querySelector('main')
  savedMainScroll = main?.scrollTop ?? 0
  savedMainScrollLeft = main?.scrollLeft ?? 0
})

onMounted(async () => {
  syncFilterBarHeight()
  if (typeof ResizeObserver !== 'undefined' && filterBarRef.value) {
    filterBarObserver = new ResizeObserver(syncFilterBarHeight)
    filterBarObserver.observe(filterBarRef.value)
  }

  // 審計 M52：服務端偏好優先，無則回退本機
  selectedColumnIds.value = (await fetchServerColumnPreferences()) ?? restoreColumnSelection()

  columnsLoading.value = true
  fetchColumns()
    .then((res) => {
      allColumns.value = res.columns
      allColumnsTotal.value = res.total
    })
    .catch(() => { /* 列選擇器降級為僅顯示目前列 */ })
    .finally(() => { columnsLoading.value = false })

  await handleQueryParams()
  mounted = true
})

// 審計 M53 修復：從詳情頁等返回（KeepAlive 命中）時 onMounted 不再觸發，需在此重新處理 ?q=/?cell=。
// 2026-08-07 無限滾動版：無 query 參數時保留 keepalive 緩存的已加載行與滾動位置，不重拉第一塊
// （原「恢復頁碼」語義自然升級為「恢復已加載行數」）。
onActivated(() => {
  if (!mounted) return
  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  const cell = typeof route.query.cell === 'string' ? route.query.cell.trim() : ''
  if (q || cell) {
    handleQueryParams()
  } else if (!matrixData.value) {
    fetchMatrixData()
  } else {
    // 無 query：保留 keepalive 緩存的數據與列集，恢復離開時的滾動位置
    const main = document.querySelector('main')
    if (main) {
      main.scrollTop = savedMainScroll
      main.scrollLeft = savedMainScrollLeft
    }
  }
})

onBeforeUnmount(() => {
  filterBarObserver?.disconnect()
  filterBarObserver = null
})
</script>

<style scoped>
.fj-matrix-page {
  --fj-main-gutter: 12px;
  width: max-content;
  min-width: 100%;
}
.fj-viewport-layer {
  position: sticky;
  left: 0;
  width: calc(100vw - var(--fj-main-gutter) * 2);
  width: 100cqw;
}
.fj-filter-dock {
  position: sticky;
  top: calc(var(--fj-main-gutter) * -1);
  left: calc(var(--fj-main-gutter) * -1);
  z-index: 40;
  width: calc(100cqw + var(--fj-main-gutter) * 2);
  margin-left: calc(var(--fj-main-gutter) * -1);
  padding: 0 var(--fj-main-gutter) 12px;
  background: var(--jc-paper);
}
.fj-matrix-state {
  min-height: clamp(280px, 42vh, 420px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--jc-border);
  background: #fff;
  box-shadow: var(--jc-shadow-hard-lg);
}
.fj-state-content {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 28px;
}
.fj-state-content-empty {
  flex-direction: column;
  text-align: center;
}
.fj-state-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--jc-accent);
  background: var(--jc-accent-soft-strong);
  color: var(--jc-accent);
}
.fj-state-icon-loading {
  border-color: var(--jc-border);
  background: var(--jc-canvas-soft);
  color: var(--jc-muted);
}
.dark .fj-matrix-state {
  border-color: var(--jc-dark-border);
  background: var(--jc-dark-surface);
}
.dark .fj-state-icon-loading {
  border-color: var(--jc-dark-border);
  background: var(--jc-dark-bg);
}
@media (min-width: 640px) {
  .fj-matrix-page { --fj-main-gutter: 16px; }
}
@media (min-width: 768px) {
  .fj-matrix-page { --fj-main-gutter: 24px; }
}
.fj-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-width: 1px;
  border-style: solid;
}
.fj-chip-active {
  background: var(--jc-accent-soft-strong);
  color: var(--jc-accent);
  border-color: var(--jc-accent);
}
.fj-legend-absent { background: #EDF2F7; }
.fj-legend-cleared { background: #FDF6E0; }
.fj-legend-null { background: #FBFBF8; }
.dark .fj-legend-absent { background: #263242; }
.dark .fj-legend-cleared { background: #3A3421; }
.dark .fj-legend-null { background: #1B2530; }
</style>
