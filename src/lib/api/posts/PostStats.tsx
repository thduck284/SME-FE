import apiClient from "@/lib/services/ApiClient"

export interface PostStats {
  commentCount: number
  shareCount: number
}

export interface PostStatsResponse {
  success: boolean
  message: string
  data: PostStats
}

export const postStatsApi = {
  getPostStats: async (postId: string): Promise<PostStats> => {
    const res = await apiClient.get(`/posts/${postId}/stats`)
    // API response structure: { success: true, message: "OK", data: { commentCount: 1, shareCount: 0 } }
    return res.data.data
  },

  getMultiplePostsStats: async (postIds: string[]): Promise<Record<string, PostStats>> => {
    const promises = postIds.map(async (postId) => {
      try {
        const stats = await postStatsApi.getPostStats(postId)
        return { postId, stats }
      } catch (error) {
        console.error(`Failed to fetch stats for post ${postId}:`, error)
        return { postId, stats: null }
      }
    })

    const results = await Promise.all(promises)
    const statsMap: Record<string, PostStats> = {}
    
    results.forEach(({ postId, stats }) => {
      if (stats) {
        statsMap[postId] = stats
      }
    })

    return statsMap
  }
}
