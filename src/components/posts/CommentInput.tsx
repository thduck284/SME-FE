"use client"

import { Button, MentionPortal } from "@/components/ui"
import { Send, Loader2, ImageIcon, X } from "lucide-react"
import { FilePreviewGrid } from "./FilePreviewGrid"
import type { MentionData } from "@/lib/types/users/MentionDto"
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"
import { useEffect } from "react"

interface CommentInputProps {
  comment: string
  isAdding: boolean
  isEditing: string | null
  editingComment: CommentType | null
  replyingTo: CommentType | null
  onChange: (value: string) => void
  onClearError: () => void
  onSubmit: (e: React.FormEvent) => void
  onCancelEdit: () => void
  onCancelReply: () => void
  getDisplayInfo: (comment: CommentType) => {
    displayName: string
    avatarUrl?: string
    fullName?: string
  }
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
  // File upload props
  files: File[]
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function CommentInput({ 
  comment, 
  isAdding, 
  isEditing,
  editingComment,
  replyingTo,
  onChange, 
  onClearError, 
  onSubmit,
  onCancelEdit,
  onCancelReply,
  getDisplayInfo,
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
  setMentions,
  files,
  onFileChange,
  onRemoveFile,
  fileInputRef
}: CommentInputProps) {

  // DEBUG: Log khi props thay đổi
  useEffect(() => {
    console.log('🔍 CommentInput Mention Debug:', {
      showMentionDropdown,
      mentionUsersCount: mentionUsers.length,
      isMentionLoading,
      mentionSelectedIndex,
      commentLength: comment.length,
      mentionsCount: mentions.length
    })
  }, [showMentionDropdown, mentionUsers, isMentionLoading, mentionSelectedIndex, comment, mentions])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const cursorPosition = e.target.selectionStart || 0
    
    console.log('⌨️ Input Change:', { 
      value, 
      cursorPosition,
      hasAtSymbol: value.includes('@')
    })
    
    onChange(value)
    onClearError()
    
    // Gọi mention handler với cursor position
    onMentionTextChange(value, cursorPosition)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('🔑 Key Down:', e.key)
    
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
          console.log('🗑️ Deleting mention:', mentionAtCursor)
          deleteRange(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
          return
        }
        const pos = selectionStart - 1
        if (pos >= 0) {
          const mentionLeft = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
          if (mentionLeft) {
            console.log('🗑️ Deleting mention left:', mentionLeft)
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
          console.log('🗑️ Deleting mention with Delete key:', mention)
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

    // LUÔN gọi mention keydown handler
    console.log('🔑 Calling onMentionKeyDown with key:', e.key)
    onMentionKeyDown(e)
  }

  const isEditMode = !!editingComment

  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-border/50">
      {/* Edit Mode Header */}
      {isEditMode && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-700 text-sm">
            <span>Editing comment</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-blue-700 hover:bg-blue-100"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Reply Mode Header */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <span>Replying to <strong>{getDisplayInfo(replyingTo).displayName}</strong></span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-green-700 hover:bg-green-100"
            onClick={onCancelReply}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* File Preview */}
      {files.length > 0 && (
        <div className="mb-3">
          <FilePreviewGrid files={files} onRemoveFile={onRemoveFile} />
        </div>
      )}

      {/* File Upload Button */}
      <div className="mb-3 flex justify-start">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-700 border border-gray-300 hover:border-gray-400"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Chọn ảnh</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={onFileChange}
          className="hidden"
        />
      </div>

      <div className="flex gap-2 relative">
        <input
          ref={inputRef}
          type="text"
          value={comment}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isEditMode 
              ? "Edit your comment..." 
              : replyingTo 
                ? `Reply to ${getDisplayInfo(replyingTo).displayName}...` 
                : "Write a comment... Type @ to see all users"
          }
          disabled={isAdding || isEditing !== null}
          className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-colors"
        />
        
        {/* DEBUG: Hiển thị trạng thái mention */}
        {showMentionDropdown && (
          <div className="absolute bottom-full left-0 mb-2 bg-yellow-100 border border-yellow-400 rounded p-2 text-xs">
            🔍 Mention dropdown is OPEN - Users: {mentionUsers.length}
          </div>
        )}
        
        {/* Mention Portal */}
        <MentionPortal
          users={mentionUsers}
          selectedIndex={mentionSelectedIndex}
          onSelect={onSelectMentionUser}
          onClose={onCloseMentionDropdown}
          isLoading={isMentionLoading}
          inputRef={inputRef}
          show={showMentionDropdown}
        />

        {isEditMode && (
          <Button 
            type="button"
            size="sm"
            onClick={onCancelEdit}
            className="flex items-center gap-1 min-w-20 transition-colors"
          >
            <X className="h-4 w-4" />
            <span>Cancel</span>
          </Button>
        )}

        <Button 
          type="submit" 
          size="sm" 
          disabled={(!comment.trim() && files.length === 0) || isAdding || isEditing !== null}
          className="flex items-center gap-1 min-w-20 transition-colors"
        >
          {isAdding || isEditing !== null ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {isEditMode ? 'Updating...' : replyingTo ? 'Replying...' : 'Posting...'}
              </span>
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>{isEditMode ? 'Update' : replyingTo ? 'Reply' : 'Post'}</span>
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