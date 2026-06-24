<template>
  <div
    ref="scrollContainer"
    class="overflow-auto bg-white dark:bg-slate-800"
    :class="{ 'grid-density-compact': density === 'compact' }"
    :style="{ contain: 'content' }"
  >
    <table
      class="w-full border-collapse"
      :style="{ tableLayout: 'fixed', minWidth: tableMinWidth + 'px' }"
    >
      <colgroup>
        <col :style="{ width: firstColumnWidth + 'px' }">
        <col
          v-for="col in columns.slice(1)"
          :key="col.key"
          :style="{ width: columnWidth(col) + 'px' }"
        >
      </colgroup>
      <thead class="sticky top-0 z-20">
        <tr class="bg-[var(--jc-canvas-soft)] dark:bg-slate-950 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
          <!-- First column header -->
          <th
            class="bg-[var(--jc-canvas-soft)] dark:bg-slate-950 px-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r-2 border-r-gray-300 dark:border-r-gray-600"
            :class="[
              density === 'compact' ? 'py-1.5' : 'py-2.5',
              stickyFirstColumn ? 'sticky left-0 z-30' : ''
            ]"
            :style="{ width: firstColumnWidth + 'px', minWidth: firstColumnWidth + 'px' }"
          >
            <span class="block truncate">{{ columns[0]?.label || '詞頭' }}</span>
          </th>
          <!-- Scrollable column headers -->
          <th
            v-for="col in columns.slice(1)"
            :key="col.key"
            class="px-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
            :class="density === 'compact' ? 'py-1.5' : 'py-2.5'"
            :style="{ width: columnWidth(col) + 'px', minWidth: columnWidth(col) + 'px' }"
          >
            <span class="block truncate">{{ col.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <template v-for="(row, rowIndex) in rows" :key="rowKey(row, rowIndex)">
          <!-- Group row (aggregated/lexeme view) -->
          <tr
            v-if="row.type === 'group'"
            class="bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-l-2 border-primary/40"
            @click="$emit('toggle-group', row.group.headwordNormalized)"
          >
            <td
              :colspan="columns.length"
              class="px-2 border-r border-gray-200 dark:border-gray-700"
              :class="density === 'compact' ? 'py-1.5' : 'py-2.5'"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <span class="font-medium text-gray-900 dark:text-white text-sm block truncate">
                    {{ row.group.headwordDisplay || '—' }}
                  </span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <UBadge
                      v-for="(e, idx) in row.group.entries.slice(0, 3)"
                      :key="e.id ?? (e as any)._tempId ?? idx"
                      size="xs"
                      variant="soft"
                      color="neutral"
                    >
                      {{ getDialectLabel(e.dialect?.name || '') || e.dialect?.name || '—' }}
                    </UBadge>
                    <UBadge
                      v-if="row.group.entries.length > 3"
                      size="xs"
                      variant="soft"
                      color="neutral"
                    >
                      +{{ row.group.entries.length - 3 }}
                    </UBadge>
                  </div>
                </div>
                <UIcon
                  :name="expandedGroups.has(row.group.headwordNormalized) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
                  class="w-5 h-5 text-gray-400 shrink-0"
                />
              </div>
            </td>
          </tr>

          <!-- Entry row -->
          <tr
            v-else
            class="hover:bg-[var(--jc-accent-soft)] dark:hover:bg-red-950/10 active:bg-gray-100 dark:active:bg-gray-800 transition-colors cursor-pointer"
            :class="{
              'bg-amber-50/50 dark:bg-amber-900/5 border-l-2 border-l-amber-400 dark:border-l-amber-600': row.entry._isDirty && !(row.entry as any)._isNew,
              'border-l-2 border-l-blue-400 dark:border-l-blue-600': (row.entry as any)._isNew,
            }"
            :style="{ minHeight: density === 'compact' ? '36px' : '48px' }"
            @click="handleEntryClick($event, row.entry)"
          >
            <!-- First column (headword) -->
            <td
              class="bg-white dark:bg-slate-800 font-medium text-gray-900 dark:text-white border-r-2 border-r-gray-200 dark:border-r-gray-700 px-2"
              :class="[
                density === 'compact' ? 'py-1.5' : 'py-2.5',
                stickyFirstColumn ? 'sticky left-0 z-10' : ''
              ]"
              :style="{ width: firstColumnWidth + 'px', minWidth: firstColumnWidth + 'px' }"
            >
              <div class="flex items-center gap-1.5 min-w-0">
                <span class="truncate text-sm">
                  {{ columns[0] ? getCellDisplay(row.entry, columns[0]) : '—' }}
                </span>
                <span v-if="row.entry._isDirty" class="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500" title="未儲存" />
                <span v-else-if="(row.entry as any)._isNew" class="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500" title="新建" />
              </div>
            </td>
            <!-- Scrollable columns -->
            <td
              v-for="col in columns.slice(1)"
              :key="col.key"
              class="px-2 text-sm border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
              :class="density === 'compact' ? 'py-1.5' : 'py-2.5'"
              :style="{ width: columnWidth(col) + 'px', minWidth: columnWidth(col) + 'px' }"
            >
              <!-- Status column with badge -->
              <template v-if="col.key === 'status'">
                <span
                  class="inline-block max-w-full overflow-hidden text-ellipsis px-1.5 py-0.5 text-xs rounded whitespace-nowrap align-middle"
                  :class="getStatusClass(row.entry.status)"
                >
                  {{ getStatusLabel(row.entry.status) }}
                </span>
              </template>
              <!-- Dialect column with badge -->
              <template v-else-if="col.key === 'dialect'">
                <span class="inline-block max-w-full overflow-hidden text-ellipsis px-1 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 whitespace-nowrap align-middle">
                  {{ getCellDisplay(row.entry, col) || '—' }}
                </span>
              </template>
              <!-- Definition (line-clamp-2) -->
              <template v-else-if="col.key === 'definition'">
                <span class="line-clamp-2 text-xs leading-relaxed">
                  {{ getCellDisplay(row.entry, col) || '—' }}
                </span>
              </template>
              <!-- Default text display (line-clamp-1) -->
              <template v-else>
                <span class="block truncate" :class="getCellClass(row.entry, col.key).join(' ')">
                  {{ getCellDisplay(row.entry, col) || '—' }}
                </span>
              </template>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import { getDialectLabel } from '~/utils/dialects'
