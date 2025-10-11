"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui"
import { MessageCircle, Share, ThumbsUp } from "lucide-react"
import { usePostReactions } from "@/lib/hooks/usePostReaction"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"

interface PostReactionsProps {
  postId: string
  onCommentClick: () => void
}

// Dùng mapping icon lucide từ constants

export function PostReactions({ postId, onCommentClick }: PostReactionsProps) {
  const { reaction, loading, react, removeReaction } = usePostReactions(postId)
  const [isReacting, setIsReacting] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)

  // Xử lý reaction với optimistic updates
  const handleReaction = async (reactionType: ReactionType) => {
    if (isReacting) return
    
    setIsReacting(true)
    setShowReactionPicker(false)
    
    try {
      // Nếu đã reaction cùng loại thì xóa, khác loại thì đổi reaction
      if (reaction?.userReaction === reactionType) {
        await removeReaction()
      } else {
        await react(reactionType)
      }
    } catch (error) {
      console.error('Failed to react:', error)
    } finally {
      setIsReacting(false)
    }
  }

  // Tính tổng số reactions với optimistic updates
  const getTotalReactions = () => {
    if (!reaction?.counters) return 0
    
    const baseTotal = Object.values(reaction.counters).reduce((sum: number, count: number) => sum + count, 0)
    
    return baseTotal
  }

  // Lấy icon hiện tại của user (chuẩn hóa viết hoa)
  const getCurrentUserReaction = () => {
    if (!reaction?.userReaction) return null
    return (reaction.userReaction.toUpperCase() as ReactionType)
  }

  const totalReactions = getTotalReactions()
  const currentReaction = getCurrentUserReaction()

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <div className="flex items-center gap-6">
        {/* Reaction Button với Picker */}
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-2 transition-all duration-200 group ${
              currentReaction 
                ? `${reactionIcons[currentReaction].color} ${reactionIcons[currentReaction].bg} ${reactionIcons[currentReaction].darkBg}`
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
            }`}
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => setShowReactionPicker(false)}
            disabled={loading || isReacting}
          >
            {isReacting ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
              {currentReaction 
                ? <span className={`text-lg ${reactionIcons[currentReaction].color}`}>{reactionIcons[currentReaction].icon}</span>
                : <ThumbsUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                <span className={`transition-all ${currentReaction ? `font-semibold ${reactionIcons[currentReaction].color}` : ''}`}>
                  {totalReactions}
                </span>
              </>
            )}
          </Button>

          {/* Reaction Picker */}
          {showReactionPicker && (
            <div 
              className="absolute bottom-full left-0 mb-2 bg-background border border-border rounded-xl shadow-lg p-3 flex items-center gap-2 z-10"
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={() => setShowReactionPicker(false)}
            >
              {Object.entries(reactionIcons).map(([type, { label, icon }]) => (
                <button
                  key={type}
                  className={`p-2 hover:scale-125 transition-all duration-200 text-lg rounded-full hover:bg-muted ${
                    currentReaction === type ? 'scale-110 bg-muted' : ''
                  }`}
                  onClick={() => handleReaction(type as ReactionType)}
                  title={label}
                >
                  <span className="text-lg">{icon}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Comment Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-muted-foreground hover:text-blue-500 transition-all hover:scale-105"
          onClick={onCommentClick}
        >
          <MessageCircle className="h-4 w-4" />
          <span>8</span>
        </Button>
        
        {/* Share Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-muted-foreground hover:text-green-500 transition-all hover:scale-105"
        >
          <Share className="h-4 w-4" />
          <span>Share</span>
        </Button>
      </div>

      {/* Hiển thị reaction summary */}
      {reaction?.counters && Object.values(reaction.counters).some(count => count > 0) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {Object.entries(reaction.counters)
            .filter(([_, count]) => count > 0)
            .map(([type, count]) => {
              const reactionConfig = reactionIcons[type as ReactionType]
              return (
                <div key={type} className="flex items-center gap-1">
                  {reactionConfig?.icon ? <span className="text-sm">{reactionConfig.icon}</span> : null}
                  <span>{count}</span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}