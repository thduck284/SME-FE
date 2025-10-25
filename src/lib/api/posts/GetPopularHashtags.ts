import apiClient from "@/lib/services/ApiClient"

export interface PopularHashtagDto {
  hashtag: string
  count: number
  lastUsed?: Date
}

export interface PopularHashtagsResponse {
  success: boolean
  message: string
  data: {
    hashtags: PopularHashtagDto[]
    total: number
  }
}

export const getPopularHashtags = async (limit?: number, days?: number): Promise<PopularHashtagsResponse> => {
  const params: Record<string, any> = {}
  
  if (limit) params.limit = limit
  if (days) params.days = days

  const response = await apiClient.get(`/posts/hashtags/popular?${new URLSearchParams(params)}`)
  return response.data
}
