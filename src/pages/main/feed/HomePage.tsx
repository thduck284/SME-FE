"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { LeftBar, RightBar } from "@/components/layouts"
import { Card, Button } from "@/components/ui"
import { getFeed } from "@/lib/api/posts/GetFeed"
import { getBatchPosts } from "@/lib/api/posts/GetBatchPosts"
import { deleteApi } from "@/lib/api/posts/DeletePost"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { MessageCircle } from "lucide-react"
import { ImageModal } from "@/components/profile/ImageModal"
import { PostList } from "@/components/posts/PostList" 
import { usePostsReactions } from "@/lib/hooks/usePostReaction" 

export function HomePage() {
  const [posts, setPosts] = useState<PostFullDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; post: PostFullDto; currentIndex: number } | null>(
    null,
  )
  const [lastSeenAt, setLastSeenAt] = useState<Date | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const postIds = posts.map(post => post.postId)
  const { reactions, react, removeReaction, loading: reactionsLoading } = usePostsReactions(postIds)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const res = await getFeed(10)
        
        // Feed API returns array of objects with postId field, need to extract postIds
        const feedItems = res.data || res
        const postIds = feedItems.map((item: any) => item.postId)
        
        if (postIds && postIds.length > 0) {
          const fullPosts = await getBatchPosts(postIds)
          setPosts(fullPosts)
          
          // Set lastSeenAt to the oldest post's createdAt for pagination
          if (fullPosts.length > 0) {
            const oldestPost = fullPosts[fullPosts.length - 1]
            setLastSeenAt(new Date(oldestPost.createdAt))
            setHasMore(feedItems.length === 10) // If we got less than 10, no more posts
          } else {
            setHasMore(false)
          }
        } else {
          setPosts([])
          setHasMore(false)
        }
      } catch (err: any) {
        setError(err.message || "Failed to load posts")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const loadMorePosts = useCallback(async () => {
    if (!lastSeenAt || loadingMore || !hasMore) {
      return
    }

    try {
      setLoadingMore(true)
      
      const [res] = await Promise.all([
        getFeed(10, lastSeenAt),
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      console.log(res)

      // Feed API returns array of objects with postId field, need to extract postIds
      const feedItems = res.data || res
      const postIds = feedItems.map((item: any) => item.postId)
      
      if (postIds && postIds.length > 0) {
        const newPosts = await getBatchPosts(postIds)
        
        if (newPosts.length > 0) {
          setPosts((prev) => [...prev, ...newPosts])
          // Update lastSeenAt to the oldest post's createdAt for next pagination
          const oldestPost = newPosts[newPosts.length - 1]
          setLastSeenAt(new Date(oldestPost.createdAt))
          setHasMore(feedItems.length === 10) // If we got less than 10, no more posts
        } else {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (err) {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [lastSeenAt, loadingMore, hasMore])

  useEffect(() => {
    if (!hasMore || !loadMoreRef.current) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !loadingMore) {
          loadMorePosts()
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      },
    )

    observer.observe(loadMoreRef.current)
    observerRef.current = observer

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [hasMore, loadingMore, loadMorePosts])

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteApi.deletePost(postId)
      setPosts(prev => prev.filter(post => post.postId !== postId))
      console.log('Post deleted successfully')
    } catch (error) {
      console.error('Failed to delete post:', error)
      throw error
    }
  }

  const getAllMedias = () => {
    const allMedias: { url: string; post: PostFullDto }[] = []
    posts.forEach((post) => {
      post.medias?.forEach((media) => {
        if (media.mediaUrl && (media.mediaUrl.includes('.jpg') || media.mediaUrl.includes('.jpeg') || 
            media.mediaUrl.includes('.png') || media.mediaUrl.includes('.webp'))) {
          allMedias.push({
            url: media.mediaUrl,
            post: post,
          })
        }
      })
    })
    return allMedias
  }

  const handleOpenImage = (imageUrl: string, post: PostFullDto) => {
    const allMedias = getAllMedias()
    const currentIndex = allMedias.findIndex((media) => media.url === imageUrl)
    setSelectedImage({
      url: imageUrl,
      post: post,
      currentIndex: currentIndex,
    })
  }

  const handleNext = async () => {
    if (!selectedImage) return

    const allMedias = getAllMedias()
    const currentIndex = selectedImage.currentIndex

    if (currentIndex === allMedias.length - 1 && hasMore) {
      await loadMorePosts()

      const newAllMedias = getAllMedias()
      if (newAllMedias.length > allMedias.length) {
        const nextMedia = newAllMedias[currentIndex + 1]
        setSelectedImage({
          url: nextMedia.url,
          post: nextMedia.post,
          currentIndex: currentIndex + 1,
        })
      }
    } else {
      const nextIndex = (currentIndex + 1) % allMedias.length
      const nextMedia = allMedias[nextIndex]

      setSelectedImage({
        url: nextMedia.url,
        post: nextMedia.post,
        currentIndex: nextIndex,
      })
    }
  }

  const handlePrev = () => {
    if (!selectedImage) return

    const allMedias = getAllMedias()
    const prevIndex = selectedImage.currentIndex === 0 ? allMedias.length - 1 : selectedImage.currentIndex - 1
    const prevMedia = allMedias[prevIndex]

    setSelectedImage({
      url: prevMedia.url,
      post: prevMedia.post,
      currentIndex: prevIndex,
    })
  }

  const handleReact = async (reactionType: string) => {
    if (!selectedImage) return
    console.log('React to post:', selectedImage.post.postId, reactionType)
    try {
      await react(selectedImage.post.postId, reactionType)
    } catch (error) {
      console.error('Failed to react:', error)
    }
  }

  const handleRemoveReaction = async () => {
    if (!selectedImage) return
    console.log('Remove reaction from post:', selectedImage.post.postId)
    try {
      await removeReaction(selectedImage.post.postId)
    } catch (error) {
      console.error('Failed to remove reaction:', error)
    }
  }

  if (loading) return <FeedLoading />
  if (error) return <FeedError error={error} />
  if (posts.length === 0) return <FeedEmpty />

  const allMedias = getAllMedias()

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Fixed */}
      <div className="fixed left-0 top-0 h-screen z-10">
        <LeftBar />
      </div>

      {/* Main Feed - Sát với sidebars */}
      <main className="flex-1 bg-gray-50 p-6 ml-64 mr-64">
        <div className="max-w-4xl mx-auto">
          <PostList 
            posts={posts} 
            onOpenImage={handleOpenImage}
            onDeletePost={handleDeletePost}
          />

          {hasMore && (
            <div 
              ref={loadMoreRef} 
              className="flex justify-center py-8"
              style={{ minHeight: '50px' }}
            >
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading more posts...</span>
              </div>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">You've reached the end of posts</div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Fixed */}
      <div className="fixed right-0 top-0 h-screen z-10">
        <RightBar />
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50">
          <ImageModal
            imageUrl={selectedImage.url}
            post={selectedImage.post}
            onClose={() => setSelectedImage(null)}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={allMedias.length > 1 || hasMore}
            hasPrev={allMedias.length > 1}
            isLoading={loadingMore}
            reactions={reactions[selectedImage.post.postId]}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
            reactionsLoading={reactionsLoading}
          />
        </div>
      )}
    </div>
  )
}

function FeedLoading() {
  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Fixed */}
      <div className="fixed left-0 top-0 h-screen z-10">
        <LeftBar />
      </div>

      {/* Main Feed - Sát với sidebars */}
      <main className="flex-1 bg-gray-50 p-6 ml-64 mr-64">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/6" />
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Right Sidebar - Fixed */}
      <div className="fixed right-0 top-0 h-screen z-10">
        <RightBar />
      </div>
    </div>
  )
}

function FeedError({ error }: { error: string }) {
  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Fixed */}
      <div className="fixed left-0 top-0 h-screen z-10">
        <LeftBar />
      </div>

      {/* Main Feed - Sát với sidebars */}
      <main className="flex-1 bg-gray-50 p-6 ml-64 mr-64">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <div className="text-destructive text-lg font-semibold mb-2">Error loading posts</div>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </Card>
        </div>
      </main>

      {/* Right Sidebar - Fixed */}
      <div className="fixed right-0 top-0 h-screen z-10">
        <RightBar />
      </div>
    </div>
  )
}

function FeedEmpty() {
  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar - Fixed */}
      <div className="fixed left-0 top-0 h-screen z-10">
        <LeftBar />
      </div>

      {/* Main Feed - Sát với sidebars */}
      <main className="flex-1 bg-gray-50 p-6 ml-64 mr-64">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Follow some users to see their posts in your feed.</p>
          </Card>
        </div>
      </main>

      {/* Right Sidebar - Fixed */}
      <div className="fixed right-0 top-0 h-screen z-10">
        <RightBar />
      </div>
    </div>
  )
}
