<template>
  <!-- 泛粵模塊內子導航（2026-08-06 用戶反饋）：導入報告/導出是模塊級管理入口，
       不佔全局頂欄；三頁共用本組件，admin 才顯示管理 tab。 -->
  <nav class="flex items-center gap-1 flex-wrap mb-4" aria-label="泛粵字表子導航">
    <UButton
      to="/faanjyut"
      variant="ghost"
      color="gray"
      icon="i-heroicons-table-cells"
      :class="[$route.path === '/faanjyut' ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
    >
      矩陣
    </UButton>
    <UButton
      v-if="isAdmin"
      to="/faanjyut/import-batches"
      variant="ghost"
      color="gray"
      icon="i-heroicons-arrow-down-tray"
      :class="[$route.path.startsWith('/faanjyut/import-batches') ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
    >
      導入報告
    </UButton>
    <UButton
      v-if="isAdmin"
      to="/faanjyut/export"
      variant="ghost"
      color="gray"
      icon="i-heroicons-arrow-up-tray"
      :class="[$route.path.startsWith('/faanjyut/export') ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
    >
      導出
    </UButton>
  </nav>
</template>

<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'

const { isAdmin } = useAuth()
</script>
