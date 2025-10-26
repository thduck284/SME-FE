"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Card, Avatar, Button } from "@/components/ui"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { CreateSharePostDto } from "@/lib/types/posts/CreatePostDto"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"
import { formatTimeAgo, getVisibilityIcon } from "@/lib/utils/PostUtils"
import { CommentsSection } from "./CommentsSection"
import { ShareModal } from "./ShareModal"
import { PostOptionsMenu } from "./PostOptionsMenu"
import { ReactionDetailsModal } from "./ReactionDetailsModal"
import { MessageCircle, Share, Repeat2, Lock, ThumbsUp, X } from "lucide-react"
import { UserService } from "@/lib/api/users/UserService"
import type { PostStats } from "@/lib/api/posts/PostStats"
import type { UserMetadata } from "@/lib/types/User"
import { getUserId } from "@/lib/utils/Jwt"
import { usePostStats } from "@/lib/hooks/usePostStats"

interface PostDetailModalProps {
  post: PostFullDto
  isOpen: boolean
  onClose: () => void
  onOpenImage: (imageUrl: string, post: PostFullDto) => void
  reaction?: { userReaction: string | null; counters: Record<string, number> }
  loading?: boolean
  onReact?: (reactionType: string) => Promise<void>
  onShareSuccess?: () => void
  isOwnPost?: boolean
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onHide?: (postId: string) => void
  onReport?: (postId: string) => void
  postStats?: PostStats
}

