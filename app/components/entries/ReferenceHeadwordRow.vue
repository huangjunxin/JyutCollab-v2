<template>
  <tr
    class="bg-blue-50/60 dark:bg-blue-900/10 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="reference-headword-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-blue-500 flex-shrink-0" />
            <h3 id="reference-headword-title" class="text-sm font-semibold text-blue-700 dark:text-blue-400">
              我要參考另一個詞條
            </h3>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
            可手動輸入其他地區／方言已有的詞頭，然後用作範本填寫此行，例如輸入「星星」來參考廣州話詞條，再填寫本地詞條「星宿」。
          </p>

          <div class="flex flex-wrap items-center gap-2">
            <UInput
              v-model="innerQuery"
              size="xs"
              class="w-40 sm:w-56"
              placeholder="輸入參考詞頭，例如：星星"
              @keyup.enter="handleSearch"
            />
            <UButton
              size="xs"
              color="primary"
              :loading="isLoading"
              @click="handleSearch"
            >
              查詢
            </UButton>
          </div>
        </div>

        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          class="flex-shrink-0"
          @mousedown.prevent="$emit('dismiss')"
        >
          關閉 (Esc)
        </UButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
const props = defineProps<{
  colspan: number
  query: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  search: [value: string]
  dismiss: []
}>()

const innerQuery = computed({
  get: () => props.query,
  set: (val: string) => emit('update:query', val)
})
function handleSearch() {
  const q = innerQuery.value.trim()
  if (!q) return
  emit('search', q)
}
</script>
