"use client"

import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Card, Avatar, Button } from "@/components/ui"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { CreateSharePostDto } from "@/lib/types/posts/CreatePostDto"
import { ReactionType, reactionIcons } from "@/lib/constants/reactions"
import { formatTimeAgo, getVisibilityIcon } from "@/lib/utils/PostUtils"
import { CommentsSection } from "./CommentsSection"
import { ShareModal } from "./ShareModal"
import { PostOptionsMenu } from "./PostOptionsMenu"
import { PostDetailModal } from "./PostDetailModal"
import { MessageCircle, Share, Repeat2, Lock, ThumbsUp } from "lucide-react"
import { UserService } from "@/lib/api/users/UserService"
import type { PostStats } from "@/lib/api/posts/PostStats"
import type { UserMetadata } from "@/lib/types/User"

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
  const navigate = useNavigate()
  const [showComments, setShowComments] = useState(false)
  const [showPostDetailModal, setShowPostDetailModal] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [authorMetadata, setAuthorMetadata] = useState<UserMetadata | null>(null)
  const [loadingAuthor, setLoadingAuthor] = useState(true)
  
  // Debug log
  
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Fetch author metadata
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
  // Chuẩn hóa về chữ hoa để khớp enum ReactionType khi hiển thị UI
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
            <img src={media.mediaUrl} alt={`Media ${idx + 1}`} className="w-full h-full object-contain transition-all duration-300 group-hover:brightness-95 bg-gray-100" />
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
              <span className={`text-lg ${reactionIcons[currentReaction].color}`}>{reactionIcons[currentReaction].icon}</span>
            ) : (
              <ThumbsUp className="h-[18px] w-[18px] text-gray-600 dark:text-gray-400" />
            )}
            <span className={`text-[15px] font-semibold ${currentReaction ? reactionIcons[currentReaction].color : ''}`}>{currentReaction ? reactionIcons[currentReaction].label : "Like"}</span>
          </>
        )}
      </Button>

      {showReactionPicker && !isReacting && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-xl px-2 py-2 flex items-center gap-1 z-50">
          {Object.entries(reactionIcons).map(([type, { label, icon, color }]) => (
            <button key={type} title={label} onClick={() => handleReaction(type as ReactionType)}
              className={`relative p-1 hover:scale-150 transition-all duration-200 text-2xl rounded-full ${currentReaction === type ? 'scale-125' : ''}`}>
              <span className={`block transform hover:-translate-y-1 transition-transform ${color}`}>{icon}</span>
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
              <span className="font-normal">
                {loadingAuthor ? (
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : authorMetadata ? (
                  `${authorMetadata.firstName} ${authorMetadata.lastName} shared a post`
                ) : (
                  "Unknown User shared a post"
                )}
              </span>
            </div>
          </div>
        )}

        {/* Thông tin tác giả */}
        <div className="flex items-start justify-between px-4 pt-3 pb-2">
          <div className="flex items-start gap-3 flex-1">
            <div 
              className="cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-blue-200 dark:hover:ring-blue-800 rounded-full"
              onClick={() => navigate(`/profile/${post.authorId}`)}
            >
              <Avatar 
                src={authorMetadata?.avtUrl || "/assets/images/default.png"} 
                alt={authorMetadata ? `${authorMetadata.firstName} ${authorMetadata.lastName}` : "User avatar"} 
                className="h-10 w-10" 
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 
                className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
                onClick={() => navigate(`/profile/${post.authorId}`)}
              >
                {loadingAuthor ? (
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : authorMetadata ? (
                  `${authorMetadata.firstName} ${authorMetadata.lastName}`.trim()
                ) : (
                  "Unknown User"
                )}
              </h4>
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
            <PostContentWithMentions content={post.content} mentions={post.mentions} onMentionClick={navigate} />
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
                <PostContentWithMentions content={post.content} mentions={post.mentions} onMentionClick={navigate} />
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
              <div 
                className="cursor-pointer hover:opacity-90 transition-opacity ring-2 ring-transparent hover:ring-blue-200 dark:hover:ring-blue-800 rounded-full"
                onClick={() => navigate(`/profile/${post.authorId}`)}
              >
                <Avatar 
                  src={authorMetadata?.avtUrl || "/assets/images/default.png"} 
                  alt={authorMetadata ? `${authorMetadata.firstName} ${authorMetadata.lastName}` : "Original author"} 
                  className="h-8 w-8" 
                />
              </div>
              <div className="flex-1 min-w-0">
                <p 
                  className="font-semibold text-[15px] text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
                  onClick={() => navigate(`/profile/${post.authorId}`)}
                >
                  {loadingAuthor ? (
                    <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ) : authorMetadata ? (
                    `${authorMetadata.firstName} ${authorMetadata.lastName}`.trim()
                  ) : (
                    "Original Author"
                  )}
                </p>
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


        {/* Reactions summary */}
        {totalReactions > 0 && (
          <div className="px-4 py-2 flex items-center justify-between text-[15px] text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 mt-3">
            <div className="flex items-center gap-1">
              {loading ? <span className="text-sm">Loading...</span> : (
                <div className="flex items-center gap-1.5 hover:underline cursor-pointer">
                  <div className="flex items-center -space-x-1">
                    {topReactions.map(([type], idx) => (
                      <div key={type} style={{ zIndex: topReactions.length - idx }}
                        className="w-[18px] h-[18px] rounded-full bg-white dark:bg-gray-900 border border-white dark:border-gray-900 flex items-center justify-center">
                        {(() => { const cfg = reactionIcons[(type.toUpperCase() as ReactionType)]; return cfg ? <span className="text-sm">{cfg.icon}</span> : null })()}
                      </div>
                    ))}
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
              onClick={() => setShowPostDetailModal(true)} 
            />
            <ActionBtn 
              icon={Share} 
              label={`Share${postStats ? ` (${postStats.shareCount || 0})` : ''}`} 
              onClick={() => setShowShareModal(true)} 
            />
          </div>
        </div>

        <CommentsSection 
          postId={post.postId} 
          isOpen={showComments} 
          onClose={() => setShowComments(false)} 
          currentUserId="572a51cc-38a3-4225-a7f2-203a514293f5" // TODO: Get from auth context
        />
      </Card>

      <PostDetailModal
        post={post}
        isOpen={showPostDetailModal}
        onClose={() => setShowPostDetailModal(false)}
        onOpenImage={onOpenImage}
        reaction={reaction}
        loading={loading}
        onReact={onReact}
        onShareSuccess={onShareSuccess}
        isOwnPost={isOwnPost}
        onEdit={onEdit}
        onDelete={onDelete}
        onSave={onSave}
        onPin={onPin}
        onHide={onHide}
        onReport={onReport}
        postStats={postStats}
      />

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)}
        post={{ 
          postId: post.postId, 
          content: post.content, 
          medias: post.medias || [], 
          authorName: authorMetadata ? `${authorMetadata.firstName} ${authorMetadata.lastName}`.trim() : "Unknown User", 
          authorAvatar: authorMetadata?.avtUrl || "/assets/images/default.png" 
        }}
        onSuccess={() => { onShareSuccess?.() }} />
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

  // Render content with highlighted mentions
  const renderContent = () => {
    // Ensure content is a valid string
    const safeContent = content || ''
    
    if (!mentions || mentions.length === 0) {
      return <span className="text-[15px] text-gray-900 dark:text-gray-100 leading-[1.3333] whitespace-pre-wrap break-words">{safeContent}</span>
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
          content: safeContent.slice(lastIndex, mention.startIndex),
          startIndex: lastIndex,
          endIndex: mention.startIndex
        })
      }

      // Add mention
      const userMetadata = userCache.get(mention.userId)
      const displayName = userMetadata 
        ? `${userMetadata.firstName || ''} ${userMetadata.lastName || ''}`.trim()
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
    if (lastIndex < safeContent.length) {
      parts.push({
        type: 'text',
        content: safeContent.slice(lastIndex),
        startIndex: lastIndex,
        endIndex: safeContent.length
      })
    }

    return (
      <span className="text-[15px] text-gray-900 dark:text-gray-100 leading-[1.3333] whitespace-pre-wrap break-words">
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <span
                key={index}
                className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer"
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
          return <span key={index}>{part.content}</span>
        })}
      </span>
    )
  }

  return renderContent()
}