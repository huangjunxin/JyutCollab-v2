<template>
  <!-- 通欄容器（2026-08-06 統一）：與全局其他頁面一致，繼承 default.vue main 的 padding -->
  <div>
    <!-- 模塊內子導航（導入報告/導出收進泛粵模塊，見 AppHeader 註釋） -->
    <FaanjyutModuleNav />
    <!-- 頁頭（§6.1） -->
    <div class="flex flex-wrap items-start gap-4 mb-4">
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
          <template v-if="matrixData">
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
    <div class="jc-card p-3 mb-3 flex flex-wrap items-center gap-2">
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
      <FaanjyutSearchSuggest />
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
        共 <strong>{{ matrixData.pagination.total.toLocaleString() }}</strong> 條 · 第
        <strong>{{ matrixData.pagination.page }}/{{ matrixData.pagination.totalPages || 1 }}</strong> 頁
      </span>
    </div>

    <!-- ?q= / ?cell= 定位提示 -->
    <div
      v-if="locateNote"
      class="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 mb-3 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2"
    >
      <UIcon name="i-heroicons-map-pin" class="w-4 h-4 shrink-0" />
      <span>{{ locateNote }}</span>
      <button type="button" class="ml-auto underline shrink-0" @click="locateNote = null">關閉</button>
    </div>

    <!-- 錯誤態 -->
    <div v-if="errorMessage" class="jc-card p-6 mb-3 text-center">
      <p class="text-sm text-red-600 dark:text-red-400 mb-3">{{ errorMessage }}</p>
      <UButton size="sm" color="neutral" variant="soft" @click="fetchMatrixData">重試</UButton>
    </div>

    <!-- 矩陣表 -->
    <FaanjyutMatrixTable
      v-else
      :columns="displayedColumns"
      :rows="matrixData?.rows ?? []"
      :loading="loading"
      :highlight-lexeme-id="highlightLexemeId"
      :highlight-source-cell="highlightSourceCell"
      :write-enabled="matrixData?.writeEnabled ?? false"
      :cell-edit="cellEdit"
    />
    <p class="text-[10px] text-gray-400 mt-2 mb-4">
      篩選 chip 只影響本頁顯示的行（在所選列中至少一格命中該態才顯示），總數仍為全表詞條數。
    </p>

    <!-- 分頁器（底部居中；翻頁保持列集與篩選） -->
    <div v-if="matrixData && matrixData.pagination.totalPages > 1" class="flex flex-col items-center gap-3 mt-2 mb-6">
      <UPagination
        :page="page"
        :total="matrixData.pagination.total"
        :items-per-page="PER_PAGE"
        size="sm"
        :disabled="loading"
        @update:page="onPageChange"
      />
      <p class="text-[11px] text-gray-400">每頁 {{ PER_PAGE }} 行 × 最多 {{ FAANJYUT_MATRIX_MAX_COLUMNS }} 列</p>
    </div>

    <!-- P5 新建詞條彈窗（§8：至少一列編輯權限 + 寫入旗標開啟時顯示按鈕） -->
    <FaanjyutCreateLexemeModal v-model:open="createModalOpen" :columns="allColumns" />
  </div>
</template>

<script setup lang="ts">
import {
  FAANJYUT_MATRIX_MAX_COLUMNS,
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

const PER_PAGE = 50
const COLUMNS_STORAGE_KEY = 'faanjyut:matrix:columns'

const route = useRoute()
const { fetchMatrix, fetchColumns, search, writeCells, locatePageByMatrixOrder } = useFaanjyutMatrix()

const page = ref(1)
/** 已選列 id；空數組 = 服務端默認列集（本人可編輯列＋穗港） */
const selectedColumnIds = ref<string[]>([])
const cellFilter = ref<FaanjyutCellState | null>(null)

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

async function fetchMatrixData() {
  loading.value = true
  errorMessage.value = null
  // 數據重載（翻頁/篩選/定位/列集變化）時清空全部編輯態（舊格可能已不在本頁）
  cellEdit.resetAll()
  try {
    matrixData.value = await fetchMatrix({
      page: page.value,
      perPage: PER_PAGE,
      columnIds: selectedColumnIds.value,
      cellFilter: cellFilter.value
    })
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || '矩陣載入失敗'
  } finally {
    loading.value = false
  }
}

function onPageChange(newPage: number) {
  if (newPage === page.value) return
  page.value = newPage
  highlightLexemeId.value = null
  highlightSourceCell.value = null
  fetchMatrixData()
}

function onColumnsChange(ids: string[]) {
  selectedColumnIds.value = ids
  persistColumnSelection(ids)
  fetchMatrixData()
}

function toggleCellFilter(value: FaanjyutCellState) {
  cellFilter.value = cellFilter.value === value ? null : value
  page.value = 1
  highlightLexemeId.value = null
  highlightSourceCell.value = null
  fetchMatrixData()
}

/** 列選擇持久化（本機；§6.2 服務端偏好屬後續階段） */
function persistColumnSelection(ids: string[]) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(ids))
  } catch { /* 忽略存儲失敗 */ }
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
 * ?q=<sourceKey> 定位：搜索 → 取 key 維度首個命中 → 按 matrixOrder 二分定位頁碼 →
 * 跳轉該頁並高亮行。無法精確定位時保留高亮 id 並在頁面說明（§6 頁面規格 3）。
 */
