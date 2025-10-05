"use client"

import { usePostsReactions } from '@/lib/hooks/usePostReaction'
import { PostItem } from './PostItem'
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { useMemo, useState } from 'react'
import { deleteApi } from '@/lib/api/posts/DeletePost'

interface PostListProps {
  posts: PostFullDto[]
  onOpenImage: (imageUrl: string, post: PostFullDto) => void
}

export function PostList({ posts, onOpenImage }: PostListProps) {
  const [postsState, setPostsState] = useState<PostFullDto[]>(posts)
  const postIds = useMemo(() => postsState.map(post => post.postId), [postsState])
  const { reactions, loading, react, removeReaction } = usePostsReactions(postIds)

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteApi.deletePost(postId)
      
      setPostsState(prevPosts => prevPosts.filter(post => post.postId !== postId))
      
      console.log('Post deleted successfully')
    } catch (error) {
      console.error('Failed to delete post:', error)
      throw error 
    }
  }

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
      {postsState.map(post => (
        <PostItem
          key={post.postId}
          post={post}
          onOpenImage={onOpenImage}
          reaction={reactions[post.postId]}
          loading={loading}
          onReact={(reactionType) => handleReact(post.postId, reactionType)}
          onDelete={handleDeletePost} 
          isOwnPost={true} 
        />
      ))}
    </div>
  )
}