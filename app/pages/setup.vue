<template>
  <div class="min-h-screen flex">
    <!-- Left side - Decorative -->
    <div class="hidden lg:flex lg:w-1/2 bg-[var(--jc-paper)] border-r border-[var(--jc-border)] relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      <div class="relative z-10 flex flex-col justify-center items-center w-full p-12 text-[var(--jc-ink)]">
        <div class="mb-8">
          <div class="w-24 h-24 bg-[var(--jc-accent)] flex items-center justify-center shadow-[var(--jc-shadow-hard-lg)]">
            <UIcon name="i-heroicons-sparkles" class="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 class="jc-serif text-4xl font-bold mb-4 text-center text-[var(--jc-accent)]">完成設定</h1>
        <p class="jc-serif text-xl text-[var(--jc-body)] mb-8 text-center">最後一步，告訴我們您的方言</p>

        <div class="space-y-4 max-w-md">
          <div class="flex items-center gap-4 bg-white/75 backdrop-blur-sm border border-[var(--jc-border)] shadow-[var(--jc-shadow-hard)] p-4">
            <div class="w-10 h-10 bg-[var(--jc-accent-soft-strong)] text-[var(--jc-accent)] flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
            </div>
            <span class="text-sm">選擇後即可創建和編輯詞條</span>
          </div>
          <div class="flex items-center gap-4 bg-white/75 backdrop-blur-sm border border-[var(--jc-border)] shadow-[var(--jc-shadow-hard)] p-4">
            <div class="w-10 h-10 bg-[var(--jc-accent-soft-strong)] text-[var(--jc-accent)] flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-adjustments-horizontal" class="w-5 h-5" />
            </div>
            <span class="text-sm">之後可在個人資料頁隨時修改</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Setup form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 jc-paper-shell">
      <div class="w-full max-w-md">
        <!-- Mobile header -->
        <div class="lg:hidden text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-[var(--jc-accent)] shadow-[var(--jc-shadow-hard)] mb-4">
            <UIcon name="i-heroicons-book-open" class="w-8 h-8 text-white" />
          </div>
          <h2 class="jc-serif text-2xl font-bold text-gray-900 dark:text-white">完成設定</h2>
        </div>

        <!-- Desktop header -->
        <div class="hidden lg:block mb-8">
          <h2 class="jc-serif text-3xl font-bold text-gray-900 dark:text-white">歡迎來到 JyutCollab</h2>
          <p class="mt-2 text-gray-600 dark:text-gray-400">選擇您要貢獻的方言點即可開始</p>
        </div>

        <!-- Setup card -->
        <UCard class="jc-card-lg border border-[var(--jc-border)]">
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- Dialect selection (required, multiple) -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                您要貢獻的方言點
                <span class="text-red-500">*</span>
                <span class="text-gray-400 font-normal">（可多選）</span>
              </label>
              <USelect
                v-model="form.dialects"
                multiple
                :items="dialectOptions"
                value-key="value"
                placeholder="請選擇方言點（可多選）"
                size="lg"
                class="w-full"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                您將成為所選方言點的貢獻者，可創建和編輯該些方言點的詞條；請至少選擇一項
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
              title="設定失敗"
              :description="error"
            />

            <!-- Submit button -->
            <UButton
              type="submit"
              color="primary"
              size="xl"
              block
              :loading="saving"
              class="mt-6 shadow-[var(--jc-shadow-hard)] transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              開始使用
            </UButton>
          </form>
        </UCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DialectId } from '~shared/dialects'
import { DIALECT_OPTIONS_FOR_SELECT, DIALECT_OPTIONS_OPTIONAL_FOR_COMBO, NATIVE_DIALECT_NONE } from '~/utils/dialects'

definePageMeta({
  middleware: ['auth'],
  layout: false
})

const router = useRouter()
const { user, loggedIn, fetch: fetchSession } = useUserSession()

// 若已有方言權限，無需再設定，直接跳轉
if (loggedIn.value && user.value?.dialectPermissions && user.value.dialectPermissions.length > 0) {
  await navigateTo('/entries', { replace: true })
}

const form = reactive({
  dialects: [] as DialectId[],
  nativeDialect: NATIVE_DIALECT_NONE as string
})

const dialectOptions = DIALECT_OPTIONS_FOR_SELECT
const saving = ref(false)
const error = ref('')

/** 母語方言：Combobox 不允許 value 為空，用 NATIVE_DIALECT_NONE；提交時轉回 undefined */
const formNativeDialectModel = computed({
  get: () => (form.nativeDialect === '' ? NATIVE_DIALECT_NONE : form.nativeDialect) as string,
  set: (v: string | { value: string; label: string } | undefined) => {
    const val = (typeof v === 'object' && v && 'value' in v) ? (v as { value: string }).value : (v ?? NATIVE_DIALECT_NONE)
    form.nativeDialect = val === NATIVE_DIALECT_NONE ? '' : val
  }
})

async function handleSubmit() {
  if (!form.dialects.length) {
    error.value = '請至少選擇一個方言點'
    return
  }

  saving.value = true
  error.value = ''

  try {
    const res = await $fetch<{ success: boolean; error?: string }>('/api/auth/setup', {
      method: 'POST',
      body: {
        dialects: form.dialects,
        nativeDialect: form.nativeDialect && form.nativeDialect !== NATIVE_DIALECT_NONE ? form.nativeDialect : undefined
      }
    })

    if (res.success) {
      await fetchSession()
      await router.push('/entries')
    } else if (res.error) {
      error.value = res.error
    }
  } catch (e: any) {
    error.value = e.data?.error ?? e.data?.message ?? e.message ?? '設定失敗'
  } finally {
    saving.value = false
  }
}
</script>
