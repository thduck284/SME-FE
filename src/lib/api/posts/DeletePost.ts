import { injectToken } from "@/lib/api/auth/Interceptor"

export const deleteApi = {
  deletePost: async (postId: string): Promise<void> => {
    try {
      const config = injectToken({
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const res = await fetch(`/posts/${postId}`, config)
      
      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(`Delete post failed: ${res.statusText} - ${errorText}`)
      }
      
      if (res.status !== 204) {
        return await res.json()
      }
    } catch (error: any) {
      console.error('Error message:', error.message)
      throw error
    }
  },
}