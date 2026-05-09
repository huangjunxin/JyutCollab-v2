<template>
  <div class="inline-flex items-center gap-2 flex-wrap">
      <UTooltip text="進階篩選">
        <UButton
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-heroicons-funnel"
          class="h-8 w-8 justify-center p-0"
          aria-label="進階篩選"
          :aria-expanded="expanded"
          aria-controls="entries-advanced-filter-panel"
          @click="emit('update:expanded', !expanded)"
        />
      </UTooltip>
      <UBadge
        v-if="hasActiveAdvancedFilters"
        color="primary"
        variant="soft"
        class="self-center"
      >
        進階篩選顯示 {{ visibleCount }} / {{ loadedCount }} 項目前已載入結果。
      </UBadge>
  </div>

  <Teleport v-if="expanded && teleportTo && canTeleport" :to="teleportTo">
    <div
      id="entries-advanced-filter-panel"
      class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
    >
      <div class="flex flex-col gap-1">
        <label for="advanced-formula-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
          公式篩選
        </label>
        <UInput
          id="advanced-formula-input"
          :model-value="formulaInput"
          size="sm"
          class="w-full"
          placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
          aria-describedby="advanced-filter-helpers advanced-formula-error"
          @update:model-value="emit('update:formulaInput', String($event ?? ''))"
          @keyup.enter="emit('apply')"
        />
        <p
          v-if="formulaError"
          id="advanced-formula-error"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          公式無法套用：{{ formulaError }} 請檢查公式語法、欄位名稱或函數參數。
        </p>
      </div>

      <div class="flex flex-col gap-1">
        <label for="advanced-regex-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
          正則篩選
        </label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <USelectMenu
            :model-value="regexField"
            :items="regexFieldOptions"
            value-key="value"
            size="sm"
            class="w-full sm:w-44"
            placeholder="任何欄位"
            aria-label="正則篩選欄位"
            @update:model-value="emit('update:regexField', String($event ?? ''))"
          />
          <UInput
            id="advanced-regex-input"
            :model-value="regexPattern"
            size="sm"
            class="w-full"
            placeholder="輸入正則表達式"
            aria-describedby="advanced-regex-error"
            @update:model-value="emit('update:regexPattern', String($event ?? ''))"
            @keyup.enter="emit('apply')"
          />
        </div>
        <p
          v-if="regexError"
          id="advanced-regex-error"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          正則表達式無法套用：{{ regexError }} 請檢查括號、轉義符號或旗標。
        </p>
      </div>

      <div
        id="advanced-filter-helpers"
        class="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1"
      >
        <p>可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status</p>
        <p>支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH</p>
        <p id="advanced-filter-readonly-helper">進階篩選只影響目前已載入的詞條，不會修改資料。</p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="primary"
          variant="solid"
          size="sm"
          @click="emit('apply')"
        >
          套用進階篩選
        </UButton>
        <UButton
          color="neutral"
          variant="soft"
          size="sm"
          @click="emit('clear')"
        >
          清除進階篩選
        </UButton>
      </div>
    </div>
  </Teleport>

  <div
    v-else-if="expanded"
    id="entries-advanced-filter-panel"
    class="w-full flex flex-col gap-3 border-t border-gray-200 dark:border-gray-700 pt-3 mt-2"
  >
    <div class="flex flex-col gap-1">
      <label for="advanced-formula-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
        公式篩選
      </label>
      <UInput
        id="advanced-formula-input"
        :model-value="formulaInput"
        size="sm"
        class="w-full"
        placeholder="例如：=AND(status = &quot;草稿&quot;, ISBLANK(definition))"
        aria-describedby="advanced-filter-helpers advanced-formula-error"
        @update:model-value="emit('update:formulaInput', String($event ?? ''))"
        @keyup.enter="emit('apply')"
      />
      <p
        v-if="formulaError"
        id="advanced-formula-error"
        role="alert"
        class="text-sm text-red-600 dark:text-red-400"
      >
        公式無法套用：{{ formulaError }} 請檢查公式語法、欄位名稱或函數參數。
      </p>
    </div>

    <div class="flex flex-col gap-1">
      <label for="advanced-regex-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
        正則篩選
      </label>
      <div class="flex flex-col gap-2 sm:flex-row">
        <USelectMenu
          :model-value="regexField"
          :items="regexFieldOptions"
          value-key="value"
          size="sm"
          class="w-full sm:w-44"
          placeholder="任何欄位"
          aria-label="正則篩選欄位"
          @update:model-value="emit('update:regexField', String($event ?? ''))"
        />
        <UInput
          id="advanced-regex-input"
          :model-value="regexPattern"
          size="sm"
          class="w-full"
          placeholder="輸入正則表達式"
          aria-describedby="advanced-regex-error"
          @update:model-value="emit('update:regexPattern', String($event ?? ''))"
          @keyup.enter="emit('apply')"
        />
      </div>
      <p
        v-if="regexError"
        id="advanced-regex-error"
        role="alert"
        class="text-sm text-red-600 dark:text-red-400"
      >
        正則表達式無法套用：{{ regexError }} 請檢查括號、轉義符號或旗標。
      </p>
    </div>

    <div
      id="advanced-filter-helpers"
      class="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1"
    >
      <p>可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status</p>
      <p>支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH</p>
      <p id="advanced-filter-readonly-helper">進階篩選只影響目前已載入的詞條，不會修改資料。</p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <UButton
        color="primary"
        variant="solid"
        size="sm"
        @click="emit('apply')"
      >
        套用進階篩選
      </UButton>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        @click="emit('clear')"
      >
        清除進階篩選
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:formulaInput': [value: string]
  'update:regexField': [value: string]
  'update:regexPattern': [value: string]
  apply: []
  clear: []
}>()

const props = defineProps<{
  expanded: boolean
  teleportTo?: string
  formulaInput: string
  regexField: string
  regexPattern: string
  fieldOptions: Array<{ value: string; label: string }>
  formulaError?: string
  regexError?: string
  hasActiveAdvancedFilters: boolean
  visibleCount: number
  loadedCount: number
}>()

const regexFieldOptions = computed(() => [
  { value: 'any', label: '任何欄位' },
  ...props.fieldOptions
])

const canTeleport = ref(false)
onMounted(() => {
  if (!props.teleportTo) return
  try {
    canTeleport.value = !!document.querySelector(props.teleportTo)
  } catch {
    canTeleport.value = false
  }
})
</script>