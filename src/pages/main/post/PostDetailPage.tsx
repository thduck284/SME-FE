"use client"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { LeftBar, RightBar } from "@/components/layouts"
import { PostDetailModal } from "@/components/posts/PostDetailModal"
import { getPostById } from "@/lib/api/posts/GetPostById"
import { getPublicPostById } from "@/lib/api/posts/GetPublicPostById"
import { RefreshCw, ArrowLeft, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui"
import { getUserId } from "@/lib/utils/Jwt"
import { usePostReactions } from "@/lib/hooks/usePostReaction"
import { usePostStats } from "@/lib/hooks/usePostStats"
import { useSocket } from "@/lib/context/SocketContext"
import { useLiveness } from "@/lib/context/LivenessSocketContext"

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Kiểm tra xem user đã login chưa
  const currentUserId = getUserId()
  const isLoggedIn = !!currentUserId

  // Hooks cho reaction và stats (chỉ sử dụng khi đã đăng nhập)
  const { 
    reaction, 
    loading: reactionLoading, 
    react: reactToPost,
    removeReaction: removeReactionFromPost
  } = usePostReactions(postId || '', isLoggedIn)
  
  const { 
    stats, 
    loading: statsLoading, 
    fetchPostStats 
  } = usePostStats()

  // Socket contexts (sẽ tự động chỉ kết nối khi đã đăng nhập)
  useSocket()
  useLiveness()

  useEffect(() => {
    if (postId) {
      fetchPost()
    }
  }, [postId])

  useEffect(() => {
    // Fetch post stats khi đã đăng nhập và có post
    if (isLoggedIn && post?.postId) {
      fetchPostStats(post.postId)
    }
  }, [isLoggedIn, post?.postId, fetchPostStats])

  const fetchPost = async () => {
    try {
      setLoading(true)
      setError(null)
      // Sử dụng public API khi chưa login, authenticated API khi đã login
      const postData = isLoggedIn 
        ? await getPostById(postId!)
        : await getPublicPostById(postId!)
      setPost(postData)
    } catch (err) {
      console.error('Error fetching post:', err)
      setError(err instanceof Error ? err.message : 'Không thể tải bài viết')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigate(-1) // Go back to previous page
  }

  const handleReact = async (reactionType: string) => {
    if (!isLoggedIn || !postId) return
    try {
      // Nếu đã có reaction và click cùng reaction type thì remove
      if (reaction?.userReaction === reactionType) {
        await removeReactionFromPost()
      } else {
        await reactToPost(reactionType)
      }
    } catch (error) {
      console.error('Failed to react to post:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex">
        {isLoggedIn && <LeftBar />}
        <main className={`${isLoggedIn ? 'flex-1' : 'w-full'} bg-gray-50 p-6`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Đang tải bài viết...</p>
                  {isLoggedIn && statsLoading && (
                    <p className="text-gray-500 text-sm mt-2">Đang tải thống kê...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        {isLoggedIn && <RightBar />}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex">
        {isLoggedIn && <LeftBar />}
        <main className={`${isLoggedIn ? 'flex-1' : 'w-full'} bg-gray-50 p-6`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{error}</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={fetchPost} variant="secondary">
                      Thử lại
                    </Button>
                    <Button onClick={handleBack} variant="primary">
                      Quay lại
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        {isLoggedIn && <RightBar />}
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex">
        {isLoggedIn && <LeftBar />}
        <main className={`${isLoggedIn ? 'flex-1' : 'w-full'} bg-gray-50 p-6`}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Không tìm thấy bài viết</p>
                  <Button onClick={handleBack} variant="primary">
                    Quay lại
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
        {isLoggedIn && <RightBar />}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {isLoggedIn && <LeftBar />}
      <main className={`${isLoggedIn ? 'flex-1' : 'w-full'} bg-gray-50 p-6`}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBack}
                variant="ghost"
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Bài viết</h1>
              {!isLoggedIn && (
                <div className="ml-auto">
                  <Button 
                    onClick={() => navigate('/login')} 
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Đăng nhập để tương tác
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Post Content */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <PostDetailModal
              post={post}
              isOpen={true}
              onClose={handleBack}
              onOpenImage={() => {}}
              reaction={isLoggedIn ? reaction : undefined}
              loading={reactionLoading}
              onReact={isLoggedIn ? handleReact : undefined}
              onShareSuccess={() => {}}
              isOwnPost={post?.authorId === currentUserId}
              onEdit={() => {}}
              onDelete={() => {}}
              onHide={() => {}}
              onReport={() => {}}
              postStats={isLoggedIn && post?.postId ? stats[post.postId] : undefined}
            />
          </div>
        </div>
      </main>
      {isLoggedIn && <RightBar />}
    </div>
  )
}
