<script setup lang="ts">
import { formatFaanJyutDateTime, formatFaanJyutNumber } from '~/utils/faanjyutFormat'

definePageMeta({
  layout: 'default',
  middleware: ['admin']
})

const { batches, total, totalPages, page, perPage, loading, errorMessage, fetchBatches } =
  useFaanjyutImportBatches()

async function onPageChange(newPage: number) {
  await fetchBatches({ page: newPage })
}

onMounted(() => {
  fetchBatches({ page: 1 })
})

/** dry-run 批次（fjdr_ 前綴）未寫入，需標註 */
function isDryRun(batchId: string): boolean {
  return batchId.startsWith('fjdr_')
}

function modeTone(mode: string): 'blue' | 'indigo' | 'red' | 'gray' {
  if (mode === 'initial') return 'blue'
  if (mode === 'diff') return 'indigo'
  if (mode === 'final_cutover') return 'red'
  return 'gray'
}

function envTone(environment: string): 'green' | 'amber' | 'gray' {
  if (environment === 'production') return 'green'
  if (environment === 'staging') return 'amber'
  return 'gray'
}
</script>

<template>
  <!-- 通欄容器（2026-08-06 統一）：與全局其他頁面一致，繼承 default.vue main 的 padding -->
  <div>
    <!-- 模塊內子導航（矩陣/導入報告/導出三頁互通） -->
    <FaanjyutModuleNav />
    <!-- ============ 頁頭 ============ -->
    <div class="flex flex-wrap items-start gap-4 mb-4">
      <div class="flex items-start gap-3 flex-1 min-w-[300px]">
        <span class="w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--jc-accent)] bg-[var(--jc-accent-soft-strong)]">
          <UIcon name="i-heroicons-arrow-down-tray" class="w-6 h-6 text-[var(--jc-accent)]" />
        </span>
        <div>
          <h1 class="jc-serif text-2xl font-bold text-[var(--jc-ink-strong)] dark:text-white">泛粵字表 · 導入報告</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
            核查每次導入 / dry-run 的證據鏈：manifest、findings 跳轉、dry-run 未寫入證明。
            <FaanjyutToneChip tone="slate" label="僅 admin 可見" class="ml-1" />
          </p>
        </div>
      </div>
    </div>

    <!-- 說明條 -->
    <div class="jc-card border-l-4 border-l-[#3B82F6] p-3 mb-5 text-sm text-[var(--jc-body)] dark:text-slate-300">
      <strong>使用説明：</strong>批次列表＋批次詳情兩層呈現。dry-run 批次（前綴
      <code class="jc-mono">fjdr_</code>）標註「未寫入」；正式批次前綴
      <code class="jc-mono">fjb_</code>（16 位）。blocker/warning 明細可跳轉詞條（
      <code class="jc-mono">?q=sourceKey</code>）或矩陣定位（<code class="jc-mono">?cell=sourceCell</code>）。
    </div>

    <!-- ============ 批次列表 ============ -->
    <section class="mb-8">
      <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-2">批次列表</h2>

      <div v-if="errorMessage" class="jc-card p-4 mb-3 text-sm text-red-600 dark:text-red-400">
        {{ errorMessage }}
      </div>

      <div v-if="loading && batches.length === 0" class="space-y-2">
        <USkeleton v-for="i in 5" :key="i" class="h-12 w-full" />
      </div>

      <div v-else class="jc-card overflow-x-auto">
        <table class="w-full min-w-[1080px] text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-slate-700 bg-[#F8FAFC] dark:bg-[var(--jc-dark-surface)]">
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">batchId</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">mode</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">environment</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">基線</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">創建者</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">status</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">來源工作簿</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">寫入總數</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">開始時間</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">結束時間</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
            <tr
              v-for="batch in batches"
              :key="batch.batchId"
              class="hover:bg-[var(--jc-accent-soft)] dark:hover:bg-white/5"
            >
              <td class="px-3 py-2 align-top">
                <NuxtLink
                  :to="`/faanjyut/import-batches/${batch.batchId}`"
                  class="jc-mono text-[13px] font-semibold text-[var(--jc-accent)] hover:underline"
                >{{ batch.batchId }}</NuxtLink>
                <FaanjyutToneChip v-if="isDryRun(batch.batchId)" tone="gray" label="dry-run，未寫入" class="block mt-1" />
              </td>
              <td class="px-3 py-2">
                <FaanjyutToneChip :tone="modeTone(batch.mode)" :label="batch.mode" />
              </td>
              <td class="px-3 py-2">
                <FaanjyutToneChip :tone="envTone(batch.environment)" :label="batch.environment" />
              </td>
              <td class="px-3 py-2 jc-mono text-xs">{{ batch.baselineLevel || '—' }}</td>
              <td class="px-3 py-2 jc-mono text-xs" :title="batch.createdBy ?? ''">{{ batch.createdBy || '—' }}</td>
              <td class="px-3 py-2">
                <FaanjyutStatusBadge :status="batch.status" />
              </td>
              <td class="px-3 py-2 text-xs text-[var(--jc-body)] dark:text-slate-300 max-w-[220px] truncate" :title="batch.sourceWorkbook">
                {{ batch.sourceWorkbook || '—' }}
              </td>
              <td class="px-3 py-2 jc-mono text-xs">{{ formatFaanJyutNumber(batch.countsWrittenTotal) }}</td>
              <td class="px-3 py-2 jc-mono text-xs">{{ formatFaanJyutDateTime(batch.startedAt) }}</td>
              <td class="px-3 py-2 jc-mono text-xs">{{ formatFaanJyutDateTime(batch.completedAt) }}</td>
              <td class="px-3 py-2">
                <NuxtLink
                  :to="`/faanjyut/import-batches/${batch.batchId}`"
                  class="text-xs text-blue-600 dark:text-blue-400 underline"
                >查看</NuxtLink>
              </td>
            </tr>
            <tr v-if="batches.length === 0">
              <td colspan="11" class="px-3 py-6 text-center text-sm text-[var(--jc-muted)]">暫無導入批次記錄。</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between gap-2 mt-3">
        <p class="text-xs text-gray-500 dark:text-slate-400">
          共 <strong>{{ formatFaanJyutNumber(total) }}</strong> 個批次 · 每頁
          <strong>{{ perPage }}</strong> 個
        </p>
        <UPagination
          v-if="totalPages > 1"
          v-model:page="page"
          :total="totalPages"
          size="sm"
          @update:page="onPageChange"
        />
      </div>
    </section>
  </div>
</template>
