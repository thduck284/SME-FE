import apiClient from '@/lib/services/ApiClient'

export interface NotificationDto {
  notificationId: string
  toUserId: string
  fromUserId: string
  eventType: string
  entityId: string
  message: string
  createdAt: Date
  readFlag: boolean
  fromUser?: {
    userId: string
    username: string
    displayName: string
    avatarUrl?: string
  }
}

export interface GetNotificationsResponseDto {
  notifications: NotificationDto[]
  hasMore: boolean
}

export interface PaginationDto {
  fetchSize?: number
  pageState?: string
}

export interface MarkAsReadRequest {
  notificationId: string
}

export interface MarkAllAsReadRequest {
  userId: string
}

export class NotificationService {
  private static baseUrl = '/notifications'

  // Lấy danh sách notification của user
  static async getNotifications(
    pagination: PaginationDto = { fetchSize: 20 }
  ): Promise<GetNotificationsResponseDto> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/me?fetchSize=${pagination.fetchSize}&pageState=${pagination.pageState || ''}`
      )
      // API trả về { success, message, data: { notifications, hasMore } }
      return response.data.data
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  // Đánh dấu notification là đã đọc
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      await apiClient.patch(`${this.baseUrl}/mark-read`, {
        notificationId
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  // Đánh dấu tất cả notification là đã đọc
  static async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch(`${this.baseUrl}/mark-all-read`)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  // Lấy số lượng notification chưa đọc
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/unread-count`)
      console.log('getUnreadCount API response:', response.data)
      
      // Backend trả về { success, message, data: { unreadCount } }
      if (response.data.success && response.data.data) {
        return response.data.data.unreadCount || 0
      } else {
        return 0
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      throw error
    }
  }

  // Xóa notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${notificationId}`)
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }
}
