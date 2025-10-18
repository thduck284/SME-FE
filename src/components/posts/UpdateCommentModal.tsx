"use client"

import { useState, useEffect, useRef } from "react"
import { X, Smile, Send, Loader2, Image, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import { EmojiPicker } from "@/components/ui"
import { Button } from "@/components/ui"
import type { CommentMedia, CommentMention } from "@/lib/types/posts/CommentsDTO"

interface UpdateCommentModalProps {
  isOpen: boolean
  commentId: string
  currentContent: string
  currentMedias?: CommentMedia[]
  currentMentions?: CommentMention[]
  onClose: () => void
  onCommentUpdated?: () => void
  onEdit?: (commentId: string, newContent: string) => Promise<void> | void
}

export function UpdateCommentModal({ 
  isOpen, 
  commentId, 
  currentContent,
  currentMedias,
  currentMentions,
  onClose, 
  onCommentUpdated,
  onEdit 
}: UpdateCommentModalProps) {
  const [content, setContent] = useState(currentContent)
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [medias, setMedias] = useState<CommentMedia[]>([])
  const [mentions, setMentions] = useState<CommentMention[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setContent(currentContent)
      setMedias(currentMedias || [])
      setMentions(currentMentions || [])
      setShowEmojiPicker(false)
      setLoading(false)
      // Focus textarea when modal opens
      setTimeout(() => {
        textareaRef.current?.focus()
        if (textareaRef.current) {
          const length = currentContent.length
          textareaRef.current.setSelectionRange(length, length)
        }
      }, 100)
    }
  }, [isOpen, currentContent, currentMedias, currentMentions])

  const handleAddEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent(prev => prev + emoji)
      return
    }
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newText = content.slice(0, start) + emoji + content.slice(end)
    setContent(newText)
    
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = textarea.selectionEnd = start + emoji.length
    }, 0)
    
    setShowEmojiPicker(false)
  }

  const handleRemoveMedia = (index: number) => {
    setMedias(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error("Comment cannot be empty")
      return
    }

    if (content === currentContent && 
        JSON.stringify(medias) === JSON.stringify(currentMedias) &&
        JSON.stringify(mentions) === JSON.stringify(currentMentions)) {
      onClose()
      return
    }

    setLoading(true)
    try {
      await onEdit?.(commentId, content)
      toast.success("Comment updated successfully!")
      onCommentUpdated?.()
      onClose()
    } catch (error: any) {
      console.error("Error updating comment:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to update comment"
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Xử lý xóa mention với Backspace/Delete
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const textarea = textareaRef.current
      if (!textarea) return

      const selectionStart = textarea.selectionStart
      const selectionEnd = textarea.selectionEnd
      const currentMentions = mentions || []

      // Hàm xóa mention
      const deleteMention = (start: number, end: number) => {
        const safeStart = Math.max(0, Math.min(start, content.length))
        const safeEnd = Math.max(safeStart, Math.min(end, content.length))
        const newText = content.slice(0, safeStart) + content.slice(safeEnd)
        const delta = safeEnd - safeStart

        // Cập nhật mentions: xóa mention bị ảnh hưởng, điều chỉnh index của các mention sau
        const updatedMentions = currentMentions
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
        setContent(newText)
        setMentions(updatedMentions)

        // Đặt con trỏ về vị trí bắt đầu của vùng xóa
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(safeStart, safeStart)
          }
        }, 0)
      }

      // Xử lý Backspace
      if (e.key === 'Backspace') {
        if (selectionStart === selectionEnd) {
          // Trường hợp 1: Con trỏ ở trong mention - xóa cả mention
          const mentionAtCursor = currentMentions.find(m => 
            selectionStart > m.startIndex && selectionStart <= m.endIndex
          )
          if (mentionAtCursor) {
            deleteMention(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
            return
          }

          // Trường hợp 2: Con trỏ ngay sau mention - xóa cả mention
          const pos = selectionStart - 1
          if (pos >= 0) {
            const mentionLeft = currentMentions.find(m => 
              pos >= m.startIndex && pos < m.endIndex
            )
            if (mentionLeft) {
              deleteMention(mentionLeft.startIndex, mentionLeft.endIndex)
              return
            }
          }
        } else {
          // Trường hợp 3: Đang chọn vùng text chứa mention - xóa cả mention
          const overlappedMentions = currentMentions.filter(m => 
            !(m.endIndex <= selectionStart || m.startIndex >= selectionEnd)
          )
          if (overlappedMentions.length > 0) {
            const mentionStart = Math.min(...overlappedMentions.map(m => m.startIndex))
            const mentionEnd = Math.max(...overlappedMentions.map(m => m.endIndex))
            deleteMention(mentionStart, mentionEnd)
            return
          }
        }
      }

      // Xử lý Delete
      if (e.key === 'Delete') {
        if (selectionStart === selectionEnd) {
          // Trường hợp: Con trỏ ở trước mention - xóa cả mention
          const mentionAtCursor = currentMentions.find(m => 
            selectionStart >= m.startIndex && selectionStart < m.endIndex
          )
          if (mentionAtCursor) {
            deleteMention(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
            return
          }
        } else {
          // Trường hợp: Đang chọn vùng text chứa mention - xóa cả mention
          const overlappedMentions = currentMentions.filter(m => 
            !(m.endIndex <= selectionStart || m.startIndex >= selectionEnd)
          )
          if (overlappedMentions.length > 0) {
            const mentionStart = Math.min(...overlappedMentions.map(m => m.startIndex))
            const mentionEnd = Math.max(...overlappedMentions.map(m => m.endIndex))
            deleteMention(mentionStart, mentionEnd)
            return
          }
        }
      }
    }

    // Các phím tắt khác giữ nguyên
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const handleCancel = () => {
    const hasChanges = content !== currentContent || 
                      JSON.stringify(medias) !== JSON.stringify(currentMedias)
    
    if (hasChanges && !loading) {
      if (!window.confirm('Are you sure you want to discard your changes?')) {
        return
      }
    }
    onClose()
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showEmojiPicker) {
        setShowEmojiPicker(false)
      }
    }

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

  if (!isOpen) return null

  const hasChanges = content !== currentContent || 
                    JSON.stringify(medias) !== JSON.stringify(currentMedias)

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl relative animate-in fade-in-90 zoom-in-90 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white select-none">
            Edit Comment
          </h2>
          <button 
            onClick={handleCancel} 
            className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-4 relative">
          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-4 text-sm resize-none min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Edit your comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              disabled={loading}
            />

            {showEmojiPicker && (
              <div className="absolute bottom-16 right-4 z-50">
                <EmojiPicker onSelect={handleAddEmoji} />
              </div>
            )}
          </div>

          {/* Media Preview */}
          {medias.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Attached Media ({medias.length})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {medias.map((media, idx) => {
                  const isImage = media.mediaUrl.includes('image') || 
                                 media.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                  const isVideo = media.mediaUrl.includes('video') || 
                                 media.mediaUrl.match(/\.(mp4|webm|ogg)$/i)

                  return (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                    >
                      {isImage ? (
                        <img
                          src={media.mediaUrl}
                          alt={`Media ${idx + 1}`}
                          className="w-full h-24 object-cover"
                        />
                      ) : isVideo ? (
                        <video
                          src={media.mediaUrl}
                          className="w-full h-24 object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <Image className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveMedia(idx)}
                        disabled={loading}
                        className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Mentions Info */}
          {mentions && mentions.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>📌 {mentions.length} mention{mentions.length > 1 ? 's' : ''} in this comment</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setShowEmojiPicker(v => !v)
              }}
              disabled={loading}
            >
              <Smile className="w-4 h-4" />
            </button>
            <span className={content.length > 450 ? 'text-orange-500' : ''}>
              {content.length}/500
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          <Button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !content.trim() || !hasChanges}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Update Comment
              </div>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}