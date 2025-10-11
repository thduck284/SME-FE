import { useState, useEffect } from "react"
import { X, Users, UserPlus } from "lucide-react"
import Button from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { relationshipService } from "@/lib/api/relationship/GetRelationship"
import { userApi } from "@/lib/api/users/User"
import { UserService } from "@/lib/api/users/UserService"
import { User } from "@/lib/types/users/UserDTO"
import { getUserId } from "@/lib/utils/Jwt"

interface UserWithRelationship extends User {
  relationshipTypes: string[]
}

interface RelationshipModalProps {
  isOpen: boolean
  onClose: () => void
  type: "followers" | "following"
  userId: string
}

export function RelationshipModal({ isOpen, onClose, type, userId }: RelationshipModalProps) {
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
      
      // Lấy danh sách relationship
      const response = type === "followers" 
        ? await relationshipService.getFollowers(userId)
        : await relationshipService.getFollowing(userId)
      
      // Lấy thông tin chi tiết của từng user
      const userPromises = response.users.map(async (userRel) => {
        try {
          // Sử dụng API getUser mới từ User.tsx
          const userData = await userApi.getUser(userRel.userId)
          
          return {
            ...userData,
            relationshipTypes: userRel.relationshipTypes
          } as UserWithRelationship
        } catch (err) {
          console.error(`Error fetching user ${userRel.userId}:`, err)
          // Trả về thông tin cơ bản nếu không lấy được chi tiết
          return {
            id: 0,
            userId: userRel.userId,
            firstName: "Unknown",
            lastName: "User",
            username: "unknown",
            email: "unknown@example.com",
            avtUrl: undefined,
            relationshipTypes: userRel.relationshipTypes
          } as UserWithRelationship
        }
      })
      
      const usersData = await Promise.all(userPromises)
      setUsers(usersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUser = async (targetUserId: string) => {
    try {
      const currentUserId = getUserId()
      if (!currentUserId) return

      await UserService.followUser(currentUserId, targetUserId)
      
      // Cập nhật state để hiển thị đã follow
      setFollowingUsers(prev => new Set([...prev, targetUserId]))
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const isFollowing = (targetUserId: string) => {
    return followingUsers.has(targetUserId)
  }

  const shouldShowFollowButton = (user: UserWithRelationship) => {
    // Chỉ hiển thị button Follow trong tab "followers"
    if (type !== "followers") return false
    
    // Hiển thị button Follow nếu:
    // 1. Có quan hệ "FOLLOWER" (user này follow mình)
    // 2. Không có quan hệ "FRIEND" (chưa là bạn)
    // 3. Chưa follow user này
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
              {type === "followers" ? "Người theo dõi" : "Đang theo dõi"}
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
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchData} variant="secondary">
                Thử lại
              </Button>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user, index) => (
                <Card key={`${user.userId}-${index}`} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                      {user.avtUrl && user.avtUrl.trim() !== '' ? (
                        <img 
                          src={user.avtUrl} 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) {
                              fallback.classList.remove('hidden')
                            }
                          }}
                        />
                      ) : (
                        <img 
                          src="/default.png" 
                          alt={`${user.firstName} ${user.lastName}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const fallback = target.nextElementSibling as HTMLElement
                            if (fallback) {
                              fallback.classList.remove('hidden')
                            }
                          }}
                        />
                      )}
                      <Users className="h-6 w-6 text-primary hidden" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        @{user.username || user.displayName || `${user.firstName || 'user'}.${user.lastName || 'name'}` || user.userId}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {shouldShowFollowButton(user) && (
                        <Button 
                          onClick={() => handleFollowUser(user.userId)}
                          size="sm"
                          className="text-xs px-3 py-1"
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
                  ? "Chưa có người theo dõi nào" 
                  : "Chưa theo dõi ai"
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Tổng cộng: {users.length}</span>
            <Button onClick={onClose} variant="secondary">
              Đóng
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
