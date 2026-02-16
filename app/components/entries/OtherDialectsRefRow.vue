<template>
  <tr
    class="bg-blue-50/80 dark:bg-blue-900/20 border-b border-gray-200 dark:border-gray-700"
    role="region"
    aria-labelledby="other-dialects-ref-title"
  >
    <td :colspan="colspan" class="px-3 py-2 align-top">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-1">
            <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 flex-shrink-0" />
            <h3 id="other-dialects-ref-title" class="text-sm font-semibold text-blue-700 dark:text-blue-400">
              其他方言點已有該詞條，可參考
            </h3>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-2">
            共 {{ entries.length }} 條（不同方言），可參考釋義與分類後填寫本條。
          </p>

          <!-- 短列表：直接顯示前幾條；若條數較多，再提供展開更多 -->
          <div class="mt-1 space-y-1.5">
            <!-- 直接顯示前 3 條 -->
            <div
              v-for="e in entries.slice(0, 3)"
              :key="e.id"
              class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-700 dark:text-gray-300 py-1"
            >
              <span class="font-medium text-gray-900 dark:text-gray-100">{{ e.headwordDisplay }}</span>
              <span class="text-blue-600 dark:text-blue-400">{{ e.dialectLabel }}</span>
              <span class="text-gray-500 dark:text-gray-500">{{ e.statusLabel }}</span>
              <span class="text-gray-400 dark:text-gray-500">{{ e.createdAtLabel }}</span>
              <UButton
                size="2xs"
                color="primary"
                variant="ghost"
                class="ml-auto"
                @click="$emit('apply-template', e.id)"
              >
                用作範本填寫本行
              </UButton>
            </div>

            <!-- 若超過 3 條，提供展開/收起更多 -->
            <template v-if="entries.length > 3">
              <button
                type="button"
                class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                @click="showDetail = !showDetail"
              >
                {{ showDetail ? '收起其他方言詞條' : `另外還有 ${ entries.length - 3 } 條，點此展開` }}
              </button>
              <div
                v-if="showDetail"
                class="mt-1 space-y-1.5 max-h-40 overflow-y-auto"
              >
                <div
                  v-for="e in entries.slice(3)"
                  :key="e.id"
                  class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-700 dark:text-gray-300 py-1"
                >
                  <span class="font-medium text-gray-900 dark:text-gray-100">{{ e.headwordDisplay }}</span>
                  <span class="text-blue-600 dark:text-blue-400">{{ e.dialectLabel }}</span>
                  <span class="text-gray-500 dark:text-gray-500">{{ e.statusLabel }}</span>
                  <span class="text-gray-400 dark:text-gray-500">{{ e.createdAtLabel }}</span>
                  <UButton
                    size="2xs"
                    color="primary"
                    variant="ghost"
                    class="ml-auto"
                    @click="$emit('apply-template', e.id)"
                  >
                    用作範本填寫本行
                  </UButton>
                </div>
              </div>
            </template>
          </div>
        </div>
        <UButton size="xs" color="neutral" variant="ghost" class="flex-shrink-0" @mousedown.prevent="$emit('dismiss')">
          忽略 (Esc)
        </UButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
defineProps<{
  colspan: number
  entries: Array<{
    id: string
    headwordDisplay: string
    dialectLabel: string
    status: string
    statusLabel: string
    createdAtLabel: string
  }>
}>()

defineEmits<{
  dismiss: []
  'apply-template': [id: string]
}>()

const showDetail = ref(false)
</script>
