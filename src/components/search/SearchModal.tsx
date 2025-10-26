"use client"

import { Search, X, User, Users, FileText, Hash } from "lucide-react"
import { useUserSearch } from "@/lib/hooks/useUserSearch"
import { UserService } from "@/lib/api/users/UserService"
import { getUserId } from "@/lib/utils/Jwt"
import { Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Button from "@/components/ui/Button"
import { getPopularHashtags, type PopularHashtagDto } from "@/lib/api/posts/GetPopularHashtags"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const navigate = useNavigate()
  const {
    users,
    isLoading,
    error,
    searchKeyword,
    pagination,
    handleSearchChange,
    loadMoreUsers,
    clearSearch
  } = useUserSearch()

  // State cho tabs
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'hashtags'>('users')
  
  // State cho popular hashtags
  const [popularHashtags, setPopularHashtags] = useState<PopularHashtagDto[]>([])
  const [loadingHashtags, setLoadingHashtags] = useState(false)
  
  // State để lưu relationships
  const [relationships, setRelationships] = useState<Record<string, any>>({})
  const [loadingRelationships, setLoadingRelationships] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  
  // Handler để search posts
  const handleSearchPosts = () => {
    if (searchKeyword.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchKeyword)}`)
      onClose()
    }
  }

  // Handler cho Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (activeTab === 'users') {
        // Nếu đang ở tab users, không làm gì (users search tự động)
        return
      } else if (activeTab === 'posts') {
        // Nếu đang ở tab posts, search posts
        handleSearchPosts()
      } else if (activeTab === 'hashtags') {
        // Nếu đang ở tab hashtags, search posts by hashtag
        handleSearchHashtag()
      }
    }
  }

  // Handler để search posts by hashtag
  const handleSearchHashtag = () => {
    if (searchKeyword.trim()) {
      // Remove # if user typed it
      const hashtag = searchKeyword.replace(/^#/, '')
      navigate(`/hashtag/${hashtag}`)
      onClose()
    }
  }

  // Handler để click hashtag
  const handleHashtagClick = (hashtag: string) => {
    navigate(`/hashtag/${hashtag}`)
    onClose()
  }

  // Fetch popular hashtags
  useEffect(() => {
    const fetchPopularHashtags = async () => {
      if (activeTab !== 'hashtags') return
      
      try {
        setLoadingHashtags(true)
        const res = await getPopularHashtags(20, 7) // 20 hashtags trong 7 ngày
        setPopularHashtags(res.data.hashtags || [])
      } catch (error) {
        console.error('Failed to fetch popular hashtags:', error)
      } finally {
        setLoadingHashtags(false)
      }
    }

    fetchPopularHashtags()
  }, [activeTab])

  // Fetch relationship cho mỗi user
  useEffect(() => {
    const fetchRelationships = async () => {
      if (users.length === 0) return
      
      const currentUserId = getUserId()
      if (!currentUserId) return

      for (const user of users) {
        // Không fetch relationship cho chính mình
        if (user.userId === currentUserId) continue
        
        if (relationships[user.userId] || loadingRelationships.has(user.userId)) continue
        
        setLoadingRelationships(prev => new Set(prev).add(user.userId))
        
        try {
          const relationship = await UserService.getRelationship(currentUserId, user.userId)
          setRelationships(prev => ({
            ...prev,
            [user.userId]: relationship
          }))
        } catch (error) {
          console.error(`Failed to fetch relationship for user ${user.userId}:`, error)
        } finally {
          setLoadingRelationships(prev => {
            const newSet = new Set(prev)
            newSet.delete(user.userId)
            return newSet
          })
        }
      }
    }

    fetchRelationships()
  }, [users, relationships, loadingRelationships])

  // Hàm xử lý relationship actions
  const handleRelationshipAction = async (userId: string, action: string) => {
    const currentUserId = getUserId()
    if (!currentUserId) return

    setActionLoading(prev => new Set(prev).add(userId))
    
    try {
      switch (action) {
        case 'follow':
          await UserService.followUser(currentUserId, userId)
          break
        case 'unfollow':
          await UserService.unfollowUser(currentUserId, userId)
          break
        default:
          console.warn('Unknown action:', action)
          return
      }
      
      // Refresh relationship data
      const relationship = await UserService.getRelationship(currentUserId, userId)
      setRelationships(prev => ({
        ...prev,
        [userId]: relationship
      }))
    } catch (error) {
      console.error('Error handling relationship action:', error)
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(userId)
        return newSet
      })
    }
  }

  // Hàm xác định button text và action dựa trên relationship
  const getRelationshipButton = (userId: string) => {
    const currentUserId = getUserId()
    
    // Nếu là chính mình thì không hiển thị button
    if (currentUserId === userId) {
      return null
    }
    
    const relationship = relationships[userId]
    if (!relationship) {
      return {
        text: 'Theo dõi',
        variant: 'primary' as const,
        disabled: false,
        action: 'follow'
      }
    }

    const { fromUser, toUser, mutualRelationships } = relationship
    const isBlocked = fromUser.relationshipTypes.includes('BLOCKED') || toUser.relationshipTypes.includes('BLOCKED')
    const isFriend = mutualRelationships.includes('FRIEND')
    const isFollowing = fromUser.relationshipTypes.includes('FOLLOWER')
    const isFollowedBy = toUser.relationshipTypes.includes('FOLLOWING')
    
    // Nếu bị block thì không hiển thị button
    if (isBlocked) {
      return null
    }
    
    // Nếu đã là bạn
    if (isFriend) {
      return {
        text: 'Hủy kết bạn',
        variant: 'secondary' as const,
        disabled: false,
        action: 'unfollow'
      }
    }
    
    // Nếu mình đã follow họ
    if (isFollowing) {
      return {
        text: 'Đang theo dõi',
        variant: 'secondary' as const,
        disabled: false,
        action: 'unfollow'
      }
    }
    
    // Nếu họ follow mình nhưng mình chưa follow họ
    if (isFollowedBy) {
      return {
        text: 'Theo dõi lại',
        variant: 'primary' as const,
        disabled: false,
        action: 'follow'
      }
    }
    
    // Chưa có quan hệ gì
    return {
      text: 'Theo dõi',
      variant: 'primary' as const,
      disabled: false,
      action: 'follow'
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="h-4 w-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'posts'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <FileText className="h-4 w-4" />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('hashtags')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium transition-all ${
                activeTab === 'hashtags'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Hash className="h-4 w-4" />
              Hashtags
            </button>
          </div>
          
          {/* Search Input */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder={
                  activeTab === 'users' ? "Search users..." : 
                  activeTab === 'posts' ? "Search posts... (Press Enter to search)" :
                  "Search hashtag... (Press Enter to search)"
                }
                value={searchKeyword}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                autoFocus
              />
              {searchKeyword && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'users' ? (
            <>
              {error && (
                <div className="p-4 text-red-600 bg-red-50 text-sm">
                  {error}
                </div>
              )}

              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              )}

              {!isLoading && users.length === 0 && searchKeyword && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No users found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try searching with a different name
                  </p>
                </div>
              )}

              {!isLoading && !searchKeyword && (
                <div className="text-center py-12">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Search for users</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter a name or username to find people
                  </p>
                </div>
              )}

              {users.length > 0 && (
                <div className="p-4 space-y-2">
                  {users.map((user) => {
                    const buttonConfig = getRelationshipButton(user.userId)
                    const isLoadingRelationship = loadingRelationships.has(user.userId)
                    const isActionLoading = actionLoading.has(user.userId)
                    
                    return (
                      <div
                        key={user.userId}
                        className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-all duration-200 group"
                      >
                        {/* Avatar và User Info */}
                        <Link
                          to={`/profile/${user.userId}`}
                          onClick={onClose}
                          className="flex items-center gap-4 flex-1 min-w-0"
                        >
                          <img
                            src={user.avtUrl || "/assets/images/default.png"}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-12 h-12 rounded-full object-cover border-2 border-orange-200 group-hover:border-orange-300 transition-colors"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-gray-500 text-sm truncate">
                              @{user.username}
                            </p>
                          </div>
                        </Link>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {/* Relationship Button */}
                          {buttonConfig && (
                            <Button
                              variant={buttonConfig.variant}
                              size="sm"
                              disabled={buttonConfig.disabled || isActionLoading}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (buttonConfig.action) {
                                  handleRelationshipAction(user.userId, buttonConfig.action)
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              {isActionLoading ? 'Đang xử lý...' : buttonConfig.text}
                            </Button>
                          )}
                          
                          {/* Loading indicator for relationship */}
                          {isLoadingRelationship && (
                            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                          )}
                          
                          {/* Profile Link */}
                          <Link
                            to={`/profile/${user.userId}`}
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-100"
                          >
                            <User className="h-5 w-5" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}

                  {/* Load More */}
                  {pagination.hasMore && (
                    <button
                      onClick={loadMoreUsers}
                      disabled={isLoading}
                      className="w-full py-3 text-orange-600 hover:bg-orange-50 rounded-xl font-medium disabled:opacity-50 transition-colors"
                    >
                      {isLoading ? "Loading..." : "Load more users"}
                    </button>
                  )}
                </div>
              )}
            </>
          ) : activeTab === 'posts' ? (
            <>
              {/* Posts Tab */}
              {!searchKeyword ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Search for posts</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Enter keywords to search for posts
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Search posts</p>
                  <p className="text-gray-400 text-sm mt-1 mb-4">
                    Press Enter or click to search for posts with "{searchKeyword}"
                  </p>
                  <Button 
                    onClick={handleSearchPosts}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Search Posts
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Hashtags Tab */}
              {!searchKeyword ? (
                <div className="p-4 space-y-4">
                  <div className="text-center py-8">
                    <Hash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">Search by hashtag</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Enter a hashtag to find posts
                    </p>
                  </div>
                  
                  {/* Popular Hashtags */}
                  {loadingHashtags ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    </div>
                  ) : popularHashtags.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Hashtags</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {popularHashtags.map((item, index) => (
                          <button
                            key={index}
                            onClick={() => handleHashtagClick(item.hashtag)}
                            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800 group-hover:text-orange-600">
                                #{item.hashtag}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {item.count} posts
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Hash className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Search hashtag</p>
                  <p className="text-gray-400 text-sm mt-1 mb-4">
                    Press Enter or click to search posts with "#{searchKeyword}"
                  </p>
                  <Button 
                    onClick={handleSearchHashtag}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    Search Hashtag
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}