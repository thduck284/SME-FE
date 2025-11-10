"use client"

import { useState, useEffect } from 'react'
import { X, Search, User, ArrowLeft, Home } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { ChatService, Message } from '@/lib/api/chat/ChatService'
import { UserService } from '@/lib/api/users/UserService'
import { getUserId } from '@/lib/utils/Jwt'
import { useLiveness } from '@/lib/context/LivenessSocketContext'
import { Link } from 'react-router-dom'
import { userApi } from '@/lib/api/users/User'

interface Friend {
  id: string
  name: string
  avatar: string
  status: 'online' | 'away' | 'offline'
  username?: string
  lastActiveAt?: Date
}

interface ChatFullWindowProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatFullWindow({ isOpen, onClose }: ChatFullWindowProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [mediaFiles, setMediaFiles] = useState<Message[]>([])
  const [showMediaSearch, setShowMediaSearch] = useState(false)
  const userId = getUserId()
  const { getFriendStatus } = useLiveness()

  const convertServerStatus = (serverStatus: string): 'online' | 'away' | 'offline' => {
    switch (serverStatus) {
      case 'ONLINE': return 'online'
      case 'AWAY': return 'away'
      case 'OFFLINE': return 'offline'
      default: return 'offline'
    }
  }

  const getFullName = (userInfo: any): string => {
    if (!userInfo) return `User`
    const userData = userInfo.data || userInfo
    const firstName = userData.firstName || ''
    const lastName = userData.lastName || ''
    return `${firstName} ${lastName}`.trim() || userData.username || `User`
  }

  const getAvatarUrl = (userInfo: any): string => {
    if (!userInfo) return "/assets/images/default.png"
    const userData = userInfo.data || userInfo
    return userData.avtUrl || "/assets/images/default.png"
  }

  const getUsername = (userInfo: any): string => {
    if (!userInfo) return ""
    const userData = userInfo.data || userInfo
    return userData.username || ""
  }

  useEffect(() => {
    if (!isOpen || !userId) return

    const loadFriends = async () => {
      try {
        setLoading(true)
        const friendIds = await UserService.getFriends(userId)
        
        const friendsWithDetails = await Promise.all(
          friendIds.map(async (friendId) => {
            try {
              const userInfo = await userApi.getUser(friendId)
              const status = getFriendStatus(friendId)
              
              return {
                id: friendId,
                name: getFullName(userInfo),
                avatar: getAvatarUrl(userInfo),
                status: status ? convertServerStatus(status.status) : 'offline',
                username: getUsername(userInfo),
                lastActiveAt: status?.lastActiveAt
              }
            } catch (error) {
              console.error(`Error loading user ${friendId}:`, error)
              const status = getFriendStatus(friendId)
              return {
                id: friendId,
                name: `User ${friendId}`,
                avatar: "/assets/images/default.png",
                status: status ? convertServerStatus(status.status) : 'offline',
                lastActiveAt: status?.lastActiveAt
              }
            }
          })
        )
        
        setFriends(friendsWithDetails)
      } catch (error) {
        console.error('Error loading friends:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFriends()
  }, [isOpen, userId, getFriendStatus])

  const handleSelectFriend = async (friend: Friend) => {
    setSelectedFriend(friend)
    try {
      // Get or create conversation
      const conversations = await ChatService.getConversations(100)
      let conversation = conversations.conversations.find(
        c => c.conversationType === 'direct' && 
        (c.title === friend.name || c.participants?.some((p: any) => p.id === friend.id || p === friend.id))
      )
      
      if (!conversation) {
        // Create new conversation if doesn't exist
        const newConv = await ChatService.createConversation({
          type: 'direct',
          participantIds: [friend.id]
        })
        conversation = { 
          conversationId: newConv.conversationId, 
          conversationType: 'direct', 
          unreadCount: 0, 
          createdAt: new Date(),
          participants: []
        }
      }
      
      setConversationId(conversation.conversationId)
    } catch (error) {
      console.error('Error getting conversation:', error)
    }
  }

  const handleSearchMedia = async () => {
    if (!conversationId || !searchQuery.trim()) return
    
    try {
      const messages = await ChatService.getMessages(conversationId, 100)
      const filtered = messages.messages.filter(msg => {
        if (msg.attachments && msg.attachments.length > 0) {
          return true
        }
        if (msg.content && msg.content.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true
        }
        return false
      })
      setMediaFiles(filtered)
      setShowMediaSearch(true)
    } catch (error) {
      console.error('Error searching media:', error)
    }
  }

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-300'
    }
  }

  if (!isOpen) return null

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            to="/home"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            onClick={onClose}
          >
            <ArrowLeft className="w-5 h-5" />
            <Home className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Messages</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Main Content - 3 Columns */}
        <div className="flex-1 flex overflow-hidden h-full">
          {/* Left Column - Friends List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
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
              ) : filteredFriends.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery ? 'No friends found' : 'No friends yet'}
                </div>
              ) : (
                <div className="p-2">
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => handleSelectFriend(friend)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedFriend?.id === friend.id
                          ? 'bg-blue-100 border border-blue-300'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="relative">
                        <Avatar
                          src={friend.avatar}
                          alt={friend.name}
                          fallback={getAvatarFallback(friend.name)}
                          className="w-12 h-12"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${getStatusColor(friend.status)}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{friend.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {friend.status === 'online' ? 'Online' : friend.status === 'away' ? 'Away' : 'Offline'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Chat Window */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {selectedFriend && conversationId ? (
              <div className="flex-1 flex flex-col h-full">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
                  <Avatar
                    src={selectedFriend.avatar}
                    alt={selectedFriend.name}
                    fallback={getAvatarFallback(selectedFriend.name)}
                    className="w-10 h-10"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedFriend.name}</h3>
                    <p className="text-xs text-gray-500">
                      {selectedFriend.status === 'online' ? 'Online' : selectedFriend.status === 'away' ? 'Away' : 'Offline'}
                    </p>
                  </div>
                </div>
                {/* Chat Content - Placeholder for now, will integrate ChatWindow logic later */}
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <p>Chat interface will be integrated here</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a friend to start chatting</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - User Info */}
          <div className="w-80 border-l border-gray-200 flex flex-col">
            {selectedFriend ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex flex-col items-center">
                    <Avatar
                      src={selectedFriend.avatar}
                      alt={selectedFriend.name}
                      fallback={getAvatarFallback(selectedFriend.name)}
                      className="w-20 h-20 mb-4"
                    />
                    <h3 className="text-lg font-semibold mb-1">{selectedFriend.name}</h3>
                    {selectedFriend.username && (
                      <p className="text-sm text-gray-500 mb-4">@{selectedFriend.username}</p>
                    )}
                    <Link
                      to={`/profile/${selectedFriend.id}`}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search Media & Files
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Search messages..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSearchMedia()
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                        <button
                          onClick={handleSearchMedia}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {showMediaSearch && mediaFiles.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Search Results</h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {mediaFiles.map((msg) => (
                            <div key={msg.messageId} className="p-2 border border-gray-200 rounded-lg">
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {msg.attachments.map((att, idx) => (
                                    <div key={idx} className="relative">
                                      {att.includes('video') || att.match(/\.(mp4|webm|ogg|mov)/i) ? (
                                        <Video className="w-full h-20 object-cover rounded" />
                                      ) : (
                                        <img src={att} alt="media" className="w-full h-20 object-cover rounded" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {msg.content && (
                                <p className="text-sm text-gray-700">{msg.content}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
                <p className="text-center">Select a friend to view their profile</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

