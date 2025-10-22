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

export class NotificationService {
  private static baseUrl = '/notifications'

  static async getNotifications(
    pagination: PaginationDto 
  ): Promise<GetNotificationsResponseDto> {
    try {
      const fetchSize = pagination.fetchSize || 10
      const pageState = pagination.pageState || ''
      
      const response = await apiClient.get(
        `${this.baseUrl}/me?fetchSize=${fetchSize}&pageState=${pageState}`
      )
     
      if (response.data.success && response.data.data) {
        return {
          notifications: response.data.data.notifications || [],
          hasMore: response.data.data.hasMore || false
        }
      } else {
        return {
          notifications: [],
          hasMore: false
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  static async markAsRead(notificationId: string, createdAt: string | Date): Promise<void> {
    try {
      let createdAtString: string
      
      if (typeof createdAt === 'string') {
        createdAtString = createdAt
      } else if (createdAt instanceof Date) {
        createdAtString = createdAt.toISOString()
      } else {
        createdAtString = new Date(createdAt).toISOString()
      }
      
      await apiClient.put(`${this.baseUrl}/${notificationId}/read`, {
        createdAt: createdAtString
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      await apiClient.patch(`${this.baseUrl}/mark-all-read`)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  static async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/unread-count`)
      
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

  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.baseUrl}/${notificationId}`)
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }
}