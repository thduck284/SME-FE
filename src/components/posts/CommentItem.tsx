"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Heart, Trash2, Loader2, MoreVertical, Edit, Reply } from "lucide-react"
import { Button } from "@/components/ui"
import type { CommentWithReactions } from "@/lib/types/posts/CommentsDTO"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import { CommentContentWithMentions } from "./CommentContentWithMentions"
import { CommentMediaGrid } from "./CommentMediaGrid"
import { CommentReactionButton } from "./CommentReactionButton"

interface CommentItemProps {
  comment: CommentWithReactions
  isTemp: boolean
  displayName: string
  avatarUrl?: string
  fullName?: string
  isLiking: string | null
  isEditing: string | null
  isDeleting: string | null
  onLike: (commentId: string) => void
  onDelete: (commentId: string) => void
  onEdit: (comment: CommentWithReactions) => void
  onReply: (comment: CommentWithReactions) => void
  onReact?: (commentId: string, reactionType: string) => void
  onRemoveReaction?: (commentId: string) => void
  onMentionClick?: (path: string) => void
  currentUserId?: string
  replies?: CommentWithReactions[]
  isExpanded?: boolean
  isLoadingReplies?: boolean
  onToggleReplies?: (commentId: string) => void
  getDisplayInfo?: (comment: CommentWithReactions) => {
    displayName: string
    avatarUrl?: string
    fullName?: string
  }
  level?: number
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
  onReact,
  onRemoveReaction,
  onMentionClick, 
  currentUserId,
  replies = [],
  isExpanded = false,
  isLoadingReplies = false,
  onToggleReplies,
  getDisplayInfo,
  level = 0
}: CommentItemProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [localComment, setLocalComment] = useState(comment)
  const optionsRef = useRef<HTMLDivElement>(null)

  // Update local comment khi prop comment thay đổi
  useEffect(() => {
    setLocalComment(comment)
  }, [comment])

  // Close options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isOwner = currentUserId && localComment.authorId === currentUserId
  const isReply = level >= 1

  // Comment action handlers
  const handleLike = useCallback((commentId: string) => {
    onLike(commentId)
  }, [onLike])

  const handleReply = useCallback((comment: CommentWithReactions) => {
    onReply(comment)
  }, [onReply])

  const handleReact = useCallback((commentId: string, reactionType: string) => {
    onReact?.(commentId, reactionType)
  }, [onReact])

  const handleRemoveReaction = useCallback((commentId: string) => {
    onRemoveReaction?.(commentId)
  }, [onRemoveReaction])

  const handleEdit = useCallback((comment: CommentWithReactions) => {
    onEdit(comment)
  }, [onEdit])

  const handleDelete = useCallback((commentId: string) => {
    onDelete(commentId)
  }, [onDelete])

  // FIXED: Sử dụng hook onToggleReplies từ CommentsSection
  const handleToggleReplies = useCallback((commentId: string) => {
    // CHỈ GIỮ LẠI CONSOLE NÀY - in thông tin comment cấp 2+
    if (level >= 1) {
      console.log('Loading replies for level 2+ comment:', commentId, 'level:', level)
    }
    
    if (onToggleReplies) {
      onToggleReplies(commentId)
    }
  }, [onToggleReplies, level])

  // Styles dựa trên level
  const getContainerStyles = () => {
    if (level === 0) {
      return "flex gap-3"
    } else if (level === 1) {
      return "flex gap-2 ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4"
    } else {
      return "flex gap-2 ml-8"
    }
  }

  const avatarSize = isReply ? "w-6 h-6" : "w-8 h-8"
  const textSize = isReply ? "text-xs" : "text-sm"

  return (
    <div className={`${getContainerStyles()} ${isTemp ? 'opacity-70' : ''}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <img
          src={avatarUrl || "/assets/images/default.png"}
          alt={displayName}
          className={`${avatarSize} rounded-full object-cover border-2 border-primary/10`}
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
                  <span className={`font-medium ${textSize} text-foreground cursor-help`}>
                    {displayName}
                  </span>
                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    {fullName}
                  </div>
                </div>
              ) : (
                <span className={`font-medium ${textSize} text-foreground`}>
                  {displayName}
                </span>
              )}
              
              {isTemp && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (Posting...)
                </span>
              )}
              
              <span className={`${textSize} text-muted-foreground`}>
                {isTemp ? 'Just now' : formatTimeAgo(localComment.createdAt)}
              </span>
            </div>
            
            <CommentContentWithMentions 
              content={localComment.content}
              mentions={localComment.mentions}
              onMentionClick={onMentionClick}
            />
            
            {/* Comment Media */}
            {localComment.medias && localComment.medias.length > 0 && (
              <div className="mt-2">
                <CommentMediaGrid medias={localComment.medias} compact={isReply} />
              </div>
            )}
          </div>
          
          {/* Options Menu - Hiển thị cho tất cả các cấp */}
          {!isTemp && (
            <div className="relative" ref={optionsRef}>
              <Button
                variant="ghost"
                size="sm"
                className={`${isReply ? 'h-6 w-6' : 'h-8 w-8'} p-0 text-muted-foreground hover:text-foreground flex-shrink-0`}
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
                          handleEdit(localComment)
                          setShowOptions(false)
                        }}
                        disabled={isEditing === localComment.id}
                      >
                        <Edit className="h-3 w-3" />
                        {isEditing === localComment.id ? 'Editing...' : 'Edit'}
                      </button>
                      <button
                        className="w-full px-3 py-2 text-sm text-left hover:bg-muted text-red-600 flex items-center gap-2"
                        onClick={() => {
                          handleDelete(localComment.id)
                          setShowOptions(false)
                        }}
                        disabled={isDeleting === localComment.id}
                      >
                        <Trash2 className="h-3 w-3" />
                        {isDeleting === localComment.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  ) : (
                    <button
                      className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                      onClick={() => {
                        handleReply(localComment)
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
        
        {/* Actions - Hiển thị đầy đủ cho tất cả các cấp */}
        {!isTemp && (
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {/* Reaction Button */}
            {onReact && onRemoveReaction && (
              <CommentReactionButton
                commentId={localComment.id}
                currentReaction={localComment.userReaction || null}
                reactionCounters={localComment.reactionCounters || {}}
                onReact={handleReact}
                onRemoveReaction={handleRemoveReaction}
                isReacting={false}
                size={isReply ? "sm" : "md"}
              />
            )}
            
            {/* Like Button fallback */}
            {(!onReact || !onRemoveReaction) && (
              <button 
                className={`flex items-center gap-1 transition-colors ${
                  localComment.isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-foreground'
                }`}
                onClick={() => handleLike(localComment.id)}
                disabled={isLiking === localComment.id}
              >
                {isLiking === localComment.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Heart className={`h-3 w-3 ${localComment.isLiked ? 'fill-current' : ''}`} />
                )}
                <span>{localComment.likes || 0}</span>
              </button>
            )}
            
            {/* Reply Button - Hiển thị cho tất cả các cấp */}
            <button 
              className="hover:text-foreground transition-colors"
              onClick={() => handleReply(localComment)}
            >
              Reply
            </button>
            
            {/* FIXED: View Replies - Hiển thị khi có replies HOẶC có hasChilds */}
            {(replies.length > 0 || localComment.hasChilds) && onToggleReplies && (
              <button 
                className="hover:text-foreground transition-colors"
                onClick={() => handleToggleReplies(localComment.id)}
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

        {/* FIXED: Replies Section - Hiển thị cho tất cả các cấp với đầy đủ chức năng */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            {replies.length > 0 ? (
              replies.map((reply, index) => {
                if (!reply) return null
                
                const replyDisplayInfo = getDisplayInfo ? getDisplayInfo(reply) : {
                  displayName: reply.authorName || 'Unknown User',
                  avatarUrl: reply.authorAvatar,
                  fullName: reply.authorName
                }

                // FIXED: Truyền replies data cho comment cấp 2, 3
                // Tìm replies của reply hiện tại từ props replies
                const replyReplies: CommentWithReactions[] = replies.filter(r => 
                  r.parentCommentId === reply.id
                )
                
                const isReplyExpanded = false
                const isLoadingReplyReplies = false
                
                return (
                  <CommentItem
                    key={reply.id || `reply-${index}-${reply.authorId}`}
                    comment={reply}
                    isTemp={false}
                    displayName={replyDisplayInfo.displayName}
                    avatarUrl={replyDisplayInfo.avatarUrl}
                    fullName={replyDisplayInfo.fullName}
                    isLiking={isLiking}
                    isEditing={isEditing}
                    isDeleting={isDeleting}
                    onLike={onLike}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onReply={onReply}
                    onReact={onReact}
                    onRemoveReaction={onRemoveReaction}
                    onMentionClick={onMentionClick}
                    currentUserId={currentUserId}
                    level={level + 1}
                    isExpanded={isReplyExpanded}
                    isLoadingReplies={isLoadingReplyReplies}
                    onToggleReplies={onToggleReplies}
                    getDisplayInfo={getDisplayInfo}
                    replies={replyReplies} // FIXED: Truyền replies data cho nested comments
                  />
                )
              })
            ) : (
              isLoadingReplies ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-8">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading replies...</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground ml-8">
                  No replies yet
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  )
}