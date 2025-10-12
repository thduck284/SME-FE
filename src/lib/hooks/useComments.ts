import { useState, useCallback } from 'react'
import { commentApi } from "@/lib/api/posts/Comment"
import type { Comment, CommentMention, CreateCommentRequest } from "@/lib/types/posts/CommentsDTO"

// Interface cho API response (có commentId thay vì id)
interface ApiComment {
  commentId: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string | null
  createdAt: string
  updatedAt: string
  parentCommentId?: string | null
  hasChilds: boolean
  likes?: number
  isLiked?: boolean
  postId: string
  mentions?: CommentMention[]
  medias?: any[]
}

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
    
    console.log('📡 Fetching comments from API:', { postId, limit, cursor })
    setIsLoading(true)
    try {
      const response = await commentApi.getCommentsByPost(postId, limit, cursor)
      console.log('📡 API Response:', {
        commentsCount: response.comments?.length || 0,
        comments: response.comments?.map(c => ({ id: c.id, content: c.content?.substring(0, 50) })) || [],
        hasMore: response.hasMore,
        nextCursor: response.nextCursor
      })
      
      setComments(prev => {
        // Map API response to Comment interface (commentId -> id)
        const mappedComments: Comment[] = (response.comments as unknown as ApiComment[]).map((comment: ApiComment) => ({
          id: comment.commentId,
          content: comment.content,
          authorId: comment.authorId,
          authorName: comment.authorName,
          authorAvatar: comment.authorAvatar || undefined,
          createdAt: comment.createdAt,
          likes: comment.likes || 0,
          isLiked: comment.isLiked || false,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId || undefined,
          mentions: comment.mentions || [],
          medias: comment.medias || []
        }))
        
        const newComments = cursor ? [...prev, ...mappedComments] : mappedComments
        console.log('📡 Setting comments:', {
          prevCount: prev.length,
          newCount: newComments.length,
          total: newComments.length
        })
        return newComments
      })
      
      setPagination({
        nextCursor: response.nextCursor,
        hasMore: response.hasMore
      })
    } catch (error) {
      console.error('❌ Error fetching comments:', error)
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
  const addComment = useCallback(async (content: string, mentions?: CommentMention[], files?: File[]) => {
    if (!content.trim() && (!files || files.length === 0)) {
      throw new Error('Comment cannot be empty')
    }

    if (!isValidPostId()) {
      throw new Error('Post ID is required and must be a valid string')
    }
    
    setIsAdding(true)
    try {
      const createData: CreateCommentRequest = {
        postId: postId,
        content: content.trim(),
        ...(mentions && mentions.length > 0 ? { mentions } : {}),
        ...(files && files.length > 0 ? { files } : {})
      }
      
      console.log('📤 Creating comment with data:', createData)
      
      const newComment = await commentApi.createComment(createData)
      
      // Đảm bảo comment mới có đầy đủ thông tin và map commentId -> id
      const enrichedComment: Comment = {
        id: (newComment as any).commentId || newComment.id,
        content: newComment.content || content.trim(),
        authorName: newComment.authorName || 'You',
        authorId: newComment.authorId || 'current-user',
        authorAvatar: newComment.authorAvatar || undefined,
        createdAt: newComment.createdAt || new Date().toISOString(),
        likes: newComment.likes || 0,
        isLiked: newComment.isLiked || false,
        postId: newComment.postId || postId,
        parentCommentId: newComment.parentCommentId || undefined,
        mentions: newComment.mentions || [],
        medias: newComment.medias || []
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