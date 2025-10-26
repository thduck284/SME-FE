import publicApiClient from "@/lib/services/PublicApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export const getPublicPostById = async (postId: string): Promise<PostFullDto> => {
  const response = await publicApiClient.get(`/posts/${postId}`)
  return response.data.data
}
