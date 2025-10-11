"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button, MentionPortal } from "@/components/ui"
import { Send, Heart, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useComments } from "@/lib/hooks/useComments"
import { useMention } from "@/lib/hooks/useMention"
import { UserService } from "@/lib/api/users/UserService"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import type { Comment as CommentType, CommentMention } from "@/lib/types/posts/CommentsDTO"
import type { UserMetadata } from "@/lib/types/User"
import type { MentionData } from "@/lib/types/users/MentionDto"

interface CommentsSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
}

export function CommentsSection({ postId, isOpen, currentUserId }: CommentsSectionProps) {
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [optimisticComments, setOptimisticComments] = useState<CommentType[]>([])
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())
  const inputRef = useRef<HTMLInputElement>(null)

  // Mention functionality
  const {
    users: mentionUsers,
    isLoading: isMentionLoading,
    showDropdown: showMentionDropdown,
    selectedIndex: mentionSelectedIndex,
    handleTextChange: handleMentionTextChange,
    handleKeyDown: handleMentionKeyDown,
    selectUser: selectMentionUser,
    closeDropdown: closeMentionDropdown,
    mentions,
    setMentions,
  } = useMention({
    currentUserId: currentUserId || '',
    onMentionAdd: () => {}, // We don't need to track mentions in comments for now
    currentText: comment,
    onTextChange: (newText, cursorPosition) => {
      setComment(newText)
      // Update cursor position after state update
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  })
  
  const {
    comments,
    isLoading,
    isAdding,
    isLiking,
    fetchComments,
    addComment,
    toggleLikeComment,
    deleteComment
  } = useComments(postId)

  // Sử dụng UserService.getUserMetadata thay vì useUsers hook

  // Combine comments from API and optimistic updates, ensuring unique IDs
  const displayComments = useMemo(() => {
    
    // Start with real comments from API
    const allComments = [...comments]
    
    // Add optimistic comments that don't exist in real comments
    optimisticComments.forEach(optimisticComment => {
      const exists = allComments.find(c => c.id === optimisticComment.id)
      if (!exists) {
        allComments.push(optimisticComment)
      }
    })
    
    // Filter out any null/undefined comments
    const validComments = allComments.filter(Boolean)
    
    // Sort by creation time (newest first)
    const sortedComments = validComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    
    return sortedComments
  }, [optimisticComments, comments])

  // Fetch comments when section opens
  useEffect(() => {
    if (isOpen && postId) {
      console.log('🔄 Fetching comments for postId:', postId)
      setError(null)
      setOptimisticComments([])
      fetchComments(10)
    }
  }, [isOpen, postId]) // Removed fetchComments from dependencies to prevent infinite loop

  // Fetch user metadata for comments with debouncing
  useEffect(() => {
    const fetchUserMetadata = async () => {
      const commentsToFetch = displayComments
        .filter(comment => comment && !userCache.has(comment.authorId))
        .filter(comment => comment.authorId && comment.authorId !== 'current-user') // Skip current-user
        .slice(0, 5) // Reduced limit to prevent blocking

      if (commentsToFetch.length === 0) return

      // Process in batches to prevent blocking
      const batchSize = 3
      for (let i = 0; i < commentsToFetch.length; i += batchSize) {
        const batch = commentsToFetch.slice(i, i + batchSize)
        
        const userPromises = batch.map(async (comment) => {
          try {
            const userMetadata = await UserService.getUserMetadata(comment.authorId)
            return { authorId: comment.authorId, userMetadata }
          } catch (error) {
            console.error(`Failed to fetch user metadata ${comment.authorId}:`, error)
            return null
          }
        })

        const results = await Promise.all(userPromises)
        const newCache = new Map(userCache)
        
        results.forEach(result => {
          if (result?.userMetadata) {
            newCache.set(result.authorId, result.userMetadata)
          }
        })
        
        setUserCache(newCache)
        
        // Small delay between batches to prevent blocking
        if (i + batchSize < commentsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    // Debounce user metadata fetching
    const timeoutId = setTimeout(() => {
      if (displayComments.length > 0) {
        fetchUserMetadata()
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [displayComments.length]) // Only depend on comment count, not userCache

  // Helper functions with memoization
  const getUserFromCache = useCallback((authorId: string): UserMetadata | undefined => 
    userCache.get(authorId), [userCache])

  const isTempComment = useCallback((comment: CommentType): boolean => 
    comment?.id?.startsWith?.('temp-') || false, [])

  const getDisplayInfo = useCallback((comment: CommentType) => {
    // Handle current-user case - show "You" for current user
    if (comment.authorId === 'current-user') {
      return {
        displayName: 'You',
        avatarUrl: comment.authorAvatar,
        fullName: 'You'
      }
    }

    // Fetch real user metadata for other users
    const userMetadata = getUserFromCache(comment.authorId)
    
    // Ưu tiên metadata thật, không dùng authorName từ comment
    const displayName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 
                       'Loading...' // Hiển thị loading khi chưa fetch xong
    const avatarUrl = userMetadata?.avtUrl || comment.authorAvatar
    const fullName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 
                    'Loading...'

    return { displayName, avatarUrl, fullName }
  }, [getUserFromCache])

  // Memoized comment submission handler
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      setError('Comment cannot be empty')
      return
    }
    
    setError(null)
    
    const tempComment: CommentType = {
      id: `temp-${Date.now()}`,
      content: comment,
      authorId: currentUserId || 'current-user',
      authorName: '', // Empty để fetch metadata thật
      authorAvatar: undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      postId,
    }

    setOptimisticComments(prev => [tempComment, ...prev])
    const currentComment = comment
    setComment("")

    try {
      // Convert mentions from MentionData format to CommentMention format
      const commentMentions = mentions.map(mention => ({
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      }))
      
      await addComment(currentComment, commentMentions)
      
      // Clear mentions after successful submission
      setMentions([])
      
      // Load lại tất cả comments sau khi comment xong
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      
      // Refresh tất cả comments
      await fetchComments(10)
      
    } catch (error: any) {
      console.error('Failed to submit comment:', error)
      
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      setComment(currentComment)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to post comment'
      setError(errorMessage)
    }
  }, [comment, currentUserId, postId, addComment, fetchComments])

  // Other comment handlers with memoization
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await toggleLikeComment(commentId)
    } catch (error) {
      console.error('Failed to like comment:', error)
      setError('Failed to like comment')
    }
  }, [toggleLikeComment])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return
    
    try {
      if (commentId?.startsWith('temp-')) {
        setOptimisticComments(prev => prev.filter(c => c.id !== commentId))
      }
      await deleteComment(commentId)
    } catch (error) {
      console.error('Failed to delete comment:', error)
      setError('Failed to delete comment')
    }
  }, [deleteComment])

  if (!isOpen) return null

  return (
    <div className="border-t border-border/50 bg-muted/30">
      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 w-6 p-0 text-red-700 hover:bg-red-100"
            onClick={() => setError(null)}
          >
            ×
          </Button>
        </div>
      )}

      {/* Comments List */}
      <div className="max-h-60 overflow-y-auto p-4 space-y-3">
        {isLoading && displayComments.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
          </div>
        ) : displayComments.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          displayComments.map((comment, index) => {
            if (!comment) return null
            
            const tempComment = isTempComment(comment)
            const { displayName, avatarUrl, fullName } = getDisplayInfo(comment)
            
            return (
              <CommentItem
                key={comment.id || `comment-${index}-${comment.authorId}`}
                comment={comment}
                isTemp={tempComment}
                displayName={displayName}
                avatarUrl={avatarUrl}
                fullName={fullName}
                isLiking={isLiking}
                onLike={handleLikeComment}
                onDelete={handleDeleteComment}
              />
            )
          })
        )}
      </div>

      {/* Comment Input */}
      <CommentInput
        comment={comment}
        isAdding={isAdding}
        onChange={setComment}
        onClearError={() => setError(null)}
        onSubmit={handleSubmitComment}
        mentionUsers={mentionUsers}
        isMentionLoading={isMentionLoading}
        showMentionDropdown={showMentionDropdown}
        mentionSelectedIndex={mentionSelectedIndex}
        onMentionTextChange={handleMentionTextChange}
        onMentionKeyDown={handleMentionKeyDown}
        onSelectMentionUser={selectMentionUser}
        onCloseMentionDropdown={closeMentionDropdown}
        inputRef={inputRef}
        mentions={mentions as MentionData[]}
        setMentions={(next) => setMentions(next)}
      />
    </div>
  )
}

