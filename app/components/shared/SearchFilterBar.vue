<template>
  <div class="mb-4 flex-shrink-0 p-3 bg-white dark:bg-slate-800 shadow-[var(--jc-shadow-hard)] border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)]">
    <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3">
      <!-- Search input: full width on mobile -->
      <div class="min-w-0 sm:min-w-[12rem] sm:flex-1">
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

      <!-- Desktop: inline filters -->
      <div class="hidden sm:flex flex-wrap items-start gap-2">
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

      <!-- Mobile: filter toggle + search button row -->
      <div class="flex sm:hidden items-center gap-2">
        <UButton
          color="gray"
          variant="outline"
          size="sm"
          icon="i-heroicons-funnel"
          class="flex-1"
          @click="mobileFiltersOpen = !mobileFiltersOpen"
        >
          篩選
          <span v-if="activeFilterCount > 0" class="ml-1 text-xs bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center">
            {{ activeFilterCount }}
          </span>
        </UButton>
        <UButton
          color="primary"
          size="sm"
          @click="$emit('search')"
        >
          搜索
        </UButton>
      </div>

      <!-- Mobile: collapsible filter panel -->
      <div v-if="mobileFiltersOpen" class="sm:hidden grid grid-cols-2 gap-2">
        <USelectMenu
          :model-value="filterUser"
          :items="userFilterOptions"
          value-key="value"
          placeholder="篩選"
          size="sm"
          class="w-full"
          @update:model-value="$emit('update:filterUser', $event)"
        />
        <USelectMenu
          :model-value="filterDialect"
          :items="dialectOptions"
          value-key="value"
          placeholder="方言"
          size="sm"
          class="w-full"
          @update:model-value="$emit('update:filterDialect', $event)"
        />
        <USelectMenu
          :model-value="filterTheme"
          :items="themeFilterOptions"
          value-key="value"
          placeholder="主題分類"
          size="sm"
          class="col-span-2"
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
          class="w-full"
          @update:model-value="$emit('update:filterStatus', $event)"
        />
        <slot name="extra-filters" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
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

const mobileFiltersOpen = ref(false)

// Count active filters to show badge
const activeFilterCount = computed(() => {
  let count = 0
  if (props.filterUser) count++
  if (props.filterDialect) count++
  if (props.filterTheme) count++
  if (props.showStatusFilter && props.filterStatus) count++
  return count
})
</script>
