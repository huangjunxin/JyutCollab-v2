<template>
  <header class="sticky top-0 z-50 border-b border-[var(--jc-border)] bg-white/80 backdrop-blur-md dark:border-[var(--jc-dark-border)] dark:bg-slate-900/80">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-14 sm:h-16 gap-2">
        <!-- Mobile hamburger -->
        <UButton
          v-if="isAuthenticated"
          color="gray"
          variant="ghost"
          icon="i-heroicons-bars-3"
          square
          class="md:hidden shrink-0"
          aria-label="開啟導航"
          @click="mobileNavOpen = true"
        />

        <div class="flex items-center gap-2 sm:gap-3 min-w-0">
          <NuxtLink to="/" class="flex items-center gap-2 sm:gap-3 group">
            <div class="w-8 h-8 sm:w-10 sm:h-10 aspect-square flex items-center justify-center bg-[var(--jc-accent)] text-white shadow-[var(--jc-shadow-hard)] transition-transform group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 shrink-0">
              <UIcon name="i-heroicons-book-open" class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div class="hidden sm:flex flex-col">
              <span class="jc-serif text-xl font-bold text-[var(--jc-accent)]">JyutCollab</span>
              <span class="text-xs text-[var(--jc-muted)] dark:text-slate-400 -mt-1">粵語詞條協作平台</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Navigation (desktop) -->
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            to="/"
            variant="ghost"
            color="gray"
            icon="i-heroicons-home"
            :class="[$route.path === '/' ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
          >
            首頁
          </UButton>
          <UButton
            to="/docs"
            variant="ghost"
            color="gray"
            icon="i-heroicons-book-open"
            :class="[$route.path.startsWith('/docs') ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
          >
            使用指南
          </UButton>
          <UButton
            to="/entries"
            variant="ghost"
            color="gray"
            icon="i-heroicons-document-text"
            :class="[$route.path.startsWith('/entries') ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
          >
            詞條列表
          </UButton>
          <UButton
            v-if="canReview"
            to="/review"
            variant="ghost"
            color="gray"
            icon="i-heroicons-clipboard-document-check"
            :class="[$route.path === '/review' ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
          >
            審核隊列
          </UButton>
          <UButton
            to="/histories"
            variant="ghost"
            color="gray"
            icon="i-heroicons-clock"
            :class="[$route.path === '/histories' ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]' : '']"
          >
            編輯歷史
          </UButton>
        </nav>

        <!-- Right side icons -->
        <div class="flex items-center gap-1 sm:gap-3 shrink-0">
          <LayoutColorModeButton />

          <!-- Notification Bell -->
          <template v-if="isAuthenticated">
            <div ref="notificationRef" class="relative">
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-bell"
                square
                class="relative"
                @click="notificationOpen = !notificationOpen"
              >
                <template v-if="unreadCount > 0">
                  <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {{ unreadCount > 9 ? '9+' : unreadCount }}
                  </span>
                </template>
              </UButton>

              <!-- Notification Dropdown -->
              <div
                v-show="notificationOpen"
                class="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-900 shadow-[var(--jc-shadow-hard)] z-50"
              >
                <div class="sticky top-0 flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <span class="font-semibold text-gray-900 dark:text-white">通知</span>
                  <button
                    v-if="unreadCount > 0"
                    type="button"
                    class="text-xs text-primary hover:underline"
                    @click="handleMarkAllRead"
                  >
                    全部已讀
                  </button>
                </div>

                <div v-if="notificationsLoading" class="p-4">
                  <USkeleton class="h-12 w-full mb-2" />
                  <USkeleton class="h-12 w-full mb-2" />
                  <USkeleton class="h-12 w-full" />
                </div>

                <div v-else-if="notifications.length === 0" class="p-4 text-center text-gray-500 dark:text-gray-400">
                  暫無通知
                </div>

                <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
                  <NuxtLink
                    v-for="notification in notifications.slice(0, 5)"
                    :key="notification.id"
                    :to="notification.actionUrl || '#'"
                    class="block p-3 hover:bg-gray-50 dark:hover:bg-gray-800"
                    :class="{ 'bg-[var(--jc-accent-soft)]': !notification.isRead }"
                    @click="handleNotificationClick(notification)"
                  >
                    <div class="flex items-start gap-3">
                      <UIcon
                        :name="getNotificationIcon(notification.type)"
                        :class="['w-5 h-5 shrink-0 mt-0.5', getNotificationColor(notification.type)]"
                      />
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {{ notification.title }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {{ notification.message }}
                        </p>
                        <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {{ formatNotificationTime(notification.createdAt) }}
                        </p>
                      </div>
                    </div>
                  </NuxtLink>
                </div>

                <NuxtLink
                  v-if="notifications.length > 0"
                  to="/notifications"
                  class="block p-2 text-center text-sm text-primary hover:bg-gray-50 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800"
                  @click="notificationOpen = false"
                >
                  查看全部通知
                </NuxtLink>
              </div>
            </div>
          </template>

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
                <UAvatar
                  :alt="user?.username"
                  size="sm"
                  class="bg-primary text-white font-sans font-bold antialiased [&_span]:font-sans [&_span]:font-bold [&_span]:text-white"
                />
                <span class="hidden sm:inline">{{ user?.username }}</span>
              </UButton>
              <div
                v-show="userMenuOpen"
                class="absolute right-0 top-full mt-1 min-w-[10rem] max-w-[calc(100vw-2rem)] border border-[var(--jc-border)] bg-white dark:border-[var(--jc-dark-border)] dark:bg-slate-900 shadow-[var(--jc-shadow-hard)] py-1 z-50"
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
                <NuxtLink
                  v-if="isAdmin"
                  to="/admin/users"
                  class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  role="menuitem"
                  @click="userMenuOpen = false"
                >
                  <UIcon name="i-heroicons-cog-6-tooth" class="w-4 h-4" />
                  用戶管理
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
          <!-- AI agent toggle -->
          <template v-if="isAuthenticated">
            <UButton
              variant="ghost"
              size="sm"
              square
              aria-label="JyutCollab AI 助手"
              @click="toggleAgent"
            >
              <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-primary" />
            </UButton>
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

  <!-- Mobile Navigation Drawer -->
  <Teleport to="body">
    <Transition name="nav-fade">
      <div
        v-if="mobileNavOpen"
        class="fixed inset-0 z-[70] md:hidden"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40" @click="mobileNavOpen = false" />
        <!-- Panel -->
        <Transition name="nav-slide">
          <div
            v-if="mobileNavOpen"
            class="relative w-72 max-w-[80vw] h-full bg-white dark:bg-slate-900 border-r border-[var(--jc-border)] dark:border-[var(--jc-dark-border)] shadow-xl flex flex-col overflow-y-auto"
          >
            <div class="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <span class="jc-serif text-lg font-bold text-[var(--jc-accent)]">JyutCollab</span>
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-x-mark"
                square
                size="sm"
                aria-label="關閉導航"
                @click="mobileNavOpen = false"
              />
            </div>

            <nav class="flex-1 p-3 space-y-1">
              <NuxtLink
                v-for="item in mobileNavItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-colors"
                :class="$route.path === item.to || ($route.path.startsWith(item.to) && item.to !== '/')
                  ? 'bg-[var(--jc-accent-soft)] text-[var(--jc-accent)]'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'"
                @click="mobileNavOpen = false"
              >
                <UIcon :name="item.icon" class="w-5 h-5 shrink-0" />
                {{ item.label }}
              </NuxtLink>
            </nav>

            <div v-if="user" class="p-4 border-t border-gray-100 dark:border-gray-800">
              <div class="flex items-center gap-3">
                <UAvatar
                  :alt="user.username"
                  size="sm"
                  class="bg-primary text-white font-sans font-bold antialiased [&_span]:font-sans [&_span]:font-bold [&_span]:text-white"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ user.displayName || user.username }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuth } from '../../composables/useAuth'
