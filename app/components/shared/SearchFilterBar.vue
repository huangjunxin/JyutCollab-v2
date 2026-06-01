<template>
  <div class="mb-4 flex-shrink-0 p-3 bg-white dark:bg-slate-800 shadow-[var(--jc-shadow-hard)] border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
    <div class="flex flex-wrap gap-3">
      <div class="min-w-[12rem] flex-1">
        <UInput
          :model-value="searchQuery"
          :placeholder="searchPlaceholder"
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full"
          @update:model-value="$emit('update:searchQuery', $event)"
          @keyup.enter="$emit('search')"
        />
      </div>
      <div class="flex flex-wrap items-start gap-2">
        <USelectMenu
          :model-value="filterUser"
          :items="userFilterOptions"
          value-key="value"
          placeholder="篩選"
          size="sm"
          class="w-28"
          @update:model-value="$emit('update:filterUser', $event)"
        />
        <USelectMenu
          :model-value="filterDialect"
          :items="dialectOptions"
          value-key="value"
          placeholder="方言"
          size="sm"
          class="w-28"
          @update:model-value="$emit('update:filterDialect', $event)"
        />
        <USelectMenu
          :model-value="filterTheme"
          :items="themeFilterOptions"
          value-key="value"
          placeholder="主題分類"
          size="sm"
          class="min-w-28 max-w-[14rem]"
          searchable
          searchable-placeholder="搜索分類..."
          @update:model-value="$emit('update:filterTheme', $event)"
        />
        <USelectMenu
          v-if="showStatusFilter"
          :model-value="filterStatus"
          :items="statusOptions"
          value-key="value"
          placeholder="狀態"
          size="sm"
          class="w-28"
          @update:model-value="$emit('update:filterStatus', $event)"
        />
        <slot name="extra-filters" />
        <UButton
          color="primary"
          size="sm"
          @click="$emit('search')"
        >
          搜索
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  searchQuery: string
  filterUser: string | number | undefined
  filterDialect: string | number | undefined
  filterTheme: string | number | undefined
  filterStatus: string | number | undefined
  userFilterOptions: Array<{ value: any; label: string }>
  dialectOptions: Array<{ value: any; label: string }>
  themeFilterOptions: Array<{ value: any; label: string }>
  statusOptions: Array<{ value: any; label: string }>
  showStatusFilter?: boolean
  searchPlaceholder?: string
}>()

defineEmits<{
  'update:searchQuery': [value: string]
  'update:filterUser': [value: any]
  'update:filterDialect': [value: any]
  'update:filterTheme': [value: any]
  'update:filterStatus': [value: any]
  'search': []
}>()
</script>
