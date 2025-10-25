import apiClient from "@/lib/services/ApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export interface HashtagResponse {
  data: PostFullDto[]
  message: string
  nextCursor?: string
}

export const getPostsByHashtag = async (hashtag: string, limit?: number, cursor?: string): Promise<HashtagResponse> => {
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit
  if (cursor) params.pageState = cursor

  const response = await apiClient.get(`/posts/hashtag/${hashtag}?${new URLSearchParams(params)}`)
  return response.data
}
