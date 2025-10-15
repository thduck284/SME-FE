"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { Button, Card, Input } from "@/components/ui"
import { Camera, User, ArrowLeft, Save, Mail, Phone, UserCircle, CheckCircle2, AlertCircle } from "lucide-react"
import { LeftBar, RightBar } from "@/components/layouts"
import { useUsers } from "@/lib/hooks/useUsers"
import { getUserId } from "@/lib/utils/Jwt"
import type { UpdateUserRequest } from "@/lib/types/users/UserDTO"

const getAvatarUrl = (avtUrl: string | null): string => {
  if (avtUrl && avtUrl.trim() !== '') {
    return avtUrl
  }
  return "/default.png"
}

export function EditProfilePage() {
  const navigate = useNavigate()
  const { updateUser, uploadAvatar, isUpdating, isUploading, error } = useUsers()
  
  const [formData, setFormData] = useState<UpdateUserRequest>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    avtUrl: ""
  })
  const [originalData, setOriginalData] = useState<UpdateUserRequest>({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    avtUrl: ""
  })
  const [avatarUrl, setAvatarUrl] = useState("/default.png")
  const [isLoading, setIsLoading] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentUserId = getUserId()

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUserId) return
      
      try {
        setIsLoading(true)
        const response = await fetch(`/users/${currentUserId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        
        const json = await response.json()
        const userData = json.data
        
        const userFormData = {
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          username: userData.username || "",
          email: userData.email || "",
          phone: userData.phone || "",
          avtUrl: userData.avtUrl || ""
        }
        
        setFormData(userFormData)
        setOriginalData(userFormData)
        const avatarUrlToSet = getAvatarUrl(userData.avtUrl)
        setAvatarUrl(avatarUrlToSet)
      } catch (error) {
        console.error('Error fetching user profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
  }, [currentUserId])

  const handleInputChange = (field: keyof UpdateUserRequest, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && currentUserId) {
      try {
        const imageUrl = URL.createObjectURL(file)
        setAvatarUrl(imageUrl)
        
        const response = await uploadAvatar(currentUserId, file)
        
        if (response.avtUrl) {
          const newAvatarUrl = getAvatarUrl(response.avtUrl)
          setAvatarUrl(newAvatarUrl)
          setFormData(prev => ({ ...prev, avtUrl: response.avtUrl }))
        }
        
        URL.revokeObjectURL(imageUrl)
        
      } catch (error) {
        console.error("Failed to upload avatar:", error)
        if (originalData.avtUrl) {
          setAvatarUrl(originalData.avtUrl)
        } else {
          setAvatarUrl("/default.png")
        }
      }
    }
  }

  const handleAvatarError = () => {
    setAvatarUrl("/default.png")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUserId) return
    
    try {
      await updateUser(currentUserId, formData)
      setSaveSuccess(true)
      
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
      
      setOriginalData(formData)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalData)

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="fixed left-0 top-0 bottom-0 w-64 z-30">
          <div className="h-full overflow-y-auto">
            <LeftBar />
          </div>
        </div>
        <main className="flex-1 overflow-y-auto h-screen p-8 ml-64 mr-64 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 font-medium">Loading your profile...</p>
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
    <div className="min-h-screen flex bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="fixed left-0 top-0 bottom-0 w-64 z-30">
        <div className="h-full overflow-y-auto">
          <LeftBar />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto h-screen p-8 ml-64 mr-64">
        <div className="max-w-4xl mx-auto">
          {/* Header with gradient */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur-xl opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 hover:bg-gray-100 rounded-xl"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Edit Profile
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Update your personal information</p>
                  </div>
                </div>
                {hasChanges && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>Unsaved changes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-sm animate-in slide-in-from-top">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 shadow-sm animate-in slide-in-from-top">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 font-medium">Profile updated successfully!</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section - Enhanced */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
              <Card className="relative bg-white/80 backdrop-blur-sm border-gray-200 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="p-8">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative mb-6">
                      <div 
                        className="relative"
                        onMouseEnter={() => setIsHoveringAvatar(true)}
                        onMouseLeave={() => setIsHoveringAvatar(false)}
                      >
                        <div className={`relative cursor-pointer`} onClick={handleAvatarClick}>
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

                        {/* Edit button */}
                        <button
                          type="button"
                          onClick={handleAvatarClick}
                          disabled={isUploading}
                          className={`absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transition-all duration-200 hover:bg-primary/90 hover:scale-110 ${isHoveringAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Picture</h3>
                    <p className="text-sm text-gray-500 mb-4 max-w-md">
                      Upload a professional photo. Square images work best. Max size: 5MB
                    </p>
                    <Button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={isUploading}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isUploading ? "Uploading..." : "Change Photo"}
                    </Button>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </Card>
            </div>

            {/* Personal Information - Enhanced */}
            <Card className="bg-white/80 backdrop-blur-sm border-gray-200 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <UserCircle className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                    <p className="text-sm text-gray-500">Update your personal details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter your first name"
                      className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter your last name"
                      className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-gray-400" />
                      Username
                    </label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder="Enter your username"
                      className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      Phone
                    </label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter your phone number"
                      className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 transition-all duration-200"
                    />
                  </div>
                  
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email Address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email address"
                      className="rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 h-12 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Action Buttons - Enhanced */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                onClick={() => navigate(-1)}
                className="px-8 h-12 rounded-xl bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-light-4 font-semibold shadow-sm hover:shadow transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!hasChanges || isUpdating}
                className="px-8 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2"
              >
                <Save className="h-5 w-5" />
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
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