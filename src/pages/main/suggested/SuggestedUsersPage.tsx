"use client"
import { useState, useEffect } from "react"
import { LeftBar, RightBar } from "@/components/layouts"
import { UserCard } from "@/components/users/UserCard"
import { UserService } from "@/lib/api/users/UserService"
import { RefreshCw, Users, AlertCircle } from "lucide-react"

import { RelationshipSuggestion } from "@/lib/types/Relationship"
import { UserMetadata } from "@/lib/types/User"
import { getUserId } from "@/lib/utils/Jwt"

interface SuggestedUser extends RelationshipSuggestion {
  userInfo: UserMetadata
}

export function SuggestedUsersPage() {
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Lấy current user ID từ auth context
  const currentUserId = getUserId() || ''

  const fetchSuggestedUsers = async () => {
    try {
      setError(null)
      const users = await UserService.getSuggestedUsersWithDetails(currentUserId)
      setSuggestedUsers(users)
    } catch (err) {
      console.error('Error fetching suggested users:', err)
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải gợi ý')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSuggestedUsers()
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchSuggestedUsers()
  }

  // Các hành động message/remove không dùng trong giao diện gợi ý kiểu Instagram

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <LeftBar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Đang tải gợi ý kết bạn...</p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <RightBar />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex">
        <LeftBar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Thử lại
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
        <RightBar />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Sidebar */}
      <LeftBar />

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-900">Gợi ý kết bạn</h1>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Đang tải...' : 'Làm mới'}
              </button>
            </div>

            <p className="text-gray-600">
              Những người bạn có thể biết dựa trên người quen chung
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {suggestedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Không có gợi ý nào
                </h3>
                <p className="text-gray-500 mb-4">
                  Chúng tôi sẽ thông báo khi có gợi ý mới cho bạn
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Làm mới
                </button>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {suggestedUsers.length} gợi ý kết bạn
                </h2>
                <div className="space-y-4">
                  {suggestedUsers.map((user) => (
                    <UserCard
                      key={user.userId}
                      userInfo={user.userInfo}
                      mutualCount={user.mutualCount}
                      onFollow={async (toUserId) => { await UserService.followUser(currentUserId, toUserId) }}
                      onUnfollow={async (toUserId) => { await UserService.unfollowUser(currentUserId, toUserId) }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <RightBar />
    </div>
  )
}
