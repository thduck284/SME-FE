import apiClient from "@/lib/services/ApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"

export const getPostById = async (postId: string): Promise<PostFullDto> => {
  const response = await apiClient.get(`/posts/${postId}`)
  return response.data.data
}

export const getMultiplePostsByIds = async (postIds: string[]): Promise<PostFullDto[]> => {
  const promises = postIds.map(async (postId) => {
    try {
      const post = await getPostById(postId)
      return post
    } catch (error) {
      console.error(`Failed to fetch post ${postId}:`, error)
      return null
    }
  })

  const results = await Promise.all(promises)
  return results.filter((post): post is PostFullDto => post !== null)
}
