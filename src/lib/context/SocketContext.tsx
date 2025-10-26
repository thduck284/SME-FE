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
  const hasJoinedRef = useRef(false)

  useEffect(() => {
    if (!userId) {
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
    }

    setNotifications([])
    setIsConnected(false)

    const newSocket = io('http://localhost:3000/notifications', {
      path: '/socket.io',
      transports: ['websocket'],
      forceNew: false,
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      
      if (!hasJoinedRef.current) {
        newSocket.emit('join', { userId })
        hasJoinedRef.current = true
      }
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      hasJoinedRef.current = false
    })

    newSocket.on('notification', (notification: Notification) => {
      setNotifications(prev => {
        const exists = prev.some(n => n.notificationId === notification.notificationId)
        if (exists) return prev
        return [notification, ...prev]
      })
    })

    newSocket.on('connect_error', () => {
      setIsConnected(false)
      hasJoinedRef.current = false
    })

    newSocket.on('reconnect', () => {
      setIsConnected(true)
      if (!hasJoinedRef.current) {
        newSocket.emit('join', { userId })
        hasJoinedRef.current = true
      }
    })

    setSocket(newSocket)

    return () => {
      hasJoinedRef.current = false
      if (newSocket) {
        newSocket.removeAllListeners()
        newSocket.disconnect()
      }
    }
  }, [userId])

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      const exists = prev.some(n => n.notificationId === notification.notificationId)
      if (exists) return prev
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