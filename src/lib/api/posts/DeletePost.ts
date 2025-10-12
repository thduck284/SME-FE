import apiClient from "@/lib/services/ApiClient"

export const deleteApi = {
  deletePost: async (postId: string): Promise<void> => {
    try {
      await apiClient.delete(`/posts/${postId}`)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to delete post"
      throw new Error(message)
    }
  },
}