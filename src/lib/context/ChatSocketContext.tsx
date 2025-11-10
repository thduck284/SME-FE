import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getUserId } from '@/lib/utils/Jwt'

interface Message {
  messageId: string
  conversationId: string
  senderId: string
  content?: string
  attachments?: string[]
  status?: string
  action?: string
  userStatus?: 'SENT' | 'DELIVERED' | 'READ'
  createdAt: Date
  updatedAt?: Date
}

interface NewMessageEvent {
  conversationId: string
  message: Message
}

interface ParticipantEvent {
  conversationId: string
  userId: string
  addedBy?: string
  removedBy?: string
  assignedBy?: string
}

interface MessageDeletedEvent {
  conversationId: string
  messageId: string
  deletedBy: string
}

interface MessageEditedEvent {
  conversationId: string
  messageId: string
  message: Message
  editedBy: string
}

interface ChatContextType {
  socket: Socket | null
  isConnected: boolean
  sendMessage: (conversationId: string, message: { content?: string; attachments?: string[] }) => Promise<void>
  onNewMessage: (callback: (event: NewMessageEvent) => void) => void
  offNewMessage: (callback: (event: NewMessageEvent) => void) => void
  addReaction: (conversationId: string, messageId: string, reaction: string, previousReaction?: string) => Promise<Record<string, number>>
  removeReaction: (conversationId: string, messageId: string, reaction: string) => Promise<Record<string, number>>
  onReactionUpdated: (callback: (event: { conversationId: string; messageId: string; reaction: string; counts: Record<string, number>; userId: string; action: 'added' | 'removed' }) => void) => void
  offReactionUpdated: (callback: (event: { conversationId: string; messageId: string; reaction: string; counts: Record<string, number>; userId: string; action: 'added' | 'removed' }) => void) => void
  onParticipantAdded: (callback: (event: ParticipantEvent) => void) => void
  offParticipantAdded: (callback: (event: ParticipantEvent) => void) => void
  onParticipantRemoved: (callback: (event: ParticipantEvent) => void) => void
  offParticipantRemoved: (callback: (event: ParticipantEvent) => void) => void
  onAdminAssigned: (callback: (event: ParticipantEvent) => void) => void
  offAdminAssigned: (callback: (event: ParticipantEvent) => void) => void
  onMessageDeleted: (callback: (event: MessageDeletedEvent) => void) => void
  offMessageDeleted: (callback: (event: MessageDeletedEvent) => void) => void
  onMessageEdited: (callback: (event: MessageEditedEvent) => void) => void
  offMessageEdited: (callback: (event: MessageEditedEvent) => void) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
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

    setIsConnected(false)

    const newSocket = io('http://localhost:3000/chat', {
      path: '/chat-socket.io',
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

    newSocket.on('join_response', (data: any) => {
      console.log('Joined chat room:', data)
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

  const sendMessage = useCallback(async (conversationId: string, message: { content?: string; attachments?: string[] }) => {
    if (!socket || !isConnected || !userId) {
      throw new Error('Socket not connected')
    }

    return new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        socket.off('send-message_response', handler)
        reject(new Error('Request Timeout'))
      }, 20000) // Increased timeout to 20 seconds

      const handler = (data: any) => {
        clearTimeout(timeoutId)
        socket.off('send-message_response', handler)
        if (data.success) {
          resolve()
        } else {
          reject(new Error(data.error || 'Failed to send message'))
        }
      }

      socket.on('send-message_response', handler)

      socket.emit('send-message', {
        conversationId,
        message,
        userId
      })
    })
  }, [socket, isConnected, userId])

  const onNewMessage = useCallback((callback: (event: NewMessageEvent) => void) => {
    if (socket) {
      socket.on('new-message', callback)
    }
  }, [socket])

  const offNewMessage = useCallback((callback: (event: NewMessageEvent) => void) => {
    if (socket) {
      socket.off('new-message', callback)
    }
  }, [socket])

