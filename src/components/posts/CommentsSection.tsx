"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useComments } from "@/lib/hooks/useComments"
import { useMention } from "@/lib/hooks/useMention"
import { UserService } from "@/lib/api/users/UserService"
import { getReplies } from "@/lib/api/posts/GetReplies"
import type { Comment as CommentType, CommentMention } from "@/lib/types/posts/CommentsDTO"
import type { UserMetadata } from "@/lib/types/User"
import type { MentionData } from "@/lib/types/users/MentionDto"
import { CommentsList } from "./CommentsList"
import { CommentInput } from "./CommentInput"
import { ErrorMessage } from "../ui/ErrorMessage"

interface CommentsSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
  onCommentSuccess?: () => void
}

export function CommentsSection({ postId, isOpen, currentUserId, onCommentSuccess }: CommentsSectionProps) {
  const navigate = useNavigate()
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [optimisticComments, setOptimisticComments] = useState<CommentType[]>([])
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())
  const [files, setFiles] = useState<File[]>([])
  const [editingComment, setEditingComment] = useState<CommentType | null>(null)
  const [replyingTo, setReplyingTo] = useState<CommentType | null>(null)
  const [replies, setReplies] = useState<Map<string, CommentType[]>>(new Map()) // parentCommentId -> replies
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set()) // commentIds that are expanded
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set()) // commentIds currently loading replies
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    mentions,
    setMentions,
  } = useMention({
    onMentionAdd: () => {},
    currentText: comment,
    onTextChange: (newText, cursorPosition) => {
      setComment(newText)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(cursorPosition, cursorPosition)
        }
      }, 0)
    }
  })
  
  const {
    comments,
    isLoading,
    isAdding,
    isLiking,
    isEditing,
    isDeleting,
    fetchComments,
    addComment,
    editComment,
    toggleLikeComment,
    deleteComment
  } = useComments(postId)

  // Combine comments from API and optimistic updates
  const displayComments = useMemo(() => {
    const allComments = [...comments]
    
    optimisticComments.forEach(optimisticComment => {
      const exists = allComments.find(c => c.id === optimisticComment.id)
      if (!exists) {
        allComments.push(optimisticComment)
      }
    })
    
    const validComments = allComments.filter(Boolean)
    const sortedComments = validComments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return sortedComments
  }, [optimisticComments, comments])

  // Fetch comments when section opens
  useEffect(() => {
    if (isOpen && postId) {
      setError(null)
      setOptimisticComments([])
      // Reset replies state when postId changes
      setReplies(new Map())
      setExpandedComments(new Set())
      setLoadingReplies(new Set())
      fetchComments(10)
    }
  }, [isOpen, postId])

  // Fetch user metadata for comments with debouncing
  useEffect(() => {
    const fetchUserMetadata = async () => {
      const commentsToFetch = displayComments
        .filter(comment => comment && !userCache.has(comment.authorId))
        .filter(comment => comment.authorId && comment.authorId !== 'current-user')
        .slice(0, 5)

      if (commentsToFetch.length === 0) return

      const batchSize = 3
      for (let i = 0; i < commentsToFetch.length; i += batchSize) {
        const batch = commentsToFetch.slice(i, i + batchSize)
        
        const userPromises = batch.map(async (comment) => {
          try {
            const userMetadata = await UserService.getUserMetadata(comment.authorId)
            return { authorId: comment.authorId, userMetadata }
          } catch (error) {
            console.error(`Failed to fetch user metadata ${comment.authorId}:`, error)
            return null
          }
        })

        const results = await Promise.all(userPromises)
        const newCache = new Map(userCache)
        
        results.forEach(result => {
          if (result?.userMetadata) {
            newCache.set(result.authorId, result.userMetadata)
          }
        })
        
        setUserCache(newCache)
        
        if (i + batchSize < commentsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (displayComments.length > 0) {
        fetchUserMetadata()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [displayComments.length])

  // Helper functions with memoization
  const getUserFromCache = useCallback((authorId: string): UserMetadata | undefined => 
    userCache.get(authorId), [userCache])

  const isTempComment = useCallback((comment: CommentType): boolean => 
    comment?.id?.startsWith?.('temp-') || false, [])

  // File upload handlers
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const getDisplayInfo = useCallback((comment: CommentType) => {
    if (comment.authorId === 'current-user') {
      return {
        displayName: 'You',
        avatarUrl: comment.authorAvatar || "/assets/images/default.png",
        fullName: 'You'
      }
    }

    const userMetadata = getUserFromCache(comment.authorId)
    const displayName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 'Loading...'
    const avatarUrl = userMetadata?.avtUrl || comment.authorAvatar || "/assets/images/default.png"
    const fullName = userMetadata ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim() : 'Loading...'

    return { displayName, avatarUrl, fullName }
  }, [getUserFromCache])

  // Convert MentionData to CommentMention
  const convertToCommentMentions = useCallback((mentionsData: MentionData[]): CommentMention[] => {
    return mentionsData.map(mention => ({
      userId: mention.userId,
      startIndex: mention.startIndex,
      endIndex: mention.endIndex
    }))
  }, [])

  // Memoized comment submission handler
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim() && files.length === 0) {
      setError('Comment cannot be empty')
      return
    }
    
    setError(null)

    // If editing existing comment
    if (editingComment) {
      try {
        const commentMentions = convertToCommentMentions(mentions)
        
        await editComment(editingComment.id, comment, commentMentions, files)
        setEditingComment(null)
        setComment("")
        setFiles([])
        setMentions([])
        
        // Call callback to refresh stats
        onCommentSuccess?.()
        
      } catch (error: any) {
        console.error('Failed to edit comment:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Failed to edit comment'
        setError(errorMessage)
      }
      return
    }

    // If adding new comment
    const tempComment: CommentType = {
      id: `temp-${Date.now()}`,
      content: comment,
      authorId: currentUserId || 'current-user',
      authorName: '',
      authorAvatar: undefined,
      createdAt: new Date().toISOString(),
      likes: 0,
      isLiked: false,
      postId,
      hasChilds: false,
      // Add reply info if replying
      ...(replyingTo && { 
        parentCommentId: replyingTo.id,
        replyingTo: {
          id: replyingTo.id,
          authorId: replyingTo.authorId,
          authorName: replyingTo.authorName || ''
        }
      })
    }

    setOptimisticComments(prev => [tempComment, ...prev])
    const currentComment = comment
    const currentFiles = [...files]
    setComment("")
    setFiles([])
    setReplyingTo(null)

    try {
      const commentMentions = convertToCommentMentions(mentions)
      
      // Pass parentCommentId if replying
      const parentCommentId = replyingTo ? replyingTo.id : undefined
      await addComment(currentComment, commentMentions, currentFiles, parentCommentId)
      setMentions([])
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      await fetchComments(10)
      
      // Call callback to refresh stats
      onCommentSuccess?.()
      
    } catch (error: any) {
      console.error('Failed to submit comment:', error)
      
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      setComment(currentComment)
      setFiles(currentFiles)
      setReplyingTo(null)
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to post comment'
      setError(errorMessage)
    }
  }, [comment, files, currentUserId, postId, addComment, fetchComments, mentions, editingComment, editComment, convertToCommentMentions, replyingTo])

  // Other comment handlers with memoization
  const handleLikeComment = useCallback(async (commentId: string) => {
    try {
      await toggleLikeComment(commentId)
    } catch (error) {
      console.error('Failed to like comment:', error)
      setError('Failed to like comment')
    }
  }, [toggleLikeComment])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!commentId || commentId === 'undefined') {
      console.error('Invalid comment ID:', commentId)
      setError('Invalid comment ID')
      return
    }
    
    if (!confirm("Are you sure you want to delete this comment?")) return
    
    try {
      if (commentId?.startsWith('temp-')) {
        setOptimisticComments(prev => prev.filter(c => c.id !== commentId))
      }
      await deleteComment(commentId)
      
      // Also remove from replies if it's a reply
      setReplies(prev => {
        const newMap = new Map(prev)
        for (const [parentId, replyList] of newMap.entries()) {
          const filteredReplies = replyList.filter(reply => reply.id !== commentId)
          if (filteredReplies.length !== replyList.length) {
            newMap.set(parentId, filteredReplies)
          }
        }
        return newMap
      })
    } catch (error) {
      console.error('Failed to delete comment:', error)
      setError('Failed to delete comment')
    }
  }, [deleteComment])

  const handleEditComment = useCallback((comment: CommentType) => {
    setEditingComment(comment)
    setComment(comment.content)
    // Set mentions if needed
    if (comment.mentions) {
      // Convert CommentMention to MentionData
      const mentionData: MentionData[] = comment.mentions.map(mention => ({
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex,
        displayName: '' // Add default displayName
      }))
      setMentions(mentionData)
    }
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingComment(null)
    setComment("")
    setFiles([])
    setMentions([])
  }, [])

  const handleReply = useCallback((comment: CommentType) => {
    setReplyingTo(comment)
    
    // Get display name using the same logic as getDisplayInfo
    const { displayName } = getDisplayInfo(comment)
    
    // Pre-fill comment with mention
    const mentionText = `@${displayName} `
    setComment(mentionText)
    setFiles([])
    setMentions([])
    
    // Focus input after state update
    setTimeout(() => {
      inputRef.current?.focus()
      // Set cursor position after the mention
      if (inputRef.current) {
        inputRef.current.setSelectionRange(mentionText.length, mentionText.length)
      }
    }, 100)
  }, [getDisplayInfo])

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
    setComment("")
    setFiles([])
    setMentions([])
  }, [])

  const loadReplies = useCallback(async (parentCommentId: string) => {
    if (loadingReplies.has(parentCommentId) || replies.has(parentCommentId)) {
      return // Already loading or loaded
    }

    setLoadingReplies(prev => new Set(prev).add(parentCommentId))
    
    try {
      const response = await getReplies(parentCommentId, 10)
      const newReplies = response.replies || []
      
      setReplies(prev => {
        const newMap = new Map(prev)
        newMap.set(parentCommentId, newReplies)
        return newMap
      })
      
      // Fetch user metadata for replies
      const repliesToFetch = newReplies
        .filter(reply => reply && !userCache.has(reply.authorId))
        .filter(reply => reply.authorId && reply.authorId !== 'current-user')
        .slice(0, 5)

      if (repliesToFetch.length > 0) {
        const userPromises = repliesToFetch.map(async (reply) => {
          try {
            const userMetadata = await UserService.getUserMetadata(reply.authorId)
            return { authorId: reply.authorId, userMetadata }
          } catch (error) {
            console.error(`Failed to fetch user metadata ${reply.authorId}:`, error)
            return null
          }
        })

        const results = await Promise.all(userPromises)
        const newCache = new Map(userCache)
        
        results.forEach(result => {
          if (result?.userMetadata) {
            newCache.set(result.authorId, result.userMetadata)
          }
        })
        
        setUserCache(newCache)
      }
      
    } catch (error) {
      console.error('Failed to load replies:', error)
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev)
        newSet.delete(parentCommentId)
        return newSet
      })
    }
  }, [loadingReplies, replies, userCache])

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
        loadReplies(commentId)
      }
      return newSet
    })
  }, [loadReplies])

  if (!isOpen) return null

  return (
    <div className="border-t border-border/50 bg-muted/30">
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <CommentsList
        comments={displayComments}
        isLoading={isLoading}
        isLiking={isLiking}
        isEditing={isEditing}
        isDeleting={isDeleting}
        currentUserId={currentUserId}
        onLike={handleLikeComment}
        onDelete={handleDeleteComment}
        onEdit={handleEditComment}
        onReply={handleReply}
        onMentionClick={navigate}
        getDisplayInfo={getDisplayInfo}
        isTempComment={isTempComment}
        replies={replies}
        expandedComments={expandedComments}
        loadingReplies={loadingReplies}
        onToggleReplies={toggleReplies}
      />

      <CommentInput
        comment={comment}
        isAdding={isAdding}
        isEditing={isEditing}
        editingComment={editingComment}
        replyingTo={replyingTo}
        onChange={setComment}
        onClearError={() => setError(null)}
        onSubmit={handleSubmitComment}
        onCancelEdit={handleCancelEdit}
        onCancelReply={handleCancelReply}
        getDisplayInfo={getDisplayInfo}
        mentionUsers={mentionUsers}
        isMentionLoading={isMentionLoading}
        showMentionDropdown={showMentionDropdown}
        mentionSelectedIndex={mentionSelectedIndex}
        onMentionTextChange={handleMentionTextChange}
        onMentionKeyDown={handleMentionKeyDown}
        onSelectMentionUser={selectMentionUser}
        onCloseMentionDropdown={closeMentionDropdown}
        inputRef={inputRef}
        mentions={mentions}
        setMentions={setMentions}
        files={files}
        onFileChange={handleFileChange}
        onRemoveFile={handleRemoveFile}
        fileInputRef={fileInputRef}
      />
    </div>
  )
}