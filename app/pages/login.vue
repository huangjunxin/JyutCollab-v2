<template>
  <div class="min-h-screen flex">
    <!-- Left side - Decorative -->
    <div class="hidden lg:flex lg:w-1/2 bg-[var(--jc-paper)] border-r border-[var(--jc-border)] relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div class="relative z-10 flex flex-col justify-center items-center w-full p-12 text-[var(--jc-ink)]">
        <!-- Logo -->
        <div class="mb-8">
          <div class="w-24 h-24 bg-[var(--jc-accent)] flex items-center justify-center shadow-[var(--jc-shadow-hard-lg)]">
            <UIcon name="i-heroicons-book-open" class="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 class="jc-serif text-4xl font-bold mb-4 text-center text-[var(--jc-accent)]">JyutCollab</h1>
        <p class="jc-serif text-xl text-[var(--jc-body)] mb-8 text-center">粵方言詞語編纂協作平台</p>

        <!-- Features -->
        <div class="space-y-4 max-w-md">
          <div class="flex items-center gap-4 bg-white/75 backdrop-blur-sm border border-[var(--jc-border)] shadow-[var(--jc-shadow-hard)] p-4">
            <div class="w-10 h-10 bg-[var(--jc-accent-soft-strong)] text-[var(--jc-accent)] flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
            </div>
            <span class="text-sm">協作編寫粵語詞條</span>
          </div>
          <div class="flex items-center gap-4 bg-white/75 backdrop-blur-sm border border-[var(--jc-border)] shadow-[var(--jc-shadow-hard)] p-4">
            <div class="w-10 h-10 bg-[var(--jc-accent-soft-strong)] text-[var(--jc-accent)] flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-sparkles" class="w-5 h-5" />
            </div>
            <span class="text-sm">AI 智能輔助建議</span>
          </div>
          <div class="flex items-center gap-4 bg-white/75 backdrop-blur-sm border border-[var(--jc-border)] shadow-[var(--jc-shadow-hard)] p-4">
            <div class="w-10 h-10 bg-[var(--jc-accent-soft-strong)] text-[var(--jc-accent)] flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-globe-alt" class="w-5 h-5" />
            </div>
            <span class="text-sm">多方言區管理</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Login form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 jc-paper-shell">
      <div class="w-full max-w-md">
        <!-- Mobile header -->
        <div class="lg:hidden text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-[var(--jc-accent)] shadow-[var(--jc-shadow-hard)] mb-4">
            <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-white" />
          </div>
          <h2 class="jc-serif text-2xl font-bold text-gray-900 dark:text-white">登錄 JyutCollab</h2>
        </div>

        <!-- Desktop header -->
        <div class="hidden lg:block mb-8">
          <h2 class="jc-serif text-3xl font-bold text-gray-900 dark:text-white">歡迎回來</h2>
          <p class="mt-2 text-gray-600 dark:text-gray-400">登錄您的賬户繼續協作</p>
        </div>

        <!-- Login card -->
        <UCard class="jc-card-lg border border-[var(--jc-border)]">
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Email -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">郵箱</label>
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
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">密碼</label>
              <UInput
                v-model="form.password"
                type="password"
                placeholder="請輸入密碼"
                maxlength="128"
                size="lg"
                icon="i-heroicons-lock-closed"
                class="w-full"
              />
            </div>

            <!-- Error message -->
            <UAlert
              v-if="error"
              color="error"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              title="登錄失敗"
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
              class="mt-6 shadow-[var(--jc-shadow-hard)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              登錄
            </UButton>
          </form>

          <!-- Google OAuth -->
          <div class="mt-5">
            <div class="relative mb-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div class="relative flex justify-center text-xs">
                <span class="bg-white dark:bg-gray-900 px-2 text-gray-500">或</span>
              </div>
            </div>
            <UButton
              block
              size="xl"
              variant="outline"
              :loading="googleLoading"
              @click="handleGoogleLogin"
              class="w-full"
            >
              <UIcon name="i-heroicons-user-circle" class="w-5 h-5 mr-2" />
              使用 Google 登錄
            </UButton>
          </div>

          <!-- Register link -->
          <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              還沒有賬號？
              <NuxtLink to="/register" class="text-primary font-medium hover:underline">
                立即註冊
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

import { useAuth } from '~/composables/useAuth'

const { login, isAuthenticated } = useAuth()
const { openInPopup } = useUserSession()
const router = useRouter()
const route = useRoute()

const form = reactive({
  email: '',
  password: ''
})

const loading = ref(false)
const googleLoading = ref(false)
const error = ref('')

// Show error from Google OAuth failure (redirected back with ?error=)
onMounted(() => {
  if (route.query.error === 'google_auth_failed') {
    error.value = 'Google 登錄失敗，請稍後重試'
  }
})

// Redirect if already authenticated
watchEffect(() => {
  if (isAuthenticated.value) {
    const redirectTo = (route.query.redirect as string) || '/entries'
    router.push(redirectTo)
  }
})

function handleGoogleLogin() {
  googleLoading.value = true
  error.value = ''
  try {
    openInPopup('/auth/google')
    // Popup auto-closes on success; reset loading after timeout
    setTimeout(() => { googleLoading.value = false }, 30000)
  } catch {
    googleLoading.value = false
    error.value = '無法打開 Google 登錄視窗，請檢查彈窗設定'
  }
}

async function handleSubmit() {
  if (!form.email || !form.password) {
    error.value = '請填寫郵箱和密碼'
    return
  }

  loading.value = true
  error.value = ''

  const result = await login(form.email, form.password)

  if (!result.success) {
    error.value = result.error || '登錄失敗'
  }

  loading.value = false
}
</script>
