<template>
  <UAlert :color="alertColor" variant="soft" :title="title" :description="description">
    <template #actions>
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="kind !== 'not-found'">
          <UButton color="primary" variant="soft" size="sm" :loading="applying" :disabled="disabled" @click="emit('apply')">
            套用視圖
          </UButton>
          <UButton color="primary" variant="ghost" size="sm" :disabled="disabled" @click="emit('save-as-own')">
            儲存為我的視圖
          </UButton>
        </template>
        <UButton color="neutral" variant="ghost" size="sm" :disabled="disabled" @click="emit('close')">
          關閉
        </UButton>
      </div>
    </template>
  </UAlert>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  kind: 'named' | 'anonymous' | 'not-found'
  viewName?: string
  creatorName?: string
  applying?: boolean
  disabled?: boolean
}>(), {
  viewName: '',
  creatorName: '',
  applying: false,
  disabled: false
})

const emit = defineEmits<{
  apply: []
  'save-as-own': []
  close: []
}>()

const alertColor = computed(() => props.kind === 'not-found' ? 'warning' : 'info')

const title = computed(() => {
  if (props.kind === 'not-found') return '視圖不存在或已被刪除'
  if (props.kind === 'anonymous') return '你正在檢視分享的視圖'
  return `你正在檢視「${props.viewName || '未命名視圖'}」`
})

const description = computed(() => {
  if (props.kind === 'not-found') return ''
  if (props.kind === 'anonymous') return '篩選和規則已套用，不會修改詞條資料。'
  return `此視圖由 ${props.creatorName || '未知用戶'} 建立。篩選和規則已套用，不會修改詞條資料。`
})
</script>
