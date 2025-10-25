import apiClient from "@/lib/services/ApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export interface SearchPostsResponse {
  success: boolean
  message: string
  data: PostFullDto[]
  meta?: {
    nextCursor?: string
  }
}

export const searchPosts = async (query: string, limit?: number, cursor?: string): Promise<SearchPostsResponse> => {
  const params: Record<string, any> = {
    q: query
  }
  
  if (limit) params.fetchSize = limit
  if (cursor) params.pageState = cursor

  const response = await apiClient.get(`/posts/search?${new URLSearchParams(params)}`)
  return response.data
}
