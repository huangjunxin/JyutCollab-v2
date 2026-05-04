<template>
  <div class="inline-flex items-center gap-2 flex-wrap">
    <UPopover :content="{ side: 'bottom', sideOffset: 8 }">
      <UTooltip text="分享目前視圖">
        <UButton
          type="button"
          size="sm"
          color="neutral"
          variant="soft"
          icon="i-heroicons-share"
          class="h-8 w-8 justify-center p-0"
          aria-label="分享目前視圖"
        />
      </UTooltip>

      <template #content>
        <section class="w-80 max-w-[calc(100vw-2rem)] space-y-3 p-3" aria-labelledby="entries-share-view-heading">
          <div class="space-y-1">
            <h3 id="entries-share-view-heading" class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              分享目前視圖
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              連結會還原公式篩選、正則設定、條件格式和驗證規則，不會修改詞條資料。
            </p>
          </div>

          <div class="rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-3 text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <div class="flex items-center justify-between gap-3">
              <span class="font-medium text-gray-700 dark:text-gray-200">分享格式版本：v{{ version }}</span>
              <UBadge v-if="restored" color="primary" variant="soft">
                已套用分享視圖
              </UBadge>
            </div>
            <p v-if="restored && restoredSummary" class="text-xs text-gray-500 dark:text-gray-400">
              {{ restoredSummary }}
            </p>
            <p v-if="canShare" class="text-xs text-gray-500 dark:text-gray-400">
              目前可分享 {{ filterCount }} 項篩選和 {{ ruleCount }} 項規則。
            </p>
            <div v-else class="space-y-1">
              <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">未有可分享設定</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                目前沒有公式篩選、正則設定、條件格式或驗證規則。請先設定視圖，再複製分享連結。
              </p>
            </div>
          </div>

          <UAlert
            v-if="sharedViewError"
            color="error"
            variant="subtle"
            role="alert"
            title="分享視圖無法套用"
            :description="sharedViewError"
          >
            <template #actions>
              <div class="flex flex-col items-start gap-2">
                <UButton color="neutral" variant="soft" size="sm" @click="emit('clear-share-query')">
                  清除分享參數
                </UButton>
                <p class="text-xs text-gray-600 dark:text-gray-300">
                  只會移除網址中的分享參數，不會清除目前表格資料。
                </p>
              </div>
            </template>
          </UAlert>

          <div class="space-y-2">
            <UButton
              type="button"
              color="primary"
              variant="solid"
              size="sm"
              block
              :disabled="!canShare"
              @click="emit('copy')"
            >
              複製視圖連結
            </UButton>

            <p
              v-if="copyStatus === 'success'"
              class="text-sm font-medium text-green-700 dark:text-green-300"
              aria-live="polite"
            >
              視圖連結已複製。
            </p>
            <p
              v-else-if="copyStatus === 'error'"
              class="text-sm font-medium text-red-600 dark:text-red-400"
              aria-live="polite"
            >
              無法複製連結。請手動複製下方網址。
            </p>

            <UInput
              v-if="shouldShowFallbackUrl"
              :model-value="generatedUrl"
              readonly
              size="sm"
              class="font-mono text-sm"
              aria-label="分享目前視圖網址"
              @focus="$event.target instanceof HTMLInputElement && $event.target.select()"
            />
          </div>
        </section>
      </template>
    </UPopover>

    <UBadge
      v-if="restored"
      color="primary"
      variant="soft"
      class="self-center"
    >
      已套用分享視圖
    </UBadge>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type CopyStatus = 'idle' | 'success' | 'error'

const emit = defineEmits<{
  copy: []
  'clear-share-query': []
}>()

const props = withDefaults(defineProps<{
  generatedUrl: string
  canShare: boolean
  version: number
  filterCount: number
  ruleCount: number
  restored: boolean
  restoredSummary?: string
  sharedViewError?: string
  copyStatus?: CopyStatus
  showFallbackUrl?: boolean
}>(), {
  restoredSummary: '',
  sharedViewError: '',
  copyStatus: 'idle',
  showFallbackUrl: false
})

const shouldShowFallbackUrl = computed(() => props.showFallbackUrl || props.copyStatus === 'error')
</script>
