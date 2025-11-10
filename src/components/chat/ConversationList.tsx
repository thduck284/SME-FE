"use client"

import { useState, useEffect } from 'react'
import { Search, Plus, User } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { GroupAvatar } from './GroupAvatar'
import { formatTimeAgo } from '@/lib/utils/PostUtils'
import { getUserId } from '@/lib/utils/Jwt'
import { UserService } from '@/lib/api/users/UserService'
import { userApi } from '@/lib/api/users/User'
import { UserMetadata } from '@/lib/types/User'

type TabType = 'all' | 'unread' | 'groups'

interface Conversation {
  conversationId: string
  conversationType?: string
  type?: string
  title?: string
  lastMessage?: string
  lastMessageSender?: string
  unreadCount: number
  updatedAt?: Date
  recipientId?: string
  recipientName?: string
  recipientAvatar?: string
  createdAt?: Date
  [key: string]: any // Allow additional properties
}

interface ConversationListProps {
  conversations: Conversation[]
  loading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  selectedConversationId?: string
  onSelectConversation: (conversation: Conversation | any) => void
  newMessageConversations: Set<string>
  onClearNewMessage: (conversationId: string) => void
  senderNameCache: Map<string, string>
  onCreateGroup: () => void
  getFriendStatus?: (userId: string) => { status: string } | null
  participantsDataMap?: Map<string, Array<{ userId: string; metadata?: UserMetadata | null }>>
  onSelectFriend?: (friendId: string, friendName: string, friendAvatar?: string) => void
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function ConversationList({
  conversations,
  loading,
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  selectedConversationId,
  onSelectConversation,
  newMessageConversations,
  onClearNewMessage,
  senderNameCache,
  onCreateGroup,
  getFriendStatus,
  participantsDataMap,
  onSelectFriend
}: ConversationListProps) {
  const userId = getUserId()
  const [friends, setFriends] = useState<Array<{ userId: string; name: string; avatar?: string; metadata?: UserMetadata }>>([])
  const [loadingFriends, setLoadingFriends] = useState(false)

  // Check if user/group is online
  const isOnline = (conv: Conversation): boolean => {
    if (!getFriendStatus) return false
    
    const convType = (conv.conversationType || conv.type || '').toLowerCase()
    
    if (convType === 'direct') {
      // For direct chat, check recipient status
      if (conv.recipientId) {
        const status = getFriendStatus(conv.recipientId)
        return status?.status === 'ONLINE'
      }
      return false
    } else if (convType === 'group') {
      // For group chat, check if at least one participant is online
      const participants = participantsDataMap?.get(conv.conversationId) || []
      return participants.some(p => {
        const status = getFriendStatus(p.userId)
        return status?.status === 'ONLINE'
      })
    }
    
    return false
  }

  // Load friends when search query exists
  useEffect(() => {
    if (!userId || !searchQuery.trim() || !onSelectFriend) return

    const loadFriends = async () => {
      setLoadingFriends(true)
      try {
        const friendIds = await UserService.getFriends(userId)
        if (friendIds.length > 0) {
          const metadataList = await UserService.getMultipleUsersMetadata(friendIds)
          const friendsWithDetails = metadataList.map(metadata => ({
            userId: metadata.userId,
            name: `${metadata.firstName} ${metadata.lastName}`.trim() || metadata.username || 'User',
            avatar: metadata.avtUrl || "/assets/images/default.png",
            metadata
          }))
          setFriends(friendsWithDetails)
        } else {
          setFriends([])
        }
      } catch (error) {
        console.error('Error loading friends:', error)
        setFriends([])
      } finally {
        setLoadingFriends(false)
      }
    }

    loadFriends()
  }, [searchQuery, userId, onSelectFriend])

  const filteredConversations = conversations
    .filter(conv => {
      const matchesSearch = !searchQuery.trim() || 
        (conv.recipientName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (conv.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()))
      
      if (!matchesSearch) return false
      
      switch (activeTab) {
        case 'unread':
          return conv.unreadCount > 0
        case 'groups':
          const convType = (conv.conversationType || conv.type || '').toLowerCase()
          return convType === 'group'
        case 'all':
        default:
          return true
      }
    })
    .sort((a, b) => {
      // Sort by updatedAt (last message time) - most recent first
      // If updatedAt is not available, use createdAt as fallback
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
      
      // Most recent first (descending order)
      return bTime - aTime
    })

  // Filter friends based on search query
  const filteredFriends = searchQuery.trim() && onSelectFriend ? friends.filter(friend => {
    const query = searchQuery.toLowerCase()
    return friend.name.toLowerCase().includes(query) ||
           friend.metadata?.username?.toLowerCase().includes(query) ||
           friend.metadata?.email?.toLowerCase().includes(query)
  }) : []

  // Check if friend already has a conversation
  const getExistingConversation = (friendId: string): Conversation | undefined => {
    return conversations.find(conv => {
      const convType = (conv.conversationType || conv.type || '').toLowerCase()
      if (convType !== 'direct') return false
      return conv.recipientId === friendId || 
             conv.participants?.some((p: any) => p.userId === friendId)
    })
  }

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations or friends..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {/* Calculate unread counts */}
        {(() => {
          // Total unread count for "All" tab
          const allUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0)
          
          // Unread conversations count for "Unread" tab
          const unreadConversationsCount = conversations.filter(c => c.unreadCount > 0).length
          
          // Total unread count for "Groups" tab (only group conversations)
          const groupsUnreadCount = conversations.reduce((sum, conv) => {
            const convType = (conv.conversationType || conv.type || '').toLowerCase()
            if (convType === 'group') {
              return sum + (conv.unreadCount || 0)
            }
            return sum
          }, 0)
          
          return (
            <>
              <button
                onClick={() => onTabChange('all')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'all'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
                {allUnreadCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {allUnreadCount > 99 ? '99+' : allUnreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => onTabChange('unread')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'unread'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Unread
                {unreadConversationsCount > 0 && (
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {unreadConversationsCount > 99 ? '99+' : unreadConversationsCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => onTabChange('groups')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === 'groups'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                } ${groupsUnreadCount > 0 ? 'pr-12' : 'pr-10'}`}
              >
                Groups
                {groupsUnreadCount > 0 && (
                  <span className="absolute top-2 right-10 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {groupsUnreadCount > 99 ? '99+' : groupsUnreadCount}
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateGroup()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-blue-100 rounded-full transition-colors"
                  title="Create Group"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                </button>
              </button>
            </>
          )
        })()}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-12 h-12 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-2">
            {/* Friends Section - Show when searching */}
            {searchQuery.trim() && onSelectFriend && (
              <>
                {loadingFriends ? (
                  <div className="p-4 space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2">
                        <div className="w-12 h-12 bg-gray-300 rounded-full animate-pulse"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredFriends.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                      Friends
                    </div>
                    {filteredFriends.map((friend) => {
                      const existingConv = getExistingConversation(friend.userId)
                      const friendStatus = getFriendStatus?.(friend.userId)
                      const isOnlineStatus = friendStatus?.status === 'ONLINE'
                      
                      return (
                        <button
                          key={friend.userId}
                          onClick={() => {
                            if (existingConv) {
                              // If conversation exists, select it
                              onSelectConversation(existingConv)
                              onClearNewMessage(existingConv.conversationId)
                            } else {
                              // If no conversation, create new one
                              onSelectFriend(friend.userId, friend.name, friend.avatar)
                            }
                            onSearchChange('') // Clear search after selection
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left hover:bg-gray-100"
                        >
                          <div className="relative">
                            <Avatar
                              src={friend.avatar}
                              alt={friend.name}
                              fallback={getAvatarFallback(friend.name)}
                              className="w-12 h-12"
                            />
                            {isOnlineStatus && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-sm truncate flex items-center gap-2">
                                {friend.name}
                                {existingConv && (
                                  <span className="text-xs text-blue-600 font-normal">(Chat)</span>
                                )}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {isOnlineStatus ? 'Online' : friendStatus?.status === 'AWAY' ? 'Away' : 'Offline'}
                            </p>
                          </div>
                          {!existingConv && (
                            <div className="flex-shrink-0">
                              <User className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </>
                )}
              </>
            )}

            {/* Conversations Section */}
            {filteredConversations.length === 0 && !loadingFriends && (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? (
                  filteredFriends.length === 0 ? 'No conversations or friends found' : 'No conversations found'
                ) : activeTab === 'unread' ? 'No unread messages' : activeTab === 'groups' ? 'No groups' : 'No conversations yet'}
              </div>
            )}
            {filteredConversations.length > 0 && (
              <>
                {searchQuery.trim() && filteredFriends.length > 0 && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-t border-gray-200 mt-2">
                    Conversations
                  </div>
                )}
                {filteredConversations.map((conv) => {
                  const hasNewMessage = newMessageConversations.has(conv.conversationId)
                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => {
                        onSelectConversation(conv)
                        onClearNewMessage(conv.conversationId)
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                        selectedConversationId === conv.conversationId
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100'
                      } ${
                        hasNewMessage 
                          ? 'bg-blue-50 border-l-4 border-l-blue-500 animate-pulse' 
                          : ''
                      }`}
                      style={{
                        animation: hasNewMessage ? 'newMessageHighlight 2s ease-in-out' : undefined
                      }}
                    >
                      <div className="relative">
                        {((conv.conversationType || conv.type)?.toLowerCase() === 'group') ? (
                          <GroupAvatar
                            participants={participantsDataMap?.get(conv.conversationId) || conv.participants?.map((p: any) => ({ userId: p.userId })) || []}
                            currentUserId={userId}
                            size="md"
                            className="w-12 h-12"
                          />
                        ) : (
                          <Avatar
                            src={conv.recipientAvatar}
                            alt={conv.recipientName || conv.title || 'Chat'}
                            fallback={getAvatarFallback(conv.recipientName || conv.title || 'C')}
                            className="w-12 h-12"
                          />
                        )}
                        {/* Online indicator - green dot at bottom right */}
                        {isOnline(conv) && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                            {conv.recipientName || conv.title || 'Chat'}
                          </p>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {conv.updatedAt && (
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(conv.updatedAt.toString())}
                              </span>
                            )}
                            {/* Unread count badge */}
                            {conv.unreadCount > 0 && (
                              <span className="bg-blue-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-2 flex items-center justify-center">
                                {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        {conv.lastMessage && (
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                            {conv.lastMessageSender && conv.lastMessageSender !== userId && (
                              <span className={conv.unreadCount > 0 ? 'font-bold' : 'font-medium'}>
                                {senderNameCache.get(conv.lastMessageSender) || conv.lastMessageSender}:{' '}
                              </span>
                            )}
                            {conv.lastMessage}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

