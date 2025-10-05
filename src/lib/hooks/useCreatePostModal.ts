import { useState, useRef, useCallback } from "react"
import { createPost } from "@/lib/api/posts/CreatePost"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"

export function useCreatePostModal(onClose: () => void, onPostCreated?: () => void) {
  const [content, setContent] = useState("")
  const type: CreatePostDto["type"] = "ORIGINAL"
  const [visibility, setVisibility] = useState<CreatePostDto["visibility"]>("PUBLIC")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      await createPost({ content, type, visibility, files })
      setContent("")
      setFiles([])
      onPostCreated?.()
      onClose()
    } catch (err) {
      console.error(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [content, files, onClose, onPostCreated, type, visibility])

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
  }
}