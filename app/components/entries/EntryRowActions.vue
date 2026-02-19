<template>
  <td class="min-w-[8rem] w-32 px-2 py-1.5 text-center align-middle overflow-visible">
    <div class="flex flex-nowrap items-center justify-center gap-1">
      <!-- 編輯狀態：保存 / 取消（成對相鄰） -->
      <UButton
        v-if="canEdit && (entry._isNew || entry._isDirty)"
        color="success"
        variant="ghost"
        size="xs"
        icon="i-heroicons-check"
        :title="entry._isNew ? '保存新詞條' : '保存更改'"
        :ui="{ base: 'hover:bg-success-500/10 dark:hover:bg-success-500/20' }"
        @click.stop="$emit('save')"
      />
      <UButton
        v-if="canEdit && (entry._isNew || entry._isDirty)"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-heroicons-x-mark"
        title="取消"
        :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
        @click.stop="$emit('cancel')"
      />
      <!-- 詞條操作：複製、刪除 -->
      <UButton
        v-if="!entry._isNew"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-heroicons-document-duplicate"
        title="複製詞條（方言改為我的母語）"
        :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
        @click.stop="$emit('duplicate')"
      />
      <UButton
        v-if="canEdit && !entry._isNew"
        color="error"
        variant="ghost"
        size="xs"
        icon="i-heroicons-trash"
        title="刪除"
        :ui="{ base: 'hover:bg-error-500/10 dark:hover:bg-error-500/20' }"
        @click.stop="$emit('delete')"
      />
      <!-- 詞語組相關：拆出、加入組、展開詞素引用 -->
      <UButton
        v-if="canEdit && showLexemeActions && !entry._isNew"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-heroicons-arrow-right-on-rectangle"
        title="將此詞條拆出成新詞語"
        :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
        @click.stop="$emit('make-new-lexeme')"
      />
      <UButton
        v-if="canEdit && showLexemeActions && !entry._isNew"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-heroicons-folder-plus"
        title="加入其他詞語組"
        :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
        @click.stop="$emit('join-lexeme')"
      />
      <UButton
        v-if="canEdit"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-lucide-quote"
        :title="isMorphemeRefsExpanded ? '收起詞素引用' : '展開詞素引用'"
        :ui="{ base: 'hover:bg-primary-500/10 dark:hover:bg-primary-500/20' }"
        @click.stop="$emit('toggle-morpheme-refs')"
      />
    </div>
  </td>
</template>

<script setup lang="ts">
import type { Entry } from '~/types'

defineProps<{
  entry: Entry
  /** 是否可編輯此詞條（貢獻者僅自己創建的可編輯；審核員/管理員任意） */
  canEdit: boolean
  /** 是否顯示詞語層相關操作（僅在「按詞語聚合」視圖顯示） */
  showLexemeActions?: boolean
  /** 詞素引用是否已展開 */
  isMorphemeRefsExpanded?: boolean
}>()

defineEmits<{
  save: []
  duplicate: []
  delete: []
  cancel: []
  'make-new-lexeme': []
  'join-lexeme': []
  'toggle-morpheme-refs': []
}>()
</script>
