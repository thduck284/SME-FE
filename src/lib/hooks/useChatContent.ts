import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat } from '@/lib/context/ChatSocketContext'
import { ChatService, Message } from '@/lib/api/chat/ChatService'
import { getUserId } from '@/lib/utils/Jwt'
import { ReactionType } from '@/lib/constants/reactions'
import { UserService } from '@/lib/api/users/UserService'
import { UserMetadata } from '@/lib/types/User'

interface UseChatContentProps {
  conversationId: string
  conversationType?: 'direct' | 'group'
  scrollToMessageId?: string | null
}

export function useChatContent({
  conversationId,
  conversationType,
  scrollToMessageId,
}: UseChatContentProps) {
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
    onMessageDeleted,
    offMessageDeleted,
    onMessageEdited,
    offMessageEdited,
  } = useChat()
  const userId = getUserId()
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ open: boolean; items: string[]; index: number }>({
    open: false,
    items: [],
    index: 0,
  })
  const [showPickerFor, setShowPickerFor] = useState<string | null>(null)
  const [showMenuFor, setShowMenuFor] = useState<string | null>(null)
  const menuRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [longPressTimer, setLongPressTimer] = useState<number | null>(null)
  const [reactingMessageIds, setReactingMessageIds] = useState<Set<string>>(new Set())
  const [messageReactions, setMessageReactions] = useState<
    Record<string, { counters: Record<string, number>; userReaction?: ReactionType }>
  >({})
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const hoverHideTimerRef = useRef<number | null>(null)
  const [detailsMessageId, setDetailsMessageId] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [userMetadataCache, setUserMetadataCache] = useState<Map<string, UserMetadata>>(new Map())
  const isGroup = conversationType === 'group'
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editMessageContent, setEditMessageContent] = useState('')
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set())
  const [forwardMessageModal, setForwardMessageModal] = useState<{
    isOpen: boolean
    message: Message | null
  }>({
    isOpen: false,
    message: null,
  })

  // Utility functions
  const isVideoUrl = (url: string) => {
    if (url.startsWith('data:video/')) return true
    return /(\.mp4|\.webm|\.ogg|\.mov|\.m4v)(\?.*)?$/i.test(url) || url.includes('/video/')
  }

  const extractUrls = (content: string): string[] => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls: string[] = []
    let match

    urlRegex.lastIndex = 0
    while ((match = urlRegex.exec(content)) !== null) {
      urls.push(match[0])
    }

    return [...new Set(urls)]
  }

  const isDifferentDay = (date1: Date, date2: Date | null): boolean => {
    if (!date2) return true
    return (
      date1.getDate() !== date2.getDate() ||
      date1.getMonth() !== date2.getMonth() ||
      date1.getFullYear() !== date2.getFullYear()
    )
  }

  const getAvatarFallback = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const getFullName = (userMetadata: UserMetadata | undefined): string => {
    if (!userMetadata) return 'User'
    return `${userMetadata.firstName || ''} ${userMetadata.lastName || ''}`.trim() || 'User'
  }

  const getAvatarUrl = (userMetadata: UserMetadata | undefined): string => {
    if (!userMetadata) return '/assets/images/default.png'
    return userMetadata.avtUrl || '/assets/images/default.png'
  }

  // Preview handlers
  const openPreview = useCallback((items: string[], index: number) => {
    setPreview({ open: true, items, index })
  }, [])

  const closePreview = useCallback(() => {
    setPreview((prev) => ({ ...prev, open: false }))
  }, [])

  const prevItem = useCallback(() => {
    setPreview((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.items.length) % prev.items.length,
    }))
  }, [])

  const nextItem = useCallback(() => {
    setPreview((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.items.length,
    }))
  }, [])

  // Attachment handlers
  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearAllAttachments = useCallback(() => {
    setPendingAttachments([])
  }, [])

  const onPickFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFilesSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const allowed = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'))
    const readers = await Promise.all(
      allowed.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
          }),
      ),
    )
    setPendingAttachments((prev) => [...prev, ...readers].slice(0, 10))
    e.target.value = ''
  }, [])

  // Message loading
  const loadInitial = useCallback(async () => {
    try {
      setLoading(true)
      const response = await ChatService.getMessages(conversationId, 10)
      const pageAsc = [...response.messages].reverse()
      setMessages(pageAsc)
      setNextCursor(response.nextCursor)

      // Collect all user IDs from readByUserIds and senderIds
      setUserMetadataCache((prevCache) => {
        const userIdsToLoad = new Set<string>()
        pageAsc.forEach((m) => {
          if (m.readByUserIds) {
            m.readByUserIds.forEach((id) => {
              if (!prevCache.has(id)) {
                userIdsToLoad.add(id)
              }
            })
          }
          // Also load sender metadata if not cached
          if (m.senderId && !prevCache.has(m.senderId)) {
            userIdsToLoad.add(m.senderId)
          }
        })

        // Load user metadata for readByUserIds
        if (userIdsToLoad.size > 0) {
          const userIdsArray = Array.from(userIdsToLoad)
          UserService.getMultipleUsersMetadata(userIdsArray)
            .then((metadataList) => {
              setUserMetadataCache((current) => {
                const next = new Map(current)
                metadataList.forEach((user) => {
                  if (user) {
                    next.set(user.userId, user)
                  }
                })
                return next
              })
            })
            .catch((error) => {
              console.error('Failed to load user metadata:', error)
            })
        }

        return prevCache
      })

      const fetchCountsPromises = pageAsc.map(async (m) => {
        try {
          const counts = await ChatService.getMessageReactionCounts(conversationId, m.messageId)
          return { messageId: m.messageId, counts }
        } catch (e) {
          return { messageId: m.messageId, counts: {} }
        }
      })

      Promise.all(fetchCountsPromises).then((results) => {
        setMessageReactions((prev) => {
          const next = { ...prev }
          results.forEach(({ messageId, counts }) => {
            next[messageId] = {
              counters: counts,
              userReaction: next[messageId]?.userReaction,
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
  }, [conversationId])

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !nextCursor) return
    try {
      setLoadingOlder(true)
      isLoadingTriggerRef.current = true
      await new Promise((r) => setTimeout(r, 500))
      const c = scrollContainerRef.current
      const prevH = c ? c.scrollHeight : 0
      const response = await ChatService.getMessages(conversationId, 10, nextCursor)
      const olderAsc = [...response.messages].reverse()
      setMessages((prev) => [...olderAsc, ...prev])
      setNextCursor(response.nextCursor)

      // Collect all user IDs from readByUserIds and senderIds
      setUserMetadataCache((prevCache) => {
        const userIdsToLoad = new Set<string>()
        olderAsc.forEach((m) => {
          if (m.readByUserIds) {
            m.readByUserIds.forEach((id) => {
              if (!prevCache.has(id)) {
                userIdsToLoad.add(id)
              }
            })
          }
          // Also load sender metadata if not cached
          if (m.senderId && !prevCache.has(m.senderId)) {
            userIdsToLoad.add(m.senderId)
          }
        })

        // Load user metadata for readByUserIds
        if (userIdsToLoad.size > 0) {
          const userIdsArray = Array.from(userIdsToLoad)
          UserService.getMultipleUsersMetadata(userIdsArray)
            .then((metadataList) => {
              setUserMetadataCache((current) => {
                const next = new Map(current)
                metadataList.forEach((user) => {
                  if (user) {
                    next.set(user.userId, user)
                  }
                })
                return next
              })
            })
            .catch((error) => {
              console.error('Failed to load user metadata:', error)
            })
        }

        return prevCache
      })

      const fetchOlderCountsPromises = olderAsc.map(async (m) => {
        try {
          const counts = await ChatService.getMessageReactionCounts(conversationId, m.messageId)
          return { messageId: m.messageId, counts }
        } catch (e) {
          return { messageId: m.messageId, counts: {} }
        }
      })

      Promise.all(fetchOlderCountsPromises).then((results) => {
        setMessageReactions((prev) => {
          const next = { ...prev }
          results.forEach(({ messageId, counts }) => {
            next[messageId] = {
              counters: counts,
              userReaction: next[messageId]?.userReaction,
            }
          })
          return next
        })
      })

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
  }, [conversationId, nextCursor, loadingOlder])

  const loadMessagesUntilFound = useCallback(
    async (targetMessageId: string, maxAttempts: number = 50) => {
      let attempts = 0
      let currentCursor = nextCursor

      while (attempts < maxAttempts) {
        if (messages.some((m) => m.messageId === targetMessageId)) {
          return true
        }

        if (!currentCursor) {
          return false
        }

        try {
          const response = await ChatService.getMessages(conversationId, 50, currentCursor)
          if (response.messages.length === 0) {
            return false
          }

          const olderAsc = [...response.messages].reverse()
          setMessages((prev) => [...olderAsc, ...prev])
          setNextCursor(response.nextCursor)
          currentCursor = response.nextCursor

          if (olderAsc.some((m) => m.messageId === targetMessageId)) {
            return true
          }

          attempts++
        } catch (error) {
          console.error('Error loading messages until found:', error)
          return false
        }
      }

      return false
    },
    [conversationId, nextCursor, messages],
  )

  const onScroll = useCallback(() => {
    const c = scrollContainerRef.current
    if (!c || loading || loadingOlder) return
    const threshold = 24
    if (!isLoadingTriggerRef.current && c.scrollTop <= threshold) {
      loadOlder()
    }
  }, [loading, loadingOlder, loadOlder])

  // Send message
  const handleSendMessage = useCallback(async () => {
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
      updatedAt: new Date(),
    }

    setMessages((prev) => [...prev, tempMessage])
    setInputMessage('')
    setPendingAttachments([])
    setSending(true)

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    try {
      await sendMessage(conversationId, {
        content,
        attachments,
      })
      setTimeout(() => {
        setMessages((prev) => {
          const exists = prev.some((m) => m.messageId === tempMessageId && m.status === 'sending')
          if (exists) {
            return prev.filter((m) => m.messageId !== tempMessageId)
          }
          return prev
        })
      }, 3000)
    } catch (error) {
      console.error('Failed to send message:', error)
      setMessages((prev) => prev.filter((m) => m.messageId !== tempMessageId))
      setInputMessage(content || '')
      setPendingAttachments(attachments || [])
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }, [conversationId, inputMessage, pendingAttachments, sending, sendMessage, userId])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSendMessage()
      }
    },
    [handleSendMessage],
  )

  const handleSelectEmoji = useCallback((emoji: string) => {
    setInputMessage((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }, [])

  // Edit message handlers
  const handleStartEdit = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.messageId === messageId)
      if (message && message.content) {
        setEditingMessageId(messageId)
        setEditMessageContent(message.content)
        setTimeout(() => {
          editInputRef.current?.focus()
          editInputRef.current?.setSelectionRange(
            editInputRef.current.value.length,
            editInputRef.current.value.length,
          )
        }, 50)
      }
    },
    [messages],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditMessageContent('')
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId || !editMessageContent.trim()) return

    try {
      await ChatService.editMessage(conversationId, editingMessageId, {
        content: editMessageContent.trim(),
      })
      setEditingMessageId(null)
      setEditMessageContent('')
    } catch (error: any) {
      console.error('Failed to edit message:', error)
      alert(error.message || 'Cannot edit message. The message may have been read.')
    }
  }, [conversationId, editingMessageId, editMessageContent])

  const handleEditKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSaveEdit()
      } else if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [handleSaveEdit, handleCancelEdit],
  )

  // Delete message handler
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (deletingMessageIds.has(messageId)) return

      if (!confirm('Are you sure you want to delete this message?')) {
        return
      }

      try {
        setDeletingMessageIds((prev) => new Set(prev).add(messageId))
        await ChatService.deleteMessage(conversationId, messageId)
      } catch (error: any) {
        console.error('Failed to delete message:', error)
        alert(error.message || 'Cannot delete message. The message may have been read.')
        setDeletingMessageIds((prev) => {
          const next = new Set(prev)
          next.delete(messageId)
          return next
        })
      }
    },
    [conversationId, deletingMessageIds],
  )

  // Forward message handlers
  const handleOpenForwardModal = useCallback((message: Message) => {
    setForwardMessageModal({
      isOpen: true,
      message,
    })
    setShowMenuFor(null)
  }, [])

  const handleCloseForwardModal = useCallback(() => {
    setForwardMessageModal({
      isOpen: false,
      message: null,
    })
  }, [])

  // Helper function to convert image/video URL to base64 data URL
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Try to fetch with CORS mode
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Failed to convert blob to base64'))
          }
        }
        reader.onerror = () => reject(new Error('FileReader error'))
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting URL to base64:', error)
      // If CORS error or other fetch error, try using image element for images
      if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i)) {
        return new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = img.width
              canvas.height = img.height
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                reject(new Error('Failed to get canvas context'))
                return
              }
              ctx.drawImage(img, 0, 0)
              const dataURL = canvas.toDataURL('image/png')
              resolve(dataURL)
            } catch (err) {
              reject(err)
            }
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })
      }
      throw error
    }
  }

  const handleForwardMessage = useCallback(
    async (targets: Array<{ type: 'conversation' | 'friend'; id: string }>) => {
      if (!forwardMessageModal.message || targets.length === 0) {
        console.error('handleForwardMessage: Missing message or no targets')
        return
      }

      const message = forwardMessageModal.message
      console.log('Forwarding message:', { messageId: message.messageId, hasContent: !!message.content, hasAttachments: !!message.attachments?.length })

      // Prepare content for forwarding
      let forwardContent = message.content || ''

      // Prepare attachments - convert URLs to base64 data URLs
      let forwardAttachments: string[] | undefined = undefined
      if (message.attachments && message.attachments.length > 0) {
        console.log(`Attempting to convert ${message.attachments.length} attachments to base64`)
        try {
          // Convert all attachment URLs to base64 data URLs
          forwardAttachments = await Promise.all(
            message.attachments.map(async (url, index) => {
              try {
                // If it's already a base64 data URL, return as is
                if (url.startsWith('data:')) {
                  console.log(`Attachment ${index + 1} is already base64`)
                  return url
                }
                // Otherwise, download and convert to base64
                console.log(`Converting attachment ${index + 1} from URL: ${url.substring(0, 50)}...`)
                const base64 = await urlToBase64(url)
                console.log(`Successfully converted attachment ${index + 1}`)
                return base64
              } catch (error) {
                console.error(`Failed to convert attachment ${index + 1}:`, error)
                throw error
              }
            })
          )
          console.log(`Successfully converted all ${forwardAttachments.length} attachments`)
        } catch (error) {
          console.error('Error converting attachments to base64:', error)
          // If conversion fails, just forward content without attachments
          forwardAttachments = undefined
          const attachmentNote = `\n[Message has ${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''} - cannot forward attachments]`
          forwardContent = forwardContent ? `${forwardContent}${attachmentNote}` : attachmentNote.trim()
        }
      }

      // Ensure we have at least some content or attachments
      if (!forwardContent.trim() && !forwardAttachments?.length) {
        forwardContent = '[Forwarded message]'
      }

      console.log('Prepared forward data:', { 
        hasContent: !!forwardContent, 
        contentLength: forwardContent.length,
        hasAttachments: !!forwardAttachments?.length,
        attachmentCount: forwardAttachments?.length || 0,
        targetCount: targets.length
      })

      // Forward message to each selected target
      const errors: Array<{ targetId: string; error: string }> = []
      const successCount = { count: 0 }
      
      for (const target of targets) {
        try {
          let conversationId: string

          if (target.type === 'friend') {
            // For friends, find or create a direct conversation
            console.log(`Finding or creating conversation for friend: ${target.id}`)
            conversationId = await ChatService.findOrCreateDirectConversation(target.id)
            console.log(`Got conversation ID for friend ${target.id}: ${conversationId}`)
          } else {
            // For conversations, use the conversation ID directly
            conversationId = target.id
          }

          console.log(`Forwarding to conversation: ${conversationId}`)
          // Use socket-based sendMessage (same as normal send message)
          await sendMessage(conversationId, {
            content: forwardContent || undefined,
            attachments: forwardAttachments,
          })
          console.log(`Successfully forwarded to ${conversationId}`)
          successCount.count++
        } catch (error: any) {
          console.error(`Failed to forward message to ${target.type} ${target.id}:`, error)
          console.error('Error details:', {
            message: error?.message,
            stack: error?.stack
          })
          // Socket errors don't have response.status, check message instead
          const errorMessage = error?.message || error?.toString() || 'Unknown error'
          const is404Error = errorMessage.includes('404') || 
                            errorMessage.includes('not found') || 
                            errorMessage.includes('Conversation not found') ||
                            errorMessage.includes('does not exist') ||
                            errorMessage.includes('not a participant')
          const finalErrorMessage = is404Error 
            ? 'Conversation does not exist, has been deleted, or you do not have access'
            : errorMessage
          errors.push({ targetId: target.id, error: finalErrorMessage })
        }
      }

      // If there are errors but some succeeded, show a warning
      // If all failed, throw error
      if (errors.length > 0) {
        if (successCount.count === 0) {
          // All failed - throw error with details
          const uniqueErrors = errors.map(e => e.error).filter((v, i, a) => a.indexOf(v) === i)
          const all404 = errors.every(e => e.error.includes('does not exist') || e.error.includes('404') || e.error.includes('not found'))
          
          if (all404 && errors.length === 1) {
            // Single 404 error
            throw new Error(`Failed to forward message. The selected conversation does not exist or has been deleted.`)
          } else if (all404) {
            // All are 404 errors
            throw new Error(`Failed to forward message. All ${errors.length} selected conversations do not exist or have been deleted. Please close the modal, reopen it and select different conversations.`)
          } else {
            // Mixed errors or other errors
            const errorDetails = uniqueErrors.length === 1 
              ? uniqueErrors[0]
              : `${errors.length} conversations failed: ${uniqueErrors.join(', ')}`
            throw new Error(`Failed to forward message to any conversation. ${errorDetails}`)
          }
        } else {
          // Some succeeded, some failed - this is partial success
          // Don't throw error, just log and return successfully
          const uniqueErrors = errors.map(e => e.error).filter((v, i, a) => a.indexOf(v) === i)
          const successMsg = `Successfully forwarded to ${successCount.count}/${targets.length} conversation${targets.length > 1 ? 's' : ''}`
          const errorMsg = uniqueErrors.length > 0 ? `. ${errors.length} conversation${errors.length > 1 ? 's' : ''} failed (${uniqueErrors.join(', ')})` : ''
          
          // Log warning for debugging
          console.warn(`${successMsg}${errorMsg}`)
          
          // Show user-friendly message in console (could also show toast notification)
          // For now, we consider this a success since at least some messages were forwarded
        }
      }
      
      // If we reached here and successCount > 0, it means at least one message was forwarded successfully
      // This is considered a success even if some failed
    },
    [forwardMessageModal.message, sendMessage],
  )

  // Reaction handlers
  const updateOptimistic = useCallback(
    (messageId: string, next: { type: 'add' | 'remove'; reaction: ReactionType }) => {
      setMessageReactions((prev) => {
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
    },
    [],
  )

  const revertOptimistic = useCallback(
    (messageId: string, snapshot: { counters: Record<string, number>; userReaction?: ReactionType }) => {
      setMessageReactions((prev) => ({ ...prev, [messageId]: snapshot }))
    },
    [],
  )

  const handleSelectReaction = useCallback(
    async (messageId: string, reaction: ReactionType) => {
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
            Object.entries(counts || {}).map(([k, v]) => [k.toUpperCase(), v]),
          )
          setMessageReactions((prev) => ({
            ...prev,
            [messageId]: { counters: normalizedCounts, userReaction: undefined },
          }))
        } else {
          const previous = snapshot.userReaction ? snapshot.userReaction.toLowerCase() : undefined
          if (previous && previous !== wireReaction) {
            await removeReaction(conversationId, messageId, previous)
          }
          const counts = await addReaction(conversationId, messageId, wireReaction, previous)
          const normalizedCounts: Record<string, number> = Object.fromEntries(
            Object.entries(counts || {}).map(([k, v]) => [k.toUpperCase(), v]),
          )
          setMessageReactions((prev) => ({
            ...prev,
            [messageId]: { counters: normalizedCounts, userReaction: reaction },
          }))
        }
      } catch (err) {
        console.error('Reaction failed, reverting:', err)
        revertOptimistic(messageId, snapshot)
      } finally {
        setReactingMessageIds((prev) => {
          const s = new Set(prev)
          s.delete(messageId)
          return s
        })
        setShowPickerFor(null)
      }
    },
    [conversationId, reactingMessageIds, messageReactions, addReaction, removeReaction, updateOptimistic, revertOptimistic],
  )

  const onTogglePickerClick = useCallback((messageId: string) => {
    setShowPickerFor((prev) => (prev === messageId ? null : messageId))
    setShowMenuFor(null) // Close menu when opening picker
  }, [])

  const onToggleMenuClick = useCallback((messageId: string) => {
    setShowMenuFor((prev) => (prev === messageId ? null : messageId))
    setShowPickerFor(null) // Close picker when opening menu
  }, [])

  const onBubbleTouchStart = useCallback((messageId: string) => {
    if (longPressTimer) window.clearTimeout(longPressTimer)
    const id = window.setTimeout(() => setShowPickerFor(messageId), 400)
    setLongPressTimer(id)
  }, [longPressTimer])

  const onBubbleTouchEnd = useCallback(() => {
    if (longPressTimer) window.clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }, [longPressTimer])

  // Effects
  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    const handleNewMessage = async (event: { conversationId: string; message: Message }) => {
      if (event.conversationId !== conversationId) return

      setMessages((prev) => {
        const exists = prev.some((m) => m.messageId === event.message.messageId)
        if (exists) {
          // Update existing message with readByUserIds if it changed
          return prev.map((m) =>
            m.messageId === event.message.messageId
              ? { ...m, readByUserIds: event.message.readByUserIds }
              : m
          )
        }

        const tempIndex = prev.findIndex(
          (m) =>
            m.messageId.startsWith('temp-') &&
            m.senderId === event.message.senderId &&
            m.status === 'sending',
        )

        if (tempIndex >= 0) {
          const newMessages = [...prev]
          newMessages[tempIndex] = event.message
          return newMessages
        }

        return [...prev, event.message]
      })
      
      // Load user metadata for readByUserIds if present
      if (event.message.readByUserIds && event.message.readByUserIds.length > 0) {
        setUserMetadataCache((prevCache) => {
          const uncachedIds = event.message.readByUserIds!.filter((id) => !prevCache.has(id))
          if (uncachedIds.length > 0) {
            UserService.getMultipleUsersMetadata(uncachedIds)
              .then((metadataList) => {
                setUserMetadataCache((current) => {
                  const next = new Map(current)
                  metadataList.forEach((user) => {
                    if (user) {
                      next.set(user.userId, user)
                    }
                  })
                  return next
                })
              })
              .catch((error) => {
                console.error('Failed to load user metadata for new message:', error)
              })
          }
          return prevCache
        })
      }
      try {
        const counts = await ChatService.getMessageReactionCounts(conversationId, event.message.messageId)
        setMessageReactions((prev) => ({
          ...prev,
          [event.message.messageId]: {
            counters: counts,
            userReaction: prev[event.message.messageId]?.userReaction,
          },
        }))
      } catch (e) {
        console.warn('Failed to fetch counts for new message', e)
      }
    }

    onNewMessage(handleNewMessage)

    return () => {
      offNewMessage(handleNewMessage)
    }
  }, [conversationId, onNewMessage, offNewMessage, userId])

  useEffect(() => {
    const handler = (event: {
      conversationId: string
      messageId: string
      reaction: string
      counts: Record<string, number>
      userId: string
      action: 'added' | 'removed'
    }) => {
      if (event.conversationId !== conversationId) return
      const normalizedCounts: Record<string, number> = Object.fromEntries(
        Object.entries(event.counts || {}).map(([k, v]) => [k.toUpperCase(), v]),
      )
      setMessageReactions((prev) => ({
        ...prev,
        [event.messageId]: {
          counters: normalizedCounts,
          userReaction:
            event.userId === userId
              ? event.action === 'added'
                ? (event.reaction.toUpperCase() as ReactionType)
                : undefined
              : prev[event.messageId]?.userReaction,
        },
      }))
    }
    onReactionUpdated(handler)
    return () => {
      offReactionUpdated(handler)
    }
  }, [conversationId, onReactionUpdated, offReactionUpdated, userId])

  useEffect(() => {
    const handler = (event: { conversationId: string; messageId: string; deletedBy: string }) => {
      if (event.conversationId !== conversationId) return

      setMessages((prev) => prev.filter((m) => m.messageId !== event.messageId))
      setDeletingMessageIds((prev) => {
        const next = new Set(prev)
        next.delete(event.messageId)
        return next
      })
      setMessageReactions((prev) => {
        const next = { ...prev }
        delete next[event.messageId]
        return next
      })
      if (editingMessageId === event.messageId) {
        setEditingMessageId(null)
        setEditMessageContent('')
      }
    }
    onMessageDeleted(handler)
    return () => {
      offMessageDeleted(handler)
    }
  }, [conversationId, onMessageDeleted, offMessageDeleted, editingMessageId])

  useEffect(() => {
    const handler = (event: { conversationId: string; messageId: string; message: Message; editedBy: string }) => {
      if (event.conversationId !== conversationId) return

      // Load user metadata for readByUserIds if present
      if (event.message.readByUserIds && event.message.readByUserIds.length > 0) {
        setUserMetadataCache((prevCache) => {
          const uncachedIds = event.message.readByUserIds!.filter((id) => !prevCache.has(id))
          if (uncachedIds.length > 0) {
            UserService.getMultipleUsersMetadata(uncachedIds)
              .then((metadataList) => {
                setUserMetadataCache((current) => {
                  const next = new Map(current)
                  metadataList.forEach((user) => {
                    if (user) {
                      next.set(user.userId, user)
                    }
                  })
                  return next
                })
              })
              .catch((error) => {
                console.error('Failed to load user metadata for edited message:', error)
              })
          }
          return prevCache
        })
      }

      setMessages((prev) => prev.map((m) => (m.messageId === event.messageId ? event.message : m)))
      if (editingMessageId === event.messageId) {
        setEditingMessageId(null)
        setEditMessageContent('')
      }
    }
    onMessageEdited(handler)
    return () => {
      offMessageEdited(handler)
    }
  }, [conversationId, onMessageEdited, offMessageEdited, editingMessageId])

  useEffect(() => {
    if (!loadingOlder && !isLoadingTriggerRef.current) {
      const c = scrollContainerRef.current
      if (c) {
        const isNearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 100
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }, [messages, loadingOlder])

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
      { root: container, threshold: 0 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [nextCursor, loadingOlder, loadOlder])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
      // Check if click is outside any menu
      if (showMenuFor) {
        const menuElement = menuRefs.current.get(showMenuFor)
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setShowMenuFor(null)
        }
      }
    }

    if (showEmojiPicker || showMenuFor) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showEmojiPicker, showMenuFor])

  useEffect(() => {
    if (!isGroup || messages.length === 0) return

    const fetchUserMetadata = async () => {
      const senderIds = Array.from(
        new Set(messages.map((m) => m.senderId).filter((id) => id && id !== userId)),
      )

      setUserMetadataCache((prev) => {
        const uncachedIds = senderIds.filter((id) => !prev.has(id))

        if (uncachedIds.length === 0) return prev

        UserService.getMultipleUsersMetadata(uncachedIds)
          .then((metadata) => {
            setUserMetadataCache((current) => {
              const next = new Map(current)
              metadata.forEach((user) => {
                next.set(user.userId, user)
              })
              return next
            })
          })
          .catch((error) => {
            console.error('Error fetching user metadata for messages:', error)
          })

        return prev
      })
    }

    fetchUserMetadata()
  }, [messages, isGroup, userId])

  useEffect(() => {
    if (!scrollToMessageId) return

    const scrollToMessage = async () => {
      const messageExists = messages.some((m) => m.messageId === scrollToMessageId)

      if (!messageExists) {
        const found = await loadMessagesUntilFound(scrollToMessageId)
        if (!found) {
          console.warn(`Message ${scrollToMessageId} not found after loading`)
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const messageElement = messageRefs.current.get(scrollToMessageId)
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        messageElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
        setTimeout(() => {
          messageElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
        }, 2000)
      } else {
        setTimeout(() => {
          const retryElement = messageRefs.current.get(scrollToMessageId)
          if (retryElement) {
            retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
            retryElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              retryElement.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2')
            }, 2000)
          }
        }, 200)
      }
    }

    scrollToMessage()
  }, [scrollToMessageId, messages, loadMessagesUntilFound])

  return {
    // State
    messages,
    loading,
    loadingOlder,
    inputMessage,
    setInputMessage,
    sending,
    pendingAttachments,
    preview,
    showPickerFor,
    showMenuFor,
    setShowMenuFor,
    menuRefs,
    messageReactions,
    hoveredMessageId,
    setHoveredMessageId,
    detailsMessageId,
    setDetailsMessageId,
    showEmojiPicker,
    setShowEmojiPicker,
    userMetadataCache,
    isGroup,
    editingMessageId,
    editMessageContent,
    setEditMessageContent,
    deletingMessageIds,
    reactingMessageIds,
    userId,
    // Refs
    messagesEndRef,
    scrollContainerRef,
    topSentinelRef,
    fileInputRef,
    emojiPickerRef,
    editInputRef,
    messageRefs,
    hoverHideTimerRef,
    // Handlers
    openPreview,
    closePreview,
    prevItem,
    nextItem,
    removeAttachment,
    clearAllAttachments,
    onPickFiles,
    onFilesSelected,
    handleSendMessage,
    handleKeyPress,
    handleSelectEmoji,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleEditKeyPress,
    handleDeleteMessage,
    handleSelectReaction,
    onTogglePickerClick,
    onToggleMenuClick,
    onBubbleTouchStart,
    onBubbleTouchEnd,
    onScroll,
    // Forward message
    forwardMessageModal,
    handleOpenForwardModal,
    handleCloseForwardModal,
    handleForwardMessage,
    // Utilities
    isVideoUrl,
    extractUrls,
    isDifferentDay,
    getAvatarFallback,
    getFullName,
    getAvatarUrl,
  }
}

