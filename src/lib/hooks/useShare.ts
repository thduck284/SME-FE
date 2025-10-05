import { useState } from 'react'
import { shareApi } from '@/lib/api/posts/SharePost'
import type { PostFullDto } from '@/lib/types/posts/PostFullDto'
import type { CreatePostDto } from '@/lib/types/posts/CreatePostDto'

export function useShare() {
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sharePost = async (rootPostId: string, data: CreatePostDto & { mediaFiles?: File[] }): Promise<PostFullDto> => {
    setIsSharing(true)
    setError(null)
    
    try { 
      const result = await shareApi.sharePost(rootPostId, data)
      return result
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to share post'
      setError(errorMessage)
      throw error
    } finally {
      setIsSharing(false)
    }
  }

  const clearError = () => setError(null)

  return {
    isSharing,
    error,
    sharePost,
    clearError
  }
}