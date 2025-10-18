import apiClient from "@/lib/services/ApiClient"

export const getFeed = async (limit?: number, lastSeenAt?: Date) => {
  const params: Record<string, any> = {}
  
  if (limit) params.limit = limit  

  const response = await apiClient.get(`/feed?${new URLSearchParams(params)}`)
  return response.data
}
