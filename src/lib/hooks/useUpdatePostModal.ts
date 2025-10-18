import type React from "react"
import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { updatePost } from "@/lib/api/posts/UpdatePost"
import { useMention } from "./useMention"
import type { MentionData } from "@/lib/types/users/MentionDto"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export function useUpdatePostModal(post: PostFullDto | null, onClose: () => void, onPostUpdated?: () => void) {
  const [postData, setPostData] = useState<PostFullDto | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [removedMediaIds, setRemovedMediaIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (post && post.postId !== postData?.postId) {
      setPostData(post)
      setFiles([])
      setRemovedMediaIds([])
    }
  }, [post, postData?.postId])

  const existingMedias = useMemo(() => {
    if (!postData?.medias) return []
    return postData.medias.filter((m) => !removedMediaIds.includes(m.mediaId))
  }, [postData?.medias, removedMediaIds])

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
    onMentionAdd: (newMentions: MentionData[]) => {
      setPostData((prev) => (prev ? { ...prev, mentions: newMentions } : null))
    },
    currentText: postData?.content || "",
    initialMentions:
      postData?.mentions && postData?.content
        ? postData.mentions.map((m) => ({
            userId: m.userId,
            startIndex: m.startIndex,
            endIndex: m.endIndex,
            displayName: (m as any).displayName || postData.content!.slice(m.startIndex, m.endIndex),
          }))
        : [],
    onTextChange: (newText: string, cursorPosition: number) => {
      setPostData((prev) => (prev ? { ...prev, content: newText } : null))
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    },
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

  const handleRemoveExistingMedia = useCallback((mediaId: string) => {
    setRemovedMediaIds((prev) => [...prev, mediaId])
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

  const handleAddEmoji = useCallback(
    (emoji: string) => {
      const textarea = textareaRef.current
      if (!textarea || !postData) {
        setPostData((prev) => (prev ? { ...prev, content: (prev.content || "") + emoji } : null))
        return
      }
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const content = postData.content || ""
      const newText = content.slice(0, start) + emoji + content.slice(end)
      setPostData((prev) => (prev ? { ...prev, content: newText } : null))
      setTimeout(() => {
        textarea.focus()
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
      }, 0)
    },
    [postData],
  )

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value
      setPostData((prev) => (prev ? { ...prev, content: newContent } : null))
      handleMentionTextChange(newContent, e.target.selectionStart)
    },
    [handleMentionTextChange],
  )

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!postData) return
      
      const textarea = textareaRef.current || (e.currentTarget as HTMLTextAreaElement | null)
      if (!textarea) {
        handleMentionKeyDown(e)
        return
      }

      const selectionStart = textarea.selectionStart
      const selectionEnd = textarea.selectionEnd
      const content = postData.content || ""
      const mentions = postData.mentions || []

      // Hàm xử lý xóa mention
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
        setPostData((prev) => prev ? { ...prev, content: newText, mentions: updatedMentions } : null)

        // Restore caret to start of deleted range
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.setSelectionRange(safeStart, safeStart)
          }
        }, 0)
      }

      // Handle Backspace để xóa cả mention
      if (e.key === 'Backspace') {
        if (selectionStart === selectionEnd) {
          // Trường hợp 1: Con trỏ ở trong mention - xóa cả mention
          const mentionAtCursor = mentions.find(m => selectionStart > m.startIndex && selectionStart <= m.endIndex)
          if (mentionAtCursor) {
            deleteRange(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
            return
          }

          // Trường hợp 2: Con trỏ ngay sau mention - xóa cả mention
          const pos = selectionStart - 1
          if (pos >= 0) {
            const mentionLeft = mentions.find(m => pos >= m.startIndex && pos < m.endIndex)
            if (mentionLeft) {
              deleteRange(mentionLeft.startIndex, mentionLeft.endIndex)
              return
            }
          }
        } else {
          // Trường hợp 3: Đang chọn vùng text chứa mention - xóa cả mention
          const overlappedMentions = mentions.filter(m => 
            !(m.endIndex <= selectionStart || m.startIndex >= selectionEnd)
          )
          if (overlappedMentions.length > 0) {
            const mentionStart = Math.min(...overlappedMentions.map(m => m.startIndex))
            const mentionEnd = Math.max(...overlappedMentions.map(m => m.endIndex))
            deleteRange(mentionStart, mentionEnd)
            return
          }
        }
      }
      
      if (e.key === 'Delete') {
        if (selectionStart === selectionEnd) {
          // Trường hợp: Con trỏ ở trước mention - xóa cả mention
          const mentionAtCursor = mentions.find(m => selectionStart >= m.startIndex && selectionStart < m.endIndex)
          if (mentionAtCursor) {
            deleteRange(mentionAtCursor.startIndex, mentionAtCursor.endIndex)
            return
          }
        } else {
          // Trường hợp: Đang chọn vùng text chứa mention - xóa cả mention
          const overlappedMentions = mentions.filter(m => 
            !(m.endIndex <= selectionStart || m.startIndex >= selectionEnd)
          )
          if (overlappedMentions.length > 0) {
            const mentionStart = Math.min(...overlappedMentions.map(m => m.startIndex))
            const mentionEnd = Math.max(...overlappedMentions.map(m => m.endIndex))
            deleteRange(mentionStart, mentionEnd)
            return
          }
        }
      }
      handleMentionKeyDown(e)
    },
    [postData, handleMentionKeyDown],
  )

  const handleSubmit = useCallback(async () => {
    if (!postData) return

    setLoading(true)
    try {
      const content = postData.content || ""
      const mentions = postData.mentions || []

      const validMentions = mentions.filter((m) => {
        const isValid = m.startIndex >= 0 && m.endIndex > m.startIndex && m.endIndex <= content.length && m.userId
        return isValid
      }) as any[]

      const payload = {
        content,
        visibility: postData.visibility,
        files: files.length > 0 ? files : undefined,
        existingMedias: existingMedias.length > 0 ? existingMedias : undefined,
        removedMediaIds: removedMediaIds.length > 0 ? removedMediaIds : undefined,
        mentions: validMentions,
      }

      await updatePost(postData.postId, payload)
      onPostUpdated?.()
      onClose()
    } catch (err) {
      console.error("Error updating post:", err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [postData, files, removedMediaIds, existingMedias, onClose, onPostUpdated])

  const setVisibility = useCallback((visibility: string) => {
    setPostData((prev) => (prev ? { ...prev, visibility } : null))
  }, [])

  if (!postData) {
    return {
      content: "",
      visibility: "PUBLIC",
      files: [],
      existingMedias: [],
      loading: false,
      isDragging: false,
      showEmojiPicker: false,
      setShowEmojiPicker,
      fileInputRef,
      textareaRef,
      handleFileChange,
      handleRemoveFile,
      handleRemoveExistingMedia,
      handleDragOver,
      handleDragLeave,
      handleDrop,
      handleAddEmoji,
      handleSubmit: async () => {},
      mentions: [],
      mentionUsers,
      isMentionLoading,
      showMentionDropdown,
      mentionSelectedIndex,
      handleContentChange: () => {},
      handleTextareaKeyDown: () => {},
      selectMentionUser,
      closeMentionDropdown,
      setVisibility: () => {},
    }
  }

  return {
    content: postData.content || "",
    visibility: postData.visibility,
    files,
    existingMedias,
    loading,
    isDragging,
    showEmojiPicker,
    setShowEmojiPicker,
    fileInputRef,
    textareaRef,
    handleFileChange,
    handleRemoveFile,
    handleRemoveExistingMedia,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleAddEmoji,
    handleSubmit,
    mentions: postData.mentions || [],
    mentionUsers,
    isMentionLoading,
    showMentionDropdown,
    mentionSelectedIndex,
    handleContentChange,
    handleTextareaKeyDown,
    selectMentionUser,
    closeMentionDropdown,
    setVisibility,
  }
}