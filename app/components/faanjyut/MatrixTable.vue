<template>
  <!-- 泛粵矩陣表（FaanjyutV1Design §6.1/6.3）：原生 table + 吸頂列頭 + 吸左行頭。
       P3 只讀版：格不可進入編輯；列頭按 canEdit 區分（可編輯正常色 / 唯讀灰化+鎖）。 -->
  <div
    ref="wrapRef"
    class="fj-matrix-wrap overflow-auto bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard-lg)]"
  >
    <table class="fj-matrix">
      <colgroup>
        <col style="width: 150px">
        <col style="width: 64px">
        <col style="width: 96px">
        <col v-for="col in columns" :key="col.id" style="width: 140px">
      </colgroup>
      <thead>
        <!-- 列分組帶（簡化版：按 sourceRole 連續段分組） -->
        <tr>
          <th class="fj-sk1 px-3 text-left" colspan="3">詞條</th>
          <th
            v-for="run in groupRuns"
            :key="`${run.role}-${run.start}`"
            :colspan="run.count"
            class="px-3 text-center"
            :class="run.role === 'domestic' ? 'fj-band-domestic' : 'fj-band-external'"
          >
            {{ run.label }}
          </th>
        </tr>
        <!-- 列頭行 -->
        <tr>
          <th class="fj-sk1 px-3 py-2 text-left">
            鍵
            <span class="block text-[9px] font-normal text-gray-400 mt-0.5">點擊前往詞條詳情</span>
          </th>
          <th class="fj-sk2 px-2 py-2 text-center">代表字</th>
          <th class="fj-sk3 px-2 py-2 text-center">綜合音</th>
          <th
            v-for="col in columns"
            :key="col.id"
            class="px-3 py-2 text-left"
            :style="columnHeaderStyle(col)"
            :title="col.canEdit ? undefined : '你沒有此列的編輯權限'"
          >
            <span
              class="text-[13px] font-bold"
              :class="col.canEdit ? 'text-[var(--jc-ink-strong)] dark:text-white' : 'text-gray-500 dark:text-gray-400'"
            >{{ col.label }}</span>
            <span
              v-if="columnBadge(col)"
              class="jc-mono text-[9px] px-1 ml-1 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-slate-700/60 rounded-full"
            >{{ columnBadge(col) }}</span>
            <span
              v-if="col.canEdit"
              class="block text-[9px] font-normal mt-0.5 flex items-center gap-0.5 text-[var(--jc-accent)]"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-3 h-3" />
              可編輯
            </span>
            <span
              v-else
              class="block text-[9px] font-normal mt-0.5 flex items-center gap-0.5 text-gray-400"
            >
              <UIcon name="i-heroicons-lock-closed" class="w-3 h-3" />
              唯讀
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="rows.length === 0">
          <td :colspan="3 + columns.length" class="text-center py-12 text-sm text-gray-400">
            {{ loading ? '載入中…' : '沒有符合條件的詞條' }}
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="row.id"
          :data-lexeme-id="row.id"
          :class="{ 'fj-row-highlight': row.id === highlightLexemeId }"
        >
          <td class="fj-sk1 px-3 py-2">
            <NuxtLink
              :to="`/faanjyut/lexemes/${row.id}`"
              class="jc-mono text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
            >{{ row.sourceKey || row.id }}</NuxtLink>
          </td>
          <td class="fj-sk2 px-2 py-2 text-center jc-headword-rare-font text-xl font-bold text-[var(--jc-ink-strong)] dark:text-white">
            {{ row.representativeChar?.display || row.representativeChar?.raw || '—' }}
          </td>
          <td class="fj-sk3 px-2 py-2 text-center">
            <span class="jc-mono text-blue-600 dark:text-blue-400 font-semibold text-sm break-all">
              {{ row.compositePronunciation?.display || row.compositePronunciation?.raw || '—' }}<span
                v-if="row.compositePronunciation?.markers?.hasBang"
                class="fj-q-mark"
                title="原表存疑標記"
              >!</span><span
                v-if="row.compositePronunciation?.markers?.hasQuestion"
                class="fj-q-mark"
                title="原表存疑標記"
              >?</span>
            </span>
          </td>
          <FaanjyutCell
            v-for="col in columns"
            :key="col.id"
            :cell="row.cells[col.id]"
            :class="{ 'fj-cell-highlight': isCellHighlighted(row, col.id) }"
          />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { FaanjyutMatrixColumn, FaanjyutMatrixRow } from '~/composables/useFaanjyutMatrix'

