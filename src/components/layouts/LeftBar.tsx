"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { Home, Search, Bell, PlusSquare, User, UserPlus, LogOut } from "lucide-react"
import { CreatePostModal } from "@/components/posts/CreatePostModal"
import { SearchModal } from "@/components/search/SearchModal"
import { NotificationModal } from "@/components/notifications"
import { useSocket } from "@/lib/context/SocketContext"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { useEnrichedSocketNotifications } from "@/lib/hooks/useEnrichedSocketNotifications"
import { UserService } from "@/lib/api/users/UserService"
import { Link } from "react-router-dom"
import { getUserId } from "@/lib/utils/Jwt"

function LeftBarComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  
  const {
    notifications: restNotifications,
    unreadCount: restUnreadCount,
    isLoading: isLoadingRest,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
    loadMoreNotifications,
    loadUnreadCount
  } = useNotifications()
  
  const { notifications: rawSocketNotifications } = useSocket()
  const enrichedSocketNotifications = useEnrichedSocketNotifications()
  
  const [mergedNotifications, setMergedNotifications] = useState<any[]>([])
  const [hasNewSocketNotification, setHasNewSocketNotification] = useState(false)
  const [processedSocketNotifications, setProcessedSocketNotifications] = useState<Set<string>>(new Set())
  
  const userId = getUserId()
  
  const handleSocketNotificationRead = useCallback((notification: any) => {
    const socketKey = `${notification.entityId}-${notification.eventType}-${notification.fromUserId}`
    
    setProcessedSocketNotifications(prev => {
      const newSet = new Set(prev)
      newSet.add(socketKey)
      return newSet
    })
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead()
    loadUnreadCount()
    setHasNewSocketNotification(false)
    
    const allSocketKeys = rawSocketNotifications.map(notif => 
      `${notif.entityId}-${notif.eventType}-${notif.fromUserId}`
    )
    setProcessedSocketNotifications(new Set(allSocketKeys))
  }, [markAllAsRead, loadUnreadCount, rawSocketNotifications])

  const handleNotificationRead = useCallback(async (notificationId: string, createdAt: string | Date) => {
    await markAsRead(notificationId, createdAt)
    loadUnreadCount()
  }, [markAsRead, loadUnreadCount])

  const handleDeleteNotification = useCallback(async (notificationId: string) => {
    await deleteNotification(notificationId)
    loadUnreadCount()
  }, [deleteNotification, loadUnreadCount])

  const handleLoadMoreNotifications = useCallback(async (currentNotifications: any[]) => {
    try {
      const result = await loadMoreNotifications(currentNotifications, currentNotifications.length == 0 ? 10 : currentNotifications.length + 10)
      
      return {
        notifications: result.notifications || [],
        hasMore: result.hasMore || false
      }
    } catch (error) {
      console.error('Error loading more notifications:', error)
      return {
        notifications: [],
        hasMore: false
      }
    }
  }, [loadMoreNotifications])

  const totalUnreadCount = useMemo(() => {
    const unprocessedSocketNotifications = rawSocketNotifications.filter(socketNotif => {
      const socketKey = `${socketNotif.entityId}-${socketNotif.eventType}-${socketNotif.fromUserId}`
      return !processedSocketNotifications.has(socketKey)
    })
    
    const socketUnreadCount = unprocessedSocketNotifications.length
    return restUnreadCount + socketUnreadCount
  }, [restUnreadCount, rawSocketNotifications, processedSocketNotifications])

  // 🚨 SỬA: Memoize merged notifications
  const enrichedNotifications = useMemo(async () => {
    if (rawSocketNotifications.length === 0 && restNotifications.length === 0) {
      return []
    }

    try {
      const allUserIds = [...new Set([
        ...restNotifications.map(n => n.fromUserId),
        ...rawSocketNotifications.map(n => n.fromUserId)
      ].filter(id => id && id.trim() !== ''))]

      let userMap = new Map()
      
      if (allUserIds.length > 0) {
        const userMetadata = await UserService.getMultipleUsersMetadata(allUserIds)
        userMap = new Map(userMetadata.map(user => [user.userId, user]))
      }

      const enrichedRestNotifications = restNotifications.map(notification => ({
        ...notification,
        fromUser: userMap.get(notification.fromUserId) ? {
          userId: userMap.get(notification.fromUserId).userId,
          username: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
          displayName: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
          avatarUrl: userMap.get(notification.fromUserId).avtUrl
        } : undefined,
        isFromSocket: false
      }))

      const enrichedSocketNotifications = rawSocketNotifications.map(notification => ({
        ...notification,
        fromUser: userMap.get(notification.fromUserId) ? {
          userId: userMap.get(notification.fromUserId).userId,
          username: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
          displayName: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
          avatarUrl: userMap.get(notification.fromUserId).avtUrl
        } : undefined,
        readFlag: false,
        isFromSocket: true
      }))

      return [...enrichedSocketNotifications, ...enrichedRestNotifications]
    } catch (error) {
      console.error('Error merging notifications:', error)
      return [
        ...rawSocketNotifications.map(n => ({ ...n, readFlag: false, isFromSocket: true })),
        ...restNotifications.map(n => ({ ...n, isFromSocket: false }))
      ]
    }
  }, [restNotifications, rawSocketNotifications])

  // 🚨 SỬA: Effect để set merged notifications
  useEffect(() => {
    const setMerged = async () => {
      const result = await enrichedNotifications
      setMergedNotifications(result)
    }
    setMerged()
  }, [enrichedNotifications])

  useEffect(() => {
    if (!userId) return
    
    loadUnreadCount()
    loadNotifications()
  }, [userId, loadUnreadCount, loadNotifications])

  useEffect(() => {
    if (rawSocketNotifications.length > 0) {
      setHasNewSocketNotification(true)
    }
  }, [rawSocketNotifications])

  const handleNotificationClick = useCallback(() => {
    setHasNewSocketNotification(false)
    setIsNotificationModalOpen(true)
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userId')
    window.location.href = '/login'
  }, [])

  // 🚨 SỬA: Memoize modal handlers
  const handleCloseCreateModal = useCallback(() => setIsModalOpen(false), [])
  const handleCloseSearchModal = useCallback(() => setIsSearchModalOpen(false), [])
  const handleCloseNotificationModal = useCallback(() => setIsNotificationModalOpen(false), [])
  const handleOpenCreateModal = useCallback(() => setIsModalOpen(true), [])
  const handleOpenSearchModal = useCallback(() => setIsSearchModalOpen(true), [])

  return (
    <>
      <aside className="w-64 h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30 border-r border-orange-200/50 hidden md:flex flex-col shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-orange-200/50">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-transparent bg-clip-text tracking-tight">
            Streamora
          </h1>
        </div>

        {/* Navigation với scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <nav className="space-y-1">
            <Link
              to="/home"
              className="flex items-center gap-4 px-4 py-3.5 text-orange-700 bg-orange-100 rounded-xl transition-all duration-300 shadow-sm font-medium group"
            >
              <Home className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Home</span>
            </Link>

            <button
              onClick={handleOpenSearchModal}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group w-full"
            >
              <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Search</span>
            </button>

            <button
              onClick={handleNotificationClick}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group w-full relative"
            >
              <div className="relative">
                <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-white text-red-500 text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold shadow-lg border-2 border-red-500">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
                {hasNewSocketNotification && totalUnreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </div>
              <span>Notifications</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group w-full"
            >
              <PlusSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Create</span>
            </button>

            <Link 
              to={userId ? `/profile/${userId}` : "/login"}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <User className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Profile</span>
            </Link>

            <Link
              to="/suggested"
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-orange-700 hover:bg-orange-50 rounded-xl transition-all duration-300 font-medium group"
            >
              <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Gợi ý theo dõi</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-4 px-4 py-3.5 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 font-medium group w-full"
            >
              <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={handleCloseCreateModal}
        onPostCreated={() => console.log("Post created")}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={handleCloseSearchModal}
      />

      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={handleCloseNotificationModal}
        restNotifications={mergedNotifications}
        socketNotifications={enrichedSocketNotifications}
        isLoading={isLoadingRest}
        pagination={pagination}
        onNotificationRead={handleNotificationRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
        onLoadMore={handleLoadMoreNotifications}
        onSocketNotificationRead={handleSocketNotificationRead}
        processedSocketNotifications={processedSocketNotifications}
      />
    </>
  )
}

// 🚨 QUAN TRỌNG: Wrap với React.memo
export const LeftBar = React.memo(LeftBarComponent)