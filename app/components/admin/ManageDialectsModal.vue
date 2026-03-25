<template>
  <UModal :open="open" @update:open="(v: boolean) => $emit('update:open', v)">
    <template #content>
      <UCard class="w-full max-w-lg">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-map" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-semibold">管理方言權限</h3>
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark"
              @click="$emit('update:open', false)"
            />
          </div>
        </template>

        <div class="space-y-4">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            用戶：<span class="font-medium text-gray-900 dark:text-gray-100">{{ user?.username }}</span>
          </div>

          <!-- 已添加的方言權限 -->
          <div class="space-y-2">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300">方言權限列表</div>
            <div v-if="localPermissions.length === 0" class="text-sm text-gray-500 dark:text-gray-400 py-2">
              暫無方言權限
            </div>
            <div v-else class="space-y-2 max-h-60 overflow-y-auto">
              <div
                v-for="(perm, index) in localPermissions"
                :key="perm.dialectName"
                class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span class="flex-1 text-sm">{{ getDialectLabel(perm.dialectName) }}</span>
                <USelect
                  v-model="perm.role"
                  :items="dialectRoleOptions"
                  size="xs"
                  class="w-28"
                />
                <UButton
                  icon="i-heroicons-x-mark"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  @click="removePermission(index)"
                />
              </div>
            </div>
          </div>

          <!-- 添加新方言 -->
          <div class="flex gap-2">
            <USelect
              v-model="newDialect"
              :items="availableDialectOptions"
              placeholder="選擇方言"
              class="flex-1"
            />
            <UButton
              color="primary"
              :disabled="!newDialect"
              @click="addPermission"
            >
              添加
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" variant="ghost" @click="$emit('update:open', false)">
              取消
            </UButton>
            <UButton color="primary" :loading="loading" @click="handleSave">
              保存
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { User, DialectPermission } from '~/types'
import { DIALECT_LABELS, DIALECT_IDS } from '~shared/dialects'

const props = defineProps<{
  user: User | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const toast = useToast()

const localPermissions = ref<DialectPermission[]>([])
const newDialect = ref('')
const loading = ref(false)

const dialectRoleOptions = [
  { value: 'contributor', label: '貢獻者' },
  { value: 'reviewer', label: '審核員' }
]

function getDialectLabel(dialectName: string): string {
  return DIALECT_LABELS[dialectName as keyof typeof DIALECT_LABELS] || dialectName
}

// 可用的方言選項（排除已添加的）
const availableDialectOptions = computed(() => {
  const addedDialects = new Set(localPermissions.value.map(p => p.dialectName))
  return DIALECT_IDS
    .filter(id => !addedDialects.has(id))
    .map(id => ({
      value: id,
      label: DIALECT_LABELS[id]
    }))
})

// Watch for user changes
watch(() => props.user, (newUser) => {
  if (newUser) {
    localPermissions.value = [...(newUser.dialectPermissions || [])]
  }
}, { immediate: true })

function addPermission() {
  if (!newDialect.value) return
  localPermissions.value.push({
    dialectName: newDialect.value,
    role: 'contributor'
  })
  newDialect.value = ''
}

function removePermission(index: number) {
  localPermissions.value.splice(index, 1)
}

async function handleSave() {
  if (!props.user) return

  loading.value = true
  try {
    await $fetch(`/api/users/${props.user.id}/dialect-permissions`, {
      method: 'PATCH',
      body: { dialectPermissions: localPermissions.value }
    })

    toast.add({
      title: '方言權限更新成功',
      color: 'success'
    })

    emit('update:open', false)
    emit('saved')
  } catch (error: any) {
    toast.add({
      title: '更新失敗',
      description: error?.data?.message || error?.message || '未知錯誤',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>
