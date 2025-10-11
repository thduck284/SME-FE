"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { Badge, Button, Card } from "@/components/ui"
import { User, FileText, ImageIcon, MapPin, LinkIcon, Calendar, Mail, Camera } from "lucide-react"
import { LeftBar, RightBar } from "@/components/layouts"
import { PostsTab } from "@/components/profile/PostsTab"
import { ImagesTab } from "@/components/profile/ImagesTab"
import { RelationshipModal } from "@/components/profile/RelationshipModal"
import { useUserRelationship } from "@/lib/hooks/useRelationship"
import { getPostsCount } from "@/lib/api/posts/GetPostsByUser"
import { useUsers } from "@/lib/hooks/useUsers"
import { getUserId } from "@/lib/utils/Jwt"

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

export function ProfilePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"profile" | "posts" | "images">("profile")
  const [avatarUrl, setAvatarUrl] = useState("/default.png")
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)
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
  const [relationshipModal, setRelationshipModal] = useState<{
    isOpen: boolean
    type: "followers" | "following"
  }>({
    isOpen: false,
    type: "followers"
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const mainContentRef = useRef<HTMLDivElement>(null)

  const { uploadAvatar, isUploading, error: uploadError } = useUsers()
  const { 
    followers, 
    following, 
    loading: loadingRelationships
  } = useUserRelationship(userId || undefined)

  // Lấy userId từ JWT khi component mount
  useEffect(() => {
    const currentUserId = getUserId()
    setUserId(currentUserId)
  }, [])

  // Sync tab state với URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as "profile" | "posts" | "images" | null
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  // Handle tab change và update URL
  const handleTabChange = (tab: "profile" | "posts" | "images") => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  // Fetch posts count
  useEffect(() => {
    const fetchPostsCount = async () => {
      if (!userId) return
      
      try {
        setLoadingPostsCount(true)
        const response = await getPostsCount(userId)
        setPostsCount(response.data.count)
      } catch (error) {
        console.error("Error fetching posts count:", error)
      } finally {
        setLoadingPostsCount(false)
      }
    }

    fetchPostsCount()
  }, [userId])

  // Fetch user profile
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
        console.log(json)
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

  const displayName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '—'
  const displayUsername = profile 
    ? `@${generateUsernameFromName(profile.firstName, profile.lastName)}`
    : ''
  const displayEmail = profile?.email || '—'
  const displayPhone = profile?.phone || '—'
  const joinedDate = profile ? new Date(profile.createdAt).toLocaleDateString() : '—'

  const tabs = [
    { key: "profile" as const, label: "Profile", icon: User },
    { key: "posts" as const, label: "Posts", icon: FileText },
    { key: "images" as const, label: "Images", icon: ImageIcon },
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && userId) {
      try {
        const imageUrl = URL.createObjectURL(file)
        setAvatarUrl(imageUrl)
        
        const response = await uploadAvatar(userId, file)
        
        if (response.avtUrl) {
          setAvatarUrl(response.avtUrl)
        }
        
        URL.revokeObjectURL(imageUrl)
        
      } catch (error) {
        console.error("Failed to upload avatar:", error)
        if (profile?.avtUrl) {
          setAvatarUrl(profile.avtUrl)
        } else {
          setAvatarUrl("/default.png")
        }
      }
    }
  }

  const handleAvatarError = () => {
    setAvatarUrl("/default.png")
  }

  const handleRelationshipClick = (type: "followers" | "following") => {
    setRelationshipModal({
      isOpen: true,
      type
    })
  }

  const closeRelationshipModal = () => {
    setRelationshipModal({
      isOpen: false,
      type: "followers"
    })
  }

  // Hiển thị loading nếu chưa có userId
  if (!userId) {
    return (
      <div className="min-h-screen flex bg-gray-100 text-gray-900 relative">
        <div className="fixed left-0 top-0 bottom-0 w-64 z-30">
          <div className="h-full overflow-y-auto">
            <LeftBar />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto h-screen p-8 ml-64 mr-64 bg-gray-100 text-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </main>
        <div className="fixed right-0 top-0 bottom-0 w-64 z-30">
          <div className="h-full overflow-y-auto">
            <RightBar />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100 text-gray-900 relative">
      {/* Left Sidebar - Fixed với full height */}
      <div className="fixed left-0 top-0 bottom-0 w-64 z-30">
        <div className="h-full overflow-y-auto">
          <LeftBar />
        </div>
      </div>

      {/* Main Content */}
      <main
        ref={mainContentRef}
        className="flex-1 overflow-y-auto h-screen p-8 ml-64 mr-64 bg-gray-100 text-gray-900"
      >
        {/* Upload Error Alert */}
        {uploadError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {uploadError}
          </div>
        )}

        {/* Profile Header */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start">
          {/* Avatar với upload functionality */}
          <div 
            className="relative"
            onMouseEnter={() => setIsHoveringAvatar(true)}
            onMouseLeave={() => setIsHoveringAvatar(false)}
          >
            <div className="relative cursor-pointer" onClick={handleAvatarClick}>
              <img
                src={avatarUrl}
                alt="User Avatar"
                className="h-32 w-32 rounded-full object-cover border-2 border-primary/20 transition-all duration-200"
                onError={handleAvatarError}
              />

              {/* Overlay icon camera khi hover */}
              <div className={`absolute inset-0 bg-black/40 rounded-full flex items-center justify-center transition-all duration-200 ${isHoveringAvatar ? 'opacity-100' : 'opacity-0'}`}>
                <Camera className="h-8 w-8 text-white" />
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            {/* Edit button */}
            <button
              onClick={handleAvatarClick}
              disabled={isUploading}
              className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-primary/90 hover:scale-110 ${isHoveringAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 space-y-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                  {loadingProfile ? 'Loading...' : errorProfile ? 'Error loading profile' : displayName}
                </h1>
                <p className="text-lg text-gray-600">
                  {loadingProfile ? '' : displayUsername}
                </p>
              </div>
              <Button className="w-full md:w-auto">Edit Profile</Button>
            </div>

            {/* Stats */}
            <div className="flex gap-10">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-2">
                  <div 
                    className={`text-2xl font-bold text-gray-900 ${
                      stat.label === "Followers" || stat.label === "Following" 
                        ? "cursor-pointer hover:text-primary transition-colors" 
                        : ""
                    }`}
                    onClick={() => {
                      if (stat.label === "Followers") {
                        handleRelationshipClick("followers")
                      } else if (stat.label === "Following") {
                        handleRelationshipClick("following")
                      }
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Bio & Interests */}
            <div className="space-y-6">
              <p className="text-pretty leading-relaxed text-gray-900">
                {loadingProfile ? ' ' : ''}
              </p>

              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" />San Francisco, CA</div>
                <div className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /><a href="#" className="text-primary hover:underline">portfolio.com</a></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Joined {joinedDate}</div>
              </div>

              <div className="flex flex-wrap gap-3">
                {interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="rounded-full bg-gray-200 text-gray-800 border-gray-300">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-16 mb-12 border-b border-gray-300">
          <nav className="flex gap-12 ml-4">
            {tabs.map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`group flex items-center gap-4 border-b-2 pb-5 text-base font-semibold transition-colors ${
                    isActive 
                      ? "border-primary text-gray-900" 
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-400"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8 ml-4">
          {activeTab === "profile" && (
            <div className="grid gap-8 md:grid-cols-2">
              <Card className="p-6 bg-white border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-base text-gray-600">Email</div>
                      <div className="text-lg font-medium text-gray-900">{displayEmail}</div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-white border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <User className="h-6 w-6 text-primary" />
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

          {activeTab === "posts" && (
            <PostsTab userId={userId} />
          )}

          {activeTab === "images" && (
            <ImagesTab userId={userId} />
          )}
        </div>
      </main>

      {/* Right Sidebar - Fixed với full height */}
      <div className="fixed right-0 top-0 bottom-0 w-64 z-30">
        <div className="h-full overflow-y-auto">
          <RightBar />
        </div>
      </div>

      {/* Relationship Modal */}
      <RelationshipModal
        isOpen={relationshipModal.isOpen}
        onClose={closeRelationshipModal}
        type={relationshipModal.type}
        userId={userId || ""}
      />
    </div>
  )
}