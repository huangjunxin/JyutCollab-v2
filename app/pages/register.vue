<template>
  <div class="min-h-screen flex">
    <!-- Left side - Decorative -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-32 right-32 w-80 h-80 bg-white rounded-full blur-3xl"></div>
        <div class="absolute bottom-32 left-32 w-64 h-64 bg-white rounded-full blur-3xl"></div>
      </div>

      <div class="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
        <!-- Logo -->
        <div class="mb-8">
          <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-2xl">
            <UIcon name="i-heroicons-user-plus" class="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 class="text-4xl font-bold mb-4 text-center">加入社區</h1>
        <p class="text-xl text-white/80 mb-8 text-center">成為粵語詞條貢獻者</p>

        <!-- Benefits -->
        <div class="space-y-4 max-w-md">
          <div class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5" />
            </div>
            <span class="text-sm">創建和編輯粵語詞條</span>
          </div>
          <div class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-clock" class="w-5 h-5" />
            </div>
            <span class="text-sm">追蹤您的編輯歷史</span>
          </div>
          <div class="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-users" class="w-5 h-5" />
            </div>
            <span class="text-sm">參與社區協作審核</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Register form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900">
      <div class="w-full max-w-md">
        <!-- Mobile header -->
        <div class="lg:hidden text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 mb-4">
            <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-white" />
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white">註冊 JyutCollab</h2>
        </div>

        <!-- Desktop header -->
        <div class="hidden lg:block mb-8">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white">創建賬户</h2>
          <p class="mt-2 text-gray-600 dark:text-gray-400">加入粵語詞條協作社區</p>
        </div>

        <!-- Register card -->
        <UCard class="shadow-xl border border-gray-200 dark:border-gray-700">
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Username -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">用戶名 <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.username"
                placeholder="請輸入用戶名（2–50 個字符）"
                maxlength="50"
                size="lg"
                icon="i-heroicons-at-symbol"
                class="w-full"
              />
            </div>

            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">郵箱 <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.email"
                type="email"
                placeholder="請輸入郵箱"
                maxlength="254"
                size="lg"
                icon="i-heroicons-envelope"
                class="w-full"
              />
            </div>

            <!-- Password -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">密碼 <span class="text-red-500">*</span></label>
              <UInput
                v-model="form.password"
                type="password"
                placeholder="請輸入密碼（6–128 位）"
                maxlength="128"
                size="lg"
                icon="i-heroicons-lock-closed"
                class="w-full"
              />
            </div>

            <!-- Display name (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                顯示名稱
                <span class="text-gray-400 font-normal">(可選)</span>
              </label>
              <UInput
                v-model="form.displayName"
                placeholder="可選，最多 100 個字符"
                maxlength="100"
                size="lg"
                icon="i-heroicons-identification"
                class="w-full"
              />
            </div>

            <!-- Dialect selection (required) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                您要貢獻的方言點
                <span class="text-red-500">*</span>
              </label>
              <USelectMenu
                v-model="formDialectModel"
                :items="dialectOptions"
                placeholder="請選擇方言點"
                size="lg"
                class="w-full"
                value-key="value"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                註冊後您將成為該方言點的貢獻者，可以創建和編輯該方言點的詞條
              </p>
            </div>

            <!-- Native dialect (optional) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                母語方言
                <span class="text-gray-400 font-normal">(可選)</span>
              </label>
              <USelectMenu
                v-model="formNativeDialectModel"
                :items="DIALECT_OPTIONS_OPTIONAL_FOR_COMBO"
                value-key="value"
                placeholder="可選"
                size="lg"
                class="w-full"
              />
            </div>

            <!-- Error message -->
            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              title="註冊失敗"
              :description="error"
              class="mt-4"
            />

            <!-- Submit button -->
            <UButton
              type="submit"
              color="primary"
              size="xl"
              block
              :loading="loading"
              class="mt-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              註冊
            </UButton>
          </form>

          <!-- Login link -->
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              已有賬號？
              <NuxtLink to="/login" class="text-primary font-medium hover:underline">
                立即登錄
              </NuxtLink>
            </p>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['guest'],
  layout: false
})

import type { DialectId } from '~shared/dialects'
import { useAuth } from '~/composables/useAuth'
import { DIALECT_OPTIONS_FOR_SELECT, DIALECT_OPTIONS_OPTIONAL_FOR_COMBO, NATIVE_DIALECT_NONE } from '~/utils/dialects'

const { register, isAuthenticated } = useAuth()
const router = useRouter()

const form = reactive({
  username: '',
  email: '',
  password: '',
  displayName: '',
  dialect: '' as string,
  nativeDialect: NATIVE_DIALECT_NONE as string
})

const dialectOptions = DIALECT_OPTIONS_FOR_SELECT

/** USelectMenu 綁定用：組件可能回傳 value 或整個 item，統一寫回字串 */
const formDialectModel = computed({
  get: () => (form.dialect || undefined) as DialectId | undefined,
  set: (v: DialectId | { value: string; label: string } | undefined) => {
    form.dialect = (typeof v === 'object' && v && 'value' in v) ? (v as { value: string }).value : (v ?? '')
  }
})

/** 母語方言：Combobox 不允許 value 為空，用 NATIVE_DIALECT_NONE；提交時轉回 undefined */
const formNativeDialectModel = computed({
  get: () => (form.nativeDialect === '' ? NATIVE_DIALECT_NONE : form.nativeDialect) as string,
  set: (v: string | { value: string; label: string } | undefined) => {
    const val = (typeof v === 'object' && v && 'value' in v) ? (v as { value: string }).value : (v ?? NATIVE_DIALECT_NONE)
    form.nativeDialect = val === NATIVE_DIALECT_NONE ? '' : val
  }
})

const loading = ref(false)
const error = ref('')

// Redirect if already authenticated
watchEffect(() => {
  if (isAuthenticated.value) {
    router.push('/entries')
  }
})

async function handleSubmit() {
  if (!form.username || !form.email || !form.password) {
    error.value = '請填寫所有必填項'
    return
  }

  if (!form.dialect) {
    error.value = '請選擇您要貢獻的方言點'
    return
  }

  if (form.password.length < 6) {
    error.value = '密碼至少6位'
    return
  }

  loading.value = true
  error.value = ''

  const result = await register({
    username: form.username,
    email: form.email,
    password: form.password,
    displayName: form.displayName || undefined,
    dialect: form.dialect,
    nativeDialect: (form.nativeDialect && form.nativeDialect !== NATIVE_DIALECT_NONE) ? form.nativeDialect : undefined
  })

  if (!result.success) {
    error.value = result.error || '註冊失敗'
  }

  loading.value = false
}
</script>
