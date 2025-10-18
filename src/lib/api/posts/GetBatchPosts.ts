import apiClient from "@/lib/services/ApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export const getBatchPosts = async (postIds: string[]): Promise<PostFullDto[]> => {
  const response = await apiClient.post('/posts/batch', {
    postIds: postIds
  })
  return response.data.data
}
