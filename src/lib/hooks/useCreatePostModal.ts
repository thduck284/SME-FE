import { useState, useRef, useCallback } from "react"
import { createPost } from "@/lib/api/posts/CreatePost"
import { useMention } from "./useMention"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"
import type { MentionData } from "@/lib/types/users/MentionDto"

export function useCreatePostModal(onClose: () => void, onPostCreated?: () => void, currentUserId?: string) {
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
    currentUserId: currentUserId || '',
    onMentionAdd: setMentions,
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
    handleMentionKeyDown(e)
  }, [handleMentionKeyDown])

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
      setContent("")
      setFiles([])
      setMentions([])
      onPostCreated?.()
      onClose()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [content, files, mentions, onClose, onPostCreated, type, visibility])

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