const props = defineProps<{
  columns: FaanjyutMatrixColumn[]
  rows: FaanjyutMatrixRow[]
  loading?: boolean
  /** ?q= 定位到的高亮詞條 */
  highlightLexemeId?: string | null
  /** ?cell= 定位到的高亮格（原表 sourceCell 引用） */
  highlightSourceCell?: string | null
}>()

const wrapRef = ref<HTMLElement | null>(null)

/** 列分組帶：按 sourceRole 連續段（§6.1「列分組帶可簡化為一行分組標題行」） */
const groupRuns = computed(() => {
  const runs: Array<{ role: string; label: string; start: number; count: number }> = []
  props.columns.forEach((col, index) => {
    const last = runs[runs.length - 1]
    if (last && last.role === col.sourceRole) {
      last.count += 1
    } else {
      runs.push({
        role: col.sourceRole,
        label: col.sourceRole === 'domestic' ? '域內方言' : '域外材料',
        start: index,
        count: 1
      })
    }
  })
  return runs
})

/** 列頭副標：域內用 shortLabel，域外用 languageCode（等寬原樣） */
function columnBadge(col: FaanjyutMatrixColumn): string | null {
  if (col.sourceRole === 'external') return col.languageCode ?? null
  if (col.shortLabel && col.shortLabel !== col.label) return col.shortLabel
  return null
}

/** 列頭底色：style.color 透明度弱化，疊在不透明底上保證吸頂遮蓋（§6 頁面規格） */
function columnHeaderStyle(col: FaanjyutMatrixColumn): Record<string, string> | undefined {
  const rgba = hexToRgba(col.style?.color, 0.16)
  if (!rgba) return undefined
  return { '--fj-col-tint': rgba } as Record<string, string>
}

