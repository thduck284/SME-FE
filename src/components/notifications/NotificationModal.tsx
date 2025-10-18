import React from 'react'
import { X, Heart, MessageCircle, UserPlus, Share, AtSign, Trash2 } from 'lucide-react'
import { useNotifications } from '../../lib/hooks/useNotifications'
import { Avatar } from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

const getNotificationIcon = (eventType: string) => {
  switch (eventType) {
    case 'post.liked':
      return <Heart className="w-5 h-5 text-red-500" />
    case 'post.commented':
      return <MessageCircle className="w-5 h-5 text-blue-500" />
    case 'user.followed':
      return <UserPlus className="w-5 h-5 text-green-500" />
    case 'post.shared':
      return <Share className="w-5 h-5 text-purple-500" />
    case 'post.mentioned':
      return <AtSign className="w-5 h-5 text-orange-500" />
    case 'post.created':
      return <MessageCircle className="w-5 h-5 text-blue-500" />
    default:
      return <MessageCircle className="w-5 h-5 text-gray-500" />
  }
}

const getNotificationMessage = (notification: any) => {
  const { eventType, fromUser } = notification
  const userName = fromUser?.displayName || fromUser?.username || 'Người dùng'  
  
  // Luôn tạo message mới thay vì dùng message từ backend
  switch (eventType) {
    case 'post.liked':
      return `${userName} đã thích bài viết của bạn`
    case 'post.commented':
      return `${userName} đã bình luận bài viết của bạn`
    case 'user.followed':
      return `${userName} đã theo dõi bạn`
    case 'post.shared':
      return `${userName} đã chia sẻ bài viết của bạn`
    case 'post.mentioned':
      return `${userName} đã nhắc đến bạn trong bài viết`
    case 'post.created':
      return `${userName} đã đăng bài viết mới`
    default:
      return `${userName} đã gửi thông báo cho bạn`
  }
}

export function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const { 
    notifications, 
    unreadCount, 
    isLoading,
    error,
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    loadNotifications
  } = useNotifications()

  // Load notifications khi modal mở
  React.useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, loadNotifications])

  if (!isOpen) return null

  const handleNotificationClick = (notification: any) => {
    if (!notification.readFlag) {
      markAsRead(notification.notificationId)
    }
    
    // Có thể navigate đến post hoặc profile tùy theo entityId
    if (notification.entityId) {
      // Navigate to post
      console.log('Navigate to entity:', notification.entityId)
    }
  }

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    deleteNotification(notificationId)
  }

  const formatTimeAgo = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Vừa xong'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Thông báo</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-8 text-red-500">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.notificationId}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.readFlag ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.eventType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar
                          src={notification.fromUser?.avatarUrl || "/image.png"}
                          alt={notification.fromUser?.displayName || "User"}
                          fallback={notification.fromUser?.displayName?.[0] || notification.fromUser?.username?.[0] || "U"}
                          className="w-8 h-8"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getNotificationMessage(notification)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!notification.readFlag && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.notificationId)}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
