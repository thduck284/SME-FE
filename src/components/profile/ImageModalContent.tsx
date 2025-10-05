"use client"

import { Button, Avatar } from "@/components/ui"
import { Heart, MessageCircle, Share, MoreHorizontal, Smile } from "lucide-react"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { useState } from "react"

interface ImageModalContentProps {
  post: PostFullDto
}

export function ImageModalContent({ post }: ImageModalContentProps) {
  const [comment, setComment] = useState("")

  // Hàm format thời gian
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (comment.trim()) {
      console.log("Comment submitted:", comment)
      setComment("")
    }
  }

  // Mock comments data
  const comments = [
    { id: 1, user: "John Doe", text: "Amazing photo! 😍", time: "2h ago" },
    { id: 2, user: "Jane Smith", text: "Love this! Where was this taken?", time: "1h ago" },
    { id: 3, user: "Mike Johnson", text: "Beautiful composition! 👏", time: "45m ago" }
  ]

  return (
    <div className="w-96 flex flex-col h-full bg-gray-50">
      {/* User Info & Post Content */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-start gap-3 mb-3">
          <Avatar 
            src="/image.png?height=40&width=40"
            alt="User avatar"
            className="h-10 w-10 border-2 border-primary/10"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground">Sarah Anderson</h4>
            <div className="text-sm text-muted-foreground">
              {formatTimeAgo(post.createdAt)}
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {post.content && (
          <p className="text-foreground leading-relaxed whitespace-pre-wrap text-sm">
            {post.content}
          </p>
        )}
      </div>

      {/* Stats & Actions */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            <span>24 likes</span>
            <span>8 comments</span>
            <span>2 shares</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-b border-gray-100 py-1">
          <Button variant="ghost" size="sm" className="flex-1 flex items-center gap-2 text-muted-foreground hover:text-red-500 hover:bg-gray-50">
            <Heart className="h-5 w-5" />
            <span className="text-sm">Like</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex-1 flex items-center gap-2 text-muted-foreground hover:text-blue-500 hover:bg-gray-50">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">Comment</span>
          </Button>
          
          <Button variant="ghost" size="sm" className="flex-1 flex items-center gap-2 text-muted-foreground hover:text-green-500 hover:bg-gray-50">
            <Share className="h-5 w-5" />
            <span className="text-sm">Share</span>
          </Button>
        </div>
      </div>

      {/* Comments Section - Chiếm toàn bộ không gian còn lại */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#f8fafc' }}>
        <div className="p-4 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar 
                src="/image.png?height=32&width=32"
                alt="User avatar"
                className="h-8 w-8"
              />
              <div className="flex-1">
                <div className="bg-white rounded-2xl px-3 py-2 border border-gray-200">
                  <div className="font-semibold text-sm">{comment.user}</div>
                  <p className="text-sm">{comment.text}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 px-2">
                  <span>Like</span>
                  <span>Reply</span>
                  <span>{comment.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comment Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleCommentSubmit} className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-3 py-2 border border-gray-200">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-transparent border-0 focus:outline-none text-sm"
            />
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            type="submit" 
            variant="ghost" 
            size="sm"
            disabled={!comment.trim()}
            className="text-blue-500 hover:text-blue-600 disabled:text-gray-400"
          >
            Post
          </Button>
        </form>
      </div>
    </div>
  )
}