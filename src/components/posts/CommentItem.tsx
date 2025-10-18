"use client"

import { useState, useRef, useEffect } from "react"
import { Heart, Trash2, Loader2, MoreVertical, Edit, Reply } from "lucide-react"
import { Button } from "@/components/ui"
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import { CommentContentWithMentions } from "./CommentContentWithMentions"
import { CommentMediaGrid } from "./CommentMediaGrid"

interface CommentItemProps {
  comment: CommentType
  isTemp: boolean
  displayName: string
  avatarUrl?: string
  fullName?: string
  isLiking: string | null
  isEditing: string | null
  isDeleting: string | null
  onLike: (commentId: string) => void
  onDelete: (commentId: string) => void
  onEdit: (comment: CommentType) => void
  onReply: (comment: CommentType) => void
  onMentionClick?: (path: string) => void
  currentUserId?: string
  replies?: CommentType[]
  isExpanded?: boolean
  isLoadingReplies?: boolean
  onToggleReplies?: (commentId: string) => void
  getDisplayInfo?: (comment: CommentType) => {
    displayName: string
    avatarUrl?: string
    fullName?: string
  }
}

export function CommentItem({ 
  comment, 
  isTemp, 
  displayName, 
  avatarUrl, 
  fullName, 
  isLiking, 
  isEditing, 
  isDeleting, 
  onLike, 
  onDelete, 
  onEdit, 
  onReply,
  onMentionClick, 
  currentUserId,
  replies = [],
  isExpanded = false,
  isLoadingReplies = false,
  onToggleReplies,
  getDisplayInfo
}: CommentItemProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [showReplyOptions, setShowReplyOptions] = useState<{ [key: string]: boolean }>({})
  const optionsRef = useRef<HTMLDivElement>(null)
  const replyOptionsRef = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Close options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
      
      // Close reply options
      Object.values(replyOptionsRef.current).forEach(ref => {
        if (ref && !ref.contains(event.target as Node)) {
          setShowReplyOptions(prev => {
            const newState = { ...prev }
            Object.keys(newState).forEach(key => {
              newState[key] = false
            })
            return newState
          })
        }
      })
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isOwner = currentUserId && comment.authorId === currentUserId

  return (
    <div className={`flex gap-3 ${isTemp ? 'opacity-70' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <img
          src={avatarUrl || "/assets/images/default.png"}
          alt={displayName}
          className="w-8 h-8 rounded-full object-cover border-2 border-primary/10"
          onError={(e) => {
            e.currentTarget.src = "/assets/images/default.png"
          }}
        />
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
              onMentionClick={onMentionClick}
            />
            
            {/* Comment Media */}
            {comment.medias && comment.medias.length > 0 && (
              <div className="mt-2">
                <CommentMediaGrid medias={comment.medias} />
              </div>
            )}
          </div>
          
          {/* Options Menu */}
          {!isTemp && (
            <div className="relative" ref={optionsRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={() => setShowOptions(!showOptions)}
                title="More options"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
              
              {showOptions && (
                <div className="absolute right-0 top-8 bg-background border border-border rounded-lg shadow-lg z-10 min-w-32 py-1">
                  {isOwner ? (
                    <>
                      <button
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          onEdit(comment)
                          setShowOptions(false)
                        }}
                        disabled={isEditing === comment.id}
                      >
                        <Edit className="h-3 w-3" />
                        {isEditing === comment.id ? 'Editing...' : 'Edit'}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                        onClick={() => {
                          onDelete(comment.id)
                          setShowOptions(false)
                        }}
                        disabled={isDeleting === comment.id}
                      >
                        <Trash2 className="h-3 w-3" />
                        {isDeleting === comment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                      onClick={() => {
                        onReply(comment)
                        setShowOptions(false)
                      }}
                    >
                      <Reply className="h-3 w-3" />
                      Reply
                    </button>
                  )}
                </div>
              )}
            </div>
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
            <button 
              className="hover:text-foreground transition-colors"
              onClick={() => onReply(comment)}
            >
              Reply
            </button>
            {comment.hasChilds && onToggleReplies && (
              <button 
                className="hover:text-foreground transition-colors"
                onClick={() => onToggleReplies(comment.id)}
                disabled={isLoadingReplies}
              >
                {isLoadingReplies ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span>
                    {isExpanded ? 'Hide' : 'View'} {replies.length > 0 ? `${replies.length} ` : ''}replies
                  </span>
                )}
              </button>
            )}
          </div>
        )}
        
        {/* Loading for temp comments */}
        {isTemp && (
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Posting...</span>
          </div>
        )}

        {/* Replies Section */}
        {isExpanded && replies.length > 0 && (
          <div className="mt-3 ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
            {replies.map((reply, index) => {
              if (!reply) return null
              
              const replyDisplayInfo = getDisplayInfo ? getDisplayInfo(reply) : {
                displayName: reply.authorName || 'Unknown User',
                avatarUrl: reply.authorAvatar,
                fullName: reply.authorName
              }
              
              const isReplyOwner = currentUserId && reply.authorId === currentUserId
              
              return (
                <div key={reply.id || `reply-${index}-${reply.authorId}`} className="flex gap-3">
                  {/* Reply Avatar */}
                  <div className="flex-shrink-0">
                    <img
                      src={replyDisplayInfo.avatarUrl || "/assets/images/default.png"}
                      alt={replyDisplayInfo.displayName}
                      className="w-6 h-6 rounded-full object-cover border border-primary/10"
                      onError={(e) => {
                        e.currentTarget.src = "/assets/images/default.png"
                      }}
                    />
                  </div>
                  
                  {/* Reply Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {replyDisplayInfo.displayName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(reply.createdAt)}
                        </span>
                      </div>
                      
                      {/* Reply Options */}
                      {isReplyOwner && (
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
                            onClick={() => setShowReplyOptions(prev => ({
                              ...prev,
                              [reply.id]: !prev[reply.id]
                            }))}
                            title="More options"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                          
                          {showReplyOptions[reply.id] && (
                            <div 
                              ref={el => replyOptionsRef.current[reply.id] = el}
                              className="absolute right-0 top-6 bg-background border border-border rounded-lg shadow-lg z-10 min-w-32 py-1"
                            >
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => {
                                  onEdit(reply)
                                  setShowReplyOptions(prev => ({ ...prev, [reply.id]: false }))
                                }}
                                disabled={isEditing === reply.id}
                              >
                                <Edit className="h-3 w-3" />
                                {isEditing === reply.id ? 'Editing...' : 'Edit'}
                              </button>
                              <button
                                className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                                onClick={() => {
                                  onDelete(reply.id)
                                  setShowReplyOptions(prev => ({ ...prev, [reply.id]: false }))
                                }}
                                disabled={isDeleting === reply.id}
                              >
                                <Trash2 className="h-3 w-3" />
                                {isDeleting === reply.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-800 dark:text-gray-200">
                      <CommentContentWithMentions
                        content={reply.content}
                        mentions={reply.mentions}
                        onMentionClick={onMentionClick}
                      />
                    </div>
                    
                    {/* Reply Media */}
                    {reply.medias && reply.medias.length > 0 && (
                      <div className="mt-2">
                        <CommentMediaGrid medias={reply.medias} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}