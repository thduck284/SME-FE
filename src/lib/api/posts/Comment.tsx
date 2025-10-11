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
    console.log('📤 Sending comment as JSON:', data)
    
    const requestData: any = {
      postId: data.postId,
    }

    // Content là optional nhưng nên luôn gửi
    if (data.content) {
      requestData.content = data.content
    } else {
      requestData.content = "" // Gửi empty string thay vì undefined
    }

    // Chỉ gửi mentions khi có items
    if (data.mentions && data.mentions.length > 0) {
      requestData.mentions = data.mentions.map(mention => ({
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      }))
    }
    // KHÔNG gửi mentions array rỗng
    
    console.log('📤 Final request data:', requestData)
    
    const res = await apiClient.post('/comments', requestData, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    return res.data
  },

  likeComment: async (commentId: string): Promise<{ likes: number; isLiked: boolean }> => {
    const res = await apiClient.post(`/comments/${commentId}/like`)
    return res.data
  },

  deleteComment: async (commentId: string): Promise<void> => {
    await apiClient.delete(`/comments/${commentId}`)
  }
}