import { useState, useCallback } from 'react'
import { commentApi } from "@/lib/api/posts/Comment"
import type { Comment, CommentMention, CreateCommentRequest } from "@/lib/types/posts/CommentsDTO"

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isLiking, setIsLiking] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    nextCursor?: string
    hasMore: boolean
  }>({ hasMore: false })

  const isValidPostId = useCallback(() => {
    return postId && typeof postId === 'string' && postId.trim().length > 0
  }, [postId])

  const fetchComments = useCallback(async (limit: number = 5, cursor?: string) => {
    if (!isValidPostId()) {
      throw new Error('Invalid post ID')
    }
    
    setIsLoading(true)
    try {
      const response = await commentApi.getCommentsByPost(postId, limit, cursor)
      
      const newComments = Array.isArray(response.comments) ? response.comments : []
      
      setComments(prev => cursor ? [...prev, ...newComments] : newComments)
      setPagination({
        nextCursor: response.nextCursor,
        hasMore: response.hasMore ?? false
      })
      
    } catch (error) {
      console.error('fetchComments error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [postId, isValidPostId])

  const loadMoreComments = useCallback(async () => {
    if (!pagination.hasMore || !pagination.nextCursor) {
      console.warn('No more comments to load')
      return
    }
    
    try {
      await fetchComments(5, pagination.nextCursor)
    } catch (error) {
      console.error('loadMoreComments error:', error)
      throw error
    }
  }, [pagination, fetchComments])

  const addComment = useCallback(async (content: string, mentions?: CommentMention[]) => {
    if (!content.trim()) {
      throw new Error('Comment content cannot be empty')
    }

    if (!isValidPostId()) {
      throw new Error('Post ID is required and must be a valid string')
    }
    
    setIsAdding(true)
    try {
      const createData: CreateCommentRequest = {
        postId: postId,
        content: content.trim(),
        ...(mentions && mentions.length > 0 ? { mentions } : {})
      }
      
      const newComment = await commentApi.createComment(createData)
      
      const enrichedComment: Comment = {
        ...newComment,
        content: newComment.content || content.trim(),
        authorName: newComment.authorName || 'You',
        authorId: newComment.authorId || 'current-user',
        createdAt: newComment.createdAt || new Date().toISOString(),
        likes: newComment.likes || 0,
        isLiked: newComment.isLiked || false,
        postId: newComment.postId || postId,
      }
      
      setComments(prev => [enrichedComment, ...prev])
      return enrichedComment
    } catch (error) {
      console.error('addComment error:', error)
      throw error
    } finally {
      setIsAdding(false)
    }
  }, [postId, isValidPostId])

  const toggleLikeComment = useCallback(async (commentId: string) => {
    if (isLiking === commentId) {
      console.warn('Already liking this comment')
      return
    }
    
    setIsLiking(commentId)
    try {
      const result = await commentApi.likeComment(commentId)
      
      setComments(prev => prev.map(comment => 
        comment.id === commentId 
          ? { 
              ...comment, 
              likes: result.likes,
              isLiked: result.isLiked
            }
          : comment
      ))
      
      return result
    } catch (error) {
      console.error('toggleLikeComment error:', error)
      throw error
    } finally {
      setIsLiking(null)
    }
  }, [isLiking])

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await commentApi.deleteComment(commentId)
      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (error) {
      console.error('deleteComment error:', error)
      throw error
    }
  }, [])

  const refreshComments = useCallback(() => {
    if (isValidPostId()) {
      fetchComments(5)
    }
  }, [fetchComments, isValidPostId])

  const clearComments = useCallback(() => {
    setComments([])
    setPagination({ hasMore: false })
  }, [])

  return {
    comments,
    isLoading,
    isAdding,
    isLiking,
    pagination,
    fetchComments,
    loadMoreComments,
    addComment,
    toggleLikeComment,
    deleteComment,
    refreshComments,
    clearComments
  }
}