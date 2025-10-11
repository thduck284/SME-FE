import type { Comment, CommentsResponse, CreateCommentRequest } from "@/lib/types/posts/CommentsDTO"

export const commentApi = {
  getCommentsByPost: async (
    postId: string, 
    limit: number = 5,  
    cursor?: string
  ): Promise<CommentsResponse> => {
    const params = new URLSearchParams()
    params.append('fetchSize', limit.toString())
    if (cursor) params.append('pageState', cursor)

    const res = await fetch(`/comments/post/${postId}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Get comments failed: ${res.statusText} - ${errorText}`)
    }

    const data = await res.json()

    const comments = Array.isArray(data.comments) ? data.comments.map((comment: any) => ({
      id: comment.commentId,
      ...comment
    })) : []

    return {
      comments,
      nextCursor: data.nextPageState,
      hasMore: !!data.nextPageState,
    }
  },

  createComment: async (data: CreateCommentRequest): Promise<Comment> => {
    const requestData: any = {
      postId: data.postId,
    }

    if (data.content) {
      requestData.content = data.content.trim()
    } else {
      requestData.content = ""
    }

    if (data.mentions && data.mentions.length > 0) {
      requestData.mentions = data.mentions
    }

    try {
      const res = await fetch('/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const contentType = res.headers.get("content-type")
      let responseData

      if (contentType && contentType.includes("application/json")) {
        responseData = await res.json()
      } else {
        responseData = await res.text()
        try {
          responseData = JSON.parse(responseData)
        } catch {
          if (typeof responseData === 'string' && res.ok) {
            responseData = { 
              id: responseData,
              content: requestData.content,
              postId: data.postId,
              authorId: 'current-user',
              authorName: 'You',
              createdAt: new Date().toISOString(),
              likes: 0,
              isLiked: false
            }
          }
        }
      }

      if (!res.ok) {
        throw new Error(responseData?.message || `Create comment failed: ${res.status}`)
      }

      console.log("Comment created:", responseData)
      return responseData
      
    } catch (error: any) {
      const message = error.message || "Failed to create comment"
      console.error("Create comment error:", error)
      throw new Error(message)
    }
  },

  likeComment: async (commentId: string): Promise<{ likes: number; isLiked: boolean }> => {
    try {
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
    } catch (error: any) {
      console.error("Like comment error:", error)
      throw error
    }
  },

  deleteComment: async (commentId: string): Promise<void> => {
    try {
      const res = await fetch(`/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Delete comment failed: ${res.status} - ${errorText}`)
      }

      console.log("Comment deleted:", commentId)
      
    } catch (error: any) {
      const message = error.message || "Failed to delete comment"
      console.error("Delete comment error:", error)
      throw new Error(message)
    }
  }
}