function hexToRgba(color: string | undefined, alpha: number): string | null {
  if (!color) return null
  const hex = color.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function isCellHighlighted(row: FaanjyutMatrixRow, columnId: string): boolean {
  if (!props.highlightSourceCell) return false
  return row.cells[columnId]?.sourceCell === props.highlightSourceCell
}

/** 定位高亮：滾動到目標行 / 目標格 */
async function scrollToHighlight() {
  await nextTick()
  const wrap = wrapRef.value
  if (!wrap) return
  if (props.highlightLexemeId) {
    wrap.querySelector(`[data-lexeme-id="${CSS.escape(props.highlightLexemeId)}"]`)
      ?.scrollIntoView({ block: 'center' })
    return
  }
  if (props.highlightSourceCell) {
    wrap.querySelector(`[data-source-cell="${CSS.escape(props.highlightSourceCell)}"]`)
      ?.scrollIntoView({ block: 'center', inline: 'center' })
  }
}

watch(
  () => [props.highlightLexemeId, props.highlightSourceCell, props.rows],
  scrollToHighlight,
  { deep: false }
)
</script>

<style>
/* 矩陣表格骨架（吸頂列頭 + 吸左行頭）；非 scoped，需覆蓋 FaanjyutCell 的 td。 */
.fj-matrix-wrap { max-height: 72vh; }
.fj-matrix { border-collapse: separate; border-spacing: 0; table-layout: fixed; width: max-content; }
.fj-matrix th, .fj-matrix td { border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; }
.fj-matrix thead th { position: sticky; z-index: 12; background: #FAFAF6; font-size: 11px; font-weight: 600; color: #4B5563; }
.fj-matrix thead tr:first-child th { top: 0; height: 28px; }
.fj-matrix thead tr:nth-child(2) th { top: 28px; vertical-align: top; }
.fj-matrix .fj-sk1 { position: sticky; left: 0; z-index: 8; background: #fff; }
.fj-matrix .fj-sk2 { position: sticky; left: 150px; z-index: 8; background: #fff; }
.fj-matrix .fj-sk3 { position: sticky; left: 214px; z-index: 8; background: #fff; }
.fj-matrix thead .fj-sk1, .fj-matrix thead .fj-sk2, .fj-matrix thead .fj-sk3 { z-index: 14; background: #FAFAF6; }
/* 列頭 tint（style.color 弱化），疊在不透明底上 */
.fj-matrix thead tr:nth-child(2) th[style*="--fj-col-tint"] {
  background: linear-gradient(0deg, var(--fj-col-tint), var(--fj-col-tint)), #FAFAF6;
}
.fj-matrix tbody tr:hover td { background: var(--jc-accent-soft); }
.fj-matrix tbody tr:hover .fj-sk1, .fj-matrix tbody tr:hover .fj-sk2, .fj-matrix tbody tr:hover .fj-sk3 { background: #FBF3F1; }
.fj-band-domestic { background: #EFF6FF !important; color: #1E40AF; }
.fj-band-external { background: #F8FAFC !important; color: #94A3B8; }
.fj-q-mark { color: #DC2626; font-weight: 700; }
/* ?q= 行高亮 / ?cell= 格高亮 */
.fj-matrix .fj-row-highlight td,
.fj-matrix .fj-row-highlight .fj-sk1,
.fj-matrix .fj-row-highlight .fj-sk2,
.fj-matrix .fj-row-highlight .fj-sk3 { background: #FBE9E4 !important; }
.fj-matrix .fj-row-highlight td:first-child { box-shadow: inset 3px 0 0 var(--jc-accent); }
.fj-matrix .fj-cell-highlight { outline: 2px solid var(--jc-accent); outline-offset: -2px; background: #FBE9E4 !important; }
/* 深色模式 */
.dark .fj-matrix th, .dark .fj-matrix td { border-right-color: #334155; border-bottom-color: #334155; }
.dark .fj-matrix thead th { background: #16202E; color: #94A3B8; }
.dark .fj-matrix .fj-sk1, .dark .fj-matrix .fj-sk2, .dark .fj-matrix .fj-sk3 { background: #1E293B; }
.dark .fj-matrix thead .fj-sk1, .dark .fj-matrix thead .fj-sk2, .dark .fj-matrix thead .fj-sk3 { background: #16202E; }
.dark .fj-matrix thead tr:nth-child(2) th[style*="--fj-col-tint"] {
  background: linear-gradient(0deg, var(--fj-col-tint), var(--fj-col-tint)), #16202E;
}
.dark .fj-matrix tbody tr:hover td { background: rgba(211, 41, 19, 0.12); }
.dark .fj-matrix tbody tr:hover .fj-sk1, .dark .fj-matrix tbody tr:hover .fj-sk2, .dark .fj-matrix tbody tr:hover .fj-sk3 { background: #2A2530; }
.dark .fj-band-domestic { background: #1E2A3A !important; color: #93C5FD; }
.dark .fj-band-external { background: #16202E !important; color: #64748B; }
.dark .fj-matrix .fj-row-highlight td,
.dark .fj-matrix .fj-row-highlight .fj-sk1,
.dark .fj-matrix .fj-row-highlight .fj-sk2,
.dark .fj-matrix .fj-row-highlight .fj-sk3 { background: #3A2521 !important; }
.dark .fj-matrix .fj-cell-highlight { background: #3A2521 !important; }
</style>
