// lib/hooks/useNotifications.ts
import { useState, useEffect, useCallback } from 'react'
import { NotificationService, NotificationDto } from '@/lib/api/notifications/NotificationService'
import { UserService } from '@/lib/api/users/UserService'

let globalNotifications: NotificationDto[] = []
let globalUnreadCount = 0
let hasLoaded = false
let isLoading = false
let userMetadataCache = new Map<string, any>()

const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach(listener => listener())
}

async function enrichNotificationsWithUserData(notifications: NotificationDto[]): Promise<NotificationDto[]> {
  const validUserIds = notifications
    .map(n => n.fromUserId)
    .filter(userId => userId && userId.trim() !== '')
  
  const uniqueUserIds = [...new Set(validUserIds)]
  
  const userIdsToFetch = uniqueUserIds.filter(userId => !userMetadataCache.has(userId))
  
  if (userIdsToFetch.length > 0) {
    try {
      const userMetadata = await UserService.getMultipleUsersMetadata(userIdsToFetch)
      userMetadata.forEach(user => {
        userMetadataCache.set(user.userId, user)
      })
    } catch (error) {
      console.error('Error fetching user metadata for notifications:', error)
    }
  }
  
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
  
  const [pagination, setPagination] = useState({
    hasMore: false,
    currentOffset: 0
  })

  useEffect(() => {
    if (hasLoaded) {
      setNotifications(globalNotifications)
      setUnreadCount(globalUnreadCount)
    }
  }, [])

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

  const handleMarkAsRead = useCallback(async (notificationId: string, createdAt: string | Date) => {
    try {
      await NotificationService.markAsRead(notificationId, createdAt)
      
      globalNotifications = globalNotifications.map(notification => 
        notification.notificationId === notificationId 
          ? { ...notification, readFlag: true }
          : notification
      )
      
      await loadUnreadCount()
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead()
      
      globalNotifications = globalNotifications.map(notification => ({ ...notification, readFlag: true }))
      await loadUnreadCount()
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }, [])

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    try {
      await NotificationService.deleteNotification(notificationId)
      
      globalNotifications = globalNotifications.filter(notification => notification.notificationId !== notificationId)
      await loadUnreadCount()
      setNotifications(globalNotifications)
      notifyListeners()
    } catch (err) {
      console.error('Error deleting notification:', err)
    }
  }, [])

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount()
      globalUnreadCount = count
      setUnreadCount(globalUnreadCount)
      notifyListeners()
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }, [])

  const loadInitialNotifications = useCallback(async (fetchSize: number = 10) => {
    if (isLoading) return

    isLoading = true
    setIsLoadingState(true)
    setError(null)
    
    try {
      await loadUnreadCount()
      
      const [response] = await Promise.all([
        NotificationService.getNotifications({
          fetchSize: fetchSize, 
          pageState: ''
        }),
        new Promise(resolve => setTimeout(resolve, 1000))
      ])
      
      if (response.notifications) {
        const enrichedNotifications = await enrichNotificationsWithUserData(response.notifications)
        
        globalNotifications = enrichedNotifications
        
        setPagination({
          hasMore: response.hasMore || false,
          currentOffset: enrichedNotifications.length
        })
        
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
  }, [loadUnreadCount])

  const loadMoreNotifications = useCallback(async (currentNotifications: NotificationDto[], fetchSize: number) => {
    if (isLoading || !pagination.hasMore) {
      return {
        notifications: [],
        hasMore: false
      }
    }

    isLoading = true
    setIsLoadingState(true)
    
    try {
      const currentOffset = pagination.currentOffset
      
      const [response] = await Promise.all([
        NotificationService.getNotifications({
          fetchSize: fetchSize,
          pageState: currentOffset.toString()
        }),
        new Promise(resolve => setTimeout(resolve, 1000))
      ])
      
      if (response.notifications && response.notifications.length > 0) {
        const enrichedNotifications = await enrichNotificationsWithUserData(response.notifications)
        
        globalNotifications = [...globalNotifications, ...enrichedNotifications]
        
        setPagination({
          hasMore: response.hasMore || false,
          currentOffset: globalNotifications.length
        })
        
        setNotifications(globalNotifications)
        notifyListeners()
        
        return {
          notifications: enrichedNotifications,
          hasMore: response.hasMore || false
        }
      } else {
        setPagination(prev => ({
          ...prev,
          hasMore: false
        }))
        
        return {
          notifications: [],
          hasMore: false
        }
      }
    } catch (error) {
      console.error('Error loading more notifications:', error)
      return {
        notifications: [],
        hasMore: false
      }
    } finally {
      isLoading = false
      setIsLoadingState(false)
    }
  }, [pagination.hasMore, pagination.currentOffset])

  const refreshNotifications = useCallback(async () => {
    setPagination({
      hasMore: false,
      currentOffset: 0
    })
    await loadInitialNotifications(10)
  }, [loadInitialNotifications])

  return {
    notifications,
    unreadCount,
    isLoading: isLoadingState,
    error,
    pagination,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    loadNotifications: loadInitialNotifications,
    loadMoreNotifications,
    refreshNotifications,
    loadUnreadCount
  }
}