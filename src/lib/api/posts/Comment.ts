import apiClient from "@/lib/services/ApiClient"
import type { Comment, CommentsResponse, CreateCommentRequest } from "@/lib/types/posts/CommentsDTO"

export const commentApi = {
  getCommentsByPost: async (
    postId: string, 
    limit?: number, 
    cursor?: string
  ): Promise<CommentsResponse> => {
    const params: Record<string, any> = {}
    
    if (limit) params.fetchSize = limit  
    if (cursor) params.pageState = cursor  
    
    const res = await apiClient.get(`/comments/post/${postId}`, { params })
    return res.data
  },

  createComment: async (data: CreateCommentRequest): Promise<Comment> => {
    const { postId, parentCommentId, content, mentions, files } = data

    if (!content?.trim() && (!files || files.length === 0)) {
      throw new Error("Comment cannot be empty")
    }

    try {
      // Send as JSON if no files, FormData if files present
      if (!files || files.length === 0) {
        const requestData: any = {
          postId: postId,
        }

        // Content là optional nhưng nên luôn gửi
        if (content) {
          requestData.content = content
        } else {
          requestData.content = "" // Gửi empty string thay vì undefined
        }

        // Chỉ gửi mentions khi có items
        if (mentions && mentions.length > 0) {
          requestData.mentions = mentions.map(mention => ({
            userId: mention.userId,
            startIndex: mention.startIndex,
            endIndex: mention.endIndex
          }))
        }
        
        if (parentCommentId) {
          requestData.parentCommentId = parentCommentId
        }
        
        const res = await apiClient.post('/comments', requestData, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        return res.data
      } else {
        // Use FormData for file uploads
        const formData = new FormData()
        formData.append('postId', postId)
        
        if (content) formData.append('content', content)
        if (parentCommentId) formData.append('parentCommentId', parentCommentId)
        
        files.forEach((file) => formData.append('mediaFiles', file))
        
        if (mentions && Array.isArray(mentions) && mentions.length > 0) {
          mentions.forEach((mention, index) => {
            formData.append(`mentions[${index}][userId]`, mention.userId)
            formData.append(`mentions[${index}][startIndex]`, mention.startIndex.toString())
            formData.append(`mentions[${index}][endIndex]`, mention.endIndex.toString())
          })
        }
        
        const res = await apiClient.post('/comments', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        
        return res.data
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to create comment"
      throw new Error(message)
    }
  },

  likeComment: async (commentId: string): Promise<{ likes: number; isLiked: boolean }> => {
    const res = await apiClient.post(`/comments/${commentId}/like`)
    return res.data
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`)
  }
}