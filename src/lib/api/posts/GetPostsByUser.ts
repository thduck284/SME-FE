import apiClient from "@/lib/services/ApiClient"

export const getPostsByUser = async (userId: string, limit?: number, cursor?: string) => {
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  

  const response = await apiClient.get(`/posts/user/${userId}?${new URLSearchParams(params)}`)
  return response.data
}

export const getPostsCount = async (userId: string) => {
  const response = await apiClient.get(`/posts/user/${userId}/count`)
  return response.data
}