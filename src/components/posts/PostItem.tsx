"use client"

import React, { useState, useRef, useEffect } from "react"
import { Card, Avatar, Badge, Button } from "@/components/ui"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { CreateSharePostDto } from "@/lib/types/posts/CreatePostDto"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"
import { formatTimeAgo, getVisibilityIcon } from "@/lib/utils/PostUtils"
import { CommentsSection } from "./CommentsSection"
import { ShareModal } from "./ShareModal"
import { PostOptionsMenu } from "./PostOptionsMenu"
import { MessageCircle, Share, Repeat2, Lock, ThumbsUp } from "lucide-react"
import { PostStats } from "@/lib/api/posts/PostStats"

interface PostItemProps {
  post: PostFullDto
  onOpenImage: (imageUrl: string, post: PostFullDto) => void
  reaction?: { userReaction: string | null; counters: Record<string, number> }
  loading?: boolean
  onReact?: (reactionType: string) => Promise<void>
  onShareSuccess?: () => void
  isOwnPost?: boolean
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onSave?: (postId: string) => void
  onPin?: (postId: string) => void
  onHide?: (postId: string) => void
  onReport?: (postId: string) => void
  postStats?: PostStats
}

export function PostItem({ 
  post, 
  onOpenImage, 
  reaction, 
  loading, 
  onReact, 
  onShareSuccess,
  isOwnPost = true,
  onEdit = () => {},
  onDelete,
  onSave = () => {},
  onPin = () => {},
  onHide = () => {},
  onReport = () => {},
  postStats
}: PostItemProps) {
  const [showComments, setShowComments] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

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

  const totalReactions = reaction?.counters 
    ? Object.values(reaction.counters).reduce((sum, count) => sum + count, 0) : 0
  const currentReaction = reaction?.userReaction 
    ? (reaction.userReaction.toUpperCase() as ReactionType) 
    : null
  const topReactions = reaction?.counters
    ? Object.entries(reaction.counters)
        .filter(([_, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : []

  const MediaGrid = ({ medias }: { medias: { mediaId: string; mediaUrl: string }[] }) => {
    if (!medias.length) return null
    const displayMedias = medias.slice(0, 4)
    const remainingCount = medias.length - 4

    if (medias.length === 1) {
      return (
        <div className="w-full bg-black">
          <div className="relative group cursor-pointer w-full max-h-[500px] flex items-center justify-center overflow-hidden"
            onClick={() => onOpenImage(medias[0].mediaUrl, post)}>
            <img src={medias[0].mediaUrl} alt="Post media" className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105" />
          </div>
        </div>
      )
    }

    return (
      <div className={`grid gap-0.5 ${medias.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {displayMedias.map((media, idx) => (
          <div key={media.mediaId} className={`relative group cursor-pointer bg-gray-100 dark:bg-gray-800 overflow-hidden ${
            medias.length === 3 && idx === 0 ? "row-span-2 col-span-2" : "aspect-square"}`}
            onClick={() => onOpenImage(media.mediaUrl, post)}>
            <img src={media.mediaUrl} alt={`Media ${idx + 1}`} className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-95" />
            {idx === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <span className="text-white text-4xl font-bold">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const ReactionButton = () => (
    <div className="relative flex-1" onMouseEnter={handleReactionShow} onMouseLeave={handleReactionHide}>
      <Button variant="ghost" size="sm" disabled={loading || isReacting}
        className={`flex items-center justify-center gap-1.5 rounded-md h-9 w-full transition-all ${
          currentReaction 
            ? `${reactionIcons[currentReaction].color} ${reactionIcons[currentReaction].bg} ${reactionIcons[currentReaction].darkBg}`
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'}`}>
        {isReacting ? (
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <>
            {currentReaction ? (
              <span className={`text-[18px] ${reactionIcons[currentReaction].color}`}>
                {reactionIcons[currentReaction].icon}
              </span>
            ) : (
              <ThumbsUp className="h-[18px] w-[18px] text-gray-600 dark:text-gray-400" />
            )}
            <span className={`text-[15px] font-semibold ${currentReaction ? reactionIcons[currentReaction].color : ''}`}>
              {currentReaction ? reactionIcons[currentReaction].label : "Like"}
            </span>
          </>
        )}
      </Button>

      {showReactionPicker && !isReacting && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-xl px-2 py-2 flex items-center gap-1 z-50">
          {Object.entries(reactionIcons).map(([type, { label, icon, color }]) => (
            <button 
              key={type} 
              title={label} 
              onClick={() => handleReaction(type as ReactionType)}
              className={`relative p-1 hover:scale-150 transition-all duration-200 text-2xl rounded-full ${currentReaction === type ? 'scale-125' : ''}`}
            >
              <span className={`block transform hover:-translate-y-1 transition-transform ${color}`}>
                {icon}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const ActionBtn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick?: () => void }) => (
    <Button variant="ghost" size="sm" onClick={onClick}
      className="flex items-center justify-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md h-9 transition-all hover:bg-gray-100 dark:hover:bg-gray-800 flex-1">
      <Icon className="h-[18px] w-[18px]" />
      <span className="text-[15px] font-semibold">{label}</span>
    </Button>
  )

  // Kiểm tra các trường hợp
  const isSharePost = post.type === 'SHARE'
  const hasRootPost = post.rootPost !== undefined

  return (
    <>
      <Card className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Header với thông tin người share (nếu là bài share) */}
        {isSharePost && (
          <div className="px-4 pt-3 pb-0">
            <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400">
              <Repeat2 className="h-3.5 w-3.5" />
              <span className="font-normal">Sarah Anderson shared a post</span>
            </div>
          </div>
        )}

        {/* Thông tin tác giả */}
        <div className="flex items-start justify-between px-4 pt-3 pb-2">
          <div className="flex items-start gap-3 flex-1">
            <Avatar src="/image.png?height=40&width=40" alt="User avatar" className="h-10 w-10 cursor-pointer hover:opacity-90 transition-opacity" />
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 hover:underline cursor-pointer">Sarah Anderson</h4>
              <div className="flex items-center gap-1 text-[13px] text-gray-500 dark:text-gray-400">
                <span className="hover:underline cursor-pointer">{formatTimeAgo(post.createdAt)}</span>
                <span>·</span>
                {React.cloneElement(getVisibilityIcon(post.visibility as CreateSharePostDto["visibility"]), { className: "h-4 w-4 text-muted-foreground" })}
              </div>
            </div>
          </div>
          <div className="relative">
            <PostOptionsMenu
              postId={post.postId}
              isOwnPost={isOwnPost}
              onEdit={onEdit}
              onDelete={onDelete}
              onSave={onSave}
              onPin={onPin}
              onHide={onHide}
              onReport={onReport}
            />
          </div>
        </div>

        {/* Nội dung của người share (nếu có) */}
        {isSharePost && post.content && (
          <div className="px-4 pt-0.5 pb-0">
            <p className="text-[15px] text-gray-900 dark:text-gray-100 leading-[1.3333] whitespace-pre-wrap break-words">{post.content}</p>
          </div>
        )}

        {/* Media của người share (nếu có) */}
        {isSharePost && post.medias && post.medias.length > 0 && (
          <div className={post.content ? 'mt-3' : ''}><MediaGrid medias={post.medias} /></div>
        )}

        {/* TRƯỜNG HỢP 1: Bài viết ORIGINAL */}
        {!isSharePost && (
          <>
            {post.content && (
              <div className="px-4 pt-0.5 pb-0">
                <p className="text-[15px] text-gray-900 dark:text-gray-100 leading-[1.3333] whitespace-pre-wrap break-words">{post.content}</p>
              </div>
            )}
            {post.medias && post.medias.length > 0 && (
              <div className={post.content ? 'mt-3' : ''}><MediaGrid medias={post.medias} /></div>
            )}
          </>
        )}

        {/* TRƯỜNG HỢP 2: Bài viết SHARE có rootPost */}
        {isSharePost && hasRootPost && post.rootPost && (
          <div className="mx-4 my-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <Avatar src="/image.png?height=32&width=32" alt="Original author" className="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 hover:underline">Original Author</p>
                <p className="text-[13px] text-gray-500 dark:text-gray-400">{formatTimeAgo(post.rootPost.createdAt)}</p>
              </div>
            </div>
            {post.rootPost.content && (
              <div className="px-3 py-2.5">
                <p className="text-[15px] text-gray-900 dark:text-gray-100 leading-[1.3333] line-clamp-4">{post.rootPost.content}</p>
              </div>
            )}
            {post.rootPost.medias && post.rootPost.medias.length > 0 && (
              <div className="pb-0">
                <div className="grid grid-cols-2 gap-0.5 overflow-hidden">
                  {post.rootPost.medias.slice(0, 4).map((media, idx) => (
                    <div key={media.mediaId} className="relative aspect-square bg-gray-200 dark:bg-gray-700 group cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); onOpenImage(media.mediaUrl, post) }}>
                      <img src={media.mediaUrl} alt={`Root media ${idx + 1}`} className="w-full h-full object-cover group-hover:brightness-95 transition-all" />
                      {idx === 3 && post.rootPost!.medias && post.rootPost!.medias.length > 4 && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white text-2xl font-bold">+{post.rootPost!.medias.length - 4}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRƯỜNG HỢP 3: Bài viết SHARE KHÔNG có rootPost (bị xóa) */}
        {isSharePost && !hasRootPost && (
          <div className="mx-4 my-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
            <div className="px-4 py-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 mb-1">
                    This content is currently unavailable
                  </p>
                  <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    This error is usually because the owner only shared the content with a small group, changed who can see it, or deleted the content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mentions */}
        {post.mentions && post.mentions.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {post.mentions.map((mention, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-0 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer transition-colors">
                  @user{mention.userId.slice(0, 8)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reactions summary */}
        {totalReactions > 0 && (
          <div className="px-4 py-2 flex items-center justify-between text-[15px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-3">
            <div className="flex items-center gap-1">
              {loading ? <span className="text-sm">Loading...</span> : (
                <div className="flex items-center gap-1.5 hover:underline cursor-pointer">
                  <div className="flex items-center -space-x-1">
                    {topReactions.map(([type], idx) => {
                      const reactionType = type.toUpperCase() as ReactionType
                      const config = reactionIcons[reactionType]
                      return (
                        <div key={type} style={{ zIndex: topReactions.length - idx }}
                          className="w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border border-white dark:border-gray-900 flex items-center justify-center">
                          {config && <span className="text-[14px]">{config.icon}</span>}
                        </div>
                      )
                    })}
                  </div>
                  <span className="text-[15px]">{totalReactions}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hover:underline cursor-pointer">
                {postStats ? `${postStats.commentCount || 0} comments` : '... comments'}
              </span>
              <span className="hover:underline cursor-pointer">
                {postStats ? `${postStats.shareCount || 0} shares` : '... shares'}
              </span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-2 py-1 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <ReactionButton />
            <ActionBtn 
              icon={MessageCircle} 
              label={`Comment${postStats ? ` (${postStats.commentCount || 0})` : ''}`} 
              onClick={() => setShowComments(!showComments)} 
            />
            <ActionBtn 
              icon={Share} 
              label={`Share${postStats ? ` (${postStats.shareCount || 0})` : ''}`} 
              onClick={() => setShowShareModal(true)} 
            />
          </div>
        </div>

        <CommentsSection postId={post.postId} isOpen={showComments} onClose={() => setShowComments(false)} />
      </Card>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)}
        post={{ postId: post.postId, content: post.content, medias: post.medias || [], authorName: "Sarah Anderson", authorAvatar: "/image.png?height=40&width=40" }}
        onSuccess={() => { onShareSuccess?.() }} />
    </>
  )
}