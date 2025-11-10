"use client"

import { useState, useEffect } from 'react'
import { Send, Paperclip, Maximize2, ChevronLeft, ChevronRight, Smile, X, Edit2, Trash2, MoreVertical, Forward } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { formatMessageTime, formatDateDivider } from '@/lib/utils/PostUtils'
import { ReactionType, reactionIcons } from '@/lib/constants/reactions'
import { ChatReactionDetailsModal } from '@/components/chat/ChatReactionDetailsModal'
import { EmojiPicker } from '@/components/ui/EmojiPicker'
import { LinkPreview } from './LinkPreview'
import { ForwardMessageModal } from '@/components/chat/ForwardMessageModal'
import { useChatContent } from '@/lib/hooks/useChatContent'

// Time Bubble Component - renders with fixed positioning to avoid clipping by overflow
function TimeBubble({
  messageId,
  messageRefs,
  scrollContainerRef,
  isOwn,
  createdAt,
  isSending,
  readByUserIds,
  userMetadataCache,
  isGroup,
  getAvatarUrl,
  getAvatarFallback,
  formatMessageTime,
}: {
  messageId: string
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
  scrollContainerRef: React.RefObject<HTMLDivElement>
  isOwn: boolean
  createdAt: Date | string
  isSending: boolean
  readByUserIds?: string[]
  userMetadataCache: Map<string, any>
  isGroup: boolean
  getAvatarUrl: (user: any) => string
  getAvatarFallback: (name: string) => string
  formatMessageTime: (date: string) => string
}) {
  const [position, setPosition] = useState<{ top: number; left?: number; right?: number } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const messageElement = messageRefs.current.get(messageId)
      if (!messageElement || !scrollContainerRef.current) {
        setPosition(null)
        return
      }

      const rect = messageElement.getBoundingClientRect()
      
      // Calculate fixed position relative to viewport
      // For own messages: show on the right
      // For other messages: show on the left
      setPosition({
        top: rect.top + rect.height / 2,
        ...(isOwn 
          ? { left: rect.right + 8 }
          : { right: window.innerWidth - rect.left + 8 }
        ),
      })
    }

    // Initial update
    const timeoutId = setTimeout(updatePosition, 0)
    
    // Update on scroll and resize
    const handleScroll = () => {
      requestAnimationFrame(updatePosition)
    }
    const handleResize = () => {
      requestAnimationFrame(updatePosition)
    }
    
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    const scrollContainer = scrollContainerRef.current
    scrollContainer?.addEventListener('scroll', handleScroll)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
      scrollContainer?.removeEventListener('scroll', handleScroll)
    }
  }, [messageId, messageRefs, scrollContainerRef, isOwn])

  if (!position) return null

  return (
    <div
      className="fixed flex items-center gap-1.5 bg-white/95 text-gray-700 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm flex-shrink-0 whitespace-nowrap z-[10000] pointer-events-none shadow-lg border border-gray-200"
      style={{
        top: `${position.top}px`,
        ...(position.left !== undefined 
          ? { left: `${position.left}px` }
          : position.right !== undefined 
          ? { right: `${position.right}px` }
          : {}
        ),
        transform: 'translateY(-50%)',
      }}
    >
      <p>{formatMessageTime(createdAt.toString())}</p>
      {isSending && (
        <span className="opacity-70 italic">Sending...</span>
      )}
      {isOwn && !isSending && readByUserIds && readByUserIds.length > 0 && (
        <div className="flex items-center gap-1 -ml-1">
          {readByUserIds.slice(0, isGroup ? 3 : 1).map((userId) => {
            const userMetadata = userMetadataCache.get(userId)
            const avatarUrl = getAvatarUrl(userMetadata)
            const fallback = getAvatarFallback(userMetadata?.firstName && userMetadata?.lastName 
              ? `${userMetadata.firstName} ${userMetadata.lastName}` 
              : 'U')
            return (
              <Avatar
                key={userId}
                src={avatarUrl}
                alt={userMetadata?.firstName && userMetadata?.lastName 
                  ? `${userMetadata.firstName} ${userMetadata.lastName}` 
                  : 'User'}
                fallback={fallback}
                className="w-4 h-4 border border-white"
              />
            )
          })}
          {isGroup && readByUserIds.length > 3 && (
            <span className="text-xs text-gray-600 ml-0.5">+{readByUserIds.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface ChatContentProps {
  conversationId: string
  recipientId?: string
  recipientName?: string
  recipientAvatar?: string
  conversationType?: 'direct' | 'group'
  scrollToMessageId?: string | null
  onStartCall?: (type: 'video' | 'voice') => void
}

export function ChatContent({ conversationId, conversationType, scrollToMessageId }: ChatContentProps) {
  const { 
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
  } = useChatContent({
    conversationId,
    conversationType,
    scrollToMessageId,
  })

  // Parse message content for rendering (returns JSX)
  const parseMessageContent = (content: string, isOwn: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts: string[] = []
    let lastIndex = 0
    let match
    
    // Reset regex lastIndex
    urlRegex.lastIndex = 0
    
    while ((match = urlRegex.exec(content)) !== null) {
      // Add text before URL
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }
      // Add URL
      parts.push(match[0])
      lastIndex = urlRegex.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }
    
    // If no URLs found, return original content
    if (parts.length === 0) {
      return <span>{content}</span>
    }
    
    return parts.map((part, index) => {
      const isUrl = /^https?:\/\/[^\s]+$/.test(part)
      if (isUrl) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={isOwn ? 'text-blue-100 underline' : 'text-blue-600 underline'}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // Collect all time bubbles to render outside scroll container
  const timeBubbles = messages
    .filter(message => 
      message.action !== 'DELETED' &&
      hoveredMessageId === message.messageId && 
      editingMessageId !== message.messageId
    )
    .map(message => ({
      messageId: message.messageId,
      isOwn: message.senderId === userId,
      createdAt: message.createdAt,
      isSending: message.status === 'sending',
      readByUserIds: message.readByUserIds,
    }))

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Time Bubbles - render outside scroll container to avoid clipping */}
      {timeBubbles.map(({ messageId, isOwn, createdAt, isSending, readByUserIds }) => (
        <TimeBubble
          key={messageId}
          messageId={messageId}
          messageRefs={messageRefs}
          scrollContainerRef={scrollContainerRef}
          isOwn={isOwn}
          createdAt={createdAt}
          isSending={isSending}
          readByUserIds={readByUserIds}
          userMetadataCache={userMetadataCache}
          isGroup={isGroup || false}
          getAvatarUrl={getAvatarUrl}
          getAvatarFallback={getAvatarFallback}
          formatMessageTime={formatMessageTime}
        />
      ))}
      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={onScroll} className="flex-1 overflow-y-auto overflow-x-hidden p-3 bg-gray-50 min-h-0">
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
            {messages
              .filter(message => message.action !== 'DELETED') // Filter out deleted messages
              .map((message) => {
              const isOwn = message.senderId === userId
              const isSending = message.status === 'sending'
              const reactions = messageReactions[message.messageId]
              const counters = reactions?.counters || {}
              const totalReactions = Object.values(counters).reduce((sum, count) => sum + (Number(count) || 0), 0)
              const hasReactions = totalReactions > 0
              const reactionTypes = Object.keys(counters).filter(key => (counters[key] || 0) > 0)
              
              const currentDate = new Date(message.createdAt)
              // Get previous non-deleted message for date divider
              const previousNonDeletedMessages = messages.filter(m => m.action !== 'DELETED')
              const previousMessageIndex = previousNonDeletedMessages.findIndex(m => m.messageId === message.messageId) - 1
              const previousMessage = previousMessageIndex >= 0 ? previousNonDeletedMessages[previousMessageIndex] : null
              const previousDate = previousMessage ? new Date(previousMessage.createdAt) : null
              const showDateDivider = isDifferentDay(currentDate, previousDate)
              
              return (
                <div 
                  key={message.messageId}
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(message.messageId, el)
                    } else {
                      messageRefs.current.delete(message.messageId)
                    }
                  }}
                >
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
                  <div className={`flex w-full items-start gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {/* Avatar for group messages - only show for other users' messages */}
                    {!isOwn && isGroup && (
                      <Avatar
                        src={getAvatarUrl(userMetadataCache.get(message.senderId))}
                        alt={getFullName(userMetadataCache.get(message.senderId))}
                        fallback={getAvatarFallback(getFullName(userMetadataCache.get(message.senderId)))}
                        className="w-8 h-8 flex-shrink-0 self-start"
                      />
                    )}
                  <div
                    className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%] min-w-0 ${hasReactions ? 'mb-6' : ''}`}
                    onMouseEnter={() => {
                      if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                      setHoveredMessageId(message.messageId)
                    }}
                    onMouseLeave={() => {
                      // Không ẩn nếu menu đang mở
                      if (showMenuFor === message.messageId) return
                      if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                      hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
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
                    {/* Text Bubble - chỉ khi có content và không có attachments, hoặc có cả hai */}
                    {message.content && !message.attachments?.length && (
                      <div 
                        className={`flex items-start gap-1 relative ${isOwn ? '' : 'flex-row-reverse'}`}
                        onMouseEnter={() => {
                          if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                          setHoveredMessageId(message.messageId)
                        }}
                        onMouseLeave={() => {
                          // Không ẩn nếu menu đang mở
                          if (showMenuFor === message.messageId) return
                          if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                          hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                        }}
                      >
                        {/* 3 chấm menu button - chỉ hiển thị khi hover, menu chỉ hiện khi click */}
                        {hoveredMessageId === message.messageId && 
                         editingMessageId !== message.messageId &&
                         !isSending && 
                         message.action !== 'DELETED' && (
                          <div 
                            className="relative flex-shrink-0 self-center"
                            onMouseEnter={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              setHoveredMessageId(message.messageId)
                            }}
                            onMouseLeave={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleMenuClick(message.messageId)
                              }}
                              className="p-1 rounded-full hover:bg-gray-200/60 text-gray-600 transition-colors"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {/* Menu dropdown - hiển thị phía trên */}
                            {showMenuFor === message.messageId && (
                              <div
                                ref={(el) => {
                                  if (el) {
                                    menuRefs.current.set(message.messageId, el)
                                  } else {
                                    menuRefs.current.delete(message.messageId)
                                  }
                                }}
                                className={`absolute ${isOwn ? 'left-0' : 'right-0'} bottom-full mb-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-[10000] min-w-[140px]`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseEnter={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  setHoveredMessageId(message.messageId)
                                }}
                                onMouseLeave={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                                }}
                              >
                                {/* Forward option - hiển thị cho cả tin nhắn của mình và người khác */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenForwardModal(message)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Forward className="w-4 h-4" />
                                  <span>Forward</span>
                                </button>
                                {/* Edit option - chỉ hiển thị cho tin nhắn của mình */}
                                {isOwn && message.content && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartEdit(message.messageId)
                                      setShowMenuFor(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Edit</span>
                                  </button>
                                )}
                                {/* Delete option - chỉ hiển thị cho tin nhắn của mình */}
                                {isOwn && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteMessage(message.messageId)
                                      setShowMenuFor(null)
                                    }}
                                    disabled={deletingMessageIds.has(message.messageId)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>
                                      {deletingMessageIds.has(message.messageId) ? 'Deleting...' : 'Delete'}
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Reaction icon - bên trái cho tin nhắn của mình, bên phải cho tin nhắn của người khác */}
                        {editingMessageId !== message.messageId && (hoveredMessageId === message.messageId || showPickerFor === message.messageId) && (
                          <div 
                            className="relative flex-shrink-0 self-center"
                            onMouseEnter={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              setHoveredMessageId(message.messageId)
                            }}
                            onMouseLeave={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                            }}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-full border border-gray-300 text-gray-600 bg-white/80 backdrop-blur hover:bg-white transition shadow-sm"
                              title="React"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTogglePickerClick(message.messageId)
                              }}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {/* Emoji picker dropdown */}
                            {showPickerFor === message.messageId && (
                              <div 
                                className={`absolute ${isOwn ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'} top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-xl px-2 py-1 flex items-center gap-1 z-[10000]`}
                                onMouseEnter={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  setHoveredMessageId(message.messageId)
                                }}
                                onMouseLeave={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                                }}
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
                        )}
                        {/* Text Bubble */}
                        <div className="relative flex-1 min-w-0">
                        {/* Edit Mode */}
                        {editingMessageId === message.messageId ? (
                          <div className={`min-w-0 rounded-lg px-3 py-2 ${
                            isOwn
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}>
                            <textarea
                              ref={editInputRef}
                              value={editMessageContent}
                              onChange={(e) => setEditMessageContent(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              className={`w-full text-sm bg-transparent border-none outline-none resize-none ${
                                isOwn ? 'text-white placeholder-white/70' : 'text-gray-900'
                              }`}
                              rows={Math.min(editMessageContent.split('\n').length, 10)}
                              placeholder="Type a message..."
                              style={{ minHeight: '20px', maxHeight: '200px' }}
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={handleSaveEdit}
                                className={`text-xs px-2 py-1 rounded ${
                                  isOwn
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className={`text-xs px-2 py-1 rounded ${
                                  isOwn
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
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
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {parseMessageContent(message.content, isOwn)}
                          </p>
                                {/* Edit indicator */}
                                {message.action === 'EDIT' && (
                                  <p className="text-xs mt-1 opacity-70 italic">
                                    (edited)
                                  </p>
                                )}
                          {/* Link Previews */}
                          {(() => {
                            const urls = extractUrls(message.content)
                            if (urls.length > 0) {
                              return (
                                <div className="mt-2 space-y-2 -mx-1">
                                  {urls.map((url, idx) => (
                                    <LinkPreview key={idx} url={url} isOwn={isOwn} />
                                  ))}
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )}
                          </>
                              )}
                            </div>
                        </div>
                      )}

                    {/* Text Bubble - chỉ khi có content và có attachments */}
                    {message.content && message.attachments && message.attachments.length > 0 && (
                      <div className="relative flex-1 min-w-0 mb-2">
                        {/* Edit Mode */}
                        {editingMessageId === message.messageId ? (
                          <div className={`min-w-0 rounded-lg px-3 py-2 ${
                            isOwn
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}>
                            <textarea
                              ref={editInputRef}
                              value={editMessageContent}
                              onChange={(e) => setEditMessageContent(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              className={`w-full text-sm bg-transparent border-none outline-none resize-none ${
                                isOwn ? 'text-white placeholder-white/70' : 'text-gray-900'
                              }`}
                              rows={Math.min(editMessageContent.split('\n').length, 10)}
                              placeholder="Type a message..."
                              style={{ minHeight: '20px', maxHeight: '200px' }}
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={handleSaveEdit}
                                className={`text-xs px-2 py-1 rounded ${
                                  isOwn
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                              >
                                Lưu
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className={`text-xs px-2 py-1 rounded ${
                                  isOwn
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                }`}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`relative group min-w-0 rounded-lg px-3 py-2 ${
                              isSending ? 'opacity-60' : ''
                            } ${
                              isOwn
                                ? 'bg-blue-500 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {parseMessageContent(message.content, isOwn)}
                            </p>
                            {/* Edit indicator */}
                            {message.action === 'EDIT' && (
                              <p className="text-xs mt-1 opacity-70 italic">
                                (edited)
                              </p>
                            )}
                            {/* Link Previews */}
                            {(() => {
                              const urls = extractUrls(message.content)
                              if (urls.length > 0) {
                                return (
                                  <div className="mt-2 space-y-2 -mx-1">
                                    {urls.map((url, idx) => (
                                      <LinkPreview key={idx} url={url} isOwn={isOwn} />
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attachments với icons - hiển thị bên dưới text nếu có text, hoặc riêng nếu chỉ có file */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div 
                        className={`flex items-start gap-1 relative ${isOwn ? '' : 'flex-row-reverse'}`}
                        onMouseEnter={() => {
                          if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                          setHoveredMessageId(message.messageId)
                        }}
                        onMouseLeave={() => {
                          // Không ẩn nếu menu đang mở
                          if (showMenuFor === message.messageId) return
                          if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                          hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                        }}
                      >
                        {/* 3 chấm menu button - chỉ hiển thị khi hover, menu chỉ hiện khi click */}
                        {hoveredMessageId === message.messageId && 
                         editingMessageId !== message.messageId &&
                         !isSending && 
                         message.action !== 'DELETED' && (
                          <div 
                            className="relative flex-shrink-0 self-center"
                            onMouseEnter={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              setHoveredMessageId(message.messageId)
                            }}
                            onMouseLeave={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onToggleMenuClick(message.messageId)
                              }}
                              className="p-1 rounded-full hover:bg-gray-200/60 text-gray-600 transition-colors"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                            {/* Menu dropdown - hiển thị phía trên */}
                            {showMenuFor === message.messageId && (
                              <div
                                ref={(el) => {
                                  if (el) {
                                    menuRefs.current.set(message.messageId, el)
                                  } else {
                                    menuRefs.current.delete(message.messageId)
                                  }
                                }}
                                className={`absolute ${isOwn ? 'left-0' : 'right-0'} bottom-full mb-1 bg-white border border-gray-200 shadow-lg rounded-lg py-1 z-[10000] min-w-[140px]`}
                                onClick={(e) => e.stopPropagation()}
                                onMouseEnter={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  setHoveredMessageId(message.messageId)
                                }}
                                onMouseLeave={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                                }}
                              >
                                {/* Forward option - hiển thị cho cả tin nhắn của mình và người khác */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenForwardModal(message)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Forward className="w-4 h-4" />
                                  <span>Forward</span>
                                </button>
                                {/* Edit option - chỉ hiển thị cho tin nhắn của mình */}
                                {isOwn && message.content && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartEdit(message.messageId)
                                      setShowMenuFor(null)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                    <span>Edit</span>
                                  </button>
                                )}
                                {/* Delete option - chỉ hiển thị cho tin nhắn của mình */}
                                {isOwn && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteMessage(message.messageId)
                                      setShowMenuFor(null)
                                    }}
                                    disabled={deletingMessageIds.has(message.messageId)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>
                                      {deletingMessageIds.has(message.messageId) ? 'Deleting...' : 'Delete'}
                                    </span>
                                  </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                        {/* Reaction icon - bên trái cho tin nhắn của mình, bên phải cho tin nhắn của người khác */}
                        {editingMessageId !== message.messageId && (hoveredMessageId === message.messageId || showPickerFor === message.messageId) && (
                          <div 
                            className="relative flex-shrink-0 self-center"
                            onMouseEnter={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              setHoveredMessageId(message.messageId)
                            }}
                            onMouseLeave={() => {
                              if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                              hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                            }}
                          >
                            <button
                              type="button"
                              className="p-1 rounded-full border border-gray-300 text-gray-600 bg-white/80 backdrop-blur hover:bg-white transition shadow-sm"
                              title="React"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTogglePickerClick(message.messageId)
                              }}
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                            {/* Emoji picker dropdown */}
                            {showPickerFor === message.messageId && (
                              <div 
                                className={`absolute ${isOwn ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'} top-full mt-2 bg-white border border-gray-200 shadow-lg rounded-xl px-2 py-1 flex items-center gap-1 z-[10000]`}
                                onMouseEnter={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  setHoveredMessageId(message.messageId)
                                }}
                                onMouseLeave={() => {
                                  if (hoverHideTimerRef.current) window.clearTimeout(hoverHideTimerRef.current)
                                  hoverHideTimerRef.current = window.setTimeout(() => setHoveredMessageId(prev => (prev === message.messageId ? null : prev)), 500)
                                }}
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
                        )}
                        {/* Attachments grid */}
                        <div className={`flex-1 grid gap-2 ${message.attachments.length === 1 ? 'grid-cols-1' : message.attachments.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {message.attachments.map((att, idx) => {
                          const video = isVideoUrl(att)
                          // Khi chỉ có 1 ảnh, không dùng aspect-square mà để ảnh tự nhiên với max-width và max-height
                          const isSingleImage = message.attachments && message.attachments.length === 1 && !video
                          return (
                            <div 
                              key={idx} 
                              className={`relative group overflow-hidden rounded-lg bg-black/5 min-w-0 ${
                                isSingleImage 
                                  ? 'w-full max-w-md mx-auto' 
                                  : 'w-full aspect-square'
                              }`}
                            >
                              {video ? (
                                <video
                                  src={att}
                                  controls
                                  className={`w-full ${isSingleImage ? 'h-auto max-h-96' : 'h-full'} object-cover rounded-lg`}
                                  onClick={(e) => { e.stopPropagation(); openPreview(message.attachments!, idx) }}
                                />
                              ) : (
                                <img
                                  src={att}
                                  alt="attachment"
                                  className={`w-full ${isSingleImage ? 'h-auto max-h-96 object-contain' : 'h-full object-cover'} rounded-lg cursor-zoom-in`}
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
      <div className="p-3 border-t border-gray-200 bg-white">
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
      {forwardMessageModal.isOpen && forwardMessageModal.message && (
        <ForwardMessageModal
          isOpen={forwardMessageModal.isOpen}
          onClose={handleCloseForwardModal}
          message={forwardMessageModal.message}
          onForward={handleForwardMessage}
        />
      )}
    </div>
  )
}

