import React, { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Heart, MessageCircle, UserPlus, Share, AtSign, Trash2, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import Button from '@/components/ui/Button'
import { PostDetailModal } from '@/components/posts/PostDetailModal'
import { getBatchPosts } from '@/lib/api/posts/GetBatchPosts'
import { usePostReactions } from '@/lib/hooks/usePostReaction'
import { usePostStats } from '@/lib/hooks/usePostStats'
import { getUserId } from '@/lib/utils/Jwt'
import type { PostFullDto } from '@/lib/types/posts/PostFullDto'

interface Notification {
  notificationId: string
  toUserId: string
  fromUserId: string
  eventType: string
  entityId: string
  message: string
  createdAt: Date
  readFlag: boolean
  fromUser?: {
    username?: string
    displayName?: string
    avatarUrl?: string
  }
  isFromSocket?: boolean
}

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  restNotifications: Notification[]
  socketNotifications: Notification[]
  isLoading: boolean
  pagination: {
    hasMore: boolean
    currentOffset: number
  }
  onNotificationRead: (notificationId: string, createdAt: string | Date) => void
  onMarkAllAsRead: () => void
  onDeleteNotification: (notificationId: string) => void
  onLoadMore: (currentNotifications: Notification[]) => Promise<{ notifications: Notification[], hasMore: boolean }>
  onSocketNotificationRead?: (notification: Notification) => void
  processedSocketNotifications?: Set<string>
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

const getNotificationMessage = (notification: Notification) => {
  const { eventType, fromUser } = notification
  const userName = fromUser?.displayName || fromUser?.username || 'User'  
  
  switch (eventType) {
    case 'post.liked':
      return `${userName} liked your post`
    case 'post.commented':
      return `${userName} commented on your post`
    case 'user.followed':
      return `${userName} started following you`
    case 'post.shared':
      return `${userName} shared your post`
    case 'post.mentioned':
      return `${userName} mentioned you in a post`
    case 'post.created':
      return `${userName} created a new post`
    default:
      return notification.message || `${userName} sent you a notification`
  }
}

export function NotificationModal({ 
  isOpen, 
  onClose, 
  restNotifications,
  socketNotifications,
  isLoading,
  pagination,
  onNotificationRead,
  onMarkAllAsRead,
  onDeleteNotification,
  onLoadMore,
  onSocketNotificationRead,
  processedSocketNotifications = new Set()
}: NotificationModalProps) {
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)
  
  const [displayedNotifications, setDisplayedNotifications] = useState<Notification[]>([])
  const [hasMore, setHasMore] = useState(pagination.hasMore)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasInitialLoad, setHasInitialLoad] = useState(false)
  const [localProcessedSocketNotifications, setLocalProcessedSocketNotifications] = useState<Set<string>>(processedSocketNotifications)
  
  // State cho PostDetailModal
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isPostDetailOpen, setIsPostDetailOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<PostFullDto | null>(null)
  const [isLoadingPost, setIsLoadingPost] = useState(false)
  
  // Hooks cho post reactions và stats
  const { reaction, loading: reactionLoading, react, removeReaction } = usePostReactions(selectedPostId || '')
  const { fetchPostStats } = usePostStats()
  const [postStats, setPostStats] = useState<any>(null)
  const [isOwnPost, setIsOwnPost] = useState(false)

  useEffect(() => {
    setLocalProcessedSocketNotifications(processedSocketNotifications)
  }, [processedSocketNotifications])

  useEffect(() => {
    if (!isOpen) {
      setDisplayedNotifications([])
      setHasInitialLoad(false)
      // Đóng PostDetailModal khi NotificationModal đóng
      setIsPostDetailOpen(false)
      setSelectedPost(null)
    }
  }, [isOpen])

  const isSocketNotificationRead = (notification: Notification): boolean => {
    if (!notification.isFromSocket) return notification.readFlag
    
    const socketKey = `${notification.entityId}-${notification.eventType}-${notification.fromUserId}`
    return localProcessedSocketNotifications.has(socketKey)
  }

  const allNotifications = useMemo(() => {
    const seenIds = new Set<string>()
    const result: Notification[] = []

    socketNotifications.forEach(notification => {
      const socketKey = `${notification.entityId}-${notification.eventType}-${notification.fromUserId}`
      if (!seenIds.has(socketKey)) {
        seenIds.add(socketKey)
        result.push({ 
          ...notification, 
          readFlag: isSocketNotificationRead(notification), 
          isFromSocket: true 
        })
      }
    })

    displayedNotifications.forEach(notification => {
      if (!seenIds.has(notification.notificationId)) {
        seenIds.add(notification.notificationId)
        result.push({ ...notification, isFromSocket: false })
      }
    })

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [socketNotifications, displayedNotifications, isSocketNotificationRead])

  useEffect(() => {
    if (isOpen && !hasInitialLoad && restNotifications.length > 0) {
      const filteredRestNotifications = restNotifications.filter(restNotif => 
        !socketNotifications.some(socketNotif => 
          socketNotif.notificationId === restNotif.notificationId ||
          (socketNotif.entityId === restNotif.entityId && 
           socketNotif.eventType === restNotif.eventType &&
           socketNotif.fromUserId === restNotif.fromUserId)
        )
      )
      
      setDisplayedNotifications(filteredRestNotifications)
      setHasMore(pagination.hasMore)
      setHasInitialLoad(true)
    }
  }, [isOpen, restNotifications, socketNotifications, pagination.hasMore, hasInitialLoad])

  useEffect(() => {
    if (!isOpen || !hasMore || isLoadingMore) {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoadingMore && hasMore) {
          handleLoadMore()
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      }
    )

    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isOpen, hasMore, isLoadingMore, displayedNotifications])

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return

    setIsLoadingMore(true)
    
    try {
      const result = await onLoadMore(displayedNotifications)
      
      if (result.notifications && result.notifications.length > 0) {
        const newNotifications = result.notifications.filter(newNotif => 
          !displayedNotifications.some(existingNotif => 
            existingNotif.notificationId === newNotif.notificationId
          ) &&
          !socketNotifications.some(socketNotif => 
            socketNotif.notificationId === newNotif.notificationId ||
            (socketNotif.entityId === newNotif.entityId && 
             socketNotif.eventType === newNotif.eventType &&
             socketNotif.fromUserId === newNotif.fromUserId)
          )
        )
        
        if (newNotifications.length > 0) {
          setDisplayedNotifications(prev => [...prev, ...newNotifications])
          setHasMore(result.hasMore)
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more notifications:', error)
      setHasMore(false)
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Hàm mở PostDetailModal
  const handleOpenPostDetail = async (postId: string) => {
    setSelectedPostId(postId)
    setIsLoadingPost(true)
    
    try {
      const posts = await getBatchPosts([postId])
      if (posts && posts.length > 0) {
        const post = posts[0]
        setSelectedPost(post)
        setIsPostDetailOpen(true)
        
        // Check if current user owns the post
        const currentUserId = getUserId()
        setIsOwnPost(currentUserId === post.authorId)
        
        // Fetch post stats
        try {
          const stats = await fetchPostStats(postId)
          setPostStats(stats)
        } catch (error) {
          console.error('Failed to fetch post stats:', error)
        }
      } else {
        console.error('Post not found')
      }
    } catch (error) {
      console.error('Error loading post:', error)
    } finally {
      setIsLoadingPost(false)
    }
  }

  const handleClosePostDetail = () => {
    setIsPostDetailOpen(false)
    setSelectedPost(null)
    setSelectedPostId(null)
    setPostStats(null)
  }

  // Handler cho reaction
  const handleReact = async (reactionType: string) => {
    if (!selectedPostId) return
    try {
      const currentReaction = reaction?.userReaction
      if (currentReaction === reactionType) {
        await removeReaction()
      } else {
        await react(reactionType)
      }
    } catch (error) {
      console.error('Failed to react:', error)
    }
  }

  // Handler cho edit post
  const handleEditPost = (postId: string) => {
    console.log('Edit post:', postId)
    // Implement edit functionality if needed
  }

  // Handler cho delete post
  const handleDeletePost = (postId: string) => {
    console.log('Delete post:', postId)
    // Implement delete functionality if needed
  }

  // Handler cho hide post
  const handleHidePost = (postId: string) => {
    console.log('Hide post:', postId)
    // Implement hide functionality if needed
  }

  // Handler cho report post
  const handleReportPost = (postId: string) => {
    console.log('Report post:', postId)
    // Implement report functionality if needed
  }

  // Handler cho share success
  const handleShareSuccess = () => {
    console.log('Share success')
    // Refresh post stats after share
    if (selectedPostId) {
      fetchPostStats(selectedPostId).then(setPostStats).catch(console.error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.readFlag) {
      if (notification.isFromSocket) {
        const socketKey = `${notification.entityId}-${notification.eventType}-${notification.fromUserId}`
        
        setLocalProcessedSocketNotifications(prev => {
          const newSet = new Set(prev)
          newSet.add(socketKey)
          return newSet
        })
        
        if (onSocketNotificationRead) {
          onSocketNotificationRead(notification)
        }
      } else {
        onNotificationRead(notification.notificationId, notification.createdAt)
        
        setDisplayedNotifications(prev => 
          prev.map(n => 
            n.notificationId === notification.notificationId 
              ? { ...n, readFlag: true }
              : n
          )
        )
      }
    }
    
    // Xử lý navigation khi click vào notification
    if (notification.entityId) {
      switch (notification.eventType) {
        case 'post.liked':
        case 'post.commented':
        case 'post.shared':
        case 'post.mentioned':
        case 'post.created':
          handleOpenPostDetail(notification.entityId)
          break
        case 'user.followed':
          navigate(`/profile/${notification.fromUserId}`)
          onClose()
          break
        default:
          console.log('Navigate to entity:', notification.entityId)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  if (!isOpen) return null

  const unreadCount = allNotifications.filter(n => !n.readFlag).length

  const handleDeleteNotification = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation()
    
    if (notification.isFromSocket) {
      console.log('Cannot delete socket notification')
      return
    }

    onDeleteNotification(notification.notificationId)
    setDisplayedNotifications(prev => prev.filter(n => n.notificationId !== notification.notificationId))
  }

  const handleMarkAllAsReadClick = () => {
    onMarkAllAsRead()
    
    setDisplayedNotifications(prev => prev.map(n => ({ ...n, readFlag: true })))
    
    const allSocketKeys = socketNotifications.map(notif => 
      `${notif.entityId}-${notif.eventType}-${notif.fromUserId}`
    )
    setLocalProcessedSocketNotifications(new Set(allSocketKeys))
    
    if (onSocketNotificationRead) {
      socketNotifications.forEach(notification => {
        onSocketNotificationRead(notification)
      })
    }
  }

  const formatTimeAgo = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    return `${Math.floor(diffInSeconds / 86400)} days ago`
  }

  const getUniqueKey = (notification: Notification): string => {
    if (notification.isFromSocket) {
      return `socket-${notification.entityId}-${notification.eventType}-${notification.fromUserId}-${notification.createdAt}`
    }
    return `rest-${notification.notificationId}`
  }

  return (
    <>
      {/* Notification Modal - z-index thấp hơn */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]" onClick={onClose}>
        <div 
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
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
                  onClick={handleMarkAllAsReadClick}
                  className="text-xs"
                >
                  Mark all as read
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

          <div 
            ref={listRef}
            className="flex-1 overflow-y-auto"
          >
            {isLoading && allNotifications.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : allNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allNotifications.map((notification) => {
                  const isRead = notification.isFromSocket 
                    ? isSocketNotificationRead(notification)
                    : notification.readFlag
                  
                  return (
                    <div
                      key={getUniqueKey(notification)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors group relative ${
                        !isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      } ${notification.isFromSocket && !isRead ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}
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
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-500">
                                  {formatTimeAgo(notification.createdAt)}
                                </p>
                                {notification.isFromSocket && !isRead && (
                                  <span className="text-xs text-green-600 font-medium">New</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!isRead && !notification.isFromSocket && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {!isRead && notification.isFromSocket && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                          {!notification.isFromSocket && (
                            <button
                              onClick={(e) => handleDeleteNotification(e, notification)}
                              className="p-1 hover:bg-gray-200 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {hasMore && (
                  <div 
                    ref={loadMoreTriggerRef} 
                    className="flex justify-center py-8"
                    style={{ minHeight: '50px' }}
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading more notifications...</span>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 text-sm">
                        Scroll to load more
                      </div>
                    )}
                  </div>
                )}

                {!hasMore && allNotifications.length > 0 && (
                  <div className="flex justify-center py-4">
                    <span className="text-sm text-gray-500">
                      All notifications loaded
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PostDetailModal - Wrap trong div có z-index cao hơn */}
      {isPostDetailOpen && selectedPost && (
        <div className="fixed inset-0 z-[10000]">
          {isLoadingPost ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : (
            <PostDetailModal
              post={selectedPost}
              isOpen={isPostDetailOpen}
              onClose={handleClosePostDetail}
              onOpenImage={(imageUrl) => {
                console.log('Open image:', imageUrl)
              }}
              reaction={reaction}
              loading={reactionLoading}
              onReact={handleReact}
              onShareSuccess={handleShareSuccess}
              isOwnPost={isOwnPost}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onHide={handleHidePost}
              onReport={handleReportPost}
              postStats={postStats}
            />
          )}
        </div>
      )}
    </>
  )
}