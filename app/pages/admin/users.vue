<template>
  <div class="flex h-full min-h-0 flex-col md:container md:mx-auto md:max-w-7xl md:px-4 md:py-6">
    <div class="hidden md:block mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">用戶管理</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">管理所有用戶的角色及權限</p>
    </div>

    <div class="md:hidden flex-shrink-0 border border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-white dark:bg-slate-800 shadow-[var(--jc-shadow-hard)]">
      <div class="flex items-center justify-between gap-3 px-3 py-2.5">
        <div class="min-w-0">
          <h1 class="jc-serif text-base font-bold text-gray-900 dark:text-white truncate">用戶管理</h1>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {{ total }} 位用戶
            <span v-if="hasActiveFilters" class="ml-1 text-[var(--jc-accent)]">· 已篩選</span>
          </p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <UButton
            icon="i-heroicons-funnel"
            :variant="mobileFiltersOpen || hasActiveFilters ? 'soft' : 'ghost'"
            :color="mobileFiltersOpen || hasActiveFilters ? 'primary' : 'neutral'"
            size="xs"
            :aria-label="mobileFiltersOpen ? '隱藏搜尋篩選' : '顯示搜尋篩選'"
            @click="mobileFiltersOpen = !mobileFiltersOpen"
          />
          <UButton
            icon="i-heroicons-arrow-path"
            variant="ghost"
            color="neutral"
            size="xs"
            aria-label="重新載入用戶列表"
            :loading="loading"
            @click="fetchUsers"
          />
        </div>
      </div>

      <div
        v-if="mobileFiltersOpen || hasActiveFilters || searchQuery"
        class="border-t border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] bg-gray-50 dark:bg-slate-900 px-3 py-2"
      >
        <UInput
          v-model="searchQuery"
          placeholder="搜尋用戶名稱、電郵..."
          icon="i-heroicons-magnifying-glass"
          size="sm"
          class="w-full"
          @keyup.enter="applyMobileSearch"
          @update:model-value="debouncedSearch"
        >
          <template #trailing>
            <UButton
              v-if="searchQuery"
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="xs"
              class="p-0.5"
              aria-label="清除搜尋"
              @click="clearSearch"
            />
          </template>
        </UInput>
        <div class="grid grid-cols-2 gap-2 mt-2">
          <USelect
            v-model="roleFilter"
            :items="roleFilterOptions"
            placeholder="角色"
            size="sm"
            class="min-w-0 w-full"
            @update:model-value="handleFilterChange"
          />
          <USelect
            v-model="statusFilter"
            :items="statusFilterOptions"
            placeholder="狀態"
            size="sm"
            class="min-w-0 w-full"
            @update:model-value="handleFilterChange"
          />
        </div>
        <div v-if="hasActiveFilters" class="mt-2 flex items-center justify-between gap-2">
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ activeFilterSummary }}</p>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            @click="clearFilters"
          >
            清除
          </UButton>
        </div>
      </div>
    </div>

    <div class="hidden md:block bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 min-w-0">
          <UInput
            v-model="searchQuery"
            placeholder="搜尋用戶名稱、電郵..."
            icon="i-heroicons-magnifying-glass"
            @update:model-value="debouncedSearch"
          />
        </div>

        <div class="flex gap-4">
          <USelect
            v-model="roleFilter"
            :items="roleFilterOptions"
            placeholder="角色"
            class="w-32"
            @update:model-value="handleFilterChange"
          />

          <USelect
            v-model="statusFilter"
            :items="statusFilterOptions"
            placeholder="狀態"
            class="w-32"
            @update:model-value="handleFilterChange"
          />
        </div>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden border border-[var(--jc-border)] bg-white shadow-[var(--jc-shadow-hard)] dark:border-[var(--jc-dark-border)] dark:bg-slate-800 md:block md:flex-none md:rounded-lg md:border-gray-200 md:bg-white md:shadow-none md:dark:border-gray-800 md:dark:bg-gray-900">
      <AdminUserTable
        class="min-h-0 flex-1"
        :users="users"
        :loading="loading"
        @edit-role="openEditRoleModal"
        @manage-dialects="openManageDialectsModal"
        @toggle-active="handleToggleActive"
      />

      <div v-if="totalPages > 1" class="flex flex-shrink-0 items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-slate-900 md:bg-transparent md:px-4 md:py-3">
        <div class="text-xs text-gray-500 md:text-sm">
          共 {{ total }} 位用戶
        </div>
        <UPagination
          v-model:page="currentPage"
          :total="totalPages"
          size="sm"
          @update:page="fetchUsers"
        />
      </div>
    </div>

    <AdminEditRoleModal
      v-model:open="editRoleModalOpen"
      :user="selectedUser"
      @saved="handleSaved"
    />

    <AdminManageDialectsModal
      v-model:open="manageDialectsModalOpen"
      :user="selectedUser"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import type { User, PaginatedResponse } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: ['admin']
})

