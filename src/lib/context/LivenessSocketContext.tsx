import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getUserId } from '@/lib/utils/Jwt'

interface UserStatus {
  fromUserId: string
  status: 'ONLINE' | 'AWAY' | 'OFFLINE'
  lastActiveAt: Date
}

interface LivenessContextType {
  socket: Socket | null
  friendStatuses: Map<string, UserStatus>
  isConnected: boolean
  getFriendStatus: (userId: string) => UserStatus | null
  sendHeartbeat: (friendIds: string[]) => void
}

const LivenessContext = createContext<LivenessContextType | undefined>(undefined)

interface LivenessProviderProps {
  children: ReactNode
}

export function LivenessProvider({ children }: LivenessProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [friendStatuses, setFriendStatuses] = useState<Map<string, UserStatus>>(new Map())
  const [isConnected, setIsConnected] = useState(false)
  const userId = getUserId()
  const hasJoinedRef = useRef(false)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const trackedFriendIdsRef = useRef<string[]>([])

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

    setFriendStatuses(new Map())
    setIsConnected(false)

    const newSocket = io('http://localhost:3000/liveness', {
      path: '/liveness-socket.io',
      transports: ['polling', 'websocket'],
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

    newSocket.on('liveness', (status: UserStatus) => {
      if (status.fromUserId === userId) {
        return
      }
      setFriendStatuses(prev => {
        const newMap = new Map(prev)
        newMap.set(status.fromUserId, status)
        return newMap
      })
    })

    newSocket.on('connect_error', (error) => {
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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      if (newSocket) {
        newSocket.removeAllListeners()
        newSocket.disconnect()
      }
    }
  }, [userId])

  useEffect(() => {
    if (!isConnected || !userId || !socket) {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      return
    }

    const sendGlobalHeartbeat = () => {
      const friendIds = trackedFriendIdsRef.current
      if (friendIds.length > 0) {
        socket.emit('heartbeat', {
          heartbeatDto: {
            fromUserId: userId,
            toUserIds: friendIds
          }
        })
      }
    }

    heartbeatIntervalRef.current = setInterval(sendGlobalHeartbeat, 5000)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
    }
  }, [isConnected, userId, socket])

  const getFriendStatus = (userId: string): UserStatus | null => {
    return friendStatuses.get(userId) || null
  }

  const sendHeartbeat = useCallback((friendIds: string[]) => {
    if (socket && isConnected && userId) {
      trackedFriendIdsRef.current = friendIds
      socket.emit('heartbeat', {
        heartbeatDto: {
          fromUserId: userId,
          toUserIds: friendIds
        }
      })
    }
  }, [socket, isConnected, userId])

  const value: LivenessContextType = {
    socket,
    friendStatuses,
    isConnected,
    getFriendStatus,
    sendHeartbeat
  }

  return (
    <LivenessContext.Provider value={value}>
      {children}
    </LivenessContext.Provider>
  )
}

export function useLiveness() {
  const context = useContext(LivenessContext)
  if (context === undefined) {
    throw new Error('useLiveness must be used within a LivenessProvider')
  }
  return context
}