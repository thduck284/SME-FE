"use client"
import { Avatar } from "@/components/ui"
import { useLiveness } from '@/lib/context/LivenessSocketContext' 
import { UserService } from '@/lib/api/users/UserService'
import { userApi } from '@/lib/api/users/User'
import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getUserId } from '@/lib/utils/Jwt'
import { formatTimeAgo } from '@/lib/utils/PostUtils'

interface Friend {
  id: string
  name: string
  avatar: string
  status: 'online' | 'away' | 'offline'
  displayName?: string
  username?: string
  lastActiveAt?: Date
}

export function RightBar() {
  const { getFriendStatus, isConnected, sendHeartbeat } = useLiveness()
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const hasSentInitialHeartbeatRef = useRef(false) 
  
  const userId = getUserId()

  const convertServerStatus = (serverStatus: string): 'online' | 'away' | 'offline' => {
    switch (serverStatus) {
      case 'ONLINE': return 'online'
      case 'AWAY': return 'away'
      case 'OFFLINE': return 'offline'
      default: return 'offline'
    }
  }

  const getStatusText = (friend: Friend): string => {
    if (friend.status === 'online' || friend.status === 'away') {
      return 'Online'
    }
    
    if (friend.status === 'offline' && friend.lastActiveAt) {
      return `Last seen ${formatTimeAgo(friend.lastActiveAt.toString())}`
    }
    
    return 'Offline'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-300'
    }
  }

  // Hàm tạo full name từ firstName và lastName
  const getFullName = (userInfo: any): string => {
    if (!userInfo) return `User`
    
    // Truy cập vào thuộc tính data nếu tồn tại
    const userData = userInfo.data || userInfo
    
    const firstName = userData.firstName || ''
    const lastName = userData.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    
    return fullName || userData.username || `User`
  }

  // Hàm lấy avatar URL
  const getAvatarUrl = (userInfo: any): string => {
    if (!userInfo) return "/assets/images/default.png"
    
    // Truy cập vào thuộc tính data nếu tồn tại
    const userData = userInfo.data || userInfo
    return userData.avtUrl || "/assets/images/default.png"
  }

  // Hàm lấy username
  const getUsername = (userInfo: any): string => {
    if (!userInfo) return ""
    
    // Truy cập vào thuộc tính data nếu tồn tại
    const userData = userInfo.data || userInfo
    return userData.username || ""
  }

  useEffect(() => {
    if (!userId) return

    const loadFriends = async () => {
      try {
        const friendIds = await UserService.getFriends(userId)
        console.log('Loaded friend IDs:', friendIds)
        
        const friendsWithDetails = await Promise.all(
          friendIds.map(async (friendId) => {
            try {
              const userInfo = await userApi.getUser(friendId)
              console.log("User data:", userInfo)
              const status = getFriendStatus(friendId)
              
              // Sử dụng các hàm helper để lấy thông tin
              const fullName = getFullName(userInfo)
              const avatarUrl = getAvatarUrl(userInfo)
              const username = getUsername(userInfo)
              
              return {
                id: friendId,
                name: fullName,
                avatar: avatarUrl,
                status: status ? convertServerStatus(status.status) : 'offline',
                displayName: userInfo.displayName,
                username: username,
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

        if (isConnected && userId && friendIds.length > 0 && !hasSentInitialHeartbeatRef.current) {
          sendHeartbeat(friendIds)
          hasSentInitialHeartbeatRef.current = true
        }

      } catch (error) {
        console.error('Error loading friends:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFriends()
  }, [userId, isConnected, sendHeartbeat, getFriendStatus])

  useEffect(() => {
    if (friends.length === 0) return

    const updateFriendsStatus = () => {
      setFriends(prevFriends => 
        prevFriends.map(friend => {
          const status = getFriendStatus(friend.id)
          return {
            ...friend,
            status: status ? convertServerStatus(status.status) : 'offline',
            lastActiveAt: status?.lastActiveAt || friend.lastActiveAt
          }
        })
      )
    }

    updateFriendsStatus()
  }, [getFriendStatus, friends.length]) 

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (loading) {
    return (
      <aside className="w-64 h-screen bg-gray-200 border-l border-gray-300 flex flex-col">
        <div className="p-5 border-b border-gray-300">
          <h2 className="font-semibold text-black text-xl">Friends</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-12 h-12 bg-gray-300 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded animate-pulse w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 h-screen bg-gray-200 border-l border-gray-300 flex flex-col">
      <div className="p-5 border-b border-gray-300">
        <h2 className="font-semibold text-black text-xl">Friends</h2>
        <div className="text-sm text-gray-600 mt-1">
          {friends.length} friends
          {friends.filter(f => f.status === 'online').length > 0 && (
            <span className="ml-2 text-green-600">
              • {friends.filter(f => f.status === 'online').length} online
            </span>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-3 p-5">
          {friends.map((friend) => (
            <Link
              key={friend.id}
              to={`/profile/${friend.id}`}
              className="block"
            >
              <li className="flex items-center gap-3 p-3 hover:bg-gray-300 rounded-lg cursor-pointer transition-colors group">
                <div className="relative">
                  <Avatar 
                    src={friend.avatar} 
                    alt={friend.name}
                    fallback={getAvatarFallback(friend.name)}
                    className="w-12 h-12 group-hover:scale-105 transition-transform duration-200"
                  />
                  <span 
                    className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-white rounded-full ${getStatusColor(friend.status)}`}
                    title={friend.status === 'online' ? 'Online' : friend.status === 'away' ? 'Away' : 'Offline'}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-black truncate" title={friend.name}>
                    {friend.name}
                  </p>
                  <p className="text-sm text-gray-700">{getStatusText(friend)}</p>
                  {friend.username && friend.username !== friend.name && (
                    <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                  )}
                </div>
              </li>
            </Link>
          ))}
        </ul>
      </div>
    </aside>
  )
}