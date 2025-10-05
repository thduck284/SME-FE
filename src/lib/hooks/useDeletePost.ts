import { useState } from 'react'
import { deleteApi } from '@/lib/api/posts/DeletePost'

export function useDeletePost() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deletePost = async (postId: string): Promise<void> => {
    setIsDeleting(true)
    setError(null)
    
    try { 
      await deleteApi.deletePost(postId)
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete post'
      setError(errorMessage)
      throw error
    } finally {
      setIsDeleting(false)
    }
  }

  const clearError = () => setError(null)

  return {
    isDeleting,
    error,
    deletePost,
    clearError
  }
}