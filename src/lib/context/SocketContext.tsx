import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { getUserId } from '@/lib/utils/Jwt'

interface Notification {
  notificationId: string
  toUserId: string
  fromUserId: string
  eventType: string
  entityId: string
  message: string
  createdAt: Date
  readFlag: boolean
}

interface SocketContextType {
  socket: Socket | null
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

interface SocketProviderProps {
  children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const userId = getUserId()
  const hasJoinedRef = useRef(false) // Track xem đã join room chưa

  useEffect(() => {
    if (!userId) {
      // Nếu không có userId, cleanup socket hiện tại
      if (socket) {
        socket.removeAllListeners()
        socket.close()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    // Cleanup socket cũ trước khi tạo mới
    if (socket) {
      console.log('Cleaning up old socket connection')
      socket.removeAllListeners()
      socket.close()
    }

    // Reset state khi tạo connection mới
    setNotifications([])
    setIsConnected(false)

    // Tạo kết nối socket mới
    const newSocket = io('http://localhost:3000/notifications', {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: true // Force tạo connection mới
    })

    // Lắng nghe sự kiện kết nối
    newSocket.on('connect', () => {
      console.log('Connected to notification server for user:', userId)
      setIsConnected(true)
      
      // Chỉ join room nếu chưa join
      if (!hasJoinedRef.current) {
        console.log('Joining room for user:', userId)
        newSocket.emit('join', { userId })
        hasJoinedRef.current = true
      }
    })

    // Lắng nghe sự kiện ngắt kết nối
    newSocket.on('disconnect', () => {
      console.log('Disconnected from notification server')
      setIsConnected(false)
      hasJoinedRef.current = false // Reset join state khi disconnect
    })

    // Lắng nghe notification mới
    newSocket.on('notification', (notification: Notification) => {
      console.log('New notification received:', notification)
      setNotifications(prev => [notification, ...prev])
    })

    // Lắng nghe message từ server
    newSocket.on('message', (data: any) => {
      console.log('Message from server:', data)
    })

    // Lắng nghe lỗi kết nối
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      hasJoinedRef.current = false
    })

    // Lắng nghe reconnection
    newSocket.on('reconnect', () => {
      console.log('Reconnected to notification server')
      setIsConnected(true)
      // Rejoin room sau khi reconnect
      if (!hasJoinedRef.current) {
        console.log('Rejoining room after reconnect for user:', userId)
        newSocket.emit('join', { userId })
        hasJoinedRef.current = true
      }
    })

    setSocket(newSocket)

    // Cleanup khi component unmount hoặc userId thay đổi
    return () => {
      console.log('Cleaning up socket connection')
      hasJoinedRef.current = false // Reset join state
      newSocket.removeAllListeners()
      newSocket.close()
    }
  }, [userId])

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.notificationId === notification.notificationId)
      if (exists) {
        console.log('Notification already exists, skipping:', notification.notificationId)
        return prev
      }
      return [notification, ...prev]
    })
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.notificationId === notificationId 
          ? { ...notification, readFlag: true }
          : notification
      )
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, readFlag: true }))
    )
  }

  const unreadCount = notifications.filter(n => !n.readFlag).length

  const value: SocketContextType = {
    socket,
    notifications,
    unreadCount,
    isConnected,
    addNotification,
    markAsRead,
    markAllAsRead
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
