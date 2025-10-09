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

    const res = await fetch(`/comments/post/${postId}?${new URLSearchParams(params)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
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

    const res = await fetch('/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Create comment failed: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json()
  },

  likeComment: async (commentId: string): Promise<{ likes: number; isLiked: boolean }> => {
    const res = await fetch(`/comments/${commentId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Like comment failed: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json()
  },

  deleteComment: async (commentId: string): Promise<void> => {
    const res = await fetch(`/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Delete comment failed: ${res.statusText} - ${errorText}`)
    }
  }
}