"use client"

import { Loader2 } from "lucide-react"
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"
import { CommentItem } from "./CommentItem"

interface CommentsListProps {
  comments: CommentType[]
  isLoading: boolean
  isLiking: string | null
  isEditing: string | null
  isDeleting: string | null
  currentUserId?: string
  onLike: (commentId: string) => void
  onDelete: (commentId: string) => void
  onEdit: (comment: CommentType) => void
  onMentionClick?: (path: string) => void
  getDisplayInfo: (comment: CommentType) => {
    displayName: string
    avatarUrl?: string
    fullName?: string
  }
  isTempComment: (comment: CommentType) => boolean
}

export function CommentsList({
  comments,
  isLoading,
  isLiking,
  isEditing,
  isDeleting,
  currentUserId,
  onLike,
  onDelete,
  onEdit,
  onMentionClick,
  getDisplayInfo,
  isTempComment
}: CommentsListProps) {
  if (isLoading && comments.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading comments...</span>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-sm py-8">
        No comments yet. Be the first to comment!
      </div>
    )
  }

  return (
    <div className="max-h-60 overflow-y-auto p-4 space-y-3">
      {comments.map((comment, index) => {
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
            isEditing={isEditing}
            isDeleting={isDeleting}
            onLike={onLike}
            onDelete={onDelete}
            onEdit={onEdit}
            onMentionClick={onMentionClick}
            currentUserId={currentUserId}
          />
        )
      })}
    </div>
  )
}