const toast = useToast()

const users = ref<User[]>([])
const loading = ref(false)
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)

const searchQuery = ref('')
const roleFilter = ref<string>('all')
const statusFilter = ref<string>('all')
const mobileFiltersOpen = ref(false)

const editRoleModalOpen = ref(false)
const manageDialectsModalOpen = ref(false)
const selectedUser = ref<User | null>(null)

const roleFilterOptions = [
  { value: 'all', label: '全部角色' },
  { value: 'contributor', label: '貢獻者' },
  { value: 'reviewer', label: '審核員' },
  { value: 'admin', label: '管理員' }
]

const statusFilterOptions = [
  { value: 'all', label: '全部狀態' },
  { value: 'true', label: '活躍' },
  { value: 'false', label: '已停用' }
]

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value) || roleFilter.value !== 'all' || statusFilter.value !== 'all'
})

const activeFilterSummary = computed(() => {
  const parts: string[] = []
  if (searchQuery.value) parts.push(`搜尋「${searchQuery.value}」`)
  if (roleFilter.value !== 'all') {
    parts.push(roleFilterOptions.find(opt => opt.value === roleFilter.value)?.label || '指定角色')
  }
  if (statusFilter.value !== 'all') {
    parts.push(statusFilterOptions.find(opt => opt.value === statusFilter.value)?.label || '指定狀態')
  }
  return parts.join(' · ')
})

let searchTimeout: NodeJS.Timeout | null = null
function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 300)
}

function applyMobileSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  currentPage.value = 1
  fetchUsers()
}

function clearSearch() {
  searchQuery.value = ''
  currentPage.value = 1
  fetchUsers()
}

function clearFilters() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchQuery.value = ''
  roleFilter.value = 'all'
  statusFilter.value = 'all'
  currentPage.value = 1
  fetchUsers()
}

function handleFilterChange() {
  currentPage.value = 1
  fetchUsers()
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('page', currentPage.value.toString())
    params.set('perPage', '20')
    if (searchQuery.value) params.set('search', searchQuery.value)
    if (roleFilter.value !== 'all') params.set('role', roleFilter.value)
    if (statusFilter.value !== 'all') params.set('isActive', statusFilter.value)

    const response = await $fetch<PaginatedResponse<User>>(`/api/users?${params.toString()}`)
    users.value = response.data
    total.value = response.total
    totalPages.value = response.totalPages
  } catch (error: any) {
    toast.add({
      title: '取得用戶列表失敗',
      description: error?.data?.message || error?.message || '未知錯誤',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function openEditRoleModal(user: User) {
  selectedUser.value = user
  editRoleModalOpen.value = true
}

function openManageDialectsModal(user: User) {
  selectedUser.value = user
  manageDialectsModalOpen.value = true
}

async function handleToggleActive(user: User) {
  const action = user.isActive ? '停用' : '啟用'
  try {
    await $fetch(`/api/users/${user.id}/toggle-active`, {
      method: 'PATCH',
      body: { isActive: !user.isActive }
    })

    toast.add({
      title: `用戶已${action}`,
      color: 'success'
    })

    fetchUsers()
  } catch (error: any) {
    toast.add({
      title: `${action}失敗`,
      description: error?.data?.message || error?.message || '未知錯誤',
      color: 'error'
    })
  }
}

function handleSaved() {
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
})
</script>
