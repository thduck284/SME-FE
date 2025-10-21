import { useState, useEffect } from 'react'
import { NotificationService, NotificationDto } from '@/lib/api/notifications/NotificationService'
import { UserService } from '@/lib/api/users/UserService'

// Global state để tránh duplicate API calls
let globalNotifications: NotificationDto[] = []
let globalUnreadCount = 0
let hasLoaded = false
let isLoading = false
let userMetadataCache = new Map<string, any>()

// Listeners để notify components khi state thay đổi
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(listener => listener())
}

// Function để lấy user metadata cho notifications
async function enrichNotificationsWithUserData(notifications: NotificationDto[]): Promise<NotificationDto[]> {
  // Lọc ra các userId hợp lệ (không null, undefined, hoặc empty string)
  const validUserIds = notifications
    .map(n => n.fromUserId)
    .filter(userId => userId && userId.trim() !== '')
  
  const uniqueUserIds = [...new Set(validUserIds)]
  
  console.log('Valid userIds for notifications:', uniqueUserIds)
  console.log('Total notifications:', notifications.length)
  
  // Lấy metadata cho các user chưa có trong cache
  const userIdsToFetch = uniqueUserIds.filter(userId => !userMetadataCache.has(userId))
  
  if (userIdsToFetch.length > 0) {
    try {
      console.log('Fetching metadata for userIds:', userIdsToFetch)
      const userMetadata = await UserService.getMultipleUsersMetadata(userIdsToFetch)
      userMetadata.forEach(user => {
        userMetadataCache.set(user.userId, user)
      })
      console.log('Successfully cached metadata for users:', userMetadata.length)
    } catch (error) {
      console.error('Error fetching user metadata for notifications:', error)
    }
  }
  
  // Enrich notifications với user data
  return notifications.map(notification => {
    const userData = notification.fromUserId && notification.fromUserId.trim() !== '' 
      ? userMetadataCache.get(notification.fromUserId)
      : null
    
    return {
      ...notification,
      fromUser: userData ? {
        userId: userData.userId,
        username: userData.username || `${userData.firstName} ${userData.lastName}`.trim(),
        displayName: `${userData.firstName} ${userData.lastName}`.trim(),
        avatarUrl: userData.avtUrl
      } : undefined
    }
  })
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationDto[]>(globalNotifications)
  const [unreadCount, setUnreadCount] = useState<number>(globalUnreadCount)
  const [isLoadingState, setIsLoadingState] = useState<boolean>(isLoading)
  const [error, setError] = useState<string | null>(null)

  // Không load notifications tự động, chỉ load khi cần
  useEffect(() => {
    // Chỉ sync với global state nếu đã có data
    if (hasLoaded) {
      setNotifications(globalNotifications)
      setUnreadCount(globalUnreadCount)
    }
  }, [])

  // Subscribe to global state changes
  useEffect(() => {
    const listener = () => {
      setNotifications(globalNotifications)
      setUnreadCount(globalUnreadCount)
    }
    
    listeners.add(listener)
    
    return () => {
      listeners.delete(listener)
    }
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId)
      
      // Update global state
      globalNotifications = globalNotifications.map(notification => 
        notification.notificationId === notificationId 
          ? { ...notification, readFlag: true }
          : notification
      )
      
      // Reload unread count từ API
      await loadUnreadCount()
      
      // Update local state
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead()
      
      // Update global state
      globalNotifications = globalNotifications.map(notification => ({ ...notification, readFlag: true }))
      
      // Reload unread count từ API
      await loadUnreadCount()
      
      // Update local state
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId)
      
      // Update global state
      globalNotifications = globalNotifications.filter(notification => notification.notificationId !== notificationId)
      
      // Reload unread count từ API
      await loadUnreadCount()
      
      // Update local state
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }

  const loadUnreadCount = async () => {
    try {
      console.log('loadUnreadCount: Calling API...')
      const count = await NotificationService.getUnreadCount()
      console.log('loadUnreadCount: API response =', count)
      globalUnreadCount = count
      setUnreadCount(globalUnreadCount)
      notifyListeners()
      console.log('loadUnreadCount: Updated globalUnreadCount =', globalUnreadCount)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const loadNotifications = async () => {
    if (hasLoaded || isLoading) {
      setNotifications(globalNotifications)
      setUnreadCount(globalUnreadCount)
      return
    }

    isLoading = true
    setIsLoadingState(true)
    setError(null)
    
    try {
      // Load unread count từ API
      await loadUnreadCount()
      
      const response = await NotificationService.getNotifications({ fetchSize: 20 })
      
      if (response.notifications) {
        console.log('response.notifications', response.notifications)
        // Enrich notifications với user metadata
        const enrichedNotifications = await enrichNotificationsWithUserData(response.notifications)
        
        globalNotifications = enrichedNotifications
        hasLoaded = true
        
        setNotifications(globalNotifications)
        setUnreadCount(globalUnreadCount)
        notifyListeners()
      }
    } catch (error) {
      console.error('Error loading notifications:', error)
      setError('Không thể tải thông báo')
    } finally {
      isLoading = false
      setIsLoadingState(false)
    }
  }

  return {
    notifications,
    unreadCount,
    isLoading: isLoadingState,
    error,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    loadNotifications,
    loadUnreadCount
  }
}