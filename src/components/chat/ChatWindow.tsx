"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Send, Minimize2, Paperclip, Maximize2, ChevronLeft, ChevronRight, Smile, Check, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useChat } from '@/lib/context/ChatSocketContext'
import { ChatService, Message } from '@/lib/api/chat/ChatService'
import { getUserId } from '@/lib/utils/Jwt'
import { formatMessageTime, formatDateDivider } from '@/lib/utils/PostUtils'
import { ReactionType, reactionIcons } from '@/lib/constants/reactions'
import { ChatReactionDetailsModal } from '@/components/chat/ChatReactionDetailsModal'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { UserService } from '@/lib/api/users/UserService'
import { UserMetadata } from '@/lib/types/User'

interface ChatWindowProps {
  conversationId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  conversationType?: 'direct' | 'group'
  onClose: () => void
  onMinimize: () => void
  position?: { x: number; y: number }
}

export function ChatWindow({ 
  conversationId, 
  recipientId,
  recipientName, 
  recipientAvatar,
  conversationType = 'direct',
  onClose,
  onMinimize,
  position = { x: 0, y: 0 }
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined)
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const isLoadingTriggerRef = useRef<boolean>(false)
  const { 
    sendMessage, 
    onNewMessage, 
    offNewMessage,
    addReaction,
    removeReaction,
    onReactionUpdated,
    offReactionUpdated,
  } = useChat()
  const userId = getUserId()
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ open: boolean; items: string[]; index: number }>(
    { open: false, items: [], index: 0 }
  )
  const [showPickerFor, setShowPickerFor] = useState<string | null>(null)
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)
  const [reactingMessageIds, setReactingMessageIds] = useState<Set<string>>(new Set())
  const [messageReactions, setMessageReactions] = useState<Record<string, { counters: Record<string, number>; userReaction?: ReactionType }>>({})
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const hoverHideTimerRef = useRef<number | null>(null)
  const [detailsMessageId, setDetailsMessageId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [userMetadataCache, setUserMetadataCache] = useState<Map<string, UserMetadata>>(new Map())
  const isGroup = conversationType === 'group'

  const isVideoUrl = (url: string) => {
    if (url.startsWith('data:video/')) return true
    return /(\.mp4|\.webm|\.ogg|\.mov|\.m4v)(\?.*)?$/i.test(url) || url.includes('/video/')
  }

  const openPreview = (items: string[], index: number) => {
    setPreview({ open: true, items, index })
  }

  const closePreview = () => setPreview(prev => ({ ...prev, open: false }))
  const prevItem = () => setPreview(prev => ({ ...prev, index: (prev.index - 1 + prev.items.length) % prev.items.length }))
  const nextItem = () => setPreview(prev => ({ ...prev, index: (prev.index + 1) % prev.items.length }))

  // Function to remove a specific attachment
  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Function to clear all attachments
  const clearAllAttachments = () => {
    setPendingAttachments([])
  }

  useEffect(() => {
    loadInitial()
  }, [conversationId])

  useEffect(() => {
    const handleNewMessage = async (event: { conversationId: string; message: Message }) => {
      if (event.conversationId === conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m.messageId === event.message.messageId)
          if (exists) return prev
          
          const tempIndex = prev.findIndex(m => 
            m.messageId.startsWith('temp-') && 
            m.senderId === event.message.senderId &&
            m.status === 'sending'
          )
          
          if (tempIndex >= 0) {
            const newMessages = [...prev]
            newMessages[tempIndex] = event.message
            return newMessages
          }
          
          return [...prev, event.message]
        })
        try {
          const counts = await ChatService.getMessageReactionCounts(conversationId, event.message.messageId)
          setMessageReactions(prev => ({
            ...prev,
            [event.message.messageId]: {
              counters: counts,
              userReaction: prev[event.message.messageId]?.userReaction
            }
          }))
        } catch (e) {
          console.warn('Failed to fetch counts for new message', e)
        }
      }
    }

    onNewMessage(handleNewMessage)

    return () => {
      offNewMessage(handleNewMessage)
    }
  }, [conversationId, onNewMessage, offNewMessage, userId])

  // Listen for reaction updates from socket and sync counts
  useEffect(() => {
    const handler = (event: { conversationId: string; messageId: string; reaction: string; counts: Record<string, number>; userId: string; action: 'added' | 'removed' }) => {
      if (event.conversationId !== conversationId) return
      const normalizedCounts: Record<string, number> = Object.fromEntries(
        Object.entries(event.counts || {}).map(([k, v]) => [k.toUpperCase(), v])
      )
      setMessageReactions(prev => ({
        ...prev,
        [event.messageId]: {
          counters: normalizedCounts,
          userReaction: event.userId === userId ? (event.action === 'added' ? (event.reaction.toUpperCase() as ReactionType) : undefined) : prev[event.messageId]?.userReaction
        }
      }))
    }
    onReactionUpdated(handler)
    return () => {
      offReactionUpdated(handler)
    }
  }, [conversationId, onReactionUpdated, offReactionUpdated, userId])

  useEffect(() => {
    // Chỉ scroll xuống dưới khi không đang load older messages
    // và khi có tin nhắn mới được thêm vào cuối
    if (!loadingOlder && !isLoadingTriggerRef.current) {
      const c = scrollContainerRef.current
      if (c) {
        // Kiểm tra xem có đang ở gần cuối không (trong vòng 100px)
        const isNearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 100
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }, [messages, loadingOlder])

  const loadInitial = async () => {
    try {
      setLoading(true)
      const response = await ChatService.getMessages(conversationId, 10)
      const pageAsc = [...response.messages].reverse()
      setMessages(pageAsc)
      setNextCursor(response.nextCursor)
      
      const fetchCountsPromises = pageAsc.map(async (m) => {
        try {
          const counts = await ChatService.getMessageReactionCounts(conversationId, m.messageId)
          return { messageId: m.messageId, counts }
        } catch (e) {
          return { messageId: m.messageId, counts: {} }
        }
      })
      
      Promise.all(fetchCountsPromises).then(results => {
        setMessageReactions(prev => {
          const next = { ...prev }
          results.forEach(({ messageId, counts }) => {
            next[messageId] = {
              counters: counts,
              userReaction: next[messageId]?.userReaction
            }
          })
          return next
        })
      })
      
      requestAnimationFrame(() => {
        const c = scrollContainerRef.current
        if (c) c.scrollTop = c.scrollHeight
      })
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOlder = async () => {
    if (loadingOlder || !nextCursor) return
    try {
      setLoadingOlder(true)
      isLoadingTriggerRef.current = true
      await new Promise(r => setTimeout(r, 500))
      const c = scrollContainerRef.current
      const prevH = c ? c.scrollHeight : 0
      const response = await ChatService.getMessages(conversationId, 10, nextCursor)
      const olderAsc = [...response.messages].reverse()
      setMessages(prev => [...olderAsc, ...prev])
      setNextCursor(response.nextCursor)
      
      const fetchOlderCountsPromises = olderAsc.map(async (m) => {
        try {
          const counts = await ChatService.getMessageReactionCounts(conversationId, m.messageId)
          return { messageId: m.messageId, counts }
        } catch (e) {
          return { messageId: m.messageId, counts: {} }
        }
      })
      
      Promise.all(fetchOlderCountsPromises).then(results => {
        setMessageReactions(prev => {
          const next = { ...prev }
          results.forEach(({ messageId, counts }) => {
            next[messageId] = {
              counters: counts,
              userReaction: next[messageId]?.userReaction
            }
          })
          return next
        })
      })
      
      // Đợi DOM update và giữ nguyên vị trí scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (c) {
            const newH = c.scrollHeight
            c.scrollTop = newH - prevH
          }
        })
      })
    } catch (e) {
      console.error('Failed to load older messages:', e)
    } finally {
      setLoadingOlder(false)
      isLoadingTriggerRef.current = false
    }
  }

  const onScroll = () => {
    const c = scrollContainerRef.current
    if (!c || loading || loadingOlder) return
    const threshold = 24
    if (!isLoadingTriggerRef.current && c.scrollTop <= threshold) {
      loadOlder()
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    const sentinel = topSentinelRef.current
    if (!container || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && nextCursor && !loadingOlder && !isLoadingTriggerRef.current) {
          loadOlder()
        }
      },
      { root: container, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [nextCursor, loadingOlder])

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && pendingAttachments.length === 0) || sending) return

    const content = inputMessage.trim() || undefined
    const attachments = pendingAttachments.length ? pendingAttachments : undefined
    
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const tempMessage: Message = {
      messageId: tempMessageId,
      conversationId,
      senderId: userId!,
      content,
      attachments,
      status: 'sending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    setMessages(prev => [...prev, tempMessage])
    setInputMessage('')
    setPendingAttachments([]) // Clear attachments after sending
    setSending(true)

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    try {
      await sendMessage(conversationId, { 
        content,
        attachments
      })
      setTimeout(() => {
        setMessages(prev => {
          const exists = prev.some(m => m.messageId === tempMessageId && m.status === 'sending')
          if (exists) {
            return prev.filter(m => m.messageId !== tempMessageId)
          }
          return prev
        })
      }, 3000)
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages(prev => prev.filter(m => m.messageId !== tempMessageId))
      setInputMessage(content || '')
      setPendingAttachments(attachments || [])
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const onPickFiles = () => fileInputRef.current?.click()

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowed = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    const readers = await Promise.all(
      allowed.map(file => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      }))
    )
    setPendingAttachments(prev => [...prev, ...readers].slice(0, 10))
    e.target.value = ''
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSelectEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker])

  const updateOptimistic = (messageId: string, next: { type: 'add' | 'remove'; reaction: ReactionType }) => {
    setMessageReactions(prev => {
      const current = prev[messageId] || { counters: {}, userReaction: undefined }
      const newCounters: Record<string, number> = { ...current.counters }
      const currentUserReaction = current.userReaction

      if (next.type === 'remove') {
        const key = next.reaction
        newCounters[key] = Math.max(0, (newCounters[key] || 0) - 1)
        if (newCounters[key] === 0) delete newCounters[key]
        return { ...prev, [messageId]: { counters: newCounters, userReaction: undefined } }
      }

      if (currentUserReaction && currentUserReaction !== next.reaction) {
        const oldKey = currentUserReaction
        newCounters[oldKey] = Math.max(0, (newCounters[oldKey] || 0) - 1)
        if (newCounters[oldKey] === 0) delete newCounters[oldKey]
      }
      const newKey = next.reaction
      newCounters[newKey] = (newCounters[newKey] || 0) + 1
      return { ...prev, [messageId]: { counters: newCounters, userReaction: next.reaction } }
    })
  }

  const revertOptimistic = (messageId: string, snapshot: { counters: Record<string, number>; userReaction?: ReactionType }) => {
    setMessageReactions(prev => ({ ...prev, [messageId]: snapshot }))
  }

  const handleSelectReaction = async (messageId: string, reaction: ReactionType) => {
    if (reactingMessageIds.has(messageId)) return
    const snapshot = messageReactions[messageId] || { counters: {}, userReaction: undefined }
    const isSame = snapshot.userReaction === reaction
    const nextType = isSame ? 'remove' : 'add'
    updateOptimistic(messageId, { type: nextType as 'add' | 'remove', reaction })
    const newSet = new Set(reactingMessageIds)
    newSet.add(messageId)
    setReactingMessageIds(newSet)
    try {
      const wireReaction = reaction.toLowerCase()
      if (isSame) {
        const counts = await removeReaction(conversationId, messageId, wireReaction)
        const normalizedCounts: Record<string, number> = Object.fromEntries(
          Object.entries(counts || {}).map(([k, v]) => [k.toUpperCase(), v])
        )
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: { counters: normalizedCounts, userReaction: undefined }
        }))
      } else {
        const previous = snapshot.userReaction ? snapshot.userReaction.toLowerCase() : undefined
        if (previous && previous !== wireReaction) {
          await removeReaction(conversationId, messageId, previous)
        }
        const counts = await addReaction(conversationId, messageId, wireReaction, previous)
        const normalizedCounts: Record<string, number> = Object.fromEntries(
          Object.entries(counts || {}).map(([k, v]) => [k.toUpperCase(), v])
        )
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: { counters: normalizedCounts, userReaction: reaction }
        }))
      }
    } catch (err) {
      console.error('Reaction failed, reverting:', err)
      revertOptimistic(messageId, snapshot)
    } finally {
      setReactingMessageIds(prev => {
        const s = new Set(prev)
        s.delete(messageId)
        return s
      })
      setShowPickerFor(null)
    }
  }

  const onTogglePickerClick = (messageId: string) => {
    setShowPickerFor(prev => (prev === messageId ? null : messageId))
  }

  const onBubbleTouchStart = (messageId: string) => {
    if (longPressTimer) window.clearTimeout(longPressTimer)
    const id = window.setTimeout(() => setShowPickerFor(messageId), 400)
    setLongPressTimer(id)
  }
  const onBubbleTouchEnd = () => {
    if (longPressTimer) window.clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getFullName = (userMetadata: UserMetadata | undefined): string => {
    if (!userMetadata) return 'User'
    return `${userMetadata.firstName || ''} ${userMetadata.lastName || ''}`.trim() || 'User'
  }

  const getAvatarUrl = (userMetadata: UserMetadata | undefined): string => {
    if (!userMetadata) return "/assets/images/default.png"
    return userMetadata.avtUrl || "/assets/images/default.png"
  }

  const isDifferentDay = (date1: Date, date2: Date | null): boolean => {
    if (!date2) return true
    return (
      date1.getDate() !== date2.getDate() ||
      date1.getMonth() !== date2.getMonth() ||
      date1.getFullYear() !== date2.getFullYear()
    )
  }

  // Fetch user metadata for group messages
  useEffect(() => {
    if (!isGroup || messages.length === 0) return

    const fetchUserMetadata = async () => {
      // Get unique sender IDs (excluding current user)
      const senderIds = Array.from(new Set(
        messages
          .map(m => m.senderId)
          .filter(id => id && id !== userId)
      ))

      // Filter out already cached users
      setUserMetadataCache(prev => {
        const uncachedIds = senderIds.filter(id => !prev.has(id))
        
        if (uncachedIds.length === 0) return prev

        // Fetch uncached users
        UserService.getMultipleUsersMetadata(uncachedIds)
          .then(metadata => {
            setUserMetadataCache(current => {
              const next = new Map(current)
              metadata.forEach(user => {
                next.set(user.userId, user)
              })
              return next
            })
          })
          .catch(error => {
            console.error('Error fetching user metadata for messages:', error)
          })

        return prev
      })
    }

    fetchUserMetadata()
  }, [messages, isGroup, userId])

  return (
    <div 
      className="fixed bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200 z-[9999]"
      style={{
        width: '320px',
        height: '420px',
        right: `${position.x}px`,
        bottom: `${position.y}px`,
        maxHeight: '100vh',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-blue-500 text-white rounded-t-lg">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Avatar
            src={recipientAvatar}
            alt={recipientName}
            fallback={getAvatarFallback(recipientName)}
            className="w-8 h-8"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{recipientName}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1.5 hover:bg-blue-600 rounded transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-blue-600 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500 text-sm">
            No messages yet. Start a conversation!
          </div>
        ) : (
          <div className="space-y-2 relative">
            <div ref={topSentinelRef} style={{ height: 1 }} />
            {loadingOlder && (
              <div className="flex justify-center items-center py-2 text-xs text-gray-500">Loading older messages...</div>
            )}
            {messages.map((message, index) => {
              const isOwn = message.senderId === userId
              const isSending = message.status === 'sending'
              const reactions = messageReactions[message.messageId]
              const counters = reactions?.counters || {}
              const totalReactions = Object.values(counters).reduce((sum, count) => sum + (Number(count) || 0), 0)
              const hasReactions = totalReactions > 0
              const reactionTypes = Object.keys(counters).filter(key => (counters[key] || 0) > 0)
              
              const currentDate = new Date(message.createdAt)
              const previousMessage = index > 0 ? messages[index - 1] : null
              const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null
              const showDateDivider = isDifferentDay(currentDate, previousDate)
              
              return (
                <div key={message.messageId}>
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-4">
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1 h-px bg-gray-300"></div>
                        <span className="text-xs text-gray-500 px-2 bg-gray-50 rounded">
                          {formatDateDivider(message.createdAt.toString())}
                        </span>
                        <div className="flex-1 h-px bg-gray-300"></div>
                      </div>
                    </div>
                  )}
                  <div className={`flex w-full items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {/* Avatar for group messages - only show for other users' messages */}
                    {!isOwn && isGroup && (
                      <Avatar
                        src={getAvatarUrl(userMetadataCache.get(message.senderId))}
                        alt={getFullName(userMetadataCache.get(message.senderId))}
                        fallback={getAvatarFallback(getFullName(userMetadataCache.get(message.senderId)))}
                        className="w-8 h-8 flex-shrink-0"
                      />
                    )}
                  <div
                    className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] min-w-0 ${hasReactions ? 'mb-6' : ''}`}
                    onMouseEnter={() => {
                      if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                      setHoveredMessageId(message.messageId)
                    }}
                    onMouseLeave={() => {
                      if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                      hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 200)
                    }}
                    onTouchStart={() => onBubbleTouchStart(message.messageId)}
                    onTouchEnd={onBubbleTouchEnd}
                  >
                    {/* Sender name for group messages - only show for other users' messages */}
                    {!isOwn && isGroup && (
                      <p className="text-xs text-gray-600 mb-1 px-1">
                        {getFullName(userMetadataCache.get(message.senderId))}
                      </p>
                    )}
                    {/* Text Bubble và Time Bubble - cùng dòng */}
                    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${hasReactions ? 'mb-1' : ''}`}>
                      {/* Text Bubble - chỉ khi có content */}
                      {message.content && (
                        <div
                          className={`relative group min-w-0 rounded-lg px-3 py-2 ${
                            isSending ? 'opacity-60' : ''
                          } ${
                            isOwn
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      )}

                      {/* Time, Status Bubble - ngang hàng với text */}
                      {hoveredMessageId === message.messageId && (
                        <div className={`flex items-center gap-1.5 bg-gray-200/60 text-gray-700 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm flex-shrink-0 ${isOwn ? 'order-2' : ''}`}>
                          <p>{formatMessageTime(message.createdAt.toString())}</p>
                          {isSending && (
                            <span className="opacity-70 italic">Sending...</span>
                          )}
                          {isOwn && !isSending && message.userStatus && (
                            <div className="flex items-center">
                              {message.userStatus === 'SENT' && (
                                <Check className="w-3 h-3 text-gray-700" />
                              )}
                              {message.userStatus === 'DELIVERED' && (
                                <CheckCheck className="w-3 h-3 text-gray-700" />
                              )}
                              {message.userStatus === 'READ' && (
                                <CheckCheck className="w-3 h-3 text-blue-600" />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Attachments - hiển thị bên dưới text, không có background */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className={`${message.content ? 'mt-2' : ''} grid gap-2 w-full ${message.attachments.length === 1 ? 'grid-cols-1' : message.attachments.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {message.attachments.map((att, idx) => {
                          const video = isVideoUrl(att)
                          return (
                            <div key={idx} className="relative group overflow-hidden rounded-lg bg-black/5 w-full aspect-square min-w-0">
                              {video ? (
                                <video
                                  src={att}
                                  controls
                                  className="w-full h-full object-cover rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); openPreview(message.attachments!, idx) }}
                                />
                              ) : (
                                <img
                                  src={att}
                                  alt="attachment"
                                  className="w-full h-full object-cover rounded-lg cursor-zoom-in"
                                  onClick={() => openPreview(message.attachments!, idx)}
                                  loading="lazy"
                                />
                              )}
                              <div className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/30 cursor-zoom-in" onClick={() => openPreview(message.attachments!, idx)}>
                                <Maximize2 className="w-5 h-5 text-white" />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Reaction button - ở góc dưới của message, không dính vào time bubble */}
                    {hasReactions && (
                      <div className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
                        <button
                          type="button"
                          className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setDetailsMessageId(message.messageId)}
                          title="View reactions"
                        >
                          <div className="flex items-center -space-x-0.5">
                            {reactionTypes.slice(0, 3).map((type) => {
                              const reactionType = type.toUpperCase() as ReactionType
                              const reactionConfig = reactionIcons[reactionType]
                              if (!reactionConfig) return null
                              
                              return (
                                <span key={type} className="text-xs leading-none">
                                  {reactionConfig.icon}
                                </span>
                              )
                            })}
                          </div>
                          <span className="text-[10px] font-medium text-gray-700 ml-0.5">
                            {totalReactions}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* Smile button - ở cạnh message */}
                    <button
                      type="button"
                      className={`absolute bottom-2 ${isOwn ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full -mr-2'} transform p-1 rounded-full border border-gray-300 text-gray-600 bg-white/80 backdrop-blur hover:bg-white transition ${hoveredMessageId === message.messageId || showPickerFor === message.messageId ? 'opacity-100' : 'opacity-0'} ${hoveredMessageId === message.messageId || showPickerFor === message.messageId ? 'pointer-events-auto' : 'pointer-events-none'} z-10`}
                      title="React"
                      onClick={() => onTogglePickerClick(message.messageId)}
                      onMouseEnter={() => {
                        if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                        setHoveredMessageId(message.messageId)
                      }}
                      onMouseLeave={() => {
                        if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                        hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 200)
                      }}
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    {showPickerFor === message.messageId && (
                      <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-xl px-2 py-1 flex items-center gap-1 z-[10000]`}
                      >
                        {Object.entries(reactionIcons).map(([type, cfg]) => {
                          const disabled = reactingMessageIds.has(message.messageId)
                          return (
                            <button
                              key={type}
                              title={cfg.label}
                              disabled={disabled}
                              className={`text-lg p-1 rounded-full hover:scale-125 transition-transform ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`}
                              onClick={() => handleSelectReaction(message.messageId, type as ReactionType)}
                            >
                              <span>{cfg.icon}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white rounded-b-lg">
        {pendingAttachments.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Attachments ({pendingAttachments.length})</span>
              <button
                onClick={clearAllAttachments}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                title="Remove all attachments"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {pendingAttachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  {isVideoUrl(att) ? (
                    <video src={att} controls className="h-16 w-full rounded" />
                  ) : (
                    <img src={att} alt="preview" className="h-16 w-full object-cover rounded" />
                  )}
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-2 items-center relative">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={onFilesSelected} />
          <button onClick={onPickFiles} className="p-2 border border-gray-300 rounded hover:bg-gray-100" title="Attach files" disabled={sending}>
            <Paperclip className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
            className={`p-2 border border-gray-300 rounded hover:bg-gray-100 ${showEmojiPicker ? 'bg-blue-100' : ''}`} 
            title="Add emoji" 
            disabled={sending}
          >
            <Smile className="w-4 h-4" />
          </button>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
              <EmojiPicker onSelect={handleSelectEmoji} />
            </div>
          )}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={(inputMessage.trim() === '' && pendingAttachments.length === 0) || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
      {preview.open && (
        <div className="fixed inset-0 z-[10000] bg-black/80 flex items-center justify-center" onClick={closePreview}>
          <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded" onClick={(e) => { e.stopPropagation(); prevItem() }}>
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 hover:bg-white/20 rounded" onClick={(e) => { e.stopPropagation(); nextItem() }}>
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {isVideoUrl(preview.items[preview.index]) ? (
              <video src={preview.items[preview.index]} controls autoPlay className="max-w-full max-h-[85vh] rounded" />
            ) : (
              <img src={preview.items[preview.index]} alt="preview" className="max-w-full max-h-[85vh] rounded" />
            )}
          </div>
        </div>
      )}
      {detailsMessageId && (
        <ChatReactionDetailsModal
          open={!!detailsMessageId}
          onClose={() => setDetailsMessageId(null)}
          conversationId={conversationId}
          messageId={detailsMessageId}
          initialCounts={messageReactions[detailsMessageId]?.counters}
        />
      )}
    </div>
  )
}