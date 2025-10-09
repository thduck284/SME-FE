export const deleteApi = {
  deletePost: async (postId: string): Promise<void> => {
    try {
      const res = await fetch(`/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
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