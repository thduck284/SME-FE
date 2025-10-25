"use client"

import { Button, Avatar } from "@/components/ui"
import { MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { useState, useRef, useEffect } from "react"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"
import { CommentsSection } from "@/components/posts/CommentsSection"
import { ShareModal } from "@/components/posts/ShareModal"
import { getUserId } from "@/lib/utils/Jwt"
import type { PostStats } from "@/lib/api/posts/PostStats"

interface ImageModalContentProps {
  post: PostFullDto
  reactions?: {
    userReaction: string | null
    counters: Record<string, number>
  }
  onReact?: (reactionType: string) => Promise<void>
  onShareSuccess?: () => void
  postStats?: PostStats
}

export function ImageModalContent({ post, reactions, onReact, onShareSuccess, postStats }: ImageModalContentProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showComments, setShowComments] = useState(true)
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const handleReactionShow = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    setShowReactionPicker(true)
  }

  const handleReactionHide = () => {
    hideTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 200)
  }

  const handleReaction = async (reactionType: ReactionType) => {
    if (isReacting || !onReact) return
    setIsReacting(true)
    setShowReactionPicker(false)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    try {
      await onReact(reactionType)
    } finally {
      setIsReacting(false)
    }
  }

  const totalReactions = reactions?.counters 
    ? Object.values(reactions.counters).reduce((sum, count) => sum + count, 0) : 0
  const currentReaction = reactions?.userReaction as ReactionType || null
  const topReactions = reactions?.counters
    ? Object.entries(reactions.counters)
        .filter(([_, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3) 
    : []

    
  const totalComments = postStats?.commentCount || 0
  const totalShares = postStats?.shareCount || 0

  return (
    <div className="w-96 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* User Info & Post Content */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3 mb-3">
          <Avatar 
            src="/image.png?height=40&width=40"
            alt="User avatar"
            className="h-10 w-10 border-2 border-primary/10"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Sarah Anderson</h4>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-500 dark:text-gray-400">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {post.content && (
          <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap text-sm">
            {post.content}
          </p>
        )}
      </div>

      {/* Reactions Summary */}
      <div className="px-4 py-2 flex items-center justify-between text-[15px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {totalReactions > 0 ? (
          <div className="flex items-center gap-1.5 hover:underline cursor-pointer">
            <div className="flex items-center -space-x-1">
              {topReactions.length > 0 ? (
                topReactions.map(([type], idx) => {
                  const cfg = reactionIcons[type as ReactionType]
                  const icon = cfg?.icon
                  return (
                    <div 
                      key={type} 
                      style={{ zIndex: topReactions.length - idx }}
                      className="w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-800 border border-white dark:border-gray-800 flex items-center justify-center"
                    >
                      {icon ? (
                        typeof icon === 'string' ? (
                          <span className="text-[14px] leading-none">{icon}</span>
                        ) : (
                          (() => {
                            const IconComp = icon as any;
                            return <IconComp className="h-[14px] w-[14px]" />;
                          })()
                        )
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-800 border border-white dark:border-gray-800 flex items-center justify-center" />
              )}
            </div>
            <span className="text-[15px]">{totalReactions}</span>
          </div>
        ) : (
          <div></div>
        )}
        <div className="flex items-center gap-3">
          <span className="hover:underline cursor-pointer">{totalComments} comments</span>
          <span className="hover:underline cursor-pointer">{totalShares} shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-1">
          {/* Reaction Button */}
          <div className="relative flex-1" onMouseEnter={handleReactionShow} onMouseLeave={handleReactionHide}>
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isReacting}
              className={`flex items-center justify-center gap-1.5 rounded-md h-9 w-full transition-all ${
                currentReaction 
                  ? `${reactionIcons[currentReaction]?.color || 'text-blue-600'} bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50` 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {isReacting ? (
                <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <>
                  {currentReaction && reactionIcons[currentReaction] && (
                    typeof reactionIcons[currentReaction].icon === 'string' ? (
                      <span className="text-[18px] leading-none">{reactionIcons[currentReaction].icon}</span>
                    ) : (
                      (() => {
                        const IconComp = reactionIcons[currentReaction].icon as any;
                        return <IconComp className="h-[18px] w-[18px]" />;
                      })()
                    )
                  )}
                  <span className="text-sm font-semibold">
                    {currentReaction ? reactionIcons[currentReaction]?.label : "Like"}
                  </span>
                </>
              )}
            </Button>

            {/* Reaction Picker */}
            {showReactionPicker && !isReacting && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-xl px-2 py-2 flex items-center gap-1 z-50">
                {Object.entries(reactionIcons).map(([type, { label, icon }]) => (
                  <button
                    key={type}
                    title={label}
                    onClick={() => handleReaction(type as ReactionType)}
                    className={`relative p-1 hover:scale-150 transition-all duration-200 rounded-full ${
                      currentReaction === type ? 'scale-125' : ''
                    }`}
                  >
                    {typeof icon === 'string' ? (
                      <span className="block transform hover:-translate-y-1 transition-transform" style={{ fontSize: '20px' }}>
                        {icon}
                      </span>
                    ) : (
                      (() => {
                        const IconComp = icon as any;
                        return <IconComp className="h-5 w-5 transform hover:-translate-y-1 transition-transform" />;
                      })()
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md h-9 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 flex-1"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold">Comment</span>
          </Button>

          {/* Share Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowShareModal(true)}
            className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md h-9 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 flex-1"
          >
            <Share className="h-[18px] w-[18px]" />
            <span className="text-sm font-semibold">Share</span>
          </Button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <CommentsSection 
          postId={post.postId} 
          isOpen={showComments} 
          onClose={() => setShowComments(false)} 
          currentUserId={getUserId() || ''}
        />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal 
          isOpen={showShareModal} 
          onClose={() => setShowShareModal(false)}
          post={{ 
            postId: post.postId, 
            content: post.content, 
            medias: post.medias || [], 
            authorName: "Sarah Anderson", 
            authorAvatar: "/image.png?height=40&width=40" 
          }}
          onSuccess={() => { 
            onShareSuccess?.();
            setShowShareModal(false);
          }} 
        />
      )}
    </div>
  )
}