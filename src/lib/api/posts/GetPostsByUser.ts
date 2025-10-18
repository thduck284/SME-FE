import apiClient from "@/lib/services/ApiClient"

export const getPostsByUser = async (
  userId: string,
  limit?: number,
  cursor?: string
) => {
  try {
    const params: Record<string, any> = {}
    if (limit) params.fetchSize = limit
    if (cursor) params.pageState = cursor

    const res = await apiClient.get(`/posts/user/${userId}`, { params })
    return res.data
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch user's posts"
    throw new Error(message)
  }
}

export const getPostsCount = async (userId: string) => {
  try {
    const res = await apiClient.get(`/posts/user/${userId}/count`)
    return res.data
  } catch (error: any) {
    const message =
      error.response?.data?.message || "Failed to fetch user's post count"
    throw new Error(message)
  }
}
