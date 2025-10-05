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

  // Validate postId
  const isValidPostId = useCallback(() => {
    return postId && typeof postId === 'string' && postId.trim().length > 0
  }, [postId])

  // Lấy comments từ API
  const fetchComments = useCallback(async (limit?: number, cursor?: string) => {
    if (!isValidPostId()) {
      throw new Error('Invalid post ID')
    }
    
    setIsLoading(true)
    try {
      const response = await commentApi.getCommentsByPost(postId, limit, cursor)
      setComments(prev => cursor ? [...prev, ...response.comments] : response.comments)
      setPagination({
        nextCursor: response.nextCursor,
        hasMore: response.hasMore
      })
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [postId, isValidPostId])

  // Load more comments
  const loadMoreComments = useCallback(async () => {
    if (!pagination.hasMore || !pagination.nextCursor) return
    await fetchComments(10, pagination.nextCursor)
  }, [pagination, fetchComments])

  // Thêm comment mới - ĐẢM BẢO CONTENT LUÔN CÓ GIÁ TRỊ
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
      
      // Đảm bảo comment mới có đầy đủ thông tin
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
      throw error
    } finally {
      setIsAdding(false)
    }
  }, [postId, isValidPostId])

  // Like/unlike comment
  const toggleLikeComment = useCallback(async (commentId: string) => {
    if (isLiking) return
    
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
      throw error
    } finally {
      setIsLiking(null)
    }
  }, [isLiking])

  // Xóa comment
  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await commentApi.deleteComment(commentId)
      setComments(prev => prev.filter(comment => comment.id !== commentId))
    } catch (error) {
      throw error
    }
  }, [])

  // Refresh comments
  const refreshComments = useCallback(() => {
    if (isValidPostId()) {
      fetchComments(10)
    }
  }, [fetchComments, isValidPostId])

  // Clear comments
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