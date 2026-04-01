<template>
  <header class="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 aspect-square flex items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/25 group-hover:shadow-green-500/40 transition-shadow">
              <UIcon name="i-heroicons-book-open" class="w-6 h-6 text-white" />
            </div>
            <div class="flex flex-col">
              <span class="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">JyutCollab</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 -mt-1">粵語詞條協作平台</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center gap-1">
          <UButton
            to="/"
            variant="ghost"
            color="gray"
            icon="i-heroicons-home"
            :class="[$route.path === '/' ? 'bg-gray-100 dark:bg-gray-800 text-primary' : '']"
          >
            首頁
          </UButton>
          <UButton
            to="/entries"
            variant="ghost"
            color="gray"
            icon="i-heroicons-document-text"
            :class="[$route.path.startsWith('/entries') ? 'bg-gray-100 dark:bg-gray-800 text-primary' : '']"
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

        <!-- Theme toggle and user menu -->
        <div class="flex items-center gap-3">
          <LayoutColorModeButton />

          <!-- Notification Bell -->
          <template v-if="isAuthenticated">
            <div ref="notificationRef" class="relative">
              <UButton
                color="gray"
                variant="ghost"
                icon="i-heroicons-bell"
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
                class="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50"
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
                    :class="{ 'bg-blue-50 dark:bg-blue-900/10': !notification.isRead }"
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
import type { Notification, NotificationType } from '../../composables/useNotifications'

const { user, isAuthenticated, canReview, isAdmin, logout } = useAuth()
const router = useRouter()
const $route = useRoute()

const userMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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
