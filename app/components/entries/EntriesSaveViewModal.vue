<template>
  <UModal :open="open" class="max-w-md" @update:open="handleOpenChange">
    <template #content>
      <UCard class="jc-modal-card w-full rounded-none [&>*]:rounded-none">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-bookmark-square" class="h-5 w-5 text-primary" />
              <h3 class="text-lg font-semibold">儲存目前視圖</h3>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              :disabled="submitting"
              @click="cancel"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UAlert v-if="error" color="error" variant="soft" :title="error" />

          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300" for="saved-view-name">
              視圖名稱
            </label>
            <UInput
              id="saved-view-name"
              v-model="localName"
              :disabled="submitting"
              :placeholder="VIEW_NAME_PLACEHOLDER"
              maxlength="100"
              class="w-full"
              @keydown.enter.prevent="submit"
            />
            <p v-if="nameError" class="text-sm text-error" role="alert">{{ nameError }}</p>
          </div>

          <fieldset class="space-y-2" :disabled="submitting">
            <legend class="text-sm font-medium text-gray-700 dark:text-gray-300">可見性</legend>
            <URadioGroup v-model="localVisibility" :items="visibilityOptions" />
          </fieldset>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" :disabled="submitting" @click="cancel">
              取消
            </UButton>
            <UButton color="primary" :loading="submitting" @click="submit">
              儲存
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { EntriesSharedViewState } from '~/utils/entriesSharedView'
import type { SavedViewVisibility } from '~/composables/useEntriesSavedViews'

const VIEW_NAME_PLACEHOLDER = '為此視圖命名（例如：廣州話口語詞條、待審查詞條）'

const props = withDefaults(defineProps<{
  open: boolean
  state: EntriesSharedViewState
  id?: string
  initialName?: string
  initialVisibility?: SavedViewVisibility
  submitting?: boolean
  error?: string | null
}>(), {
  id: undefined,
  initialName: '',
  initialVisibility: 'private',
  submitting: false,
  error: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [payload: { name: string; visibility: SavedViewVisibility; state: EntriesSharedViewState; id?: string }]
  cancel: []
}>()

const visibilityOptions: Array<{ label: string; value: SavedViewVisibility }> = [
  { label: '私人（僅自己可見）', value: 'private' },
  { label: '公開（所有用戶可見）', value: 'public' }
]

const localName = ref('')
const localVisibility = ref<SavedViewVisibility>('private')
const nameError = ref('')

watch(
  () => [props.open, props.initialName, props.initialVisibility] as const,
  () => {
    if (!props.open) return
    localName.value = props.initialName ?? ''
    localVisibility.value = props.initialVisibility ?? 'private'
    nameError.value = ''
  },
  { immediate: true }
)

function handleOpenChange(value: boolean) {
  emit('update:open', value)
  if (!value) emit('cancel')
}

function cancel() {
  emit('update:open', false)
  emit('cancel')
}

function submit() {
  const name = localName.value.trim()
  if (!name) {
    nameError.value = '視圖名稱不能為空'
    return
  }
  if (name.length > 100) {
    nameError.value = '視圖名稱過長'
    return
  }
  if (localVisibility.value !== 'public' && localVisibility.value !== 'private') {
    localVisibility.value = 'private'
  }
  nameError.value = ''
  emit('save', {
    id: props.id,
    name,
    visibility: localVisibility.value,
    state: props.state
  })
}
</script>
