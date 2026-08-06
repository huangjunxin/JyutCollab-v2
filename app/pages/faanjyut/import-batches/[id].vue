<script setup lang="ts">
import type { FaanJyutFindingGroup } from '~/types/faanjyut'
import {
  faanJyutDisplayValue,
  formatFaanJyutDateTime,
  formatFaanJyutNumber
} from '~/utils/faanjyutFormat'

definePageMeta({
  layout: 'default',
  middleware: ['admin']
})

const route = useRoute()
const { data, loading, errorMessage, fetchBatch } = useFaanjyutImportBatchDetail()

const batchId = computed(() => String(route.params.id ?? ''))

watch(batchId, () => {
  fetchBatch(batchId.value)
})

onMounted(() => {
  fetchBatch(batchId.value)
})

useHead(() => ({
  title: batchId.value ? `${batchId.value} · 導入報告 · 泛粵字表` : '導入報告 · 泛粵字表'
}))

const batch = computed(() => data.value?.batch ?? null)
const precheck = computed(() => data.value?.precheck ?? null)
const write = computed(() => data.value?.write ?? null)
const indexPlan = computed(() => data.value?.indexPlan ?? null)
const rollbackCounts = computed(() => data.value?.rollbackCounts ?? null)

const countsWritten = computed<Array<[string, number]>>(() => {
  const written = batch.value?.counts?.written ?? {}
  return Object.entries(written)
})

/** counts.written 鍵的繁中說明（數值是契約對象，鍵名保持原文） */
const countKeyNotes: Record<string, string> = {
  faanjyut_columns: '方言列 132 ＋ 域外列 46',
  lexemes: '＝ validRows，矩陣行數',
  entries: '方音 Entry',
  external_etymons: '域外材料',
  faanjyut_cell_states: '含 _ / clear 狀態格',
  faanjyut_comments: '原表批註（脫敏後）',
  faanjyut_links: 'DQ／DR／見／歸 關係'
}

// ---- findings ----

function severityTone(severity: 'blocker' | 'warning'): 'red' | 'amber' {
  return severity === 'blocker' ? 'red' : 'amber'
}

function severityLabel(severity: 'blocker' | 'warning'): string {
  return severity === 'blocker' ? 'blocker' : 'warning'
}

/** sourceKey 項 → 矩陣定位（詳情路由是 lexeme id，非 sourceKey；q 參數由矩陣頁消費） */
function sourceKeyLink(sourceKey: string): string {
  return `/faanjyut?q=${encodeURIComponent(sourceKey)}`
}

/** sourceCell 項 → 矩陣定位 */
function sourceCellLink(sourceCell: string): string {
  return `/faanjyut?cell=${encodeURIComponent(sourceCell)}`
}

// ---- dry-run 證明 ----

const databaseProof = computed(() => precheck.value?.databaseProof ?? null)

const proofCollections = computed<Array<{ name: string; before: number | null; after: number | null }>>(() => {
  const proof = databaseProof.value
  if (!proof) return []
  const names = new Set([
    ...Object.keys(proof.collectionsBefore),
    ...Object.keys(proof.collectionsAfter),
    ...proof.collectionNamesBefore,
    ...proof.collectionNamesAfter
  ])
  return [...names].sort().map((name) => ({
    name,
    before: proof.collectionsBefore[name] ?? null,
    after: proof.collectionsAfter[name] ?? null
  }))
})

// ---- rollback ----

const rollbackCollections = computed<Array<{ name: string; before: number | null; after: number | null }>>(() => {
  const counts = rollbackCounts.value
  if (!counts) return []
  const names = new Set([...Object.keys(counts.before ?? {}), ...Object.keys(counts.after ?? {})])
  return [...names].sort().map((name) => ({
    name,
    before: counts.before[name] ?? null,
    after: counts.after[name] ?? null
  }))
})

function findingGroupItemsCount(groups: FaanJyutFindingGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0)
}
</script>

