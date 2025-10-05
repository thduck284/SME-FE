"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { Card } from "@/components/ui"
import { getPostsByUser } from "@/lib/api/posts/GetPostsByUser"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { ImageModal } from "./ImageModal"
import { usePostsReactions } from "@/lib/hooks/usePostReaction"

export function ImagesTab() {
  const [posts, setPosts] = useState<PostFullDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<{url: string, post: PostFullDto, currentIndex: number} | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Lấy tất cả postIds để fetch reactions
  const postIds = posts.map(post => post.postId)
  const { reactions, react, removeReaction, loading: reactionsLoading } = usePostsReactions(postIds)

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        const res = await getPostsByUser(5) 
        const nextCursorValue = res.meta?.nextCursor || res.nextCursor
        setPosts(res.data || res)
        setNextCursor(nextCursorValue)
        setHasMore(!!nextCursorValue)
      } catch (err: any) {
        setError(err.message || "Failed to load posts")
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  // Load more posts
  const loadMorePosts = useCallback(async () => {
    if (!nextCursor || loadingMore || !hasMore) return
    
    try {
      setLoadingMore(true)
      
      const [res] = await Promise.all([
        getPostsByUser(5, nextCursor),
        new Promise(resolve => setTimeout(resolve, 500))
      ])

      const nextCursorValue = res.meta?.nextCursor || res.nextCursor
      const newPosts = res.data || res
      setPosts(prev => [...prev, ...newPosts])
      setNextCursor(nextCursorValue)
      setHasMore(!!nextCursorValue)
    } catch (err) {
      setHasMore(false)
    } finally {
      setLoadingMore(false)
    }
  }, [nextCursor, loadingMore, hasMore])

  // Infinite scroll với Intersection Observer
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

  const getAllMedias = () => {
    const allMedias: {url: string, post: PostFullDto}[] = []
    posts.forEach(post => {
      post.medias?.forEach(media => {
        if (media.mediaUrl && (media.mediaUrl.includes('.jpg') || media.mediaUrl.includes('.jpeg') || 
            media.mediaUrl.includes('.png') || media.mediaUrl.includes('.webp'))) {
          allMedias.push({
            url: media.mediaUrl,
            post: post
          })
        }
      })
    })
    return allMedias
  }

  // Hàm xử lý mở modal ảnh
  const handleOpenImage = (imageUrl: string, post: PostFullDto) => {
    const allMedias = getAllMedias()
    const currentIndex = allMedias.findIndex(media => media.url === imageUrl)
    setSelectedImage({
      url: imageUrl,
      post: post,
      currentIndex: currentIndex
    })
  }

  // Hàm xử lý chuyển ảnh tiếp theo
  const handleNext = async () => {
    if (!selectedImage) return
    
    const allMedias = getAllMedias()
    const currentIndex = selectedImage.currentIndex
    
    // Nếu đang ở ảnh cuối cùng và có thể load thêm
    if (currentIndex === allMedias.length - 1 && hasMore) {
      await loadMorePosts()
      
      // Sau khi load xong, chuyển đến ảnh đầu tiên của batch mới
      const newAllMedias = getAllMedias()
      if (newAllMedias.length > allMedias.length) {
        const nextMedia = newAllMedias[currentIndex + 1]
        setSelectedImage({
          url: nextMedia.url,
          post: nextMedia.post,
          currentIndex: currentIndex + 1
        })
      }
    } else {
      // Chuyển đến ảnh tiếp theo bình thường
      const nextIndex = (currentIndex + 1) % allMedias.length
      const nextMedia = allMedias[nextIndex]
      
      setSelectedImage({
        url: nextMedia.url,
        post: nextMedia.post,
        currentIndex: nextIndex
      })
    }
  }

  // Hàm xử lý chuyển ảnh trước đó
  const handlePrev = () => {
    if (!selectedImage) return
    
    const allMedias = getAllMedias()
    const prevIndex = selectedImage.currentIndex === 0 
      ? allMedias.length - 1 
      : selectedImage.currentIndex - 1
    const prevMedia = allMedias[prevIndex]
    
    setSelectedImage({
      url: prevMedia.url,
      post: prevMedia.post,
      currentIndex: prevIndex
    })
  }

  // Lọc chỉ lấy các post có ảnh
  const postsWithImages = posts.filter(post => 
    post.medias && post.medias.length > 0 && post.medias.some(media => 
      media.mediaUrl && (media.mediaUrl.includes('.jpg') || media.mediaUrl.includes('.jpeg') || 
      media.mediaUrl.includes('.png') || media.mediaUrl.includes('.webp'))
    )
  )

  // Lấy tất cả ảnh từ các post
  const allImages = postsWithImages.flatMap(post => 
    post.medias!.filter(media => 
      media.mediaUrl && (media.mediaUrl.includes('.jpg') || media.mediaUrl.includes('.jpeg') || 
      media.mediaUrl.includes('.png') || media.mediaUrl.includes('.webp'))
    ).map(media => ({
      url: media.mediaUrl,
      postId: post.postId,
      mediaId: media.mediaId,
      post: post
    }))
  )

  if (loading) return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden animate-pulse border border-black">
          <div className="aspect-square bg-muted" />
        </Card>
      ))}
    </div>
  )

  if (error) return (
    <div className="text-center py-8">
      <div className="text-destructive text-lg font-semibold mb-2">Error loading images</div>
      <p className="text-muted-foreground">{error}</p>
    </div>
  )

  if (allImages.length === 0 && !loading) return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
        <span className="text-2xl">📷</span>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">No images yet</h3>
      <p className="text-muted-foreground">When you share photos, they will appear here.</p>
    </div>
  )

  const allMedias = getAllMedias()

  return (
    <>
      <div className="space-y-6">
        {/* Grid ảnh */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allImages.map((image, index) => (
            <Card 
              key={`${image.postId}-${image.mediaId}`} 
              className="overflow-hidden group cursor-pointer border border-black"
              onClick={() => handleOpenImage(image.url, image.post)}
            >
              <div className="aspect-square bg-black overflow-hidden">
                <img 
                  src={image.url} 
                  alt={`Gallery image ${index + 1}`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
            </Card>
          ))}
        </div>

        {/* Loading indicator */}
        {hasMore && (
          <div 
            ref={loadMoreRef} 
            className="flex justify-center py-8"
            style={{ minHeight: '50px' }}
          >
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading more images...</span>
            </div>
          </div>
        )}

        {/* End of content */}
        {!hasMore && allImages.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            You've seen all images
          </div>
        )}
      </div>

      {/* Image Modal */}
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
            // Truyền reactions data vào
            reactions={reactions[selectedImage.post.postId]}
            onReact={(reactionType: string) => react(selectedImage.post.postId, reactionType)}
            onRemoveReaction={() => removeReaction(selectedImage.post.postId)}
            reactionsLoading={reactionsLoading}
          />
        </div>
      )}
    </>
  )
}