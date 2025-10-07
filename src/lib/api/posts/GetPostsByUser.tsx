import apiClient from "@/lib/services/ApiClient"

export const getPostsByUser = async (limit?: number, cursor?: string) => {
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  
  
  const res = await apiClient.get(`/posts/user/${'e564d666-c21c-4dee-a5b0-ab2029dae1f2'}`, { params })
  return res.data
}

export const getPostsCount = async () => {
  const res = await apiClient.get(`/posts/user/${'e564d666-c21c-4dee-a5b0-ab2029dae1f2'}/count`)
  return res.data
}