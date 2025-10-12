import apiClient from "@/lib/services/ApiClient"
import type { MentionResponse } from "@/lib/types/users/MentionDto"

export const mentionApi = {
  searchUsers: async (query: string): Promise<MentionResponse> => {
    try {
      const response = await apiClient.get('/posts/mention', {
        params: { query }
      })
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to search users for mention"
      throw new Error(message)
    }
  }
}
