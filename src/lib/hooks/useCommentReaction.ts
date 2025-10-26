import { useState, useEffect, useCallback } from 'react'
import { reactionService } from '@/lib/api/posts/Reaction'
import { getUserId } from '@/lib/utils/Jwt'

interface ReactionState {
  userReaction: string | null
  counters: Record<string, number>
}

interface UseCommentsReactionsReturn {
  reactions: Record<string, ReactionState>
  loading: boolean
  error: string | null
  react: (commentId: string, reactionType: string) => Promise<void>
  removeReaction: (commentId: string) => Promise<void>
  refetch: () => Promise<void>
}

export const useCommentsReactions = (commentIds: string[]): UseCommentsReactionsReturn => {
  const [reactions, setReactions] = useState<Record<string, ReactionState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = getUserId() || ''

  const fetchReactions = useCallback(async () => {
    if (commentIds.length === 0) {
      setReactions({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const reactionsMeta = await reactionService.getCommentsReactions(userId, commentIds)
      
      const reactionsData: Record<string, ReactionState> = {}
      Object.entries(reactionsMeta).forEach(([commentId, meta]) => {
        reactionsData[commentId] = {
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
  }, [commentIds.join(','), userId]) 

  const react = useCallback(async (commentId: string, reactionType: string) => {
    setError(null)
    
    const prevReactions = { ...reactions }

    try {
      setReactions(prev => {
        const newReactions = { ...prev }
        
        if (!newReactions[commentId]) {
          newReactions[commentId] = {
            userReaction: reactionType,
            counters: { [reactionType]: 1 }
          }
        } else {
          const newCounters = { ...newReactions[commentId].counters }
          const oldReaction = newReactions[commentId].userReaction

          if (oldReaction && oldReaction !== reactionType) {
            newCounters[oldReaction] = Math.max(0, (newCounters[oldReaction] || 0) - 1)
          }

          newCounters[reactionType] = (newCounters[reactionType] || 0) + 1

          newReactions[commentId] = {
            userReaction: reactionType,
            counters: newCounters
          }
        }

        return newReactions
      })

      await reactionService.react({
        targetId: commentId,
        targetType: 'COMMENT',
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

  const removeReaction = useCallback(async (commentId: string) => {
    if (!reactions[commentId] || !reactions[commentId].userReaction) return

    setError(null)
    
    const prevReactions = { ...reactions }
    const oldReaction = reactions[commentId].userReaction

    try {
      setReactions(prev => {
        const newReactions = { ...prev }
        
        if (newReactions[commentId] && newReactions[commentId].userReaction) {
          const newCounters = { ...newReactions[commentId].counters }
          
          if (oldReaction && newCounters[oldReaction]) {
            newCounters[oldReaction] = Math.max(0, newCounters[oldReaction] - 1)
          }

          newReactions[commentId] = {
            userReaction: null,
            counters: newCounters
          }
        }

        return newReactions
      })

      await reactionService.removeReaction(commentId, 'COMMENT', userId)

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

export const useCommentReactions = (commentId: string) => {
  const { reactions, loading, error, react, removeReaction, refetch } = useCommentsReactions([commentId])
  
  return {
    reaction: reactions[commentId] || null,
    loading,
    error,
    react: (reactionType: string) => react(commentId, reactionType),
    removeReaction: () => removeReaction(commentId),
    refetch,
  }
}