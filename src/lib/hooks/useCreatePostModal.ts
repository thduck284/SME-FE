import { useState, useRef, useCallback } from "react"
import { createPost } from "@/lib/api/posts/CreatePost"
import { useMention } from "./useMention"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"
import type { MentionData } from "@/lib/types/users/MentionDto"

export function useCreatePostModal(onClose: () => void, onPostCreated?: () => void) {
  const [content, setContent] = useState("")
  const type: CreatePostDto["type"] = "ORIGINAL"
  const [visibility, setVisibility] = useState<CreatePostDto["visibility"]>("PUBLIC")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [mentions, setMentions] = useState<MentionData[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    onMentionAdd: setMentions,
    currentText: content,
    onTextChange: (newText, cursorPosition) => {
      setContent(newText)
      // Update cursor position after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  })

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      const newFiles = Array.from(e.dataTransfer.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleAddEmoji = useCallback((emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((c) => c + emoji)
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
  }, [content])

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
    handleMentionTextChange(newContent, e.target.selectionStart)
  }, [handleMentionTextChange])

  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current || (e.currentTarget as HTMLTextAreaElement | null)
    if (!textarea) {
      handleMentionKeyDown(e)
      return
    }

    const selectionStart = textarea.selectionStart
    const selectionEnd = textarea.selectionEnd

    const expandDeletionToMentions = (deleteStart: number, deleteEnd: number) => {
      // If deletion overlaps any mention, expand to cover full mention(s)
      const overlapped = mentions.filter(m => !(m.endIndex <= deleteStart || m.startIndex >= deleteEnd))
      if (overlapped.length === 0) return { start: deleteStart, end: deleteEnd }
      const mentionStart = Math.min(...overlapped.map(m => m.startIndex))
      const mentionEnd = Math.max(...overlapped.map(m => m.endIndex))
      // Preserve user-selected range while ensuring full mentions are removed
      const start = Math.min(deleteStart, mentionStart)
      const end = Math.max(deleteEnd, mentionEnd)
      return { start, end }
    }

    const deleteRange = (start: number, end: number) => {
      const safeStart = Math.max(0, Math.min(start, content.length))
      const safeEnd = Math.max(safeStart, Math.min(end, content.length))
      const newText = content.slice(0, safeStart) + content.slice(safeEnd)
      const delta = safeEnd - safeStart

      // Update mentions: remove overlapped, shift those after
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
      setContent(newText)
      setMentions(updatedMentions)

      // Restore caret to start of deleted range
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(safeStart, safeStart)
        }
      }, 0)
    }

    // Handle Backspace/Delete to delete the entire mention block when inside it
    if (e.key === 'Backspace') {
      if (selectionStart === selectionEnd) {
        // Collapsed caret: prefer deleting mention at cursor if caret is at its start
        const mentionAtCursor = mentions.find(m => selectionStart >= m.startIndex && selectionStart < m.endIndex)
        if (mentionAtCursor) {
          deleteRange(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
          return
        }

        // Or if caret is after mention, deleting previous char inside mention
        const pos = selectionStart - 1
        if (pos >= 0) {
          const mentionLeft = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
          if (mentionLeft) {
            deleteRange(mentionLeft.startIndex, mentionLeft.endIndex)
            return
          }
        }
      } else {
        // Range selection: if overlaps mention(s), delete whole mention block(s)
        const { start, end } = expandDeletionToMentions(selectionStart, selectionEnd)
        if (start !== selectionStart || end !== selectionEnd) {
          deleteRange(start, end)
          return
        }
      }
    }

    if (e.key === 'Delete') {
      if (selectionStart === selectionEnd) {
        // Collapsed caret: deleting next char
        const pos = selectionStart
        const mention = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
        if (mention) {
          deleteRange(mention.startIndex, mention.endIndex)
          return
        }
      } else {
        // Range selection: if overlaps mention(s), delete whole mention block(s)
        const { start, end } = expandDeletionToMentions(selectionStart, selectionEnd)
        if (start !== selectionStart || end !== selectionEnd) {
          deleteRange(start, end)
          return
        }
      }
    }

    // Fallback to mention navigation/selection behavior
    handleMentionKeyDown(e)
  }, [content, mentions, handleMentionKeyDown])

  const resetForm = useCallback(() => {
    setContent("")
    setFiles([])
    setMentions([])
  }, [])

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      const mentionData = mentions.map(mention => ({
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      }))
      
      await createPost({ 
        content, 
        type, 
        visibility, 
        files, 
        mentions: mentionData.length > 0 ? mentionData : undefined 
      })
      resetForm()
      onPostCreated?.()
      onClose()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [content, files, mentions, onClose, onPostCreated, type, visibility, resetForm])

  return {
    content,
    setContent,
    type,
    visibility,
    setVisibility,
    files,
    setFiles,
    loading,
    
    isDragging,
    showEmojiPicker,
    setShowEmojiPicker,
    
    fileInputRef,
    textareaRef,
    
    handleFileChange,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    handleAddEmoji,
    
    handleSubmit,
    resetForm,
    
    mentions,
    mentionUsers,
    isMentionLoading,
    showMentionDropdown,
    mentionSelectedIndex,
    handleContentChange,
    handleTextareaKeyDown,
    selectMentionUser,
    closeMentionDropdown,
  }
}