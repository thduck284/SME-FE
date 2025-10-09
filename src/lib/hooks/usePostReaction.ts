import { useState, useEffect, useCallback } from 'react'
import { reactionService } from '@/lib/api/posts/Reaction'
import { getUserId } from '@/lib/utils/Jwt'

interface ReactionState {
  userReaction: string | null
  counters: Record<string, number>
}

interface UsePostsReactionsReturn {
  reactions: Record<string, ReactionState>
  loading: boolean
  error: string | null
  react: (postId: string, reactionType: string) => Promise<void>
  removeReaction: (postId: string) => Promise<void>
  refetch: () => Promise<void>
}

export const usePostsReactions = (postIds: string[]): UsePostsReactionsReturn => {
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = getUserId() || ''

  const fetchReactions = useCallback(async () => {
    if (postIds.length === 0) {
      setReactions({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const reactionsMeta = await reactionService.getPostsReactions(userId, postIds)
      
      const reactionsData: Record<string, ReactionState> = {}
      Object.entries(reactionsMeta).forEach(([postId, meta]) => {
        reactionsData[postId] = {
          userReaction: (((meta as any).yourReaction) ?? meta.userReaction) || null,
          counters: meta.counters
        }
      })
      
      setReactions(reactionsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions')
      console.error('Error fetching reactions:', err)
    } finally {
      setLoading(false)
    }
  }, [postIds.join(','), userId]) 

  const react = useCallback(async (postId: string, reactionType: string) => {
    setError(null)
    
    const prevReactions = { ...reactions }

    try {
      setReactions(prev => {
        const newReactions = { ...prev }
        
        if (!newReactions[postId]) {
          newReactions[postId] = {
            userReaction: reactionType,
            counters: { [reactionType]: 1 }
          }
        } else {
          const newCounters = { ...newReactions[postId].counters }
          const oldReaction = newReactions[postId].userReaction

          if (oldReaction && oldReaction !== reactionType) {
            newCounters[oldReaction] = Math.max(0, (newCounters[oldReaction] || 0) - 1)
          }

          newCounters[reactionType] = (newCounters[reactionType] || 0) + 1

          newReactions[postId] = {
            userReaction: reactionType,
            counters: newCounters
          }
        }

        return newReactions
      })

      await reactionService.react({
        targetId: postId,
        targetType: 'POST',
        userId,
        reactionType
      })

    } catch (err) {
      setReactions(prevReactions)
      setError(err instanceof Error ? err.message : 'Failed to react')
      console.error('Error reacting:', err)
      throw err
    }
  }, [userId, reactions])

  const removeReaction = useCallback(async (postId: string) => {
    if (!reactions[postId] || !reactions[postId].userReaction) return

    setError(null)
    
    const prevReactions = { ...reactions }
    const oldReaction = reactions[postId].userReaction

    try {
      setReactions(prev => {
        const newReactions = { ...prev }
        
        if (newReactions[postId] && newReactions[postId].userReaction) {
          const newCounters = { ...newReactions[postId].counters }
          
          if (oldReaction && newCounters[oldReaction]) {
            newCounters[oldReaction] = Math.max(0, newCounters[oldReaction] - 1)
          }

          newReactions[postId] = {
            userReaction: null,
            counters: newCounters
          }
        }

        return newReactions
      })

      await reactionService.removeReaction(postId, 'POST', userId)

    } catch (err) {
      setReactions(prevReactions)
      setError(err instanceof Error ? err.message : 'Failed to remove reaction')
      console.error('Error removing reaction:', err)
      throw err
    }
  }, [userId, reactions])

  useEffect(() => {
    fetchReactions()
  }, [fetchReactions])

  return {
    reactions,
    loading,
    error,
    react,
    removeReaction,
    refetch: fetchReactions,
  }
}

export const usePostReactions = (postId: string) => {
  const { reactions, loading, error, react, removeReaction, refetch } = usePostsReactions([postId])
  
  return {
    reaction: reactions[postId] || null,
    loading,
    error,
    react: (reactionType: string) => react(postId, reactionType),
    removeReaction: () => removeReaction(postId),
    refetch,
  }
}
