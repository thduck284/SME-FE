"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useComments } from "@/lib/hooks/useComments"
import { useMention } from "@/lib/hooks/useMention"
import { useCommentsReactions } from "@/lib/hooks/useCommentReaction"
import { UserService } from "@/lib/api/users/UserService"
import { getReplies } from "@/lib/api/posts/GetReplies"
import type { CommentWithReactions, CommentMention } from "@/lib/types/posts/CommentsDTO"
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
  const [optimisticComments, setOptimisticComments] = useState<CommentWithReactions[]>([])
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())
  const [files, setFiles] = useState<File[]>([])
  const [editingComment, setEditingComment] = useState<CommentWithReactions | null>(null)
  const [replyingTo, setReplyingTo] = useState<CommentWithReactions | null>(null)
  const [replies, setReplies] = useState<Map<string, CommentWithReactions[]>>(new Map())
  const [expandedComments, setExpandedComments] = useState<Map<string, boolean>>(new Map())
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set())
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

  // Comment reactions hook
  const commentIds = useMemo(() => {
    const rootCommentIds = [...comments, ...optimisticComments]
      .filter(comment => comment && comment.id && !comment.id.startsWith('temp-'))
      .map(comment => comment.id)

    const allReplies = Array.from(replies.values()).flat()
    const replyIds = allReplies
      .filter(reply => reply && reply.id && !reply.id.startsWith('temp-'))
      .map(reply => reply.id)

    const allCommentIds = [...rootCommentIds, ...replyIds]
    
    return [...new Set(allCommentIds)]
  }, [comments, optimisticComments, replies])

  const {
    reactions: commentReactions,
    react: reactToComment,
    removeReaction: removeCommentReaction,
    loading: reactionsLoading
  } = useCommentsReactions(commentIds)

  // Combine comments from API and optimistic updates với reaction data
  const displayComments = useMemo(() => {
    const allComments = [...comments]
    
    optimisticComments.forEach(optimisticComment => {
      const exists = allComments.find(c => c.id === optimisticComment.id)
      if (!exists) {
        allComments.push(optimisticComment)
      }
    })
    
    const validComments = allComments.filter(Boolean)
    
    // Merge reaction data vào comments
    const commentsWithReactions = validComments.map(comment => {
      const reactionData = commentReactions[comment.id]
      return {
        ...comment,
        userReaction: reactionData?.userReaction || null,
        reactionCounters: reactionData?.counters || {},
        totalReactions: Object.values(reactionData?.counters || {}).reduce((sum, count) => sum + count, 0),
        likes: comment.likes || 0,
        isLiked: comment.isLiked || false
      }
    })
    
    const sortedComments = commentsWithReactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return sortedComments
  }, [optimisticComments, comments, commentReactions])

  // Fetch comments when section opens
  useEffect(() => {
    if (isOpen && postId) {
      setError(null)
      setOptimisticComments([])
      setReplies(new Map())
      setExpandedComments(new Map())
      setLoadingReplies(new Set())
      fetchComments(10)
    }
  }, [isOpen, postId])

  // Fetch user metadata for comments và replies
  useEffect(() => {
    const fetchUserMetadata = async () => {
      const allCommentsToFetch = [
        ...displayComments,
        ...Array.from(replies.values()).flat()
      ]
        .filter(comment => comment && !userCache.has(comment.authorId))
        .filter(comment => comment.authorId && comment.authorId !== 'current-user')

      if (allCommentsToFetch.length === 0) return

      const batchSize = 3
      for (let i = 0; i < allCommentsToFetch.length; i += batchSize) {
        const batch = allCommentsToFetch.slice(i, i + batchSize)
        
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
        
        if (i + batchSize < allCommentsToFetch.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    }

    const timeoutId = setTimeout(() => {
      if (displayComments.length > 0 || replies.size > 0) {
        fetchUserMetadata()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [displayComments.length, replies.size, userCache])

  // Helper functions
  const getUserFromCache = useCallback((authorId: string): UserMetadata | undefined => 
    userCache.get(authorId), [userCache])

  const isTempComment = useCallback((comment: CommentWithReactions): boolean => 
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

  const getDisplayInfo = useCallback((comment: CommentWithReactions) => {
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

  // Comment reaction handlers
  const handleReactToComment = useCallback(async (commentId: string, reactionType: string) => {
    try {
      await reactToComment(commentId, reactionType)
      await fetchComments(10)
    } catch (error) {
      console.error('Failed to react to comment:', error)
      setError('Failed to react to comment')
    }
  }, [reactToComment, fetchComments])

  const handleRemoveCommentReaction = useCallback(async (commentId: string) => {
    try {
      await removeCommentReaction(commentId)
      await fetchComments(10)
    } catch (error) {
      console.error('Failed to remove comment reaction:', error)
      setError('Failed to remove reaction')
    }
  }, [removeCommentReaction, fetchComments])

  // Comment submission handler
  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim() && files.length === 0) {
      setError('Comment cannot be empty')
      return
    }
    
    setError(null)

    if (editingComment) {
      try {
        const commentMentions = convertToCommentMentions(mentions)
        await editComment(editingComment.id, comment, commentMentions, files)
        setEditingComment(null)
        setComment("")
        setFiles([])
        setMentions([])
        onCommentSuccess?.()
      } catch (error: any) {
        console.error('Failed to edit comment:', error)
        const errorMessage = error.response?.data?.message || error.message || 'Failed to edit comment'
        setError(errorMessage)
      }
      return
    }

    const tempComment: CommentWithReactions = {
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
      userReaction: null,
      reactionCounters: {},
      totalReactions: 0,
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
      const parentCommentId = replyingTo ? replyingTo.id : undefined
      await addComment(currentComment, commentMentions, currentFiles, parentCommentId)
      setMentions([])
      setOptimisticComments(prev => prev.filter(c => c.id !== tempComment.id))
      await fetchComments(10)
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
  }, [comment, files, currentUserId, postId, addComment, fetchComments, mentions, editingComment, editComment, convertToCommentMentions, replyingTo, onCommentSuccess])

  // Other comment handlers
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
      
      setReplies(prev => {
        const newMap = new Map(prev)
        for (const [parentId, replyList] of newMap.entries()) {
          const filteredReplies = replyList.filter(reply => reply.id !== commentId)
          newMap.set(parentId, filteredReplies)
        }
        return newMap
      })
    } catch (error) {
      console.error('Failed to delete comment:', error)
      setError('Failed to delete comment')
    }
  }, [deleteComment])

  const handleEditComment = useCallback((comment: CommentWithReactions) => {
    setEditingComment(comment)
    setComment(comment.content)
    if (comment.mentions) {
      const mentionData: MentionData[] = comment.mentions.map(mention => ({
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex,
        displayName: ''
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

  const handleReply = useCallback((comment: CommentWithReactions) => {
    setReplyingTo(comment)
    const { displayName } = getDisplayInfo(comment)
    const mentionText = `@${displayName} `
    setComment(mentionText)
    setFiles([])
    setMentions([])
    
    setTimeout(() => {
      inputRef.current?.focus()
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

  // FIXED: Load replies cho tất cả các cấp comment
  const loadReplies = useCallback(async (parentCommentId: string) => {
    if (loadingReplies.has(parentCommentId)) {
      return
    }

    console.log('Loading replies for comment:', parentCommentId)
    setLoadingReplies(prev => new Set(prev).add(parentCommentId))
    
    try {
      const response = await getReplies(parentCommentId, 50)
      const newReplies = response.replies || []
      
      console.log('Loaded replies for:', parentCommentId, 'count:', newReplies.length)
      
      setReplies(prev => {
        const newMap = new Map(prev)
        newMap.set(parentCommentId, newReplies)
        return newMap
      })

      // Tự động set expanded thành true sau khi load replies
      setExpandedComments(prev => {
        const newMap = new Map(prev)
        newMap.set(parentCommentId, true)
        return newMap
      })
      
      // Fetch user metadata cho replies mới
      const repliesToFetch = newReplies
        .filter(reply => reply && !userCache.has(reply.authorId))
        .filter(reply => reply.authorId && reply.authorId !== 'current-user')

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
      setError('Failed to load replies')
    } finally {
      setLoadingReplies(prev => {
        const newSet = new Set(prev)
        newSet.delete(parentCommentId)
        return newSet
      })
    }
  }, [loadingReplies, userCache])

  // FIXED: Sửa hàm toggleReplies để hỗ trợ tất cả các cấp
  const toggleReplies = useCallback((commentId: string) => {
    console.log('Toggle replies for comment:', commentId)
    
    setExpandedComments(prev => {
      const newMap = new Map(prev)
      const isCurrentlyExpanded = newMap.get(commentId) || false
      
      if (isCurrentlyExpanded) {
        newMap.set(commentId, false)
        console.log('Hiding replies for:', commentId)
      } else {
        newMap.set(commentId, true)
        console.log('Showing replies for:', commentId)
        // QUAN TRỌNG: Gọi loadReplies cho tất cả các cấp
        loadReplies(commentId)
      }
      return newMap
    })
  }, [loadReplies])

  // FIXED: Tạo displayReplies với reaction data và hỗ trợ nested replies
  const displayReplies = useMemo(() => {
    const newRepliesMap = new Map<string, CommentWithReactions[]>()
    
    // Tạo map với tất cả replies
    for (const [parentId, replyList] of replies.entries()) {
      const repliesWithReactions = replyList.map(reply => {
        const reactionData = commentReactions[reply.id]
        return {
          ...reply,
          userReaction: reactionData?.userReaction || null,
          reactionCounters: reactionData?.counters || {},
          totalReactions: Object.values(reactionData?.counters || {}).reduce((sum, count) => sum + count, 0),
          likes: reply.likes || 0,
          isLiked: reply.isLiked || false
        }
      })
      newRepliesMap.set(parentId, repliesWithReactions)
    }
    
    return newRepliesMap
  }, [replies, commentReactions])

  if (!isOpen) return null

  return (
    <div className="border-t border-border/50 bg-muted/30">
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <CommentsList
        comments={displayComments}
        isLoading={isLoading || reactionsLoading}
        isLiking={isLiking}
        isEditing={isEditing}
        isDeleting={isDeleting}
        currentUserId={currentUserId}
        onLike={handleLikeComment}
        onDelete={handleDeleteComment}
        onEdit={handleEditComment}
        onReply={handleReply}
        onReact={handleReactToComment}
        onRemoveReaction={handleRemoveCommentReaction}
        onMentionClick={navigate}
        getDisplayInfo={getDisplayInfo}
        isTempComment={isTempComment}
        replies={displayReplies}
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