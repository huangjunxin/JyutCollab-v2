<template>
  <UModal :open="open" @update:open="(v: boolean) => $emit('update:open', v)">
    <template #content>
      <UCard class="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">完整詞條</h3>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="$emit('update:open', false)"
            />
          </div>
        </template>

        <div v-if="loading" class="flex flex-col items-center justify-center py-12">
          <div
            class="w-10 h-10 border-2 border-gray-200 dark:border-gray-700 border-t-primary rounded-full animate-spin"
          />
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">加載中...</p>
        </div>

        <div v-else-if="errorMessage" class="py-6 text-center">
          <p class="text-red-600 dark:text-red-400">{{ errorMessage }}</p>
        </div>

        <div v-else-if="displayEntry" class="overflow-y-auto flex-1 min-h-0">
          <EntriesEntryDetailCard :display-entry="displayEntry" class="border-0 shadow-none" />
        </div>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'
import {
  type DisplayEntry,
  entryToDisplay,
  jyutjyuRawToDisplay
} from '~/composables/useEntryDisplay'

const props = withDefaults(
  defineProps<{
    open: boolean
    /** 本系統詞條（優先） */
    entry?: Entry | null
    /** Jyutjyu 搜尋結果的單條 raw 對象 */
    jyutjyuRaw?: Record<string, any> | null
    /** 本系統詞條 ID，打開時會請求 GET /api/entries/:id */
    entryId?: string | null
  }>(),
  {
    entry: null,
    jyutjyuRaw: null,
    entryId: null
  }
)

defineEmits<{
  'update:open': [value: boolean]
}>()

const loading = ref(false)
const errorMessage = ref('')
const fetchedEntry = ref<Entry | null>(null)

const displayEntry = computed<DisplayEntry | null>(() => {
  if (props.entry) return entryToDisplay(props.entry)
  if (props.jyutjyuRaw) return jyutjyuRawToDisplay(props.jyutjyuRaw)
  if (fetchedEntry.value) return entryToDisplay(fetchedEntry.value)
  return null
})

async function fetchEntry(id: string) {
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: Entry }>(`/api/entries/${id}`)
    fetchedEntry.value = res?.data ?? null
  } catch (e: any) {
    errorMessage.value = e?.data?.message || e?.message || '獲取詞條失敗'
    fetchedEntry.value = null
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      fetchedEntry.value = null
      errorMessage.value = ''
      return
    }
    if (props.entry || props.jyutjyuRaw) return
    if (props.entryId) fetchEntry(props.entryId)
  },
  { immediate: true }
)

watch(
  () => props.entryId,
  (id) => {
    if (props.open && id && !props.entry && !props.jyutjyuRaw) fetchEntry(id)
  }
)
</script>
