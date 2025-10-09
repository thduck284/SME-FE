"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button, MentionPortal } from "@/components/ui"
import { Send, Heart, Trash2, Loader2, AlertCircle } from "lucide-react"
import { useComments } from "@/lib/hooks/useComments"
import { useMention } from "@/lib/hooks/useMention"
import { UserService } from "@/lib/api/users/UserService"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"
import type { UserMetadata } from "@/lib/types/User"

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
  } = useMention({
    currentUserId: currentUserId || '',
    onMentionAdd: () => {}, // We don't need to track mentions in comments for now
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
  const displayComments = [...optimisticComments, ...comments]
    .filter(Boolean)
    .reduce((acc, comment) => {
      if (!acc.find(c => c.id === comment.id)) {
        acc.push(comment)
      }
      return acc
    }, [] as CommentType[])

  // Fetch comments when section opens
  useEffect(() => {
    if (isOpen && postId) {
      setError(null)
      setOptimisticComments([])
      fetchComments(10)
    }
  }, [isOpen, postId, fetchComments])

  // Fetch user metadata for comments
  useEffect(() => {
    const fetchUserMetadata = async () => {
      const commentsToFetch = displayComments
        .filter(comment => comment && !userCache.has(comment.authorId))
        .slice(0, 10) // Limit concurrent requests

      const userPromises = commentsToFetch.map(async (comment) => {
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
    }

    if (displayComments.length > 0) {
      fetchUserMetadata()
    }
  }, [displayComments, userCache])

  // Helper functions
  const getUserFromCache = useCallback((authorId: string): UserMetadata | undefined => 
    userCache.get(authorId), [userCache])

  const isTempComment = useCallback((comment: CommentType): boolean => 
    comment?.id?.startsWith?.('temp-') || false, [])

  const getDisplayInfo = useCallback((comment: CommentType) => {
    const userMetadata = getUserFromCache(comment.authorId)
    const displayName = comment.authorName === 'You' ? 'You' : 
                       (userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : comment.authorName || 'Unknown User')
    const avatarUrl = userMetadata?.avtUrl || comment.authorAvatar
    const fullName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 
                    comment.authorName || 'Unknown User'

    return { displayName, avatarUrl, fullName }
  }, [getUserFromCache])

  // Comment handlers
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim()) {
      setError('Comment cannot be empty')
      return
    }
    
    setError(null)
    
    const tempComment: CommentType = {
      id: `temp-${Date.now()}`,
      content: comment,
      authorId: 'current-user',
      authorName: 'You',
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
      const newComment = await addComment(currentComment)
      
      // Cache user metadata for new comment
      if (newComment.authorId) {
        try {
          const userMetadata = await UserService.getUserMetadata(newComment.authorId)
          setUserCache(prev => new Map(prev).set(newComment.authorId, userMetadata))
        } catch (error) {
          console.error('Failed to fetch user metadata for new comment:', error)
        }
      }
      
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      
    } catch (error: any) {
      console.error('Failed to submit comment:', error)
      
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      setComment(currentComment)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to post comment'
      setError(errorMessage)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    try {
      await toggleLikeComment(commentId)
    } catch (error) {
      console.error('Failed to like comment:', error)
      setError('Failed to like comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
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
  }

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
            
            <p className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
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
  inputRef
}: CommentInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onChange(value)
    onClearError()
    onMentionTextChange(value, e.target.selectionStart || 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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