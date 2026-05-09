<template>
  <UModal :open="open" class="max-w-3xl" @update:open="handleOpenChange">
    <template #content>
      <UCard class="w-full">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-adjustments-horizontal" class="h-5 w-5 text-primary" />
              <h3 class="text-lg font-semibold">管理視圖</h3>
            </div>
            <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-x-mark" @click="close" />
          </div>
        </template>

        <div class="space-y-4">
          <UAlert v-if="error" color="error" variant="soft" :title="error" />

          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="index in 3" :key="index" class="h-14 w-full" />
          </div>

          <div v-else-if="views.length === 0" class="py-12 text-center">
            <h4 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">尚未儲存任何視圖</h4>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              儲存目前篩選和規則設定為命名視圖，方便日後快速切換或與團隊分享。
            </p>
          </div>

          <div v-else class="max-h-[60vh] space-y-2 overflow-y-auto">
            <div
              v-for="view in views"
              :key="view.id"
              class="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{{ view.name }}</span>
                  <UBadge :color="view.visibility === 'public' ? 'success' : 'neutral'" variant="soft" size="xs">
                    {{ view.visibility === 'public' ? '公開' : '私人' }}
                  </UBadge>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  <span v-if="view.creatorName">{{ view.creatorName }}</span>
                  <span v-if="view.creatorName && formattedDate(view.updatedAt)"> · </span>
                  <span v-if="formattedDate(view.updatedAt)">{{ formattedDate(view.updatedAt) }}</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <template v-if="view.creatorId === currentUserId">
                  <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-pencil-square" @click="emit('edit', view)">
                    編輯
                  </UButton>
                  <UButton color="error" variant="ghost" size="sm" icon="i-heroicons-trash" @click="requestDelete(view)">
                    刪除
                  </UButton>
                </template>
                <template v-else>
                  <UButton color="neutral" variant="ghost" size="sm" icon="i-heroicons-eye" @click="emit('apply', view)">
                    檢視
                  </UButton>
                  <UButton color="primary" variant="ghost" size="sm" icon="i-heroicons-document-duplicate" @click="emit('copy-as-own', view)">
                    複製為我的視圖
                  </UButton>
                </template>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <UModal v-model:open="deleteOpen" class="max-w-md">
    <template #content>
      <UCard class="w-full">
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            刪除「{{ pendingDeleteView?.name }}」？此操作無法還原。
          </h3>
        </template>

        <UAlert v-if="deleteError" color="error" variant="soft" title="刪除視圖失敗，請稍後再試" />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" :disabled="deleting" @click="deleteOpen = false">
              取消
            </UButton>
            <UButton color="error" :loading="deleting" @click="confirmDelete">
              刪除
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { SavedViewRecord } from '~/composables/useEntriesSavedViews'

withDefaults(defineProps<{
  open: boolean
  views: SavedViewRecord[]
  currentUserId: string
  loading?: boolean
  error?: string | null
  deleting?: boolean
}>(), {
  loading: false,
  error: null,
  deleting: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  apply: [view: SavedViewRecord]
  edit: [view: SavedViewRecord]
  delete: [view: SavedViewRecord]
  'copy-as-own': [view: SavedViewRecord]
  close: []
}>()

const deleteOpen = ref(false)
const deleteError = ref(false)
const pendingDeleteView = ref<SavedViewRecord | null>(null)

function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) emit('close')
}

function close() {
  emit('update:open', false)
  emit('close')
}

function requestDelete(view: SavedViewRecord) {
  pendingDeleteView.value = view
  deleteError.value = false
  deleteOpen.value = true
}

function confirmDelete() {
  if (!pendingDeleteView.value) {
    deleteError.value = true
    return
  }
  emit('delete', pendingDeleteView.value)
  deleteOpen.value = false
}

function formattedDate(value?: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('zh-HK', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
