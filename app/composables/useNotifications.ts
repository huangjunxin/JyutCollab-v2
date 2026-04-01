/**
 * 通知系統 Composable
 */

export type NotificationType = 'review_approved' | 'review_rejected' | 'draft_reminder' | 'system'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  metadata?: {
    entryId?: string
    headword?: string
    dialect?: string
    reviewNotes?: string
    reviewedBy?: string
  }
  createdAt: string
}

export interface NotificationListResponse {
  data: Notification[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
  unreadCount: number
}

export const useNotifications = () => {
  const notifications = ref<Notification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { isAuthenticated } = useAuth()

  async function fetchNotifications(page: number = 1, perPage: number = 20, unreadOnly: boolean = false) {
    if (!isAuthenticated.value) {
      notifications.value = []
      unreadCount.value = 0
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await $fetch<NotificationListResponse>('/api/notifications', {
        query: { page, perPage, unreadOnly }
      })
      notifications.value = result.data
      unreadCount.value = result.unreadCount
    } catch (e: any) {
      error.value = e?.message || '獲取通知失敗'
    } finally {
      loading.value = false
    }
  }

  async function markAsRead(notificationId: string) {
    if (!isAuthenticated.value) return

    try {
      const result = await $fetch<{ success: boolean; unreadCount: number }>(`/api/notifications/${notificationId}/read`, {
        method: 'PUT'
      })
      unreadCount.value = result.unreadCount

      // 更新本地通知狀態
      const notification = notifications.value.find(n => n.id === notificationId)
      if (notification) {
        notification.isRead = true
      }
    } catch (e: any) {
      console.error('標記已讀失敗:', e?.message)
    }
  }

  async function markAllAsRead() {
    if (!isAuthenticated.value) return

    try {
      await $fetch('/api/notifications/read-all', {
        method: 'PUT'
      })
      unreadCount.value = 0
      notifications.value.forEach(n => n.isRead = true)
    } catch (e: any) {
      console.error('標記全部已讀失敗:', e?.message)
    }
  }

  // 獲取通知圖標
  function getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      review_approved: 'i-heroicons-check-circle',
      review_rejected: 'i-heroicons-x-circle',
      draft_reminder: 'i-heroicons-document',
      system: 'i-heroicons-megaphone'
    }
    return icons[type] || 'i-heroicons-bell'
  }

  // 獲取通知顏色
  function getNotificationColor(type: NotificationType): string {
    const colors: Record<NotificationType, string> = {
      review_approved: 'text-green-500',
      review_rejected: 'text-red-500',
      draft_reminder: 'text-amber-500',
      system: 'text-blue-500'
    }
    return colors[type] || 'text-gray-500'
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    getNotificationIcon,
    getNotificationColor
  }
}