<template>
  <!-- 通欄容器（2026-08-06 統一）：與全局其他頁面一致，繼承 default.vue main 的 padding -->
  <div>
    <!-- 返回行 -->
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink
        to="/faanjyut/import-batches"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--jc-border)] bg-white dark:bg-[var(--jc-dark-surface)] text-[var(--jc-body)] dark:text-slate-300 hover:bg-black/5 dark:hover:bg-black/20 shadow-[var(--jc-shadow-hard)]"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        返回批次列表
      </NuxtLink>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-40 w-full" />
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <!-- 錯誤 -->
    <div v-else-if="errorMessage" class="jc-card p-6 text-center">
      <p class="text-sm font-semibold text-red-600 dark:text-red-400">{{ errorMessage }}</p>
      <p class="text-xs text-[var(--jc-muted)] mt-1">批次可能不存在，或你未有管理員權限。</p>
      <NuxtLink to="/faanjyut/import-batches" class="inline-block mt-4 text-sm text-blue-600 underline">
        返回批次列表
      </NuxtLink>
    </div>

    <template v-else-if="batch">
      <!-- ============ 批次詳情頭 ============ -->
      <section class="mb-6">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white">批次詳情</h2>
          <span class="jc-mono text-sm font-semibold text-[var(--jc-accent)]">{{ batch.batchId }}</span>
          <FaanjyutStatusBadge :status="batch.status" />
          <FaanjyutToneChip tone="blue" :label="batch.mode" />
          <FaanjyutToneChip tone="amber" :label="batch.environment" />
        </div>

        <!-- manifest 卡：來源欄位保留英文字段名（契約核對對象）＋等寬 -->
        <div class="jc-card-lg p-4 mb-4">
          <div class="flex items-center gap-2 mb-3">
            <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-[var(--jc-accent)]" />
            <h3 class="font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100">import_manifest</h3>
            <span class="text-xs text-gray-500 dark:text-slate-400">
              <template v-if="batch.precheckRunId">
                對應 dry-run：<code class="jc-mono text-blue-600">{{ batch.precheckRunId }}</code>（未寫入，證明見下方）
              </template>
              <template v-else>本批次無關聯 dry-run 預檢</template>
            </span>
          </div>

          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div class="flex gap-2">
              <dt class="w-36 shrink-0 text-[var(--jc-muted)]">sourceWorkbook</dt>
              <dd class="font-medium dark:text-slate-200">{{ batch.source.sourceWorkbook }}</dd>
            </div>
            <div class="flex gap-2">
              <dt class="w-36 shrink-0 text-[var(--jc-muted)]">sourceFileSha256</dt>
              <dd><FaanjyutCopyText :value="batch.source.sourceFileSha256" truncated /></dd>
            </div>
            <div class="flex gap-2">
              <dt class="w-36 shrink-0 text-[var(--jc-muted)]">manifestSha256</dt>
              <dd><FaanjyutCopyText :value="batch.source.manifestSha256" truncated /></dd>
            </div>
            <div class="flex gap-2">
              <dt class="w-36 shrink-0 text-[var(--jc-muted)]">bulkSize</dt>
              <dd class="jc-mono">{{ batch.bulkSize }}</dd>
            </div>
          </dl>

          <!-- 計數表（七類，契約真實導出） -->
          <div class="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
            <p class="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">
              counts.written（NDJSON 七類記錄數，契約真實導出）
            </p>
            <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <div
                v-for="[key, value] in countsWritten"
                :key="key"
                class="border border-[var(--jc-border)] bg-[#FAFAF6] dark:bg-[var(--jc-dark-surface)] px-3 py-2"
                :title="countKeyNotes[key]"
              >
                <p class="text-[11px] text-[var(--jc-muted)] jc-mono truncate">{{ key }}</p>
                <p class="text-lg font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100 jc-mono">{{ formatFaanJyutNumber(value) }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 批次資訊（繁體中文標籤） -->
        <div class="jc-card p-4 mb-4">
          <h3 class="text-sm font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100 mb-3">批次資訊</h3>
          <dl class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">模式</dt>
              <dd class="jc-mono">{{ batch.mode }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">環境</dt>
              <dd class="jc-mono">{{ batch.environment }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">狀態</dt>
              <dd><FaanjyutStatusBadge :status="batch.status" /></dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">預檢 runId</dt>
              <dd class="jc-mono">{{ batch.precheckRunId || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">報告目錄</dt>
              <dd class="jc-mono text-[13px] break-all">{{ batch.reportDir || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">寫入批次大小</dt>
              <dd class="jc-mono">{{ batch.bulkSize }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">開始時間</dt>
              <dd class="jc-mono">{{ formatFaanJyutDateTime(batch.startedAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">完成時間</dt>
              <dd class="jc-mono">{{ formatFaanJyutDateTime(batch.completedAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">失敗時間</dt>
              <dd class="jc-mono">{{ formatFaanJyutDateTime(batch.failedAt) }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[var(--jc-muted)] mb-0.5">回滾時間</dt>
              <dd class="jc-mono">{{ formatFaanJyutDateTime(batch.rolledBackAt) }}</dd>
            </div>
          </dl>
          <div v-if="batch.error" class="mt-3 border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            <span class="font-semibold">錯誤：</span><code class="jc-mono">{{ batch.error }}</code>
          </div>
        </div>
      </section>

      <!-- ============ findings（按 code 分組） ============ -->
      <section class="mb-8">
        <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-1">findings 跳轉（按 code 分組）</h2>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
          sourceKey 跳轉至<NuxtLink to="/faanjyut" class="text-blue-600 underline">矩陣定位</NuxtLink>（
          <code class="jc-mono">?q=sourceKey</code>）；sourceCell 跳轉矩陣定位（
          <code class="jc-mono">?cell=sourceCell</code>）。
        </p>

        <!-- 匯總條 -->
        <div class="jc-card p-3 mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span class="font-semibold text-[var(--jc-ink-strong)] dark:text-slate-100">findings 匯總</span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-red-600" />blocker
            <strong class="jc-mono">{{ formatFaanJyutNumber(precheck ? findingGroupItemsCount(precheck.blockers) : 0) }}</strong>
          </span>
          <span class="inline-flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500" />warning
            <strong class="jc-mono">{{ formatFaanJyutNumber(precheck ? findingGroupItemsCount(precheck.warnings) : 0) }}</strong>
          </span>
          <span class="text-xs text-gray-500 dark:text-slate-400 ml-auto">
            嚴重度：blocker（紅，阻止導入）· warning（黃，需人工核查）
          </span>
        </div>

        <template v-if="precheck">
          <!-- blocker 組 -->
          <div v-if="precheck.blockers.length" class="space-y-3 mb-3">
            <details v-for="group in precheck.blockers" :key="`b-${group.code}`" class="jc-card" open>
              <summary class="px-4 py-3 flex items-center gap-2 cursor-pointer select-none hover:bg-black/[.02] dark:hover:bg-black/20">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-[var(--jc-muted)] transition-transform group-open:rotate-90" />
                <span class="jc-mono text-[13px] font-semibold border border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 px-2 py-0.5">
                  {{ group.code }}
                </span>
                <FaanjyutToneChip tone="red" label="blocker" />
                <span class="jc-mono text-xs text-gray-500 dark:text-slate-400 ml-auto">{{ group.count }} 條</span>
              </summary>
              <FindingGroupTable :group="group" />
            </details>
          </div>

          <!-- warning 組 -->
          <div v-if="precheck.warnings.length" class="space-y-3">
            <details v-for="group in precheck.warnings" :key="`w-${group.code}`" class="jc-card" open>
              <summary class="px-4 py-3 flex items-center gap-2 cursor-pointer select-none hover:bg-black/[.02] dark:hover:bg-black/20">
                <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-[var(--jc-muted)] transition-transform group-open:rotate-90" />
                <span class="jc-mono text-[13px] font-semibold border border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 px-2 py-0.5">
                  {{ group.code }}
                </span>
                <FaanjyutToneChip tone="amber" label="warning" />
                <span class="jc-mono text-xs text-gray-500 dark:text-slate-400 ml-auto">{{ group.count }} 條</span>
              </summary>
              <FindingGroupTable :group="group" />
            </details>
          </div>

          <div v-if="precheck.blockers.length === 0 && precheck.warnings.length === 0" class="jc-card p-4 text-sm text-[var(--jc-muted)]">
            無 blocker / warning——dry-run 預檢全部通過（<span class="jc-mono">passed: {{ precheck.passed ? 'true' : 'false' }}</span>）。
          </div>
        </template>
        <div v-else class="jc-card p-4 text-sm text-[var(--jc-muted)]">
          本批次無 precheck 報告（schema_dry_run_report.json 不存在或未關聯）。
        </div>
      </section>

      <!-- ============ dry-run 證明 ============ -->
      <section v-if="databaseProof" class="mb-8">
        <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-1">dry-run 證明</h2>
        <p class="text-xs text-gray-500 dark:text-slate-400 mb-3">
          對應批次 <code class="jc-mono">{{ batch.precheckRunId || batch.batchId }}</code>——證明 dry-run 只觀察、未寫入。
        </p>

        <div class="jc-card-lg p-4">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <span
              class="px-3 py-1.5 text-sm jc-mono"
              :class="databaseProof.unchanged
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/30'"
            >unchanged: {{ databaseProof.unchanged ? 'true' : 'false' }}</span>
            <span class="text-sm text-[var(--jc-body)] dark:text-slate-300">
              writeCommandsObserved：
              <code class="jc-mono font-semibold">[]</code>（觀察到
              <strong>{{ databaseProof.writeCommandsObserved.length }}</strong> 條寫入命令）
            </span>
          </div>

          <p class="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">collections 前後計數對照（dry-run 觀察值）</p>
          <div class="overflow-x-auto mb-4">
            <table class="w-full min-w-[640px] text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-slate-700">
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">collection</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">導入前</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">dry-run 後（觀察）</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">差異</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
                <tr v-for="col in proofCollections" :key="col.name">
                  <td class="px-3 py-2 jc-mono text-[13px]">{{ col.name }}</td>
                  <td class="px-3 py-2 jc-mono">{{ col.before === null ? '—' : formatFaanJyutNumber(col.before) }}</td>
                  <td class="px-3 py-2 jc-mono">{{ col.after === null ? '—' : formatFaanJyutNumber(col.after) }}</td>
                  <td
                    class="px-3 py-2 jc-mono font-semibold"
                    :class="(col.before ?? 0) === (col.after ?? 0) ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'"
                  >
                    {{ col.before === null || col.after === null ? '—' : formatFaanJyutNumber((col.after ?? 0) - (col.before ?? 0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 索引計劃摘要 -->
          <template v-if="indexPlan">
            <p class="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">索引計劃摘要（migrate:faanjyut-indexes）</p>
            <div class="flex flex-wrap gap-2 text-xs">
              <span class="border border-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-3 py-1.5">
                create <strong class="jc-mono">{{ indexPlan.createCount }}</strong>
              </span>
              <span class="border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 px-3 py-1.5">
                drop <strong class="jc-mono">{{ indexPlan.dropCount }}</strong>
              </span>
              <span class="border border-[var(--jc-border)] bg-[#FAFAF6] dark:bg-[var(--jc-dark-surface)] px-3 py-1.5">
                headword.search 殘留 <strong class="jc-mono">{{ indexPlan.headwordSearchResidue }}</strong>
                <span class="text-gray-500 dark:text-slate-400">（方案 B：全面停讀寫後遷移）</span>
              </span>
            </div>
            <p class="text-xs text-gray-500 dark:text-slate-400 mt-2">
              正式計劃由 migrate:faanjyut-indexes 於各目標環境實探後生成。
            </p>
          </template>
        </div>
      </section>

      <!-- ============ 寫入 ============ -->
      <section v-if="write" class="mb-8">
        <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-2">寫入（import_write_report）</h2>
        <div class="jc-card p-4">
          <div class="flex flex-wrap items-center gap-3 mb-3">
            <FaanjyutToneChip :tone="write.matched ? 'green' : 'red'" :label="write.matched ? 'matched：與 manifest 一致' : 'matched：不一致'" />
            <span class="text-sm text-[var(--jc-body)] dark:text-slate-300">
              批次大小（bulkSize）：<code class="jc-mono">{{ write.bulkSize ?? '—' }}</code>
            </span>
          </div>
          <div v-if="write.counts && Object.keys(write.counts).length" class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <div
              v-for="[key, value] in Object.entries(write.counts)"
              :key="key"
              class="border border-[var(--jc-border)] bg-[#FAFAF6] dark:bg-[var(--jc-dark-surface)] px-3 py-2"
            >
              <p class="text-[11px] text-[var(--jc-muted)] jc-mono truncate">{{ key }}</p>
              <p class="text-lg font-semibold jc-mono">{{ faanJyutDisplayValue(value) }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 回滾 ============ -->
      <section v-if="rollbackCollections.length || batch.rolledBackAt" class="mb-8">
        <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-2">回滾</h2>
        <div class="jc-card p-4">
          <div class="flex flex-wrap items-center gap-2 mb-3 text-sm text-[var(--jc-body)] dark:text-slate-300">
            <FaanjyutStatusBadge :status="batch.status" />
            <span>回滾時間：<code class="jc-mono">{{ formatFaanJyutDateTime(batch.rolledBackAt) }}</code></span>
          </div>
          <div v-if="rollbackCollections.length" class="overflow-x-auto">
            <table class="w-full min-w-[560px] text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-slate-700">
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">collection</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">回滾前</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">回滾後</th>
                  <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">差異</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
                <tr v-for="col in rollbackCollections" :key="col.name">
                  <td class="px-3 py-2 jc-mono text-[13px]">{{ col.name }}</td>
                  <td class="px-3 py-2 jc-mono">{{ col.before === null ? '—' : formatFaanJyutNumber(col.before) }}</td>
                  <td class="px-3 py-2 jc-mono">{{ col.after === null ? '—' : formatFaanJyutNumber(col.after) }}</td>
                  <td class="px-3 py-2 jc-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {{ col.before === null || col.after === null ? '—' : formatFaanJyutNumber((col.after ?? 0) - (col.before ?? 0)) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="text-sm text-[var(--jc-muted)]">本批次未記錄回滾計數。</p>
        </div>
      </section>
    </template>
  </div>
</template>
