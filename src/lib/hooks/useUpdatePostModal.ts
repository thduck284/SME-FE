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
        mentions: validMentions.length > 0 ? validMentions : undefined,
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