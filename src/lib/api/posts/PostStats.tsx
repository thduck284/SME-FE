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
    const res = await fetch(`/posts/${postId}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Failed to fetch post stats: ${res.statusText} - ${errorText}`)
    }

    const data: PostStatsResponse = await res.json()
    return data.data
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