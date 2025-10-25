// components/comments/CommentReactionButton.tsx
"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui"
import { ThumbsUp } from "lucide-react"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"

interface CommentReactionButtonProps {
  commentId: string
  currentReaction: string | null
  reactionCounters: Record<string, number>
  onReact: (commentId: string, reactionType: string) => void
  onRemoveReaction: (commentId: string) => void
  isReacting: boolean
  size?: "sm" | "md"
}

export function CommentReactionButton({
  commentId,
  currentReaction,
  reactionCounters,
  onReact,
  onRemoveReaction,
  isReacting,
  size = "sm"
}: CommentReactionButtonProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const totalReactions = Object.values(reactionCounters).reduce((sum, count) => sum + count, 0)
  const topReactions = Object.entries(reactionCounters)
    .filter(([_, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)

  const handleReactionShow = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setShowReactionPicker(true)
  }

  const handleReactionHide = () => {
    hideTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 200)
  }

  const handleReaction = async (reactionType: ReactionType) => {
    setShowReactionPicker(false)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    
    if (currentReaction === reactionType) {
      onRemoveReaction(commentId)
    } else {
      onReact(commentId, reactionType)
    }
  }

  const handleRemoveReaction = async () => {
    if (currentReaction) {
      onRemoveReaction(commentId)
    }
  }

  const buttonSize = size === "sm" ? "h-7 px-2" : "h-8 px-3"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-[14px] w-[14px]"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <div 
      className="relative" 
      onMouseEnter={handleReactionShow} 
      onMouseLeave={handleReactionHide}
    >
      <Button 
        variant="ghost" 
        size={size}
        disabled={isReacting}
        onClick={currentReaction ? handleRemoveReaction : undefined}
        className={`flex items-center gap-1.5 rounded-full ${buttonSize} transition-all ${
          currentReaction 
            ? `${reactionIcons[currentReaction as ReactionType]?.color || ''} ${
                reactionIcons[currentReaction as ReactionType]?.bg || ''
              } ${
                reactionIcons[currentReaction as ReactionType]?.darkBg || ''
              } hover:opacity-80` 
            : 'bg-transparent text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        {isReacting ? (
          <div className={`animate-spin rounded-full border-2 border-current border-t-transparent ${iconSize}`} />
        ) : (
          <>
            {currentReaction ? (
              <span className={`${iconSize} ${reactionIcons[currentReaction as ReactionType]?.color || ''}`}>
                {reactionIcons[currentReaction as ReactionType]?.icon}
              </span>
            ) : (
              <ThumbsUp className={`${iconSize} text-current`} />
            )}
            {totalReactions > 0 && (
              <span className={`font-medium ${textSize}`}>
                {totalReactions}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Reaction Picker */}
      {showReactionPicker && !isReacting && (
        <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-xl px-2 py-1.5 flex items-center gap-1 z-50">
          {Object.entries(reactionIcons).map(([type, { label, icon, color }]) => (
            <button 
              key={type} 
              title={currentReaction === type ? `Remove ${label}` : label} 
              onClick={() => handleReaction(type as ReactionType)}
              className={`relative p-1 hover:scale-125 transition-all duration-200 text-lg rounded-full ${
                currentReaction === type 
                  ? 'scale-110 ring-2 ring-red-300 dark:ring-red-700 bg-red-50 dark:bg-red-900/20' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`block transform hover:-translate-y-0.5 transition-transform ${color}`}>
                {icon}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Top reactions preview */}
      {!showReactionPicker && topReactions.length > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center">
          {topReactions.map(([type], index) => {
            const config = reactionIcons[type as ReactionType]
            if (!config) return null
            
            return (
              <div 
                key={type} 
                style={{ zIndex: topReactions.length - index }}
                className="w-3 h-3 rounded-full bg-white dark:bg-gray-900 border border-white dark:border-gray-900 flex items-center justify-center -ml-1 first:ml-0"
              >
                <span className="text-[10px] leading-none">{config.icon}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}