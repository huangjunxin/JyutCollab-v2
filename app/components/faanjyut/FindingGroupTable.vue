<script setup lang="ts">
import type { FaanJyutFindingGroup } from '~/types/faanjyut'

/**
 * findings 組內明細表（message / sourceKey / sourceCell / objectId）。
 * sourceKey 項 → 矩陣定位 ?q=sourceKey；sourceCell 項 → 矩陣定位 ?cell=sourceCell
 * （詳情路由為 lexeme id 而非 sourceKey，故一律走矩陣查詢參數；缺省欄位顯示「—」）。
 */
defineProps<{
  group: FaanJyutFindingGroup
}>()

function sourceKeyLink(sourceKey: string): string {
  return `/faanjyut?q=${encodeURIComponent(sourceKey)}`
}

function sourceCellLink(sourceCell: string): string {
  return `/faanjyut?cell=${encodeURIComponent(sourceCell)}`
}
</script>

<template>
  <div class="px-4 pb-4 border-t border-gray-100 dark:border-slate-700 pt-3 overflow-x-auto">
    <table class="w-full min-w-[980px] text-sm">
      <thead>
        <tr class="border-b border-gray-200 dark:border-slate-700">
          <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">message</th>
          <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">sourceKey</th>
          <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">sourceCell</th>
          <th class="text-left px-3 py-2 text-xs font-semibold text-[var(--jc-muted)]">objectId</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-slate-700">
        <tr v-for="(item, index) in group.items" :key="index">
          <td class="px-3 py-2 text-[13px] dark:text-slate-200">{{ item.message }}</td>
          <td class="px-3 py-2">
            <NuxtLink
              v-if="item.sourceKey"
              :to="sourceKeyLink(item.sourceKey)"
              class="jc-mono text-[12px] text-blue-600 dark:text-blue-400 underline"
            >{{ item.sourceKey }}</NuxtLink>
            <span v-else class="jc-mono text-[12px] text-gray-400">—</span>
          </td>
          <td class="px-3 py-2">
            <NuxtLink
              v-if="item.sourceCell"
              :to="sourceCellLink(item.sourceCell)"
              class="jc-mono text-[12px] text-blue-600 dark:text-blue-400 underline"
            >{{ item.sourceCell }}</NuxtLink>
            <span v-else class="jc-mono text-[12px] text-gray-400">—</span>
          </td>
          <td class="px-3 py-2 jc-mono text-[12px] dark:text-slate-300">{{ item.objectId || '—' }}</td>
        </tr>
        <tr v-if="group.items.length === 0">
          <td colspan="4" class="px-3 py-4 text-xs text-gray-500 dark:text-slate-400">
            無記錄——任何一條 blocker 都會中止導入。
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
