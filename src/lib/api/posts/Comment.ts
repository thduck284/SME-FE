import { injectToken } from "@/lib/api/auth/Interceptor"
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
    
    const config = injectToken({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await fetch(`/comments/post/${postId}?${new URLSearchParams(params)}`, config)
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Get comments failed: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json()
  },

  createComment: async (data: CreateCommentRequest): Promise<Comment> => {
    const requestData: any = {
      postId: data.postId,
    }

    if (data.content) {
      requestData.content = data.content
    } else {
      requestData.content = ""
    }

    if (data.mentions && data.mentions.length > 0) {
      requestData.mentions = data.mentions
    }
    
    const config = injectToken({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })

    const res = await fetch('/comments', config)
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Create comment failed: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json()
  },

  likeComment: async (commentId: string): Promise<{ likes: number; isLiked: boolean }> => {
    const config = injectToken({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await fetch(`/comments/${commentId}/like`, config)
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Like comment failed: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json()
  },

  deleteComment: async (commentId: string): Promise<void> => {
    const config = injectToken({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await fetch(`/comments/${commentId}`, config)
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Delete comment failed: ${res.statusText} - ${errorText}`)
    }
  }
}