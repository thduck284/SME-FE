"use client"

import { usePostsReactions } from '@/lib/hooks/usePostReaction'
import { PostItem } from './PostItem'
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { useMemo } from 'react'

interface PostListProps {
  posts: PostFullDto[]
  onOpenImage: (imageUrl: string, post: PostFullDto) => void
}

export function PostList({ posts, onOpenImage }: PostListProps) {
  const postIds = useMemo(() => posts.map(post => post.postId), [posts])
  const { reactions, loading, react, removeReaction } = usePostsReactions(postIds)

  const handleReact = async (postId: string, reactionType: string) => {
    try {
      const currentReaction = reactions[postId]?.userReaction
      if (currentReaction === reactionType) {
        await removeReaction(postId)
      } else {
        await react(postId, reactionType)
      }
    } catch (error) {
      console.error('Failed to react:', error)
    }
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostItem
          key={post.postId}
          post={post}
          onOpenImage={onOpenImage}
          reaction={reactions[post.postId]}
          loading={loading}
          onReact={(reactionType) => handleReact(post.postId, reactionType)}
        />
      ))}
    </div>
  )
}