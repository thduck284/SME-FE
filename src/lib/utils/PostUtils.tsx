import { Globe, Lock, Users, UserPlus } from "lucide-react"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"
import React from "react"

export function getVisibilityIcon(visibility?: CreatePostDto["visibility"]): React.ReactElement {
  switch (visibility) {
    case "PUBLIC":
      return <Globe className="w-4 h-4" />
    case "PRIVATE":
      return <Lock className="w-4 h-4" />
    case "FRIEND":
      return <Users className="w-4 h-4" />
    case "FOLLOWER":
      return <UserPlus className="w-4 h-4" />
    default:
      return <Globe className="w-4 h-4" />
  }
}

export const VISIBILITY_OPTIONS: { value: CreatePostDto["visibility"]; label: string }[] = [
  { value: "PUBLIC", label: "Public" },
  { value: "PRIVATE", label: "Only me" },
  { value: "FRIEND", label: "Friends" },
  { value: "FOLLOWER", label: "Followers" },
]

import { ImageIcon, VideoIcon, MapPin } from "lucide-react"

export const formatTimeAgo = (dateString: string): string => {
  if (!dateString) return "Just now"
  
  const date = new Date(dateString)
  
  // Kiểm tra nếu date không hợp lệ
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString)
    return "Just now"
  }
  
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInSeconds < 60) return "Just now"
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  const isCurrentYear = date.getFullYear() === now.getFullYear()
  
  if (isCurrentYear) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } else {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}

export const getTypeIcon = (type: string) => {
  switch (type) {
    case "IMAGE":
      return <ImageIcon className="h-4 w-4" />
    case "VIDEO":
      return <VideoIcon className="h-4 w-4" />
    case "LOCATION":
      return <MapPin className="h-4 w-4" />
    default:
      return null
  }
}