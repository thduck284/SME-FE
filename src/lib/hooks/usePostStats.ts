import { useState, useCallback } from 'react'
import { postStatsApi, PostStats } from '@/lib/api/posts/PostStats'

export function usePostStats() {
  const [stats, setStats] = useState<Record<string, PostStats>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPostStats = useCallback(async (postId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const postStats = await postStatsApi.getPostStats(postId)
      console.log('📊 usePostStats fetchPostStats result:', postStats, 'for postId:', postId)
      setStats(prev => {
        const newStats = {
          ...prev,
          [postId]: postStats
        }
        console.log('📊 usePostStats setStats:', newStats)
        return newStats
      })
      return postStats
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch post stats'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMultiplePostsStats = useCallback(async (postIds: string[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const statsMap = await postStatsApi.getMultiplePostsStats(postIds)
      console.log('📊 usePostStats fetchMultiplePostsStats result:', statsMap)
      setStats(prev => {
        const newStats = {
          ...prev,
          ...statsMap
        }
        console.log('📊 usePostStats setStats (multiple):', newStats)
        return newStats
      })
      return statsMap
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch posts stats'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const getPostStats = useCallback((postId: string): PostStats | undefined => {
    return stats[postId]
  }, [stats])

  const updatePostStats = useCallback((postId: string, updates: Partial<PostStats>) => {
    setStats(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        ...updates
      }
    }))
  }, [])

  const clearStats = useCallback(() => {
    setStats({})
  }, [])

  return {
    stats,
    loading,
    error,
    fetchPostStats,
    fetchMultiplePostsStats,
    getPostStats,
    updatePostStats,
    clearStats
  }
}
