<script setup lang="ts">
import { formatFaanJyutDateTime, formatFaanJyutNumber } from '~/utils/faanjyutFormat'
import type { FaanJyutExportOptions } from '~/types/faanjyut'

definePageMeta({
  layout: 'default',
  middleware: ['admin']
})

const {
  batches, total, totalPages, page, perPage, loading, errorMessage,
  pendingExportId, createExport, fetchBatches, startPolling, stopPolling
} = useFaanjyutExport()
const toast = useToast()

// 三個開關（FaanjyutV1Design §10.2：includeDrafts 默認關 / includeAudit 僅 admin / includeStyles）
const includeDrafts = ref(false)
const includeAudit = ref(false)
const includeStyles = ref(false)

const generating = computed(() => pendingExportId.value !== null)

async function onGenerate() {
  if (generating.value) return
  const options: FaanJyutExportOptions = {
    includeDrafts: includeDrafts.value,
    includeAudit: includeAudit.value,
    includeStyles: includeStyles.value
  }
  try {
    const batch = await createExport(options)
    pendingExportId.value = batch.id
    toast.add({
      title: 'backup 導出已開始',
      description: batch.fileName,
      icon: 'i-heroicons-arrow-up-tray'
    })
    startPolling()
    await fetchBatches({ page: 1 })
  } catch (error: any) {
    toast.add({
      title: '啟動導出失敗',
      description: error?.data?.message || error?.message || '請稍後重試',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
  }
}

// 輪詢結果：pending 批次出現終態 → toast + 停止輪詢
watch([pendingExportId, batches], () => {
  const id = pendingExportId.value
  if (!id) return
  const target = batches.value.find((b) => b.id === id)
  if (!target) return
  if (target.status === 'completed') {
    toast.add({
      title: 'backup 已生成',
      description: `${target.fileName}（${formatFileSize(target.fileSize)}）`,
      color: 'success',
      icon: 'i-heroicons-check-circle'
    })
    pendingExportId.value = null
    stopPolling()
  } else if (target.status === 'failed') {
    toast.add({
      title: '導出失敗',
      description: target.error || '請查看批次狀態',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle'
    })
    pendingExportId.value = null
    stopPolling()
  }
})

async function onPageChange(newPage: number) {
  await fetchBatches({ page: newPage })
}

onMounted(() => {
  fetchBatches({ page: 1 })
})

onBeforeUnmount(() => {
  stopPolling()
})

/** 字節數 → 可讀大小（B/KB/MB） */
function formatFileSize(bytes: number | null): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '—'
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

/** 開關狀態簡標：含=✓ / 不含=✗ */
function switchText(flag: boolean): string {
  return flag ? '含 ✓' : '不含 ✗'
}
</script>

<template>
  <div class="mx-auto max-w-[1400px] p-4 sm:p-6">
    <!-- 模塊內子導航（矩陣/導入報告/導出三頁互通） -->
    <FaanjyutModuleNav />
    <!-- ============ 頁頭 ============ -->
    <div class="flex flex-wrap items-start gap-4 mb-4">
      <div class="flex items-start gap-3 flex-1 min-w-[300px]">
        <span class="w-10 h-10 shrink-0 flex items-center justify-center border border-[var(--jc-accent)] bg-[var(--jc-accent-soft-strong)]">
          <UIcon name="i-heroicons-arrow-up-tray" class="w-6 h-6 text-[var(--jc-accent)]" />
        </span>
        <div>
          <h1 class="jc-serif text-2xl font-bold text-[var(--jc-ink-strong)] dark:text-white">泛粵字表 · 導出</h1>
          <p class="text-sm text-gray-500 dark:text-slate-400 mt-1">
            生成 backup ZIP（manifest + 各 NDJSON，含每文件記錄數與 SHA-256）並可重新下載。
            <FaanjyutToneChip tone="slate" label="僅 admin 可見" class="ml-1" />
          </p>
        </div>
      </div>
    </div>

    <!-- 說明條 -->
    <div class="jc-card border-l-4 border-l-[#3B82F6] p-3 mb-5 text-sm text-[var(--jc-body)] dark:text-slate-300">
      <strong>使用説明：</strong>v1 只有 backup 一種 scope——全部詞條組＋全部格＋註釋/鏈接/域外。
      <code class="jc-mono">includeDrafts</code> 默認關（排除草稿詞條及其關聯）；
      <code class="jc-mono">includeAudit</code> 含泛粵編輯歷史（僅 admin）；<code class="jc-mono">includeStyles</code>
      保留列樣式。導出在後台生成（瀏覽器可關閉頁面，生成完成後重新打開即可下載）；
      下載為流式 ZIP，manifest 自身即包內證據（每文件記錄數 + SHA-256 可復算）。
    </div>

    <!-- ============ 生成表單 ============ -->
    <section class="mb-8">
      <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-2">生成 backup</h2>
      <div class="jc-card p-4">
        <div class="flex flex-wrap items-center gap-x-8 gap-y-3">
          <label class="flex items-center gap-2 text-sm text-[var(--jc-body)] dark:text-slate-300">
            <USwitch v-model="includeDrafts" size="md" :disabled="generating" />
            含草稿詞條（<code class="jc-mono">includeDrafts</code>）
          </label>
          <label class="flex items-center gap-2 text-sm text-[var(--jc-body)] dark:text-slate-300">
            <USwitch v-model="includeAudit" size="md" :disabled="generating" />
            含編輯歷史（<code class="jc-mono">includeAudit</code>）
          </label>
          <label class="flex items-center gap-2 text-sm text-[var(--jc-body)] dark:text-slate-300">
            <USwitch v-model="includeStyles" size="md" :disabled="generating" />
            保留列樣式（<code class="jc-mono">includeStyles</code>）
          </label>
          <div class="ml-auto">
            <UButton
              color="primary"
              icon="i-heroicons-arrow-up-tray"
              :loading="generating"
              :disabled="generating"
              @click="onGenerate"
            >
              {{ generating ? '生成中…' : '生成 backup' }}
            </UButton>
          </div>
        </div>
        <p v-if="generating" class="mt-3 text-xs text-blue-600 dark:text-blue-400">
          backup 正在後台生成（批次 <span class="jc-mono">{{ pendingExportId }}</span>），完成後自動刷新，可離開頁面稍後再來下載。
        </p>
      </div>
    </section>

    <!-- ============ 導出歷史 ============ -->
    <section class="mb-8">
      <h2 class="jc-serif text-lg font-bold text-[var(--jc-ink-strong)] dark:text-white mb-2">導出歷史</h2>

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
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">時間</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">檔名</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">開關</th>
              <th class="text-right px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">大小</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">生成者</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">狀態</th>
              <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-slate-700">
            <tr
              v-for="batch in batches"
              :key="batch.id"
              class="hover:bg-[var(--jc-accent-soft)] dark:hover:bg-white/5"
            >
              <td class="px-3 py-2 jc-mono text-xs">{{ formatFaanJyutDateTime(batch.createdAt) }}</td>
              <td class="px-3 py-2">
                <span class="jc-mono text-[13px] text-[var(--jc-ink-strong)] dark:text-white">{{ batch.fileName }}</span>
                <span class="block text-xs text-[var(--jc-muted)] jc-mono">{{ batch.id }}</span>
              </td>
              <td class="px-3 py-2 text-xs text-[var(--jc-body)] dark:text-slate-300">
                <span>草稿 {{ switchText(batch.options.includeDrafts) }}</span>
                <span class="mx-1 text-[var(--jc-muted)]">·</span>
                <span>歷史 {{ switchText(batch.options.includeAudit) }}</span>
                <span class="mx-1 text-[var(--jc-muted)]">·</span>
                <span>樣式 {{ switchText(batch.options.includeStyles) }}</span>
              </td>
              <td class="px-3 py-2 jc-mono text-xs text-right">{{ formatFileSize(batch.fileSize) }}</td>
              <td class="px-3 py-2 text-xs text-[var(--jc-body)] dark:text-slate-300">{{ batch.createdBy }}</td>
              <td class="px-3 py-2">
                <FaanjyutStatusBadge :status="batch.status" />
              </td>
              <td class="px-3 py-2">
                <a
                  v-if="batch.downloadable"
                  :href="`/api/faanjyut/export-batches/${batch.id}/file`"
                  class="text-xs text-blue-600 dark:text-blue-400 underline"
                >下載</a>
                <span v-else class="text-xs text-[var(--jc-muted)]">—</span>
              </td>
            </tr>
            <tr v-if="batches.length === 0">
              <td colspan="7" class="px-3 py-6 text-center text-sm text-[var(--jc-muted)]">暫無導出記錄。</td>
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
