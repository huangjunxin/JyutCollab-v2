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
    <component :is="panelBody" />
  </Teleport>

  <component v-else-if="expanded" :is="panelBody" />
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, resolveComponent } from 'vue'
import type { AdvancedFilterError } from '~/utils/entriesAdvancedFilter'
import type { AdvancedFilterRegexRowState, AdvancedFilterRegexConditionPayload } from '~/composables/useEntriesAdvancedFilters'

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  'update:formulaInput': [value: string]
  'add-regex-row': []
  'remove-regex-row': [id: string]
  'update-regex-row': [id: string, patch: Partial<AdvancedFilterRegexConditionPayload>]
  apply: []
  clear: []
}>()

const props = defineProps<{
  expanded: boolean
  teleportTo?: string
  formulaInput: string
  regexRows: AdvancedFilterRegexRowState[]
  regexRowErrors: Record<string, AdvancedFilterError | null>
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

const panelBody = computed(() => ({
  render() {
    const UInput = resolveComponent('UInput')
    const USelectMenu = resolveComponent('USelectMenu')
    const UButton = resolveComponent('UButton')

    return h('div', {
      id: 'entries-advanced-filter-panel',
      class: 'w-full flex flex-col gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 p-3 mt-2 mb-4'
    }, [
      h('div', { class: 'flex flex-col gap-1' }, [
        h('label', {
          for: 'advanced-formula-input',
          class: 'text-xs font-semibold text-gray-700 dark:text-gray-200'
        }, '公式篩選'),
        h(UInput, {
          id: 'advanced-formula-input',
          modelValue: props.formulaInput,
          size: 'sm',
          class: 'w-full',
          placeholder: '例如：=AND(status = "草稿", ISBLANK(definition))',
          'aria-describedby': 'advanced-filter-helpers advanced-formula-error',
          'onUpdate:modelValue': (value: unknown) => emit('update:formulaInput', String(value ?? '')),
          onKeyup: (event: KeyboardEvent) => {
            if (event.key === 'Enter') emit('apply')
          }
        }),
        props.formulaError
          ? h('p', {
              id: 'advanced-formula-error',
              role: 'alert',
              class: 'text-sm text-red-600 dark:text-red-400'
            }, `公式無法套用：${props.formulaError} 請檢查公式語法、欄位名稱或函數參數。`)
          : null
      ]),

      h('div', { class: 'flex flex-col gap-2' }, [
        h('div', { class: 'flex items-center justify-between gap-2' }, [
          h('label', {
            for: 'advanced-regex-input-0',
            class: 'text-xs font-semibold text-gray-700 dark:text-gray-200'
          }, '正則條件'),
          h(UButton, {
            color: 'neutral',
            variant: 'soft',
            size: 'xs',
            icon: 'i-heroicons-plus',
            onClick: () => emit('add-regex-row')
          }, () => '新增正則條件')
        ]),
        ...props.regexRows.map((row, index) => h('div', { key: row.id, class: 'flex flex-col gap-1' }, [
          h('div', { class: 'flex flex-col gap-2 sm:flex-row' }, [
            h(USelectMenu, {
              modelValue: row.field,
              items: regexFieldOptions.value,
              valueKey: 'value',
              size: 'sm',
              class: 'w-full sm:w-44',
              placeholder: '任何欄位',
              'aria-label': `第 ${index + 1} 個正則條件欄位`,
              'onUpdate:modelValue': (value: unknown) => emit('update-regex-row', row.id, { field: String(value ?? 'any') as AdvancedFilterRegexConditionPayload['field'] })
            }),
            h(UInput, {
              id: `advanced-regex-input-${index}`,
              modelValue: row.pattern,
              size: 'sm',
              class: 'w-full',
              placeholder: '輸入正則表達式',
              'aria-describedby': `advanced-regex-error-${row.id}`,
              'onUpdate:modelValue': (value: unknown) => emit('update-regex-row', row.id, { pattern: String(value ?? '') }),
              onKeyup: (event: KeyboardEvent) => {
                if (event.key === 'Enter') emit('apply')
              }
            }),
            h(UInput, {
              modelValue: row.flags,
              size: 'sm',
              class: 'w-full sm:w-24',
              placeholder: '旗標',
              'aria-label': `第 ${index + 1} 個正則條件旗標`,
              'onUpdate:modelValue': (value: unknown) => emit('update-regex-row', row.id, { flags: String(value ?? '') }),
              onKeyup: (event: KeyboardEvent) => {
                if (event.key === 'Enter') emit('apply')
              }
            }),
            h(UButton, {
              color: 'neutral',
              variant: 'ghost',
              size: 'sm',
              icon: 'i-heroicons-trash',
              class: 'self-start sm:self-auto',
              'aria-label': '移除此正則條件',
              disabled: props.regexRows.length === 1 && !row.pattern.trim(),
              onClick: () => emit('remove-regex-row', row.id)
            })
          ]),
          props.regexRowErrors[row.id]
            ? h('p', {
                id: `advanced-regex-error-${row.id}`,
                role: 'alert',
                class: 'text-sm text-red-600 dark:text-red-400'
              }, `第 ${index + 1} 個正則條件無法套用：${props.regexRowErrors[row.id]?.message} 請檢查括號、轉義符號或旗標。`)
            : null
        ])),
        props.regexError && !Object.values(props.regexRowErrors).some(Boolean)
          ? h('p', {
              id: 'advanced-regex-error',
              role: 'alert',
              class: 'text-sm text-red-600 dark:text-red-400'
            }, `正則表達式無法套用：${props.regexError} 請檢查括號、轉義符號或旗標。`)
          : null,
        h('p', { class: 'text-xs text-gray-500 dark:text-gray-400' }, '多個正則條件會同時套用，詞條必須符合所有條件。')
      ]),

      h('div', {
        id: 'advanced-filter-helpers',
        class: 'rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-1'
      }, [
        h('p', '可用欄位：headword、dialect、phonetic、entryType、theme、definition、register、status'),
        h('p', '支援函數：AND、OR、NOT、LEN、ISBLANK、REGEXMATCH、CONTAINS、STARTSWITH、ENDSWITH'),
        h('p', { id: 'advanced-filter-readonly-helper' }, '進階篩選只影響目前已載入的詞條，不會修改資料。')
      ]),

      h('div', { class: 'flex flex-wrap items-center gap-2' }, [
        h(UButton, {
          color: 'primary',
          variant: 'solid',
          size: 'sm',
          onClick: () => emit('apply')
        }, () => '套用進階篩選'),
        h(UButton, {
          color: 'neutral',
          variant: 'soft',
          size: 'sm',
          onClick: () => emit('clear')
        }, () => '清除進階篩選')
      ])
    ])
  }
}))
</script>
