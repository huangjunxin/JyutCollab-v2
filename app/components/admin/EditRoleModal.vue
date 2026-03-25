<template>
  <UModal
    :open="open"
    class="max-w-md"
    @update:open="(v: boolean) => $emit('update:open', v)"
  >
    <template #content>
      <UCard class="w-full overflow-x-hidden">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-primary" />
              <h3 class="text-lg font-semibold">編輯角色</h3>
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

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">角色 <span class="text-red-500">*</span></label>
            <USelect
              v-model="selectedRole"
              :items="roleOptions"
              placeholder="選擇角色"
              size="lg"
              class="w-full"
            />
          </div>

          <div class="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 inline mr-1" />
            角色變更將影響用戶的所有權限
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
import type { User } from '~/types'

const props = defineProps<{
  user: User | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const toast = useToast()

const selectedRole = ref<'contributor' | 'reviewer' | 'admin'>('contributor')
const loading = ref(false)

const roleOptions = [
  { value: 'contributor', label: '貢獻者' },
  { value: 'reviewer', label: '審核員' },
  { value: 'admin', label: '管理員' }
]

// Watch for user changes to update selected role
watch(() => props.user, (newUser) => {
  if (newUser) {
    selectedRole.value = newUser.role
  }
}, { immediate: true })

async function handleSave() {
  if (!props.user) return

  loading.value = true
  try {
    await $fetch(`/api/users/${props.user.id}/role`, {
      method: 'PATCH',
      body: { role: selectedRole.value }
    })

    toast.add({
      title: '角色更新成功',
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