  const addReaction = useCallback(async (conversationId: string, messageId: string, reaction: string, previousReaction?: string) => {
    if (!socket || !isConnected || !userId) throw new Error('Socket not connected')
    return new Promise<Record<string, number>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        socket.off('add-reaction_response', handler)
        reject(new Error('Timeout adding reaction'))
      }, 15000)
      
      const handler = (data: any) => {
        clearTimeout(timeoutId)
        socket.off('add-reaction_response', handler)
        if (data.success) resolve(data.counts as Record<string, number>)
        else reject(new Error(data.error || 'Failed to add reaction'))
      }
      socket.on('add-reaction_response', handler)
      socket.emit('add-reaction', { conversationId, messageId, userId, reaction, previousReaction })
    })
  }, [socket, isConnected, userId])

  const removeReaction = useCallback(async (conversationId: string, messageId: string, reaction: string) => {
    if (!socket || !isConnected || !userId) throw new Error('Socket not connected')
    return new Promise<Record<string, number>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        socket.off('remove-reaction_response', handler)
        reject(new Error('Timeout removing reaction'))
      }, 15000)
      
      const handler = (data: any) => {
        clearTimeout(timeoutId)
        socket.off('remove-reaction_response', handler)
        if (data.success) resolve(data.counts as Record<string, number>)
        else reject(new Error(data.error || 'Failed to remove reaction'))
      }
      socket.on('remove-reaction_response', handler)
      socket.emit('remove-reaction', { conversationId, messageId, userId, reaction })
    })
  }, [socket, isConnected, userId])

  const onReactionUpdated = useCallback((callback: (event: { conversationId: string; messageId: string; reaction: string; counts: Record<string, number>; userId: string; action: 'added' | 'removed' }) => void) => {
    if (socket) socket.on('reaction-updated', callback)
  }, [socket])

  const offReactionUpdated = useCallback((callback: (event: { conversationId: string; messageId: string; reaction: string; counts: Record<string, number>; userId: string; action: 'added' | 'removed' }) => void) => {
    if (socket) socket.off('reaction-updated', callback)
  }, [socket])

  const onParticipantAdded = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.on('participant-added', callback)
  }, [socket])

  const offParticipantAdded = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.off('participant-added', callback)
  }, [socket])

  const onParticipantRemoved = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.on('participant-removed', callback)
  }, [socket])

  const offParticipantRemoved = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.off('participant-removed', callback)
  }, [socket])

  const onAdminAssigned = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.on('admin-assigned', callback)
  }, [socket])

  const offAdminAssigned = useCallback((callback: (event: ParticipantEvent) => void) => {
    if (socket) socket.off('admin-assigned', callback)
  }, [socket])

  const onMessageDeleted = useCallback((callback: (event: MessageDeletedEvent) => void) => {
    if (socket) socket.on('message-deleted', callback)
  }, [socket])

  const offMessageDeleted = useCallback((callback: (event: MessageDeletedEvent) => void) => {
    if (socket) socket.off('message-deleted', callback)
  }, [socket])

  const onMessageEdited = useCallback((callback: (event: MessageEditedEvent) => void) => {
    if (socket) socket.on('message-edited', callback)
  }, [socket])

  const offMessageEdited = useCallback((callback: (event: MessageEditedEvent) => void) => {
    if (socket) socket.off('message-edited', callback)
  }, [socket])

  const value: ChatContextType = {
    socket,
    isConnected,
    sendMessage,
    onNewMessage,
    offNewMessage,
    addReaction,
    removeReaction,
    onReactionUpdated,
    offReactionUpdated,
    onParticipantAdded,
    offParticipantAdded,
    onParticipantRemoved,
    offParticipantRemoved,
    onAdminAssigned,
    offAdminAssigned,
    onMessageDeleted,
    offMessageDeleted,
    onMessageEdited,
    offMessageEdited
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}


