<template>
  <header class="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <NuxtLink to="/entries" class="flex items-center gap-3 group">
          <div class="w-10 h-10 aspect-square flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-shadow">
            <UIcon name="i-heroicons-book-open" class="w-6 h-6 text-white" />
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">JyutCollab</span>
            <span class="text-xs text-gray-500 dark:text-gray-400 -mt-1">粵語詞條協作平台</span>
          </div>
        </NuxtLink>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            to="/entries"
            variant="ghost"
            color="gray"
            icon="i-heroicons-document-text"
            :class="[$route.path === '/entries' ? 'bg-gray-100 dark:bg-gray-800 text-primary' : '']"
          >
            詞條列表
          </UButton>
          <UButton
            v-if="canReview"
            to="/review"
            variant="ghost"
            color="gray"
            icon="i-heroicons-clipboard-document-check"
            :class="[$route.path === '/review' ? 'bg-gray-100 dark:bg-gray-800 text-primary' : '']"
          >
            審核隊列
          </UButton>
          <UButton
            to="/histories"
            variant="ghost"
            color="gray"
            icon="i-heroicons-clock"
            :class="[$route.path === '/histories' ? 'bg-gray-100 dark:bg-gray-800 text-primary' : '']"
          >
            編輯歷史
          </UButton>
        </nav>

        <!-- User menu: custom dropdown (no Teleport) to avoid parentNode null in UDropdownMenu -->
        <div class="flex items-center gap-3">
          <template v-if="isAuthenticated">
            <div ref="userMenuRef" class="relative inline-block">
              <UButton
                color="gray"
                variant="ghost"
                class="gap-2"
                aria-haspopup="true"
                :aria-expanded="userMenuOpen"
                @click="userMenuOpen = !userMenuOpen"
              >
                <UAvatar :alt="user?.username" size="xs" class="bg-primary text-white" />
                <span class="hidden sm:inline">{{ user?.username }}</span>
              </UButton>
              <div
                v-show="userMenuOpen"
                class="absolute right-0 top-full mt-1 min-w-[10rem] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-50"
                role="menu"
              >
                <div class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800" role="presentation">
                  {{ user?.username }}
                </div>
                <NuxtLink
                  to="/profile"
                  class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  role="menuitem"
                  @click="userMenuOpen = false"
                >
                  <UIcon name="i-heroicons-user-circle" class="w-4 h-4" />
                  個人資料
                </NuxtLink>
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  role="menuitem"
                  @click="handleLogoutClick"
                >
                  <UIcon name="i-heroicons-arrow-right-on-rectangle" class="w-4 h-4" />
                  退出登錄
                </button>
              </div>
            </div>
          </template>
          <template v-else>
            <UButton
              to="/login"
              color="gray"
              variant="ghost"
            >
              登錄
            </UButton>
            <UButton
              to="/register"
              color="primary"
            >
              註冊
            </UButton>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'

const { user, isAuthenticated, canReview, logout } = useAuth()
const router = useRouter()
const $route = useRoute()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

function closeUserMenu() {
  userMenuOpen.value = false
}

function onClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeUserMenu()
  }
}

watch(userMenuOpen, (open) => {
  if (open) {
    nextTick(() => {
      document.addEventListener('click', onClickOutside)
    })
  } else {
    document.removeEventListener('click', onClickOutside)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside)
})

async function handleLogoutClick() {
  closeUserMenu()
  await logout()
}
</script>
