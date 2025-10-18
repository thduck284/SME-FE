import apiClient from "@/lib/services/ApiClient"
import type { Comment } from "@/lib/types/posts/CommentsDTO"

interface RepliesResponse {
  replies: Comment[]
  nextCursor?: string
  hasMore: boolean
}

export const getReplies = async (parentCommentId: string, fetchSize: number = 10, pageState?: string): Promise<RepliesResponse> => {
  const params: Record<string, any> = {
    fetchSize,
  }
  
  if (pageState) {
    params.pageState = pageState
  }

  const response = await apiClient.get(`comments/replies/${parentCommentId}?${new URLSearchParams(params)}`)
  
  // Map API response to match Comment interface
  const mappedReplies = response.data.replies?.map((reply: any) => ({
    ...reply,
    id: reply.commentId, // Map commentId to id
  })) || []
  
  return {
    ...response.data,
    replies: mappedReplies
  }
}
