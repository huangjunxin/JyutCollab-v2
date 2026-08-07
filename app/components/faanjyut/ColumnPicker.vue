<template>
  <!-- 列選擇器（§6.2）：勾選列 -> 套用後重新請求 columns 參數。
       「重設為預設」= 服務端默認列集（本人可編輯列＋穗港）。 -->
  <div ref="rootRef" class="relative">
    <button
      type="button"
      class="h-9 px-3 text-sm border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800 text-[var(--jc-body)] dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
      title="多選方言列"
      @click="toggleOpen"
    >
      <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4" />
      方言列
      <span class="jc-mono text-xs">{{ selectedCountLabel }}</span>
      <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-gray-400" />
    </button>

    <div
      v-if="open"
      class="absolute z-30 mt-1 w-72 max-h-[420px] flex flex-col bg-white dark:bg-slate-800 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-[var(--jc-shadow-hard-lg)]"
    >
      <!-- 默認列集說明（§6.2）：預設 = 本人可編輯列＋廣州/香港；選擇會記住 -->
      <div class="px-3 py-1.5 border-b border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] text-[11px] text-gray-400 dark:text-gray-500">
        預設：可編輯列＋廣州、香港；選擇會記住
      </div>
      <div class="flex-1 overflow-y-auto p-2">
        <p v-if="loading" class="text-xs text-gray-400 px-2 py-3">列清單載入中…</p>
        <template v-else>
          <div v-for="group in groupedColumns" :key="group.role" class="mb-2">
            <p class="px-2 pt-1 pb-1 text-[10px] font-semibold text-gray-400">{{ group.label }}</p>
            <label
              v-for="col in group.columns"
              :key="col.id"
              class="flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
              :title="col.canEdit ? undefined : '你沒有此列的編輯權限（唯讀可見）'"
            >
              <input
                type="checkbox"
                class="accent-[var(--jc-accent)]"
                :checked="draft.includes(col.id)"
                @change="toggleColumn(col.id)"
              >
              <span class="flex-1 truncate text-[var(--jc-body)] dark:text-gray-300">{{ col.label }}</span>
              <span v-if="col.sourceRole === 'external' && col.languageCode" class="jc-mono text-[9px] text-gray-400">{{ col.languageCode }}</span>
              <UIcon
                :name="col.canEdit ? 'i-heroicons-pencil-square' : 'i-heroicons-lock-closed'"
                class="w-3 h-3 shrink-0"
                :class="col.canEdit ? 'text-[var(--jc-accent)]' : 'text-gray-300 dark:text-gray-600'"
              />
            </label>
          </div>
        </template>
      </div>
      <div class="border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] px-3 py-2 flex items-center gap-2">
        <span class="text-[11px] text-gray-400">
          已選 <strong>{{ draft.length }}</strong>
        </span>
        <button
          type="button"
          class="ml-auto text-xs text-gray-500 dark:text-gray-400 hover:underline"
          @click="selectAll"
        >全選</button>
        <button
          type="button"
          class="text-xs text-gray-500 dark:text-gray-400 hover:underline"
          @click="clearAll"
        >清空</button>
        <button
          type="button"
          class="text-xs text-gray-500 dark:text-gray-400 hover:underline"
          @click="resetToDefault"
        >預設</button>
        <UButton size="xs" :disabled="loading" @click="apply">套用</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type FaanjyutMatrixColumn } from '~/composables/useFaanjyutMatrix'

const props = withDefaults(defineProps<{
  allColumns: FaanjyutMatrixColumn[]
  /** 已選列 id；空數組 = 服務端默認列集 */
  modelValue: string[]
  /** 目前表格實際顯示的列數（默認列集時按鈕計數用） */
  displayedCount?: number
  loading?: boolean
}>(), {
  displayedCount: 0,
  loading: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const rootRef = ref<HTMLElement | null>(null)
const open = ref(false)
const draft = ref<string[]>([])

const selectedCountLabel = computed(() =>
  props.modelValue.length > 0 ? props.modelValue.length : props.displayedCount
)

const groupedColumns = computed(() => {
  const domestic = props.allColumns.filter((c) => c.sourceRole === 'domestic')
  const external = props.allColumns.filter((c) => c.sourceRole === 'external')
  return [
    { role: 'domestic', label: `域內方言（${domestic.length}）`, columns: domestic },
    { role: 'external', label: `域外材料（${external.length}）`, columns: external }
  ].filter((g) => g.columns.length > 0)
})

function toggleColumn(id: string) {
  const index = draft.value.indexOf(id)
  if (index >= 0) {
    draft.value.splice(index, 1)
  } else {
    draft.value.push(id)
  }
}

function toggleOpen() {
  open.value = !open.value
  if (open.value) {
    draft.value = [...props.modelValue]
  }
}

function apply() {
  emit('update:modelValue', [...draft.value])
  open.value = false
}

function selectAll() {
  draft.value = props.allColumns.map((c) => c.id)
}

function clearAll() {
  draft.value = []
}

function resetToDefault() {
  draft.value = []
  emit('update:modelValue', [])
  open.value = false
}

function onClickOutside(event: MouseEvent) {
  if (open.value && rootRef.value && !rootRef.value.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>
