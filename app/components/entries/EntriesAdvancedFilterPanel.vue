<template>
  <div class="inline-flex items-center gap-2 flex-wrap">
      <UButton
        size="sm"
        color="neutral"
        variant="soft"
        icon="i-heroicons-funnel"
        aria-label="進階篩選"
        :aria-expanded="expanded"
        aria-controls="entries-advanced-filter-panel"
        @click="emit('update:expanded', !expanded)"
      />
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

      <div class="flex flex-col gap-3 xl:flex-row xl:items-end">
        <div class="flex flex-col gap-1 xl:w-1/2">
          <div class="flex items-center gap-2">
            <label for="advanced-global-regex-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
              正則搜尋
            </label>
            <UButton
              size="xs"
              :color="globalRegexEnabled ? 'primary' : 'neutral'"
              :variant="globalRegexEnabled ? 'soft' : 'ghost'"
              :aria-pressed="globalRegexEnabled"
              @click="emit('update:globalRegexEnabled', !globalRegexEnabled)"
            >
              {{ globalRegexEnabled ? '已啟用' : '啟用' }}
            </UButton>
          </div>
          <UInput
            id="advanced-global-regex-input"
            :model-value="globalRegexInput"
            size="sm"
            class="w-full"
            placeholder="輸入正則表達式，只搜尋目前已載入的詞條"
            aria-describedby="advanced-global-regex-error advanced-filter-readonly-helper"
            @update:model-value="emit('update:globalRegexInput', String($event ?? ''))"
            @keyup.enter="emit('apply')"
          />
          <p
            v-if="globalRegexError"
            id="advanced-global-regex-error"
            role="alert"
            class="text-sm text-red-600 dark:text-red-400"
          >
            正則表達式無法套用：{{ globalRegexError }} 請檢查括號、轉義符號或旗標。
          </p>
        </div>

        <div class="flex flex-col gap-1 xl:w-1/2">
          <label class="text-xs font-semibold text-gray-700 dark:text-gray-200">
            欄位正則篩選
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <USelectMenu
              :model-value="columnRegexField"
              :items="fieldOptions"
              value-key="value"
              size="sm"
              class="w-full sm:w-56"
              placeholder="選擇欄位"
              aria-label="欄位正則篩選"
              @update:model-value="emit('update:columnRegexField', String($event ?? ''))"
            />
            <UInput
              :model-value="columnRegexPattern"
              size="sm"
              class="w-full"
              placeholder="輸入此欄位的正則表達式"
              aria-label="欄位正則篩選"
              aria-describedby="advanced-column-regex-error advanced-filter-readonly-helper"
              @update:model-value="emit('update:columnRegexPattern', String($event ?? ''))"
              @keyup.enter="emit('apply')"
            />
          </div>
          <p
            v-if="columnRegexError"
            id="advanced-column-regex-error"
            role="alert"
            class="text-sm text-red-600 dark:text-red-400"
          >
            正則表達式無法套用：{{ columnRegexError }} 請檢查括號、轉義符號或旗標。
          </p>
        </div>
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

    <div class="flex flex-col gap-3 xl:flex-row xl:items-end">
      <div class="flex flex-col gap-1 xl:w-1/2">
        <div class="flex items-center gap-2">
          <label for="advanced-global-regex-input" class="text-xs font-semibold text-gray-700 dark:text-gray-200">
            正則搜尋
          </label>
          <UButton
            size="xs"
            :color="globalRegexEnabled ? 'primary' : 'neutral'"
            :variant="globalRegexEnabled ? 'soft' : 'ghost'"
            :aria-pressed="globalRegexEnabled"
            @click="emit('update:globalRegexEnabled', !globalRegexEnabled)"
          >
            {{ globalRegexEnabled ? '已啟用' : '啟用' }}
          </UButton>
        </div>
        <UInput
          id="advanced-global-regex-input"
          :model-value="globalRegexInput"
          size="sm"
          class="w-full"
          placeholder="輸入正則表達式，只搜尋目前已載入的詞條"
          aria-describedby="advanced-global-regex-error advanced-filter-readonly-helper"
          @update:model-value="emit('update:globalRegexInput', String($event ?? ''))"
          @keyup.enter="emit('apply')"
        />
        <p
          v-if="globalRegexError"
          id="advanced-global-regex-error"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          正則表達式無法套用：{{ globalRegexError }} 請檢查括號、轉義符號或旗標。
        </p>
      </div>

      <div class="flex flex-col gap-1 xl:w-1/2">
        <label class="text-xs font-semibold text-gray-700 dark:text-gray-200">
          欄位正則篩選
        </label>
        <div class="flex flex-col gap-2 sm:flex-row">
          <USelectMenu
            :model-value="columnRegexField"
            :items="fieldOptions"
            value-key="value"
            size="sm"
            class="w-full sm:w-56"
            placeholder="選擇欄位"
            aria-label="欄位正則篩選"
            @update:model-value="emit('update:columnRegexField', String($event ?? ''))"
          />
          <UInput
            :model-value="columnRegexPattern"
            size="sm"
            class="w-full"
            placeholder="輸入此欄位的正則表達式"
            aria-label="欄位正則篩選"
            aria-describedby="advanced-column-regex-error advanced-filter-readonly-helper"
            @update:model-value="emit('update:columnRegexPattern', String($event ?? ''))"
            @keyup.enter="emit('apply')"
          />
        </div>
        <p
          v-if="columnRegexError"
          id="advanced-column-regex-error"
          role="alert"
          class="text-sm text-red-600 dark:text-red-400"
        >
          正則表達式無法套用：{{ columnRegexError }} 請檢查括號、轉義符號或旗標。
        </p>
      </div>
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
import { onMounted, ref } from 'vue'

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:formulaInput': [value: string]
  'update:globalRegexEnabled': [value: boolean]
  'update:globalRegexInput': [value: string]
  'update:columnRegexField': [value: string]
  'update:columnRegexPattern': [value: string]
  apply: []
  clear: []
}>()

const props = defineProps<{
  expanded: boolean
  teleportTo?: string
  formulaInput: string
  globalRegexEnabled: boolean
  globalRegexInput: string
  columnRegexField: string
  columnRegexPattern: string
  fieldOptions: Array<{ value: string; label: string }>
  formulaError?: string
  globalRegexError?: string
  columnRegexError?: string
  hasActiveAdvancedFilters: boolean
  visibleCount: number
  loadedCount: number
}>()

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
