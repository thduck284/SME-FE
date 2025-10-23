"use client"

import { Search, X, User, Users } from "lucide-react"
import { useUserSearch } from "@/lib/hooks/useUserSearch"
import { Link } from "react-router-dom"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
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

  // Hàm xử lý thêm bạn bè
  const handleAddFriend = (userId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    console.log(`Add friend: ${userId}`)
    // TODO: Implement add friend logic here
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-gray-200">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchKeyword}
              onChange={(e) => handleSearchChange(e.target.value)}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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
              {users.map((user) => (
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
                      src={user.avtUrl || "/default.png"}
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
                    {/* Add Friend Button */}
                    <button
                      onClick={(e) => handleAddFriend(user.userId, e)}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm whitespace-nowrap"
                    >
                      Add Friend
                    </button>
                    
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
              ))}

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
        </div>
      </div>
    </div>
  )
}