// Sub-components for better organization
interface CommentItemProps {
  comment: CommentType
  isTemp: boolean
  displayName: string
  avatarUrl?: string
  fullName?: string
  isLiking: string | null
  onLike: (commentId: string) => void
  onDelete: (commentId: string) => void
}

function CommentItem({ 
  comment, 
  isTemp, 
  displayName, 
  avatarUrl, 
  fullName, 
  isLiking, 
  onLike, 
  onDelete 
}: CommentItemProps) {
  return (
    <div className={`flex gap-3 ${isTemp ? 'opacity-70' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover border-2 border-primary/10"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {displayName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {/* Name with tooltip */}
              {fullName ? (
                <div className="group relative">
                  <span className="font-medium text-sm text-foreground cursor-help">
                    {displayName}
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    {fullName}
                  </div>
                </div>
              ) : (
                <span className="font-medium text-sm text-foreground">
                  {displayName}
                </span>
              )}
              
              {isTemp && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Posting...)
                </span>
              )}
              
              <span className="text-xs text-muted-foreground">
                {isTemp ? 'Just now' : formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            
            <CommentContentWithMentions 
              content={comment.content}
              mentions={comment.mentions}
            />
          </div>
          
          {!isTemp && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 flex-shrink-0"
              onClick={() => onDelete(comment.id)}
              title="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        {/* Actions */}
        {!isTemp && (
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <button 
              className={`flex items-center gap-1 transition-colors ${
                comment.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-foreground'
              }`}
              onClick={() => onLike(comment.id)}
              disabled={isLiking === comment.id}
            >
              {isLiking === comment.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Heart className={`h-3 w-3 ${comment.isLiked ? 'fill-current' : ''}`} />
              )}
              <span>{comment.likes || 0}</span>
            </button>
            <button className="hover:text-foreground transition-colors">
              Reply
            </button>
          </div>
        )}
        
        {/* Loading for temp comments */}
        {isTemp && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Posting...</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface CommentInputProps {
  comment: string
  isAdding: boolean
  onChange: (value: string) => void
  onClearError: () => void
  onSubmit: (e: React.FormEvent) => void
  // Mention props
  mentionUsers: any[]
  isMentionLoading: boolean
  showMentionDropdown: boolean
  mentionSelectedIndex: number
  onMentionTextChange: (text: string, cursorPosition: number) => void
  onMentionKeyDown: (e: React.KeyboardEvent) => void
  onSelectMentionUser: (user: any) => void
  onCloseMentionDropdown: () => void
  inputRef: React.RefObject<HTMLInputElement>
  mentions: MentionData[]
  setMentions: (next: MentionData[]) => void
}

function CommentInput({ 
  comment, 
  isAdding, 
  onChange, 
  onClearError, 
  onSubmit,
  mentionUsers,
  isMentionLoading,
  showMentionDropdown,
  mentionSelectedIndex,
  onMentionTextChange,
  onMentionKeyDown,
  onSelectMentionUser,
  onCloseMentionDropdown,
  inputRef,
  mentions,
  setMentions
}: CommentInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onChange(value)
    onClearError()
    onMentionTextChange(value, e.target.selectionStart || 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current || (e.currentTarget as HTMLInputElement | null)
    if (!input) {
      onMentionKeyDown(e)
      return
    }

    const selectionStart = input.selectionStart || 0
    const selectionEnd = input.selectionEnd || 0

    const expandDeletionToMentions = (deleteStart: number, deleteEnd: number) => {
      const overlapped = mentions.filter(m => !(m.endIndex <= deleteStart || m.startIndex >= deleteEnd))
      if (overlapped.length === 0) return { start: deleteStart, end: deleteEnd }
      const mentionStart = Math.min(...overlapped.map(m => m.startIndex))
      const mentionEnd = Math.max(...overlapped.map(m => m.endIndex))
      const start = Math.min(deleteStart, mentionStart)
      const end = Math.max(deleteEnd, mentionEnd)
      return { start, end }
    }

    const deleteRange = (start: number, end: number) => {
      const safeStart = Math.max(0, Math.min(start, comment.length))
      const safeEnd = Math.max(safeStart, Math.min(end, comment.length))
      const newText = comment.slice(0, safeStart) + comment.slice(safeEnd)
      const delta = safeEnd - safeStart

      const updatedMentions = mentions
        .filter(m => !(m.endIndex > safeStart && m.startIndex < safeEnd))
        .map(m => {
          if (m.startIndex >= safeEnd) {
            return {
              ...m,
              startIndex: m.startIndex - delta,
              endIndex: m.endIndex - delta,
            }
          }
          return m
        })

      e.preventDefault()
      onChange(newText)
      setMentions(updatedMentions)

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(safeStart, safeStart)
        }
      }, 0)
    }

    if (e.key === 'Backspace') {
      if (selectionStart === selectionEnd) {
        const mentionAtCursor = mentions.find(m => selectionStart >= m.startIndex && selectionStart < m.endIndex)
        if (mentionAtCursor) {
          deleteRange(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
          return
        }
        const pos = selectionStart - 1
        if (pos >= 0) {
          const mentionLeft = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
          if (mentionLeft) {
            deleteRange(mentionLeft.startIndex, mentionLeft.endIndex)
            return
          }
        }
      } else {
        const { start, end } = expandDeletionToMentions(selectionStart, selectionEnd)
        if (start !== selectionStart || end !== selectionEnd) {
          deleteRange(start, end)
          return
        }
      }
    }

    if (e.key === 'Delete') {
      if (selectionStart === selectionEnd) {
        const pos = selectionStart
        const mention = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
        if (mention) {
          deleteRange(mention.startIndex, mention.endIndex)
          return
        }
      } else {
        const { start, end } = expandDeletionToMentions(selectionStart, selectionEnd)
        if (start !== selectionStart || end !== selectionEnd) {
          deleteRange(start, end)
          return
        }
      }
    }

    onMentionKeyDown(e)
  }

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border/50">
      <div className="flex gap-2 relative">
        <input
          ref={inputRef}
          type="text"
          value={comment}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment... Type @ to see all users"
          disabled={isAdding}
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-colors"
        />
        
        {/* Mention Portal - Renders outside post container */}
        <MentionPortal
          users={mentionUsers}
          selectedIndex={mentionSelectedIndex}
          onSelect={onSelectMentionUser}
          onClose={onCloseMentionDropdown}
          isLoading={isMentionLoading}
          inputRef={inputRef}
          show={showMentionDropdown}
        />
        <Button 
          type="submit" 
          size="sm" 
          disabled={!comment.trim() || isAdding}
          className="flex items-center gap-1 min-w-20 transition-colors"
        >
          {isAdding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Posting...</span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>Post</span>
            </>
          )}
        </Button>
      </div>
      
      {comment.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          {comment.length}/500
        </div>
      )}
    </form>
  )
}

// Component to render comment content with mentions highlighted
function CommentContentWithMentions({ content, mentions }: { content: string; mentions?: CommentMention[] }) {
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())

  // Fetch user metadata for all mentions
  useEffect(() => {
    if (!mentions || mentions.length === 0) return

    const fetchUserMetadata = async () => {
      // Get unique user IDs that we haven't fetched yet
      const userIdsToFetch = mentions
        .map(m => m.userId)
        .filter((userId, index, self) => self.indexOf(userId) === index)
        .filter(userId => !userCache.has(userId))

      if (userIdsToFetch.length === 0) {
        return
      }

      try {
        // Fetch all user metadata in parallel
        const userPromises = userIdsToFetch.map(async (userId) => {
          try {
            const metadata = await UserService.getUserMetadata(userId)
            return { userId, metadata }
          } catch (error) {
            console.error('Failed to fetch user metadata for mention:', error)
            return {
              userId,
              metadata: {
                userId,
                firstName: 'User',
                lastName: userId.slice(0, 8),
                avtUrl: null
              }
            }
          }
        })

        const results = await Promise.all(userPromises)
        
        // Update cache with all results
        setUserCache(prevCache => {
          const updatedCache = new Map(prevCache)
          results.forEach(({ userId, metadata }) => {
            updatedCache.set(userId, metadata)
          })
          return updatedCache
        })
      } catch (error) {
        console.error('Error fetching user metadata:', error)
      }
    }

    fetchUserMetadata()
  }, [mentions]) // Only depend on mentions

  // Render content with highlighted mentions
  const renderContent = () => {
    if (!mentions || mentions.length === 0) {
      return <span className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words block">{content}</span>
    }

    // Sort mentions by startIndex to process them in order
    const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex)
    
    const parts: Array<{
      type: 'text' | 'mention'
      content: string
      startIndex: number
      endIndex: number
      userId?: string
    }> = []
    let lastIndex = 0

    sortedMentions.forEach((mention) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, mention.startIndex),
          startIndex: lastIndex,
          endIndex: mention.startIndex
        })
      }

      // Add mention
      const userMetadata = userCache.get(mention.userId)
      const displayName = userMetadata 
        ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
        : `@user${mention.userId.slice(0, 8)}`

      parts.push({
        type: 'mention',
        content: `@${displayName}`,
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      })

      lastIndex = mention.endIndex
    })

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
        startIndex: lastIndex,
        endIndex: content.length
      })
    }

    return (
      <span className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words block">
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <span
                key={index}
                className="text-blue-600 dark:text-blue-400 font-medium cursor-pointer hover:underline"
                onClick={() => {
                  // Navigate to user profile
                  console.log('Navigate to user profile:', part.userId)
                }}
              >
                {part.content}
              </span>
            )
          }
          return <span key={index}>{part.content}</span>
        })}
      </span>
    )
  }

  return renderContent()
}