export function PostDetailModal({ 
  post, 
  isOpen,
  onClose,
  onOpenImage, 
  reaction, 
  loading, 
  onReact, 
  onShareSuccess,
  isOwnPost = true,
  onEdit = () => {},
  onDelete,
  onHide = () => {},
  onReport = () => {},
  postStats
}: PostDetailModalProps) {
  const navigate = useNavigate()
  const [isReacting, setIsReacting] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showReactionDetails, setShowReactionDetails] = useState(false)
  const [authorMetadata, setAuthorMetadata] = useState<UserMetadata | null>(null)
  const [loadingAuthor, setLoadingAuthor] = useState(true)
  const [rootAuthorMetadata, setRootAuthorMetadata] = useState<UserMetadata | null>(null)
  const [loadingRootAuthor, setLoadingRootAuthor] = useState(false)
  
  // Post stats hook
  const { fetchPostStats, getPostStats } = usePostStats()
  const [localPostStats, setLocalPostStats] = useState<PostStats | null>(postStats || null)

  // Initialize stats on mount
  useEffect(() => {
    if (!localPostStats && post.postId) {
      fetchPostStats(post.postId).then(setLocalPostStats).catch(console.error)
    }
  }, [post.postId, localPostStats, fetchPostStats])
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Console.log props khi modal mở
  useEffect(() => {
    if (isOpen) {
      console.log("=== PostDetailModal Props ===")
      console.log("post:", post)
      console.log("isOpen:", isOpen)
      console.log("reaction:", reaction)
      console.log("loading:", loading)
      console.log("isOwnPost:", isOwnPost)
      console.log("postStats:", postStats)
      console.log("===========================")
    }
  }, [isOpen, post, reaction, loading, isOwnPost, postStats])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    const fetchAuthorMetadata = async () => {
      try {
        setLoadingAuthor(true)
        const metadata = await UserService.getUserMetadata(post.authorId)
        setAuthorMetadata(metadata)
      } catch (error) {
        console.error('Failed to fetch author metadata:', error)
        setAuthorMetadata(null)
      } finally {
        setLoadingAuthor(false)
      }
    }

    fetchAuthorMetadata()
  }, [post.authorId])

  // Fetch root author metadata for repost
  useEffect(() => {
    const fetchRootAuthorMetadata = async () => {
      if (post.type === 'SHARE' && post.rootPost?.authorId) {
        try {
          setLoadingRootAuthor(true)
          const metadata = await UserService.getUserMetadata(post.rootPost.authorId)
          setRootAuthorMetadata(metadata)
        } catch (error) {
          console.error('Failed to fetch root author metadata:', error)
          setRootAuthorMetadata(null)
        } finally {
          setLoadingRootAuthor(false)
        }
      }
    }

    fetchRootAuthorMetadata()
  }, [post.type, post.rootPost?.authorId])

  // Callback to refresh stats after comment
  const handleCommentSuccess = useCallback(async () => {
    try {
      const updatedStats = await fetchPostStats(post.postId)
      setLocalPostStats(updatedStats)
    } catch (error) {
      console.error('Failed to refresh post stats:', error)
    }
  }, [fetchPostStats, post.postId])

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

  const handleRemoveReaction = async () => {
    if (isReacting || !onReact) return
    setIsReacting(true)
    setShowReactionPicker(false)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    try {
      // Gọi với reaction hiện tại để remove
      await onReact(currentReaction!)
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

    const isVideo = (url: string) => {
      return url.match(/\.(mp4|webm|ogg|mov|avi)$/i) || url.includes('video')
    }

    if (medias.length === 1) {
      const media = medias[0]
      return (
        <div className="w-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden">
          {isVideo(media.mediaUrl) ? (
            <div className="relative w-full max-h-[500px] flex items-center justify-center overflow-hidden">
              <video 
                src={media.mediaUrl} 
                className="w-full h-full object-cover" 
                controls
                preload="metadata"
                muted
                style={{ maxHeight: '500px' }}
              />
            </div>
          ) : (
            <div className="relative group cursor-pointer w-full max-h-[500px] flex items-center justify-center overflow-hidden"
              onClick={() => onOpenImage(media.mediaUrl, post)}>
              <img src={media.mediaUrl} alt="Post media" className="w-full h-auto object-contain transition-all duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300"></div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className={`grid gap-1 rounded-xl overflow-hidden ${medias.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {displayMedias.map((media, idx) => (
          <div key={media.mediaId} className={`relative bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden ${
            medias.length === 3 && idx === 0 ? "row-span-2 col-span-2" : "aspect-square"}`}>
            {isVideo(media.mediaUrl) ? (
              <video 
                src={media.mediaUrl} 
                className="w-full h-full object-cover" 
                controls
                preload="metadata"
                muted
              />
            ) : (
              <div className="relative group cursor-pointer w-full h-full"
                onClick={() => onOpenImage(media.mediaUrl, post)}>
                <img src={media.mediaUrl} alt={`Media ${idx + 1}`} className="w-full h-full object-contain transition-all duration-500 group-hover:scale-105 group-hover:brightness-95" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-300"></div>
              </div>
            )}
            {idx === 3 && remainingCount > 0 && (
              <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-md flex items-center justify-center">
                <span className="text-white text-5xl font-bold drop-shadow-lg">+{remainingCount}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const ReactionButton = () => (
    <div className="relative flex-1" onMouseEnter={onReact ? handleReactionShow : undefined} onMouseLeave={onReact ? handleReactionHide : undefined}>
      <Button 
        variant="ghost" 
        size="sm" 
        disabled={loading || isReacting || !onReact}
        onClick={onReact && currentReaction ? handleRemoveReaction : undefined}
        className={`flex items-center justify-center gap-2 rounded-xl h-10 w-full transition-all duration-300 font-semibold ${
          !onReact 
            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700'
            : currentReaction 
              ? `${reactionIcons[currentReaction].color} ${reactionIcons[currentReaction].bg} ${reactionIcons[currentReaction].darkBg} hover:opacity-80 shadow-sm`
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800'
        }`}>
        {isReacting ? (
          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
        ) : (
          <>
            {currentReaction ? (
              <span className={`text-xl ${reactionIcons[currentReaction].color}`}>{reactionIcons[currentReaction].icon}</span>
            ) : (
              <ThumbsUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            )}
            <span className={`text-sm ${currentReaction ? reactionIcons[currentReaction].color : ''}`}>
              {!onReact ? "Đăng nhập để Like" : currentReaction ? `Remove ${reactionIcons[currentReaction].label}` : "Like"}
            </span>
          </>
        )}
      </Button>

      {showReactionPicker && !isReacting && onReact && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl px-3 py-3 flex items-center gap-1.5 z-50 animate-in zoom-in-95 duration-200">
          {Object.entries(reactionIcons).map(([type, { label, icon, color }]) => (
            <button 
              key={type} 
              title={currentReaction === type ? `Remove ${label}` : label} 
              onClick={() => handleReaction(type as ReactionType)}
              className={`relative p-2 hover:scale-150 transition-all duration-300 text-3xl rounded-xl ${
                currentReaction === type 
                  ? 'scale-125 ring-2 ring-red-400 dark:ring-red-600 bg-red-50 dark:bg-red-900/30' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`block transform hover:-translate-y-2 transition-transform duration-300 ${color}`}>{icon}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const ActionBtn = ({ icon: Icon, label, onClick, disabled }: { icon: any; label: string; onClick?: () => void; disabled?: boolean }) => (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl h-10 transition-all duration-300 flex-1 font-semibold border border-transparent ${
        disabled 
          ? 'text-gray-400 cursor-not-allowed bg-gray-100 dark:bg-gray-800 dark:text-gray-600'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
      }`}>
      <Icon className="h-5 w-5" />
      <span className="text-sm">{label}</span>
    </Button>
  )

  // Kiểm tra các trường hợp
  const isSharePost = post.type === 'SHARE'
  const hasRootPost = post.rootPost !== undefined

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop với z-index cao */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal Content - Full height, giữ nguyên width */}
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full h-full max-h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Cải thiện với gradient và icon đẹp hơn */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Post Details</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 hover:rotate-90 transition-all duration-300"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Scrollable Content - Chiếm toàn bộ không gian còn lại */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <Card className="rounded-none shadow-none border-0 bg-transparent">
              {/* Header với thông tin người share (nếu là bài share) - Cải thiện */}
              {isSharePost && (
                <div className="px-6 pt-4 pb-2">
                  <div className="flex items-center gap-2.5 text-sm text-gray-600 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/30">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Repeat2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium">
                      {loadingAuthor ? (
                        <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ) : authorMetadata ? (
                        <span className="text-gray-800 dark:text-gray-200">{authorMetadata.firstName} {authorMetadata.lastName}</span>
                      ) : (
                        "Unknown User"
                      )}
                      <span className="text-gray-500 dark:text-gray-400 ml-1">shared this post</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Thông tin tác giả - Cải thiện */}
              <div className="flex items-start justify-between px-6 pt-4 pb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div 
                    className="cursor-pointer hover:opacity-90 transition-all duration-300 ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 dark:hover:ring-blue-600 rounded-full hover:scale-105"
                    onClick={() => navigate(`/profile/${post.authorId}`)}
                  >
                    <Avatar 
                      src={authorMetadata?.avtUrl || "/assets/images/default.png"} 
                      alt={authorMetadata ? `${authorMetadata.firstName} ${authorMetadata.lastName}` : "User avatar"} 
                      className="h-12 w-12" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 
                      className="font-bold text-base text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                      onClick={() => navigate(`/profile/${post.authorId}`)}
                    >
                      {loadingAuthor ? (
                        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                      ) : authorMetadata ? (
                        `${authorMetadata.firstName} ${authorMetadata.lastName}`.trim()
                      ) : (
                        "Unknown User"
                      )}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      <span className="hover:underline cursor-pointer font-medium">{formatTimeAgo(post.createdAt)}</span>
                      <span className="text-gray-400 dark:text-gray-600">·</span>
                      <div className="flex items-center gap-1">
                        {React.cloneElement(getVisibilityIcon(post.visibility as CreateSharePostDto["visibility"]), { className: "h-4 w-4 text-gray-400 dark:text-gray-500" })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  {getUserId() && post.authorId === getUserId() && (
                    <PostOptionsMenu
                      postId={post.postId}
                      post={post}
                      isOwnPost={isOwnPost}
                      onDelete={onDelete}
                      onHide={onHide}
                      onReport={onReport}
                    />
                  )}
                </div>
              </div>

              {/* Nội dung của người share (nếu có) */}
              {isSharePost && post.content && (
                <div className="px-6 pt-1 pb-3">
                  <PostContentWithMentions content={post.content} mentions={post.mentions} onMentionClick={navigate} />
                </div>
              )}

              {/* Media của người share (nếu có) */}
              {isSharePost && post.medias && post.medias.length > 0 && (
                <div className={`px-6 ${post.content ? 'pb-3' : 'pb-3'}`}><MediaGrid medias={post.medias} /></div>
              )}

              {/* TRƯỜNG HỢP 1: Bài viết ORIGINAL */}
              {!isSharePost && (
                <>
                  {post.content && (
                    <div className="px-6 pt-1 pb-3">
                      <PostContentWithMentions content={post.content} mentions={post.mentions} onMentionClick={navigate} />
                    </div>
                  )}
                  {post.medias && post.medias.length > 0 && (
                    <div className={`px-6 ${post.content ? 'pb-3' : 'pb-3'}`}><MediaGrid medias={post.medias} /></div>
                  )}
                </>
              )}

              {/* TRƯỜNG HỢP 2: Bài viết SHARE có rootPost */}
              {isSharePost && hasRootPost && post.rootPost && (
                <div className="mx-6 my-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/30">
                    <div 
                      className="cursor-pointer hover:opacity-90 transition-all duration-300 ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-400 dark:hover:ring-blue-600 rounded-full hover:scale-105"
                      onClick={() => navigate(`/profile/${post.rootPost?.authorId}`)}
                    >
                      <Avatar 
                        src={rootAuthorMetadata?.avtUrl || "/assets/images/default.png"} 
                        alt={rootAuthorMetadata ? `${rootAuthorMetadata.firstName} ${rootAuthorMetadata.lastName}` : "Original author"} 
                        className="h-9 w-9" 
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="font-bold text-sm text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                        onClick={() => navigate(`/profile/${post.rootPost?.authorId}`)}
                      >
                        {loadingRootAuthor ? (
                          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        ) : rootAuthorMetadata ? (
                          `${rootAuthorMetadata.firstName} ${rootAuthorMetadata.lastName}`.trim()
                        ) : (
                          "Original Author"
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{formatTimeAgo(post.rootPost.createdAt)}</p>
                    </div>
                  </div>
                  {post.rootPost.content && (
                    <div className="px-4 py-3 bg-white/30 dark:bg-gray-900/20">
                      <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed line-clamp-4">{post.rootPost.content}</p>
                    </div>
                  )}
                  {post.rootPost.medias && post.rootPost.medias.length > 0 && (
                    <div className="pb-0">
                      <div className="grid grid-cols-2 gap-0.5 overflow-hidden">
                        {post.rootPost.medias.slice(0, 4).map((media, idx) => (
                          <div key={media.mediaId} className="relative aspect-square bg-gray-200 dark:bg-gray-700 group cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); onOpenImage(media.mediaUrl, post) }}>
                            <img src={media.mediaUrl} alt={`Root media ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 group-hover:brightness-95 transition-all duration-300" />
                            {idx === 3 && post.rootPost!.medias && post.rootPost!.medias.length > 4 && (
                              <div className="absolute inset-0 bg-gradient-to-br from-black/80 to-black/60 backdrop-blur-md flex items-center justify-center">
                                <span className="text-white text-3xl font-bold drop-shadow-lg">+{post.rootPost!.medias.length - 4}</span>
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
                <div className="mx-6 my-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/30 dark:to-gray-800/50">
                  <div className="px-5 py-8">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-inner">
                          <Lock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2">
                          This content is currently unavailable
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          This error is usually because the owner only shared the content with a small group, changed who can see it, or deleted the content.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Reactions summary - chỉ hiển thị khi đã đăng nhập */}
              {onReact && (
                <div className="px-6 py-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-3 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-2">
                    {loading ? <span className="text-sm">Loading...</span> : (
                      totalReactions > 0 ? (
                        <div 
                          className="flex items-center gap-2 hover:underline cursor-pointer group"
                          onClick={() => setShowReactionDetails(true)}
                        >
                          <div className="flex items-center -space-x-1.5">
                            {topReactions.map(([type], idx) => (
                              <div key={type} style={{ zIndex: topReactions.length - idx }}
                                className="w-6 h-6 rounded-full bg-white dark:bg-gray-900 border-2 border-white dark:border-gray-900 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                                {(() => { const cfg = reactionIcons[(type.toUpperCase() as ReactionType)]; return cfg ? <span className="text-base">{cfg.icon}</span> : null })()}
                              </div>
                            ))}
                          </div>
                          <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{totalReactions}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Chưa có reaction</span>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="hover:underline cursor-pointer font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                      {localPostStats ? `${localPostStats.commentCount || 0} comments` : '... comments'}
                    </span>
                    <span className="hover:underline cursor-pointer font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
                      {localPostStats ? `${localPostStats.shareCount || 0} shares` : '... shares'}
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/30">
                <div className="flex items-center gap-2">
                  <ReactionButton />
                  <ActionBtn 
                    icon={MessageCircle} 
                    label={`Comment${localPostStats ? ` (${localPostStats.commentCount || 0})` : ''}`} 
                    onClick={() => {}} 
                    disabled={!onReact}
                  />
                </div>
              </div>
            </Card>

            {/* Comments Section */}
            {onReact && (
              <div className="border-t-4 border-gray-100 dark:border-gray-800">
                <CommentsSection 
                  postId={post.postId} 
                  isOpen={true} 
                  onClose={() => {}} 
                  currentUserId={getUserId() || ''}
                  onCommentSuccess={handleCommentSuccess}
                />
              </div>
            )}
            
            {/* Message khi chưa đăng nhập */}
            {!onReact && (
              <div className="border-t-4 border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                <div className="px-6 py-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Đăng nhập để bình luận
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Bạn cần đăng nhập để có thể bình luận và tương tác với bài viết này.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/login'}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                  >
                    Đăng nhập ngay
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)}
        post={{ 
          postId: post.postId, 
          content: post.content, 
          medias: post.medias || [], 
          authorName: authorMetadata ? `${authorMetadata.firstName} ${authorMetadata.lastName}`.trim() : "Unknown User", 
          authorAvatar: authorMetadata?.avtUrl || "/assets/images/default.png" 
        }}
        onSuccess={() => { onShareSuccess?.() }} />

      <ReactionDetailsModal 
        isOpen={showReactionDetails}
        onClose={() => setShowReactionDetails(false)}
        targetId={post.postId}
        targetType="POST"
      />
    </>
  )
}

// Component để render content với mentions được highlight
function PostContentWithMentions({ content, mentions, onMentionClick }: { content: string; mentions?: any[]; onMentionClick?: (path: string) => void }) {
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())

  // Fetch user metadata for all mentions
  useEffect(() => {
    if (!mentions || mentions.length === 0) return

    const fetchUserMetadata = async () => {
      // Get unique user IDs that we haven't fetched yet
      const userIdsToFetch = mentions
        .map(m => m.userId)
        .filter((userId, index, self) => self.indexOf(userId) === index)
        .filter(userId => !userCache.has(userId))

      if (userIdsToFetch.length === 0) {
        return
      }

      try {
        // Fetch all user metadata in parallel
        const userPromises = userIdsToFetch.map(async (userId) => {
          try {
            const metadata = await UserService.getUserMetadata(userId)
            return { userId, metadata }
          } catch (error) {
            console.error('Failed to fetch user metadata for mention:', error)
            return {
              userId,
              metadata: {
                userId,
                firstName: 'User',
                lastName: userId.slice(0, 8),
                avtUrl: null
              }
            }
          }
        })

        const results = await Promise.all(userPromises)
        
        // Update cache with all results
        setUserCache(prevCache => {
          const updatedCache = new Map(prevCache)
          results.forEach(({ userId, metadata }) => {
            updatedCache.set(userId, metadata)
          })
          return updatedCache
        })
      } catch (error) {
        console.error('Error fetching user metadata:', error)
      }
    }

    fetchUserMetadata()
  }, [mentions]) // Only depend on mentions

  // Function to render content with hashtag highlighting
  const renderContentWithHashtags = (text: string) => {
    if (!text) return text
    
    // Regex to match hashtags (#word)
    const hashtagRegex = /#(\w+)/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      // Add text before hashtag
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      
      // Store hashtag value to avoid null reference
      const hashtagValue = match[1]
      const fullHashtag = match[0]
      
      // Add hashtag with highlighting
      parts.push(
        <span
          key={match.index}
          className="text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer bg-purple-50 dark:bg-purple-900/20 px-1 py-0.5 rounded transition-all duration-200 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          title={`#${hashtagValue}`}
          onClick={() => {
            // Navigate to hashtag page
            window.location.href = `/hashtag/${hashtagValue}`
          }}
        >
          {fullHashtag}
        </span>
      )
      
      lastIndex = match.index + match[0].length
    }
    
    // Add remaining text after last hashtag
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }
    
    return parts.length > 0 ? parts : text
  }

  // Render content with highlighted mentions and hashtags
  const renderContent = () => {
    if (!mentions || mentions.length === 0) {
      return renderContentWithHashtags(content)
    }

    // Sort mentions by startIndex to process them in order
    const sortedMentions = [...mentions].sort((a, b) => a.startIndex - b.startIndex)
    
    const parts: Array<{
      type: 'text' | 'mention'
      content: string
      startIndex: number
      endIndex: number
      userId?: string
    }> = []
    let lastIndex = 0

    sortedMentions.forEach((mention) => {
      // Add text before mention
      if (mention.startIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, mention.startIndex),
          startIndex: lastIndex,
          endIndex: mention.startIndex
        })
      }

      // Add mention
      const userMetadata = userCache.get(mention.userId)
      const displayName = userMetadata 
        ? `${userMetadata.firstName} ${userMetadata.lastName}`.trim()
        : `@user${mention.userId.slice(0, 8)}`

      parts.push({
        type: 'mention',
        content: `@${displayName}`,
        userId: mention.userId,
        startIndex: mention.startIndex,
        endIndex: mention.endIndex
      })

      lastIndex = mention.endIndex
    })

    // Add remaining text after last mention
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
        startIndex: lastIndex,
        endIndex: content.length
      })
    }

    return (
      <span className="text-base text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <span
                key={index}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                title={`@${part.userId}`}
                onClick={() => {
                  if (onMentionClick && part.userId) {
                    onMentionClick(`/profile/${part.userId}`)
                  }
                }}
              >
                {part.content}
              </span>
            )
          }
          return <span key={index}>{renderContentWithHashtags(part.content)}</span>
        })}
      </span>
    )
  }

  return renderContent()
}