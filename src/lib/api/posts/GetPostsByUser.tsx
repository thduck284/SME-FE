import apiClient from "@/lib/services/ApiClient"

export const getPostsByUser = async (limit?: number, cursor?: string) => {
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  
  
  const res = await apiClient.get(`/posts/user/${'572a51cc-38a3-4225-a7f2-203a514293f5'}`, { params })
  return res.data
}

export const getPostsCount = async () => {
  const res = await apiClient.get(`/posts/user/${'572a51cc-38a3-4225-a7f2-203a514293f5'}/count`)
  return res.data
}