import { useAgentChat } from '../../composables/useAgentChat'
import type { Notification, NotificationType } from '../../composables/useNotifications'

const { user, isAuthenticated, canReview, isAdmin, logout } = useAuth()
const router = useRouter()
const $route = useRoute()
const { open: agentOpen } = useAgentChat()

function toggleAgent() {
  agentOpen.value = !agentOpen.value
}

const mobileNavOpen = ref(false)
const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

// Mobile nav items
const mobileNavItems = computed(() => {
  const items = [
    { to: '/', icon: 'i-heroicons-home', label: '首頁' },
    { to: '/docs', icon: 'i-heroicons-book-open', label: '使用指南' },
    { to: '/entries', icon: 'i-heroicons-document-text', label: '詞條列表' },
    { to: '/histories', icon: 'i-heroicons-clock', label: '編輯歷史' },
    { to: '/profile', icon: 'i-heroicons-user-circle', label: '個人資料' },
  ]
  if (canReview.value) {
    items.splice(3, 0, { to: '/review', icon: 'i-heroicons-clipboard-document-check', label: '審核隊列' })
  }
  if (isAdmin.value) {
    items.push({ to: '/admin/users', icon: 'i-heroicons-cog-6-tooth', label: '用戶管理' })
  }
  return items
})

// Close mobile nav on route change
watch(() => $route.path, () => {
  mobileNavOpen.value = false
})

// Notification state
const notificationOpen = ref(false)
const notificationRef = ref<HTMLElement | null>(null)
const {
  notifications,
  unreadCount,
  loading: notificationsLoading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  getNotificationIcon: getIcon,
  getNotificationColor: getColor
} = useNotifications()

// Fetch notifications on mount
onMounted(() => {
  if (isAuthenticated.value) {
    fetchNotifications()
  }
})

// Helper functions
function getNotificationIcon(type: NotificationType): string {
  return getIcon(type)
}

function getNotificationColor(type: NotificationType): string {
  return getColor(type)
}

function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  if (diffHours < 24) return `${diffHours} 小時前`
  if (diffDays < 7) return `${diffDays} 天前`

  return date.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })
}

async function handleNotificationClick(notification: Notification) {
  if (!notification.isRead) {
    await markAsRead(notification.id)
  }
  notificationOpen.value = false
}

async function handleMarkAllRead() {
  await markAllAsRead()
}

// Close notification dropdown on outside click
function onNotificationClickOutside(event: MouseEvent) {
  if (notificationRef.value && !notificationRef.value.contains(event.target as Node)) {
    notificationOpen.value = false
  }
}

watch(notificationOpen, (open) => {
  if (open) {
    nextTick(() => {
      document.addEventListener('click', onNotificationClickOutside)
    })
  } else {
    document.removeEventListener('click', onNotificationClickOutside)
  }
})

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

<style scoped>
.nav-slide-enter-active,
.nav-slide-leave-active {
  transition: transform 0.2s ease;
}
.nav-slide-enter-from,
.nav-slide-leave-to {
  transform: translateX(-100%);
}
.nav-fade-enter-active,
.nav-fade-leave-active {
  transition: opacity 0.2s ease;
}
.nav-fade-enter-from,
.nav-fade-leave-to {
  opacity: 0;
}
</style>
