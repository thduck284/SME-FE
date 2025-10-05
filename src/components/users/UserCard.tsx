"use client"
import { useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui"
import { Button } from "@/components/ui"
// no icons needed for minimal Instagram-like look

interface UserInfo {
  userId: string
  firstName: string
  lastName: string
  avtUrl: string | null
}

interface UserCardProps {
  userInfo: UserInfo
  mutualCount: number
  isFollowing?: boolean
  onFollow?: (userId: string) => Promise<void> | void
  onUnfollow?: (userId: string) => Promise<void> | void
  onAddFriend?: (userId: string) => void
}

export function UserCard({ 
  userInfo, 
  mutualCount, 
  isFollowing,
  onFollow,
  onUnfollow,
  onAddFriend, 
}: UserCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [hasFollowed, setHasFollowed] = useState(false)

  const handleAddFriend = async () => {
    if (!onAddFriend) return
    
    setIsLoading(true)
    try {
      await onAddFriend(userInfo.userId)
      setHasFollowed(true)
    } catch (error) {
      console.error('Error adding friend:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollow = async () => {
    if (!onFollow) return
    setIsLoading(true)
    try {
      await onFollow(userInfo.userId)
      setHasFollowed(true)
    } catch (error) {
      console.error('Error following user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Chỉ hiển thị hành động Theo dõi theo phong cách gợi ý Instagram

  const handleUnfollow = async () => {
    if (!onUnfollow) return
    setIsLoading(true)
    try {
      await onUnfollow(userInfo.userId)
      setHasFollowed(false)
    } catch (error) {
      console.error('Error unfollowing user:', error)
    } finally {
      setIsLoading(false)
    }
  }

  
  

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 hover:shadow-sm transition">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12">
          <AvatarImage 
            src={userInfo.avtUrl || undefined} 
            alt={`${userInfo.firstName} ${userInfo.lastName}`} 
          />
          <AvatarFallback>
            {userInfo.firstName[0]}{userInfo.lastName[0]}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {userInfo.firstName} {userInfo.lastName}
          </h3>
          <p className="text-xs text-gray-500 truncate">{mutualCount} người quen</p>
        </div>

        {/* Actions */}
        <div className="shrink-0">
          {isFollowing || hasFollowed ? (
            <Button
              onClick={handleUnfollow}
              disabled={isLoading}
              className="rounded-full bg-black text-white hover:bg-black px-4 py-1.5 text-sm font-semibold"
            >
              {isLoading ? "Đang xử lý..." : "Đang theo dõi"}
            </Button>
          ) : (
            <Button
              onClick={onFollow ? handleFollow : handleAddFriend}
              disabled={isLoading}
              className="rounded-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold"
            >
              {isLoading ? "Đang xử lý..." : "Theo dõi"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
