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
  onMentionClick?: (path: string) => void
  currentUserId?: string
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
  onMentionClick,
  currentUserId
}: CommentItemProps) {
  const [showOptions, setShowOptions] = useState(false)
  const optionsRef = useRef<HTMLDivElement>(null)

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
                        // Handle reply functionality
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