"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui"
import { Send, Heart, Trash2, Loader2, AlertCircle, ChevronDown } from "lucide-react"
import { useComments } from "@/lib/hooks/useComments"
import { UserService } from "@/lib/api/users/UserService"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import { getUserId } from "@/lib/utils/Jwt" 
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"
import type { UserMetadata } from "@/lib/types/User"

interface CommentsSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

export function CommentsSection({ postId, isOpen, onClose }: CommentsSectionProps) {
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [optimisticComments, setOptimisticComments] = useState<CommentType[]>([])
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const fetchingRef = useRef<Set<string>>(new Set())
  const commentsContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    comments,
    isLoading,
    isAdding,
    isLiking,
    pagination,
    fetchComments,
    loadMoreComments,
    addComment,
    toggleLikeComment,
    deleteComment
  } = useComments(postId)

  // ✅ Get current user ID on mount
  useEffect(() => {
    const userId = getUserId()
    setCurrentUserId(userId)
  }, [])

  const displayComments = [...optimisticComments, ...comments]
    .filter(Boolean)
    .reduce((acc, comment) => {
      if (!acc.find(c => c.id === comment.id)) {
        acc.push(comment)
      }
      return acc
    }, [] as CommentType[])

  useEffect(() => {
    if (isOpen && postId) {
      setError(null)
      setOptimisticComments([])
      fetchComments(5)
    }
  }, [isOpen, postId, fetchComments])

  useEffect(() => {
    const fetchUserMetadata = async () => {
      const commentsToFetch = displayComments
        .filter(comment => {
          if (!comment || !comment.authorId) return false
          return !userCache.has(comment.authorId) && 
                 !fetchingRef.current.has(comment.authorId)
        })
        .slice(0, 5)

      if (commentsToFetch.length === 0) return

      commentsToFetch.forEach(c => fetchingRef.current.add(c.authorId))

      const userPromises = commentsToFetch.map(async (comment) => {
        try {
          const userMetadata = await UserService.getUserMetadata(comment.authorId)
          return { authorId: comment.authorId, userMetadata }
        } catch (error) {
          console.error(`Failed to fetch user metadata ${comment.authorId}:`, error)
          return null
        }
      })

      try {
        const results = await Promise.all(userPromises)
        const newCache = new Map(userCache)
        
        results.forEach(result => {
          if (result?.userMetadata) {
            newCache.set(result.authorId, result.userMetadata)
          }
        })
        
        setUserCache(newCache)
      } finally {
        commentsToFetch.forEach(c => fetchingRef.current.delete(c.authorId))
      }
    }

    if (displayComments.length > 0) {
      fetchUserMetadata()
    }
  }, [displayComments.length])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const isNearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 100

    if (isNearBottom && pagination.hasMore && !isLoading) {
      loadMoreComments()
    }
  }, [pagination.hasMore, isLoading, loadMoreComments])

  const getUserFromCache = useCallback((authorId: string): UserMetadata | undefined => 
    userCache.get(authorId), [userCache])

  const isTempComment = useCallback((comment: CommentType): boolean => 
    comment?.id?.startsWith?.('temp-') || false, [])

  const isOwnComment = useCallback((comment: CommentType): boolean => {
    return currentUserId ? comment.authorId === currentUserId : false
  }, [currentUserId])

  const getDisplayInfo = useCallback((comment: CommentType) => {
    const userMetadata = getUserFromCache(comment.authorId)
    const displayName = isOwnComment(comment) ? 'You' : 
                       (userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : comment.authorName || 'Unknown User')
    const avatarUrl = userMetadata?.avtUrl || comment.authorAvatar
    const fullName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 
                    comment.authorName || 'Unknown User'

    return { displayName, avatarUrl, fullName }
  }, [getUserFromCache, isOwnComment])

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
      authorId: currentUserId || 'current-user',
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

      <div 
        ref={commentsContainerRef}
        onScroll={handleScroll}
        className="max-h-60 overflow-y-auto p-4 space-y-3"
      >
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
          <>
            {displayComments.map((comment, index) => {
              if (!comment) return null
              
              const tempComment = isTempComment(comment)
              const isOwn = isOwnComment(comment)
              const { displayName, avatarUrl, fullName } = getDisplayInfo(comment)
              
              return (
                <CommentItem
                  key={comment.id || `comment-${index}-${comment.authorId}`}
                  comment={comment}
                  isTemp={tempComment}
                  isOwn={isOwn}
                  displayName={displayName}
                  avatarUrl={avatarUrl}
                  fullName={fullName}
                  isLiking={isLiking}
                  onLike={handleLikeComment}
                  onDelete={handleDeleteComment}
                />
              )
            })}
            
            {pagination.hasMore && !isLoading && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadMoreComments}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Load more
                </Button>
              </div>
            )}
            
            {isLoading && displayComments.length > 0 && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>

      <CommentInput
        comment={comment}
        isAdding={isAdding}
        onChange={setComment}
        onClearError={() => setError(null)}
        onSubmit={handleSubmitComment}
      />
    </div>
  )
}

interface CommentItemProps {
  comment: CommentType
  isTemp: boolean
  isOwn: boolean
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
  isOwn,
  displayName, 
  avatarUrl, 
  fullName, 
  isLiking, 
  onLike, 
  onDelete 
}: CommentItemProps) {
  return (
    <div className={`flex gap-3 ${isTemp ? 'opacity-70' : ''}`}>
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
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {fullName && fullName !== 'Unknown User' ? (
                <div className="group relative inline-block">
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
              
              {isTemp && <span className="text-xs text-muted-foreground">(Posting...)</span>}
              
              <span className="text-xs text-muted-foreground">
                {isTemp ? 'Just now' : formatTimeAgo(comment.createdAt)}
              </span>
            </div>
            
            <p className="text-sm text-foreground bg-background rounded-lg p-3 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
          
          {!isTemp && isOwn && (
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
          </div>
        )}
        
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
}

function CommentInput({ comment, isAdding, onChange, onClearError, onSubmit }: CommentInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border/50">
      <div className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => {
            onChange(e.target.value)
            onClearError()
          }}
          placeholder="Write a comment..."
          disabled={isAdding}
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-colors"
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
              <span>Post</span>
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