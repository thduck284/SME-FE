"use client"

import { useState, useEffect } from "react"
import { Home, Search, Bell, PlusSquare, User, UserPlus, LogOut } from "lucide-react"
import { CreatePostModal } from "@/components/posts/CreatePostModal"
import { SearchModal } from "@/components/search/SearchModal"
import { NotificationModal } from "@/components/notifications"
import { useSocket } from "@/lib/context/SocketContext"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { UserService } from "@/lib/api/users/UserService"
import { Link } from "react-router-dom"
import { getUserId } from "@/lib/utils/Jwt"

export function LeftBar() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  
  // REST notifications từ useNotifications hook
  const {
    notifications: restNotifications,
    unreadCount: restUnreadCount,
    isLoading: isLoadingRest,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
    loadUnreadCount
  } = useNotifications()
  
  // Socket notifications (real-time)
  const { notifications: rawSocketNotifications } = useSocket()
  
  // Merged notifications (REST + Socket)
  const [mergedNotifications, setMergedNotifications] = useState<any[]>([])
  
  // Có notification mới từ socket chưa được xem
  const [hasNewSocketNotification, setHasNewSocketNotification] = useState(false)
  
  const userId = getUserId()

  // Load REST notifications và unread count lần đầu
  useEffect(() => {
    if (!userId) return
    
    console.log('LeftBar: Loading initial notifications and unread count...')
    loadUnreadCount()
    loadNotifications()
  }, [userId, loadUnreadCount, loadNotifications])

  // Merge socket notifications vào REST notifications và enrich user data
  useEffect(() => {
    const mergeAndEnrichNotifications = async () => {
      if (rawSocketNotifications.length === 0 && restNotifications.length === 0) {
        setMergedNotifications([])
        return
      }

      try {
        // Lấy danh sách unique userIds từ cả REST và socket notifications
        const allUserIds = [...new Set([
          ...restNotifications.map(n => n.fromUserId),
          ...rawSocketNotifications.map(n => n.fromUserId)
        ].filter(id => id && id.trim() !== ''))]

        let userMap = new Map()
        
        if (allUserIds.length > 0) {
          // Fetch user metadata
          console.log('Fetching user metadata for notifications:', allUserIds)
          const userMetadata = await UserService.getMultipleUsersMetadata(allUserIds)
          userMap = new Map(userMetadata.map(user => [user.userId, user]))
        }

        // Enrich REST notifications
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

        // Enrich socket notifications (luôn là unread)
        const enrichedSocketNotifications = rawSocketNotifications.map(notification => ({
          ...notification,
          fromUser: userMap.get(notification.fromUserId) ? {
            userId: userMap.get(notification.fromUserId).userId,
            username: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
            displayName: `${userMap.get(notification.fromUserId).firstName} ${userMap.get(notification.fromUserId).lastName}`.trim(),
            avatarUrl: userMap.get(notification.fromUserId).avtUrl
          } : undefined,
          readFlag: false, // Socket notifications luôn là unread
          isFromSocket: true
        }))

        // Merge: Socket notifications (mới nhất) + REST notifications
        const merged = [...enrichedSocketNotifications, ...enrichedRestNotifications]
        
        setMergedNotifications(merged)
        console.log('Merged notifications:', {
          socket: enrichedSocketNotifications.length,
          rest: enrichedRestNotifications.length,
          total: merged.length
        })

      } catch (error) {
        console.error('Error merging notifications:', error)
        // Fallback: merge without enrichment
        const fallbackMerged = [
          ...rawSocketNotifications.map(n => ({ ...n, readFlag: false, isFromSocket: true })),
          ...restNotifications.map(n => ({ ...n, isFromSocket: false }))
        ]
        setMergedNotifications(fallbackMerged)
      }
    }

    mergeAndEnrichNotifications()
  }, [restNotifications, rawSocketNotifications])

  // Theo dõi socket notifications mới
  useEffect(() => {
    if (rawSocketNotifications.length > 0) {
      setHasNewSocketNotification(true)
      console.log('New socket notifications detected:', rawSocketNotifications.length)
    }
  }, [rawSocketNotifications])

  // 🚨 SỬA: Chỉ dùng REST unread count (socket notifications chưa được lưu trong DB)
  const totalUnreadCount = restUnreadCount

  const handleNotificationClick = () => {
    // Reset trạng thái có notification mới
    setHasNewSocketNotification(false)
    setIsNotificationModalOpen(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userId')
    window.location.href = '/login'
  }

  // Callback khi notification được đánh dấu đã đọc từ modal
  const handleNotificationRead = async (notificationId: string) => {
    await markAsRead(notificationId)
    // Reload unread count sau khi mark as read
    loadUnreadCount()
  }

  // Callback khi đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    // Reload unread count
    loadUnreadCount()
  }

  // Callback khi xóa notification
  const handleDeleteNotification = async (notificationId: string) => {
    await deleteNotification(notificationId)
    // Reload unread count
    loadUnreadCount()
  }

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
              onClick={() => setIsSearchModalOpen(true)}
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
                {/* Chấm xanh khi có notification mới từ socket */}
                {hasNewSocketNotification && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                )}
              </div>
              <span>Notifications</span>
            </button>

            {/* Create Button */}
            <button
              onClick={() => setIsModalOpen(true)}
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
              <span>Gợi ý kết bạn</span>
            </Link>

            {/* Logout Button */}
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

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPostCreated={() => console.log("Post created")}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        restNotifications={mergedNotifications}
        socketNotifications={[]}
        isLoading={isLoadingRest}
        onNotificationRead={handleNotificationRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteNotification={handleDeleteNotification}
      />
    </>
  )
}