import { STATUS_LABELS } from '~/utils/entriesTableConstants'

type MobileGroup = { headwordDisplay: string; headwordNormalized: string; entries: Entry[] }
type MobileRow =
  | { type: 'group'; group: MobileGroup; groupIndex: number }
  | { type: 'entry'; entry: Entry; groupIndex: number; entryIndexInGroup?: number }

type MobileColumnDef = { key: string; label: string; width: string; type: string; get: (e: Entry) => unknown }

const props = defineProps<{
  rows: MobileRow[]
  columns: MobileColumnDef[]
  expandedGroups: Set<string>
  density: 'standard' | 'compact'
  stickyFirstColumn: boolean
  getCellDisplay: (entry: Entry, col: MobileColumnDef) => string
  getCellClass: (entry: Entry, field: string) => string[]
}>()

const emit = defineEmits<{
  'row-click': [entry: Entry]
  'toggle-group': [headwordNormalized: string]
}>()

const scrollContainer = ref<HTMLElement | null>(null)

const firstColumnWidth = computed(() => parseColumnWidth(props.columns[0]?.width, 94))

// Track touch start position to distinguish horizontal swipe from tap
let touchStartX = 0
let touchStartY = 0
let touchMoved = false

onMounted(() => {
  scrollContainer.value?.addEventListener('touchstart', onTouchStart, { passive: true })
  scrollContainer.value?.addEventListener('touchmove', onTouchMove, { passive: true })
})

onUnmounted(() => {
  scrollContainer.value?.removeEventListener('touchstart', onTouchStart)
  scrollContainer.value?.removeEventListener('touchmove', onTouchMove)
})

function onTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  touchMoved = false
}

function onTouchMove(e: TouchEvent) {
  const dx = Math.abs(e.touches[0].clientX - touchStartX)
  const dy = Math.abs(e.touches[0].clientY - touchStartY)
  // If horizontal movement > 10px, treat as scroll, not tap
  if (dx > 10 || dx > dy) {
    touchMoved = true
  }
}

function handleEntryClick(event: MouseEvent, entry: Entry) {
  // On touch devices, suppress click if the user was scrolling horizontally
  if (touchMoved) {
    touchMoved = false
    return
  }
  emit('row-click', entry)
}

const tableMinWidth = computed(() => {
  const scrollable = props.columns.slice(1).reduce((sum, c) => sum + columnWidth(c), 0)
  return firstColumnWidth.value + scrollable
})

function parseColumnWidth(width: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(width || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function columnWidth(column: MobileColumnDef): number {
  return parseColumnWidth(column.width, 72)
}

function rowKey(row: MobileRow, index: number): string {
  if (row.type === 'group') return `group-${row.group.headwordNormalized}-${row.groupIndex}`
  return (row.entry.id || (row.entry as any)._tempId || `entry-${index}`) as string
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  pending_review: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  rejected: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
}

function getStatusClass(status?: string): string {
  return STATUS_CLASSES[status || 'draft'] || STATUS_CLASSES.draft
}

function getStatusLabel(status?: string): string {
  return (STATUS_LABELS as Record<string, string>)[status || 'draft'] || status || '草稿'
}
</script>

<style scoped>
.grid-density-compact td,
.grid-density-compact th {
  font-size: 0.75rem;
}
</style>
