import apiClient from "@/lib/services/ApiClient"

// DeletePost.ts
export const deleteApi = {
  deletePost: async (postId: string): Promise<void> => {
    console.log('🔐 Checking token...')
    const token = localStorage.getItem('token') || localStorage.getItem('authToken') || 'test-token'
    console.log('🔐 Using token:', token ? 'Yes' : 'No')
    
    try {
      const res = await apiClient.delete(`/posts/${postId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      console.log('✅ deleteApi: DELETE request successful')
      return res.data
    } catch (error: any) {
      console.error('❌ deleteApi: DELETE request failed:', error)
      console.error('❌ Status:', error.response?.status)
      console.error('❌ Error data:', error.response?.data)
      throw error
    }
  },
}