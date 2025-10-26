"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { X, Users, UserPlus } from "lucide-react"
import Button from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { relationshipService } from "@/lib/api/relationship/GetRelationship"
import { userApi } from "@/lib/api/users/User"
import { UserService } from "@/lib/api/users/UserService"
import { User } from "@/lib/types/users/UserDTO"
import { getUserId } from "@/lib/utils/Jwt"

interface UserWithRelationship {
  userId: string
  firstName: string
  lastName: string
  username: string
  avtUrl: string | null
  relationshipTypes: string[]
}

interface RelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  type: "followers" | "following"
  userId: string
}

export function RelationshipModal({ isOpen, onClose, type, userId }: RelationshipModalProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithRelationship[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && userId) {
      fetchData()
    }
  }, [isOpen, userId, type])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get relationship list
      const response = type === "followers" 
        ? await relationshipService.getFollowers(userId)
        : await relationshipService.getFollowing(userId)
      
      // Get detailed information for each user
      const userPromises = response.users.map(async (userRel) => {
        try {
          const userData = await userApi.getUser(userRel.userId)
          console.log('Fetched user data:', userData)
          
          // SỬA: Kiểm tra nếu userData có property data (API response format)
          // hoặc sử dụng trực tiếp userData (User type)
          const userDetails = (userData as any).data || userData
          
          return {
            userId: userDetails.userId || userRel.userId,
            firstName: userDetails.firstName || "Unknown",
            lastName: userDetails.lastName || "User",
            username: userDetails.username || "unknown",
            avtUrl: userDetails.avtUrl || null,
            relationshipTypes: userRel.relationshipTypes
          } as UserWithRelationship
        } catch (err) {
          console.error(`Error fetching user ${userRel.userId}:`, err)
          // Return basic information if cannot get details
          return {
            userId: userRel.userId,
            firstName: "Unknown",
            lastName: "User",
            username: "unknown",
            avtUrl: null,
            relationshipTypes: userRel.relationshipTypes
          } as UserWithRelationship
        }
      })
      
      const usersData = await Promise.all(userPromises)
      console.log('Final users data:', usersData)
      setUsers(usersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while loading data")
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUser = async (targetUserId: string) => {
    try {
      const currentUserId = getUserId()
      if (!currentUserId) return

      await UserService.followUser(currentUserId, targetUserId)
      
      // Update state to show followed
      setFollowingUsers(prev => new Set([...prev, targetUserId]))
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleUserClick = (targetUserId: string) => {
    onClose() // Close modal first
    navigate(`/profile/${targetUserId}`) // Navigate to user profile
  }

  const isFollowing = (targetUserId: string) => {
    return followingUsers.has(targetUserId)
  }

  const shouldShowFollowButton = (user: UserWithRelationship) => {
    // Only show Follow button in "followers" tab
    if (type !== "followers") return false
    
    // Show Follow button if:
    // 1. Has "FOLLOWER" relationship (this user follows me)
    // 2. No "FRIEND" relationship (not friends yet)
    // 3. Not following this user yet
    const hasFollowerRelation = user.relationshipTypes.includes('FOLLOWER')
    const hasFriendRelation = user.relationshipTypes.includes('FRIEND')
    const alreadyFollowing = isFollowing(user.userId)
    
    return hasFollowerRelation && !hasFriendRelation && !alreadyFollowing
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {type === "followers" ? (
              <Users className="h-5 w-5 text-primary" />
            ) : (
              <UserPlus className="h-5 w-5 text-primary" />
            )}
            <h2 className="text-xl font-semibold text-gray-900">
              {type === "followers" ? "Followers" : "Following"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-gray-600">Loading {type}...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchData} variant="secondary">
                Try Again
              </Button>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user, index) => (
                <Card 
                  key={`${user.userId}-${index}`} 
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer border border-gray-200"
                  onClick={() => handleUserClick(user.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                        <img 
                          src={user.avtUrl || "/default.png"} 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/default.png"
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          @{user.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {shouldShowFollowButton(user) && (
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation() // Prevent navigation when clicking follow button
                            handleFollowUser(user.userId)
                          }}
                          size="sm"
                          className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          Follow
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {type === "followers" 
                  ? "No followers yet" 
                  : "Not following anyone yet"
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total: {users.length}</span>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}