async function locateByQuery(q: string) {
  try {
    const res = await search(q, 5)
    const keyHit = res.groups.find((g) => g.dimension === 'key')?.hits[0]
    const hit = keyHit ?? res.groups.flatMap((g) => g.hits)[0]
    if (!hit) {
      locateNote.value = `找不到「${q}」對應的詞條，已載入第一頁。`
      await fetchMatrixData()
      return
    }
    highlightLexemeId.value = hit.lexemeId

    const matrixOrder = hit.extra?.matrixOrder
    if (typeof matrixOrder !== 'number') {
      locateNote.value = `已找到詞條（${hit.snippet}），但此命中不含排序資訊，無法計算所在頁；可點行首鍵前往詞條詳情。`
      await fetchMatrixData()
      return
    }

    // 先取第一頁拿到 totalPages，再二分定位
    const firstPage = await fetchMatrix({ page: 1, perPage: PER_PAGE, columnIds: selectedColumnIds.value })
    const totalPages = firstPage.pagination.totalPages
    const target = await locatePageByMatrixOrder(matrixOrder, PER_PAGE, totalPages)
    page.value = target ?? 1
    matrixData.value = page.value === 1
      ? firstPage
      : await fetchMatrix({ page: page.value, perPage: PER_PAGE, columnIds: selectedColumnIds.value })

    // matrixOrder 重複值跨頁邊界時試相鄰頁
    if (!matrixData.value.rows.some((r) => r.id === hit.lexemeId)) {
      for (const p of [page.value + 1, page.value - 1]) {
        if (p < 1 || p > totalPages) continue
        const data = await fetchMatrix({ page: p, perPage: PER_PAGE, columnIds: selectedColumnIds.value })
        if (data.rows.some((r) => r.id === hit.lexemeId)) {
          page.value = p
          matrixData.value = data
          break
        }
      }
    }

    if (matrixData.value.rows.some((r) => r.id === hit.lexemeId)) {
      locateNote.value = `已定位「${q}」：第 ${page.value} 頁，目標行已高亮。`
    } else {
      locateNote.value = `已定位「${q}」附近頁（第 ${page.value} 頁），但目標行未在本頁顯示；可前往詞條詳情。`
    }
  } catch {
    locateNote.value = `「${q}」搜索定位失敗，已載入第一頁。`
    await fetchMatrixData()
  }
}

/**
 * ?cell=<sourceCell> 定位（導入報告跳轉用）：目前無 sourceCell → 詞條的查詢 API，
 * 只能在已載入頁內掃描高亮；不在本頁時給出說明（§6 頁面規格 3 允許的降級）。
 */
function applyCellHighlight(sourceCell: string) {
  highlightSourceCell.value = sourceCell
  const found = (matrixData.value?.rows ?? []).some((row) =>
    Object.values(row.cells).some((cell) => cell.sourceCell === sourceCell)
  )
  locateNote.value = found
    ? `已高亮原表格 ${sourceCell}。`
    : `原表格 ${sourceCell} 不在目前頁；目前只支援頁內高亮，請配合 ?q=<詞條鍵> 定位所在頁。`
}

onMounted(async () => {
  selectedColumnIds.value = restoreColumnSelection()

  columnsLoading.value = true
  fetchColumns()
    .then((res) => {
      allColumns.value = res.columns
      allColumnsTotal.value = res.total
    })
    .catch(() => { /* 列選擇器降級為僅顯示目前列 */ })
    .finally(() => { columnsLoading.value = false })

  const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  const cell = typeof route.query.cell === 'string' ? route.query.cell.trim() : ''

  if (q) {
    cellFilter.value = null
    await locateByQuery(q)
  } else {
    await fetchMatrixData()
  }
  if (cell) {
    applyCellHighlight(cell)
  }
})
</script>

<style scoped>
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
