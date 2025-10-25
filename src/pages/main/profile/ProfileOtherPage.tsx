"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Badge, Button, Card } from "@/components/ui"
import { User, FileText, ImageIcon, MapPin, LinkIcon, Calendar, Mail, ArrowLeft, Users } from "lucide-react"
import { PostsTab } from "@/components/profile/PostsTab"
import { ImagesTab } from "@/components/profile/ImagesTab"
import { useUserRelationship } from "@/lib/hooks/useRelationship"
import { getPostsCount } from "@/lib/api/posts/GetPostsByUser"
import { useNavigate } from "react-router-dom"

const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

const generateUsernameFromName = (firstName: string, lastName: string): string => {
  const cleanFirstName = removeVietnameseTones(firstName)
  const cleanLastName = removeVietnameseTones(lastName)

  const fullName = `${cleanFirstName} ${cleanLastName}`.trim()

  let hash = 0
  for (let i = 0; i < fullName.length; i++) {
    const char = fullName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  const numericCode = Math.abs(hash).toString().substring(0, 6)

  const firstNames = cleanFirstName.split(' ').filter(name => name.length > 0)
  const lastNames = cleanLastName.split(' ').filter(name => name.length > 0)

  const firstPart = firstNames[0] || ''
  const lastPart = lastNames[0] || ''

  const middleInitials = [
    ...firstNames.slice(1).map(name => name.charAt(0)),
    ...lastNames.slice(1).map(name => name.charAt(0))
  ].filter(char => char.length > 0)

  let baseUsername = firstPart
  if (middleInitials.length > 0) {
    baseUsername += '.' + middleInitials.join('')
  }
  if (lastPart) {
    baseUsername += '.' + lastPart
  }

  return `${baseUsername}.${numericCode}`
}

const getAvatarUrl = (avtUrl: string | null): string => {
  if (avtUrl && avtUrl.trim() !== '') {
    return avtUrl
  }
  return "/default.png"
}

// Friends Tab Component
const FriendsTab = () => {
  const [friends, setFriends] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        setLoading(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockFriends = [
          {
            id: 1,
            name: "Alex Johnson",
            username: "alex.johnson",
            avatar: "/default.png",
            mutualFriends: 12
          },
          {
            id: 2,
            name: "Sarah Miller",
            username: "sarah.miller",
            avatar: "/default.png",
            mutualFriends: 8
          },
          {
            id: 3,
            name: "Mike Chen",
            username: "mike.chen",
            avatar: "/default.png",
            mutualFriends: 5
          },
          {
            id: 4,
            name: "Emily Davis",
            username: "emily.davis",
            avatar: "/default.png",
            mutualFriends: 15
          },
          {
            id: 5,
            name: "David Wilson",
            username: "david.wilson",
            avatar: "/default.png",
            mutualFriends: 3
          },
          {
            id: 6,
            name: "Lisa Brown",
            username: "lisa.brown",
            avatar: "/default.png",
            mutualFriends: 7
          }
        ]
        
        setFriends(mockFriends)
      } catch (error) {
        console.error("Error fetching friends:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFriends()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {friends.map((friend) => (
        <Card key={friend.id} className="p-4 bg-white border border-gray-300">
          <div className="flex items-center gap-3">
            <img
              src={friend.avatar}
              alt={friend.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{friend.name}</h3>
              <p className="text-sm text-gray-600 truncate">@{friend.username}</p>
              <p className="text-xs text-gray-500">{friend.mutualFriends} mutual friends</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
              Message
            </Button>
            <Button size="sm" className="flex-1">
              Remove
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function ProfileOtherPage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<"posts" | "profile" | "friends" | "images">("posts")
  const [avatarUrl, setAvatarUrl] = useState("/default.png")
  const [postsCount, setPostsCount] = useState(0)
  const [loadingPostsCount, setLoadingPostsCount] = useState(true)
  const [profile, setProfile] = useState<{
    userId: string
    username: string
    firstName: string
    lastName: string
    email: string
    phone: string | null
    avtUrl: string | null
    createdAt: string
    updatedAt: string
  } | null>(null)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [errorProfile, setErrorProfile] = useState<string | null>(null)
  const [isFriend, setIsFriend] = useState(false)
  const [isRequestSent, setIsRequestSent] = useState(false)

  const { 
    followers, 
    following, 
    loading: loadingRelationships
  } = useUserRelationship()

  useEffect(() => {
    const fetchPostsCount = async () => {
      if (!userId) return // Chỉ fetch khi có userId
      
      try {
        setLoadingPostsCount(true)
        const response = await getPostsCount(userId) // Truyền userId vào hàm
        setPostsCount(response.data.count)
      } catch (error) {
        console.error("Error fetching posts count:", error)
      } finally {
        setLoadingPostsCount(false)
      }
    }

    fetchPostsCount()
  }, [userId]) // Thêm userId vào dependency

  useEffect(() => {
    const controller = new AbortController()
    const fetchProfile = async () => {
      if (!userId) return
      try {
        setLoadingProfile(true)
        setErrorProfile(null)
        const res = await fetch(`/users/${userId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Failed to load profile: ${res.status} ${text}`)
        }
        const json = await res.json()
        setProfile(json.data)

        if (json.data) {
          const avatarUrlToSet = getAvatarUrl(json.data.avtUrl)
          setAvatarUrl(avatarUrlToSet)
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setErrorProfile(e.message || 'Failed to load profile')
        }
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchProfile()
    return () => controller.abort()
  }, [userId])

  const handleAddFriend = () => {
    setIsRequestSent(true)
    console.log(`Add friend: ${userId}`)
  }

  const displayUsername = profile
    ? `@${profile.username || generateUsernameFromName(profile.firstName, profile.lastName)}`
    : ''

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '—'
  const displayEmail = profile?.email || '—'
  const displayPhone = profile?.phone || '—'
  const joinedDate = profile ? new Date(profile.createdAt).toLocaleDateString() : '—'

  const tabs = [
    { key: "posts" as const, label: "Posts", icon: FileText },
    { key: "friends" as const, label: "Friends", icon: Users },
    { key: "images" as const, label: "Images", icon: ImageIcon },
    { key: "profile" as const, label: "Profile", icon: User },
  ]

  const stats = [
    { 
      label: "Posts", 
      value: loadingPostsCount ? "..." : postsCount.toString() 
    },
    { 
      label: "Followers", 
      value: loadingRelationships ? "..." : (followers?.total.toString() || "0"),
    },
    { 
      label: "Following", 
      value: loadingRelationships ? "..." : (following?.total.toString() || "0"),
    },
  ]

  const interests = ["Photography", "Design", "Travel", "Technology", "Art"]

  const handleAvatarError = () => {
    setAvatarUrl("/default.png")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-200 border-b border-gray-300">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-300 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {loadingProfile ? 'Loading...' : displayName}
            </h2>
            <p className="text-sm text-gray-600">
              {loadingProfile ? '' : displayUsername}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {errorProfile && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {errorProfile}
          </div>
        )}

        <Card className="bg-white border border-gray-300 rounded-xl overflow-hidden mb-8">
          <div className="p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-12">
              <div className="flex-shrink-0">
                <img
                  src={avatarUrl}
                  alt="User Avatar"
                  className="h-40 w-40 rounded-full object-cover border-4 border-gray-300 shadow-lg"
                  onError={handleAvatarError}
                />
              </div>

              <div className="flex-1 space-y-6">
                <div className="flex flex-col gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {loadingProfile ? 'Loading...' : displayName}
                  </h1>
                  <p className="text-lg text-gray-600">
                    {loadingProfile ? '' : displayUsername}
                  </p>
                </div>

                <div className="flex gap-8">
                  {stats.map((stat) => (
                    <div key={stat.label} className="space-y-1">
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-sm text-gray-600">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={handleAddFriend}
                    disabled={isFriend || isRequestSent}
                    className={`${
                      isFriend 
                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed' 
                        : isRequestSent
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isFriend ? 'Friends' : isRequestSent ? 'Request Sent' : 'Add Friend'}
                  </Button>
                  <Button className="border-gray-300">
                    Message
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
              <p className="text-gray-700 leading-relaxed">
                Passionate about creating amazing experiences. Coffee enthusiast & photographer.
              </p>

              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  San Francisco, CA
                </div>
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  <a href="#" className="text-blue-600 hover:underline">portfolio.com</a>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joined {joinedDate}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="rounded-full bg-blue-100 text-blue-800 border-blue-200">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="mb-8 border-b border-gray-300">
          <nav className="flex gap-8">
            {tabs.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`group flex items-center gap-2 border-b-2 pb-4 font-semibold transition-colors ${
                    isActive
                      ? "border-blue-600 text-gray-900"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="space-y-6">
          {activeTab === "posts" && (
            <PostsTab userId={userId!} />
          )}

          {activeTab === "friends" && (
            <FriendsTab />
          )}

          {activeTab === "images" && (
            <ImagesTab userId={userId!} />
          )}

          {activeTab === "profile" && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="p-6 bg-white border border-gray-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-base text-gray-600">Email</div>
                      <div className="text-lg font-medium text-gray-900">{displayEmail}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border border-gray-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-base text-gray-600">Phone</div>
                      <div className="text-lg font-medium text-gray-900">{displayPhone}</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="fixed left-0 top-0 bottom-0 w-64 bg-gray-200 pointer-events-none -z-10" />
      <div className="fixed right-0 top-0 bottom-0 w-64 bg-gray-200 pointer-events-none -z-10" />
    </div>
  )
}