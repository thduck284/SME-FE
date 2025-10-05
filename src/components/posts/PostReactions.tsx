"use client"

import { Button } from "@/components/ui"
import { Heart, MessageCircle, Share, Laugh, Frown, Zap } from "lucide-react"
import { usePostReactions } from "@/lib/hooks/usePostReaction"
import { useState } from "react"

interface PostReactionsProps {
  postId: string
  onCommentClick: () => void
}

export enum ReactionType {
  LIKE = 'LIKE',
  LOVE = 'LOVE',
  HAHA = 'HAHA',
  WOW = 'WOW',
  SAD = 'SAD',
  ANGRY = 'ANGRY'
}

const reactionIcons = {
  [ReactionType.LIKE]: { icon: Heart, label: "Like", color: "text-blue-500", emoji: "👍" },
  [ReactionType.LOVE]: { icon: Heart, label: "Love", color: "text-red-500", emoji: "❤️" },
  [ReactionType.HAHA]: { icon: Laugh, label: "Haha", color: "text-yellow-500", emoji: "😄" },
  [ReactionType.WOW]: { icon: Zap, label: "Wow", color: "text-yellow-500", emoji: "😮" },
  [ReactionType.SAD]: { icon: Frown, label: "Sad", color: "text-blue-400", emoji: "😢" },
  [ReactionType.ANGRY]: { icon: Zap, label: "Angry", color: "text-orange-500", emoji: "😠" },
}

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

  // Lấy icon hiện tại của user
  const getCurrentUserReaction = () => {
    if (!reaction?.userReaction) return null
    return reaction.userReaction as ReactionType
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
                ? `${reactionIcons[currentReaction].color} scale-105` 
                : 'text-muted-foreground hover:text-red-500'
            }`}
            onMouseEnter={() => setShowReactionPicker(true)}
            onMouseLeave={() => setShowReactionPicker(false)}
            disabled={loading || isReacting}
          >
            {isReacting ? (
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                {currentReaction ? (
                  // Hiển thị emoji của reaction đã chọn
                  <span className="text-base">{reactionIcons[currentReaction].emoji}</span>
                ) : (
                  // Hiển thị emoji like mặc định
                  <span className="text-base">👍</span>
                )}
                <span className={`transition-all ${currentReaction ? 'font-semibold' : ''}`}>
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
              {Object.entries(reactionIcons).map(([type, { label, emoji }]) => (
                <button
                  key={type}
                  className={`p-2 hover:scale-125 transition-all duration-200 text-lg rounded-full hover:bg-muted ${
                    currentReaction === type ? 'scale-110 bg-muted' : ''
                  }`}
                  onClick={() => handleReaction(type as ReactionType)}
                  title={label}
                >
                  {emoji}
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
                  <span className="text-sm">{reactionConfig?.emoji}</span>
                  <span>{count}</span>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}