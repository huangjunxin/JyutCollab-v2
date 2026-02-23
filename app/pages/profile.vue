<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">個人資料</h1>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary animate-spin" />
    </div>

    <!-- Content -->
    <template v-else-if="profile">
      <UCard class="shadow-sm border border-gray-200 dark:border-gray-700">
        <!-- 頭像與基本資訊（只讀） -->
        <div class="flex flex-col sm:flex-row gap-6 mb-8">
          <div class="flex-shrink-0">
            <UAvatar
              :alt="profile.username"
              :src="profile.avatarUrl || undefined"
              size="xl"
              class="bg-primary text-white ring-4 ring-gray-100 dark:ring-gray-800"
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ profile.displayName || profile.username }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">@{{ profile.username }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
              <UIcon name="i-heroicons-envelope" class="w-4 h-4 flex-shrink-0" />
              {{ profile.email }}
            </p>
            <p class="mt-2">
              <UBadge :color="roleBadgeColor[profile.role] ?? 'neutral'" variant="subtle" size="sm">
                {{ roleLabel }}
              </UBadge>
            </p>
          </div>
        </div>

        <!-- 統計（只讀） -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div class="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-center">
            <p class="text-2xl font-bold text-primary">{{ profile.contributionCount ?? 0 }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">貢獻詞條</p>
          </div>
          <div class="rounded-lg bg-gray-100 dark:bg-gray-800 p-4 text-center">
            <p class="text-2xl font-bold text-primary">{{ profile.reviewCount ?? 0 }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">審核詞條</p>
          </div>
        </div>

        <!-- 可編輯表單 -->
        <form @submit.prevent="handleSubmit" class="space-y-5">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">編輯資料</h3>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">顯示名稱</label>
            <UInput
              v-model="form.displayName"
              placeholder="可選，最多 100 個字符"
              maxlength="100"
              size="lg"
              icon="i-heroicons-identification"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">所在地</label>
            <UInput
              v-model="form.location"
              placeholder="例如：香港、廣州（最多 100 個字符）"
              maxlength="100"
              size="lg"
              icon="i-heroicons-map-pin"
              class="w-full"
            />
          </div>

          <!-- 可貢獻的方言（多選）；reviewer/admin 可操作所有方言，此處可標記常用 -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              可貢獻的方言
              <span class="text-gray-400 font-normal">（可多選，至少一項）</span>
            </label>
            <p v-if="profile.role === 'reviewer' || profile.role === 'admin'" class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              您可審核所有方言，此處為您常用的方言標籤
            </p>
            <USelect
              v-model="form.dialects"
              multiple
              :items="dialectOptions"
              value-key="value"
              placeholder="請選擇方言點（可多選）"
              size="lg"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">母語方言</label>
            <select
              v-model="form.nativeDialect"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-base shadow-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option
                v-for="opt in DIALECT_OPTIONS_OPTIONAL"
                :key="opt.value || '__none__'"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">頭像網址</label>
            <UInput
              v-model="form.avatarUrl"
              placeholder="https://..."
              size="lg"
              icon="i-heroicons-photo"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">簡介</label>
            <UTextarea
              v-model="form.bio"
              placeholder="簡短介紹（可選，最多 500 個字符）"
              :rows="3"
              maxlength="500"
              class="w-full"
            />
          </div>

          <UAlert
            v-if="error"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            title="保存失敗"
            :description="error"
          />
          <UAlert
            v-if="success"
            color="success"
            variant="subtle"
            icon="i-heroicons-check-circle"
            title="已保存"
          />

          <UButton
            type="submit"
            color="primary"
            size="lg"
            :loading="saving"
          >
            保存
          </UButton>
        </form>
      </UCard>
    </template>

    <!-- Error state -->
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="無法載入個人資料"
      :description="loadError"
    />
  </div>
</template>

<script setup lang="ts">
import { useProfileUpdatedUser } from '~/composables/useAuth'
import { getDialectLabel, DIALECT_OPTIONS_FOR_SELECT, DIALECT_OPTIONS_OPTIONAL, normalizeNativeDialect } from '~/utils/dialects'

definePageMeta({
  middleware: ['auth'],
  layout: 'default'
})

interface DialectPerm {
  dialectName: string
  role: string
}

interface Profile {
  id: string
  email: string
  username: string
  displayName?: string
  avatarUrl?: string
  location?: string
  nativeDialect?: string
  role: string
  bio?: string
  dialectPermissions: DialectPerm[]
  contributionCount: number
  reviewCount: number
  createdAt?: string
  updatedAt?: string
}

const profile = ref<Profile | null>(null)
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const error = ref('')
const success = ref(false)

const dialectOptions = DIALECT_OPTIONS_FOR_SELECT

const form = reactive({
  displayName: '',
  location: '',
  dialects: [] as string[],
  nativeDialect: '',
  avatarUrl: '',
  bio: ''
})

const roleLabels: Record<string, string> = {
  contributor: '貢獻者',
  reviewer: '審核員',
  admin: '管理員'
}

const roleBadgeColor: Record<string, 'primary' | 'neutral' | 'error'> = {
  contributor: 'neutral',
  reviewer: 'primary',
  admin: 'error'
}

const roleLabel = computed(() =>
  profile.value ? roleLabels[profile.value.role] ?? profile.value.role : ''
)

function dialectLabel(name: string) {
  return getDialectLabel(name)
}

async function loadProfile() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{ success: boolean; data: Profile }>('/api/auth/me')
    if (res.success && res.data) {
      profile.value = res.data
      form.displayName = res.data.displayName ?? ''
      form.location = res.data.location ?? ''
      form.dialects = [...new Set((res.data.dialectPermissions ?? []).map(p => p.dialectName))]
      form.nativeDialect = normalizeNativeDialect(res.data.nativeDialect)
      form.avatarUrl = res.data.avatarUrl ?? ''
      form.bio = res.data.bio ?? ''
    }
  } catch (e: any) {
    loadError.value = e.data?.message ?? e.message ?? '請先登錄'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  const isContributor = profile.value?.role === 'contributor'
  if (isContributor && form.dialects.length < 1) {
    error.value = '請至少選擇一個可貢獻的方言點'
    return
  }
  saving.value = true
  error.value = ''
  success.value = false
  try {
    const body: Record<string, unknown> = {
      displayName: form.displayName || undefined,
      location: form.location || undefined,
      nativeDialect: form.nativeDialect || undefined,
      avatarUrl: form.avatarUrl || undefined,
      bio: form.bio || undefined
    }
    if (form.dialects.length >= 1) {
      body.dialects = [...new Set(form.dialects)]
    }
    const res = await $fetch<{ success: boolean; data?: Profile; error?: string }>('/api/auth/me', {
      method: 'PATCH',
      body
    })
    if (res.success && res.data) {
      profile.value = res.data
      success.value = true
      const { session } = useUserSession()
      const updatedUser = res.data
      if (session.value) {
        session.value = { ...session.value, user: updatedUser }
      }
      const profileUpdatedUser = useProfileUpdatedUser()
      profileUpdatedUser.value = { id: updatedUser.id, dialectPermissions: updatedUser.dialectPermissions ?? [] }
      // 不呼叫 fetchSession()，避免帶回舊快取覆蓋剛寫入的 dialectPermissions；伺服器已在 me.patch 用 setUserSession 更新 cookie
    } else if (res.success === false && (res as any).error) {
      error.value = (res as any).error
    }
  } catch (e: any) {
    error.value = e.data?.error ?? e.data?.message ?? e.message ?? '保存失敗'
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>
