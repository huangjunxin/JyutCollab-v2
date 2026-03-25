<template>
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <!-- 頁面標題 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">用戶管理</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">管理所有用戶的角色和權限</p>
    </div>

    <!-- 搜索和篩選 -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
      <div class="flex flex-wrap gap-4">
        <!-- 搜索框 -->
        <div class="flex-1 min-w-[200px]">
          <UInput
            v-model="searchQuery"
            placeholder="搜索用戶名、郵箱..."
            icon="i-heroicons-magnifying-glass"
            @update:model-value="debouncedSearch"
          />
        </div>

        <!-- 角色篩選 -->
        <USelect
          v-model="roleFilter"
          :items="roleFilterOptions"
          placeholder="角色"
          class="w-32"
          @update:model-value="fetchUsers"
        />

        <!-- 狀態篩選 -->
        <USelect
          v-model="statusFilter"
          :items="statusFilterOptions"
          placeholder="狀態"
          class="w-32"
          @update:model-value="fetchUsers"
        />
      </div>
    </div>

    <!-- 用戶表格 -->
    <div class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <AdminUserTable
        :users="users"
        :loading="loading"
        @edit-role="openEditRoleModal"
        @manage-dialects="openManageDialectsModal"
        @toggle-active="handleToggleActive"
      />

      <!-- 分頁 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div class="text-sm text-gray-500">
          共 {{ total }} 位用戶
        </div>
        <UPagination
          v-model:page="currentPage"
          :total="totalPages"
          @update:page="fetchUsers"
        />
      </div>
    </div>

    <!-- 編輯角色彈窗 -->
    <AdminEditRoleModal
      v-model:open="editRoleModalOpen"
      :user="selectedUser"
      @saved="handleSaved"
    />

    <!-- 管理方言彈窗 -->
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

// 數據狀態
const users = ref<User[]>([])
const loading = ref(false)
const total = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)

// 篩選狀態
const searchQuery = ref('')
const roleFilter = ref<string>('all')
const statusFilter = ref<string>('all')

// 彈窗狀態
const editRoleModalOpen = ref(false)
const manageDialectsModalOpen = ref(false)
const selectedUser = ref<User | null>(null)

// 篩選選項
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

// 防抖搜索
let searchTimeout: NodeJS.Timeout | null = null
function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchUsers()
  }, 300)
}

// 獲取用戶列表
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
      title: '獲取用戶列表失敗',
      description: error?.data?.message || error?.message || '未知錯誤',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// 打開編輯角色彈窗
function openEditRoleModal(user: User) {
  selectedUser.value = user
  editRoleModalOpen.value = true
}

// 打開管理方言彈窗
function openManageDialectsModal(user: User) {
  selectedUser.value = user
  manageDialectsModalOpen.value = true
}

// 切換用戶狀態
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

// 保存後刷新列表
function handleSaved() {
  fetchUsers()
}

// 初始加載
onMounted(() => {
  fetchUsers()
})
</script>
