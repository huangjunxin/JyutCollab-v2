<template>
  <td class="w-20 px-2 py-1 text-center">
    <div class="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <UButton
        v-if="entry._isNew || entry._isDirty"
        color="success"
        variant="ghost"
        size="xs"
        icon="i-heroicons-check"
        :title="entry._isNew ? '保存新詞條' : '保存更改'"
        @click.stop="$emit('save')"
      />
      <UButton
        v-if="!entry._isNew"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-heroicons-document-duplicate"
        title="複製詞條（方言改為我的母語）"
        @click.stop="$emit('duplicate')"
      />
      <UButton
        v-if="!entry._isNew"
        color="error"
        variant="ghost"
        size="xs"
        icon="i-heroicons-trash"
        title="刪除"
        @click.stop="$emit('delete')"
      />
      <UButton
        v-if="entry._isNew || entry._isDirty"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-heroicons-x-mark"
        title="取消"
        @click.stop="$emit('cancel')"
      />
    </div>
  </td>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'

defineProps<{
  entry: Entry
}>()

defineEmits<{
  save: []
  duplicate: []
  delete: []
  cancel: []
}>()
</script>
