"use client"

import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Avatar, Button } from "@/components/ui"
import { X } from "lucide-react"
import { getReactionDetails, ReactionDetailsResponse, ReactionDetail } from "@/lib/api/posts/ReactionDetails"
import { UserService } from "@/lib/api/users/UserService"
import type { UserMetadata } from "@/lib/types/User"
import { formatTimeAgo } from "@/lib/utils/PostUtils"
import { reactionIcons, ReactionType } from "@/lib/constants/reactions"

interface ReactionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  targetId: string
  targetType?: string
}


interface UserReaction extends ReactionDetail {
  userMetadata?: UserMetadata
  loading?: boolean
}

export function ReactionDetailsModal({ 
  isOpen, 
  onClose, 
  targetId, 
  targetType = 'POST' 
}: ReactionDetailsModalProps) {
  const navigate = useNavigate()
  const [reactionData, setReactionData] = useState<ReactionDetailsResponse | null>(null)
  const [userReactions, setUserReactions] = useState<UserReaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && targetId) {
      fetchReactionDetails()
    }
  }, [isOpen, targetId, targetType])

  const fetchReactionDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getReactionDetails(targetId, targetType)
      setReactionData(data)
      
      // Initialize user reactions with loading state
      const initialUserReactions: UserReaction[] = data.reactionDetails.map(reaction => ({
        ...reaction,
        loading: true
      }))
      setUserReactions(initialUserReactions)
      
      // Fetch user metadata for each reaction
      fetchUserMetadata(data.reactionDetails)
    } catch (err: any) {
      setError(err.message || "Failed to load reaction details")
    } finally {
      setLoading(false)
    }
  }

  const fetchUserMetadata = async (reactions: ReactionDetail[]) => {
    const userIds = reactions.map(r => r.userId)
    
    try {
      const userMetadataList = await UserService.getMultipleUsersMetadata(userIds)
      
      // Create a map of userId to metadata
      const metadataMap = new Map<string, UserMetadata>()
      userMetadataList.forEach(metadata => {
        metadataMap.set(metadata.userId, metadata)
      })
      
      // Update user reactions with metadata
      setUserReactions(prev => 
        prev.map(reaction => ({
          ...reaction,
          userMetadata: metadataMap.get(reaction.userId),
          loading: false
        }))
      )
    } catch (error) {
      console.error('Failed to fetch user metadata:', error)
      // Update loading state even if failed
      setUserReactions(prev => 
        prev.map(reaction => ({
          ...reaction,
          loading: false
        }))
      )
    }
  }

  const getReactionConfig = (reactionType: string) => {
    return reactionIcons[reactionType as ReactionType] || reactionIcons[ReactionType.LIKE]
  }

  const handleUserClick = useCallback((userId: string) => {
    navigate(`/profile/${userId}`)
    onClose() // Close modal after navigation
  }, [navigate, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Reactions
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading reactions...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-500">{error}</p>
              <Button 
                className="mt-2" 
                onClick={fetchReactionDetails}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="p-4">
              {/* Summary */}
              {reactionData && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(reactionData.counters).map(([type, count]) => {
                      if (count > 0) {
                        const config = getReactionConfig(type)
                        return (
                          <div key={type} className="flex items-center gap-1 text-sm">
                            <span className="text-lg">{config.icon}</span>
                            <span className="text-gray-600 dark:text-gray-400">{count}</span>
                          </div>
                        )
                      }
                      return null
                    })}
                  </div>
                </div>
              )}

              {/* User Reactions List */}
              <div className="space-y-3">
                {userReactions.map((reaction, index) => {
                  const config = getReactionConfig(reaction.reactionType)
                  
                  return (
                    <div 
                      key={`${reaction.userId}-${index}`} 
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors"
                      onClick={() => handleUserClick(reaction.userId)}
                    >
                      <Avatar
                        src={reaction.userMetadata?.avtUrl || "/assets/images/default.png"}
                        alt={reaction.userMetadata ? `${reaction.userMetadata.firstName} ${reaction.userMetadata.lastName}` : "User"}
                        className="h-10 w-10"
                      />
                      
                      <div className="flex-1 min-w-0">
                        {reaction.loading ? (
                          <div className="space-y-1">
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {reaction.userMetadata ? 
                                `${reaction.userMetadata.firstName} ${reaction.userMetadata.lastName}`.trim() : 
                                "Unknown User"
                              }
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatTimeAgo(reaction.createdAt)}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="text-xl">{config.icon}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {userReactions.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No reactions yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
