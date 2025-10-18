"use client"

import { useState, useEffect } from "react"
import { X, ImageIcon, Video, Smile, MapPin } from "lucide-react"
import toast from "react-hot-toast"
import { EmojiPicker, MentionPortal } from "@/components/ui"
import { getVisibilityIcon, VISIBILITY_OPTIONS } from "@/lib/utils/PostUtils"
import { useUpdatePostModal } from "@/lib/hooks/useUpdatePostModal"
import { UserService } from "@/lib/api/users/UserService"
import { getUserId } from "@/lib/utils/Jwt"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import type { UserMetadata } from "@/lib/types/User"

interface UpdatePostModalProps {
  isOpen: boolean
  post: PostFullDto | null
  onClose: () => void
  onPostUpdated?: () => void
}

const getAvatarUrl = (avtUrl: string | null): string => {
  if (avtUrl && avtUrl.trim() !== '') {
    return avtUrl
  }
  return "/default.png"
}

export function UpdatePostModal({ isOpen, post, onClose, onPostUpdated }: UpdatePostModalProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [userCache, setUserCache] = useState<Map<string, UserMetadata>>(new Map())
  const [visibilityDropdownOpen, setVisibilityDropdownOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    userId: string
    firstName: string
    lastName: string
    avtUrl: string | null
  } | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userId = getUserId()
        if (!userId) return

        const userData = await UserService.getUserMetadata(userId)
        setCurrentUser({
          userId: userData.userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          avtUrl: userData.avtUrl
        })
      } catch (error) {
        console.error("Failed to fetch current user:", error)
      }
    }

    fetchCurrentUser()
  }, [])

  const {
    content,
    visibility,
    setVisibility,
    files,
    existingMedias,
    loading,
    isDragging,
    showEmojiPicker,
    setShowEmojiPicker,
    fileInputRef,
    textareaRef,
    handleFileChange,
    handleRemoveFile,
    handleRemoveExistingMedia,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleAddEmoji,
    handleSubmit: originalHandleSubmit,
    mentions,
    mentionUsers,
    isMentionLoading,
    showMentionDropdown,
    mentionSelectedIndex,
    handleContentChange,
    handleTextareaKeyDown,
    selectMentionUser,
    closeMentionDropdown,
  } = useUpdatePostModal(post, onClose, onPostUpdated)

  useEffect(() => {
    if (!mentions || mentions.length === 0) return

    const fetchUserMetadata = async () => {
      const userIdsToFetch = mentions
        .map((m) => m.userId)
        .filter((userId, index, self) => self.indexOf(userId) === index)
        .filter((userId) => !userCache.has(userId))

      if (userIdsToFetch.length === 0) return

      try {
        const userPromises = userIdsToFetch.map(async (userId) => {
          try {
            const metadata = await UserService.getUserMetadata(userId)
            return { userId, metadata }
          } catch (error) {
            console.error("Failed to fetch user metadata:", error)
            return {
              userId,
              metadata: {
                userId,
                firstName: "User",
                lastName: userId.slice(0, 8),
                avtUrl: null,
              },
            }
          }
        })

        const results = await Promise.all(userPromises)
        setUserCache((prevCache) => {
          const updatedCache = new Map(prevCache)
          results.forEach(({ userId, metadata }) => {
            updatedCache.set(userId, metadata)
          })
          return updatedCache
        })
      } catch (error) {
        console.error("Error fetching user metadata:", error)
      }
    }

    fetchUserMetadata()
  }, [mentions])

  const handleSubmit = async () => {
    try {
      await originalHandleSubmit()
      toast.success("Post updated successfully!", { duration: 2000 })
    } catch (error) {
      console.error("Submit error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update post", { duration: 3000 })
    }
  }

  if (!isMounted || !isOpen || !post) {
    return null
  }

  const totalMediaCount = existingMedias.length + files.length
  const displayName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : "You"
  const avatarUrl = getAvatarUrl(currentUser?.avtUrl ?? null)

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-xl relative animate-in fade-in-90 zoom-in-90 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent select-none">
            Edit Post
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6 relative">
          <div className="flex items-center gap-4">
            {/* User Info - Thay thế chữ "Y" bằng avatar và tên */}
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt="User Avatar"
                className="h-12 w-12 rounded-full object-cover border-2 border-blue-200"
                onError={(e) => {
                  e.currentTarget.src = "/default.png"
                }}
              />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{displayName}</p>
                <p className="text-xs text-gray-500">Editing post</p>
              </div>
            </div>

            {/* Visibility dropdown */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-blue-50 hover:border-blue-400"
                onClick={() => setVisibilityDropdownOpen((v) => !v)}
              >
                {getVisibilityIcon(visibility as any)}
                <span>{VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.label || "Public"}</span>
                <svg
                  className={`ml-1 h-4 w-4 transition-transform ${visibilityDropdownOpen ? "rotate-180" : ""}`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {visibilityDropdownOpen && (
                <ul className="absolute left-0 mt-1 max-h-48 w-40 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-20">
                  {VISIBILITY_OPTIONS.map(({ value, label }) => (
                    <li
                      key={value}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-gray-700 hover:bg-blue-100 ${
                        visibility === value ? "bg-blue-200 font-semibold" : ""
                      }`}
                      onClick={() => {
                        if (value) {
                          setVisibility(value as any)
                        }
                        setVisibilityDropdownOpen(false)
                      }}
                    >
                      {getVisibilityIcon(value as any)}
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Content editing area */}
          <div className="space-y-4">
            {/* Textarea for editing content */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="w-full border-0 text-lg resize-none min-h-[120px] max-h-[180px] focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-400 rounded-2xl p-4 bg-gray-50 shadow-inner"
                placeholder="Edit your post..."
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleTextareaKeyDown}
                maxLength={1000}
              />

              {/* Mention Portal */}
              <MentionPortal
                users={mentionUsers}
                selectedIndex={mentionSelectedIndex}
                onSelect={selectMentionUser}
                onClose={closeMentionDropdown}
                isLoading={isMentionLoading}
                inputRef={textareaRef}
                show={showMentionDropdown}
              />

              {showEmojiPicker && (
                <div className="absolute bottom-[110px] right-8 z-50">
                  <EmojiPicker onSelect={handleAddEmoji} />
                </div>
              )}
            </div>

            {/* Combined Media Preview Grid - Existing + New Files */}
            {totalMediaCount > 0 && (
              <div
                className={`grid gap-3 ${
                  totalMediaCount === 1
                    ? "grid-cols-1"
                    : totalMediaCount === 2
                      ? "grid-cols-2"
                      : totalMediaCount === 3
                        ? "grid-cols-3"
                        : "grid-cols-2"
                }`}
              >
                {/* Existing Media */}
                {existingMedias.map((media) => (
                  <div
                    key={media.mediaId}
                    className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square"
                  >
                    {media.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                      <video src={media.mediaUrl} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={media.mediaUrl} alt="Existing media" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingMedia(media.mediaId)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* New Files */}
                {files.map((file, index) => {
                  const isVideo = file.type.startsWith("video/")
                  const preview = URL.createObjectURL(file)
                  return (
                    <div
                      key={`new-${index}`}
                      className="relative group rounded-2xl overflow-hidden bg-gray-100 aspect-square"
                    >
                      {isVideo ? (
                        <video src={preview} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* File upload area */}
          <div
            className={`mt-4 border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer select-none ${
              isDragging
                ? "border-blue-400 bg-blue-50 shadow-lg"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/70"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-blue-100 rounded-full">
                <ImageIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="font-semibold text-gray-900 select-none">Drop images or videos here</p>
              <p className="text-sm text-gray-500 select-none">or</p>
              <button
                type="button"
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full shadow-md hover:from-blue-600 hover:to-blue-700 transition-colors font-semibold"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Select from computer
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl relative">
          <div className="flex items-center gap-4 text-gray-500">
            <button
              type="button"
              className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors relative"
              onClick={(e) => {
                e.stopPropagation()
                setShowEmojiPicker((v) => !v)
              }}
            >
              <Smile className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-blue-50 hover:text-blue-500 transition-colors"
              onClick={() => toast("Location feature coming soon!")}
            >
              <MapPin className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              className="px-5 py-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-7 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && totalMediaCount === 0)}
            >
              {loading ? (
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                "Update Post"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}