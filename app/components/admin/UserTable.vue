<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">用戶</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">郵箱</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">角色</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">方言權限</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">貢獻</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">審核</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">狀態</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">創建時間</th>
          <th class="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr v-if="loading">
          <td colspan="9" class="px-4 py-8 text-center text-gray-500">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin inline mr-2" />
            載入中...
          </td>
        </tr>
        <tr v-else-if="users.length === 0">
          <td colspan="9" class="px-4 py-8 text-center text-gray-500">
            暫無數據
          </td>
        </tr>
        <tr
          v-for="user in users"
          v-else
          :key="user.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <UAvatar :alt="user.username" size="xs" class="bg-primary text-white" />
              <div>
                <div class="text-sm font-medium">{{ user.username }}</div>
                <div v-if="user.displayName" class="text-xs text-gray-500">{{ user.displayName }}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ user.email }}</td>
          <td class="px-4 py-3">
            <UBadge :color="getRoleColor(user.role)" size="sm">
              {{ getRoleLabel(user.role) }}
            </UBadge>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-1">
              <span class="text-sm">{{ user.dialectPermissions?.length || 0 }}</span>
              <UPopover v-if="user.dialectPermissions?.length" class="cursor-help">
                <UIcon name="i-heroicons-information-circle" class="w-4 h-4 text-gray-400" />
                <template #panel>
                  <div class="p-2 max-w-xs">
                    <div class="text-xs text-gray-500 mb-1">方言權限：</div>
                    <div class="flex flex-wrap gap-1">
                      <UBadge
                        v-for="perm in user.dialectPermissions"
                        :key="perm.dialectName"
                        color="gray"
                        size="xs"
                      >
                        {{ getDialectLabel(perm.dialectName) }}
                      </UBadge>
                    </div>
                  </div>
                </template>
              </UPopover>
            </div>
          </td>
          <td class="px-4 py-3 text-sm">{{ user.contributionCount }}</td>
          <td class="px-4 py-3 text-sm">{{ user.reviewCount }}</td>
          <td class="px-4 py-3">
            <UBadge :color="user.isActive ? 'success' : 'neutral'" size="sm">
              {{ user.isActive ? '活躍' : '已停用' }}
            </UBadge>
          </td>
          <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
            {{ formatDate(user.createdAt) }}
          </td>
          <td class="px-4 py-3">
            <UDropdownMenu
              :items="getActionItems(user)"
              :popper="{ placement: 'bottom-end' }"
            >
              <UButton
                icon="i-heroicons-ellipsis-horizontal"
                color="gray"
                variant="ghost"
                size="xs"
              />
            </UDropdownMenu>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { User } from '~/types'
import { DIALECT_LABELS } from '~shared/dialects'

defineProps<{
  users: User[]
  loading: boolean
}>()

const emit = defineEmits<{
  'edit-role': [user: User]
  'manage-dialects': [user: User]
  'toggle-active': [user: User]
}>()

function getRoleColor(role: string): string {
  switch (role) {
    case 'admin': return 'error'
    case 'reviewer': return 'primary'
    default: return 'neutral'
  }
}

function getRoleLabel(role: string): string {
  switch (role) {
    case 'admin': return '管理員'
    case 'reviewer': return '審核員'
    default: return '貢獻者'
  }
}

function getDialectLabel(dialectName: string): string {
  return DIALECT_LABELS[dialectName as keyof typeof DIALECT_LABELS] || dialectName
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('zh-HK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

function getActionItems(user: User) {
  return [[
    {
      label: '編輯角色',
      icon: 'i-heroicons-user-circle',
      onSelect: () => emit('edit-role', user)
    },
    {
      label: '管理方言',
      icon: 'i-heroicons-map',
      onSelect: () => emit('manage-dialects', user)
    },
    {
      label: user.isActive ? '停用' : '啟用',
      icon: user.isActive ? 'i-heroicons-no-symbol' : 'i-heroicons-check-circle',
      onSelect: () => emit('toggle-active', user)
    }
  ]]
}
</script>
