import { useState, useEffect, useCallback } from 'react'
import { relationshipService } from '@/lib/api/relationship/GetRelationship'
import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'
import { getUserId } from '@/lib/utils/Jwt'

interface UseRelationshipReturn {
  followers: UserRelationshipsResponseDto | null
  following: UserRelationshipsResponseDto | null
  loading: boolean
  error: string | null
  fetchFollowers: () => Promise<void>
  fetchFollowing: () => Promise<void>
  refetchAll: () => Promise<void>
}

export const useRelationship = (userId?: string): UseRelationshipReturn => {
  const [followers, setFollowers] = useState<UserRelationshipsResponseDto | null>(null)
  const [following, setFollowing] = useState<UserRelationshipsResponseDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowers = useCallback(async () => {
    const currentUserId = userId || getUserId()
    if (!currentUserId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const followersData = await relationshipService.getFollowers(currentUserId)
      setFollowers(followersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch followers')
      console.error('Error fetching followers:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchFollowing = useCallback(async () => {
    const currentUserId = userId || getUserId()
    if (!currentUserId) return
    
    setLoading(true)
    setError(null)
    
    try {
      const followingData = await relationshipService.getFollowing(currentUserId)
      setFollowing(followingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch following')
      console.error('Error fetching following:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const refetchAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchFollowers(),
        fetchFollowing()
      ])
    } finally {
      setLoading(false)
    }
  }, [fetchFollowers, fetchFollowing])

  return {
    followers,
    following,
    loading,
    error,
    fetchFollowers,
    fetchFollowing,
    refetchAll,
  }
}

// Hook cho relationship (sử dụng userId từ JWT)
export const useUserRelationship = (userId?: string) => {
  const { 
    followers, 
    following, 
    loading, 
    error, 
    fetchFollowers, 
    fetchFollowing, 
    refetchAll 
  } = useRelationship(userId)

  useEffect(() => {
    refetchAll()
  }, [refetchAll])

  return {
    followers,
    following,
    loading,
    error,
    refetch: refetchAll,
    refetchFollowers: fetchFollowers,
    refetchFollowing: fetchFollowing
  }
}