"use client"

import { useState, useEffect } from "react"
import { Button, Avatar } from "@/components/ui"
import { Globe, Users, UserPlus, Lock, ImageIcon, Send, X, Video } from "lucide-react"
import { useShare } from "@/lib/hooks/useShare"
import type { CreatePostDto, Visibility } from "@/lib/types/posts/CreatePostDto"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  post: {
    postId: string
    content?: string
    medias?: { mediaId: string; mediaUrl: string }[]
    authorName: string
    authorAvatar?: string
  }
  onSuccess?: () => void
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ReactElement; description: string }[] = [
  { value: "PUBLIC", label: "Public", icon: <Globe className="w-4 h-4" />, description: "Anyone can see" },
  { value: "FRIEND", label: "Friends", icon: <Users className="w-4 h-4" />, description: "Your friends only" },
  { value: "FOLLOWER", label: "Followers", icon: <UserPlus className="w-4 h-4" />, description: "Your followers" },
  { value: "PRIVATE", label: "Only me", icon: <Lock className="w-4 h-4" />, description: "Just you" },
]

export function ShareModal({ isOpen, onClose, post, onSuccess }: ShareModalProps) {
  const [content, setContent] = useState("")
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC")
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false)

  const { isSharing, error, sharePost, clearError } = useShare()

  // Clear error when modal opens
  useEffect(() => {
    if (isOpen) {
      clearError()
    }
  }, [isOpen, clearError])

  const handleShare = async () => {
    if (isSharing) return

    try {
      const shareData: CreatePostDto & { mediaFiles?: File[] } = {
        content: content.trim() || undefined,
        type: "SHARE",
        visibility,
        ...(mediaFiles.length > 0 && { mediaFiles })
      }

      await sharePost(post.postId, shareData)
      handleClose()
      onSuccess?.()
    } catch (error) {
      // Error is already handled by useShare hook
      console.error('Share failed:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setMediaFiles(prev => [...prev, ...files])
  }

  const removeMediaFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleClose = () => {
    setContent("")
    setMediaFiles([])
    setVisibility("PUBLIC")
    setShowVisibilityDropdown(false)
    clearError()
    onClose()
  }

  const selectedVisibility = VISIBILITY_OPTIONS.find(opt => opt.value === visibility)

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Share Post</h2>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={isSharing}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              {/* Share Content Input */}
              <div>
                <textarea
                  placeholder="Share your thoughts about this post..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[120px] p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 transition-colors placeholder:text-gray-400 text-gray-900 dark:text-white"
                  disabled={isSharing}
                />
              </div>

              {/* Media Upload Section */}
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {mediaFiles.map((file, index) => {
                    const isVideo = file.type.startsWith('video/')
                    return (
                      <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {isVideo ? (
                          <video
                            src={URL.createObjectURL(file)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <div className="absolute bottom-2 left-2 bg-black/70 rounded-full p-1">
                            <Video className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeMediaFile(index)}
                          className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={isSharing}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Original Post Preview */}
              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar
                    src={post.authorAvatar || "/image.png"}
                    alt={post.authorName}
                    className="h-10 w-10 ring-2 ring-white dark:ring-gray-700"
                  />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{post.authorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Original post</p>
                  </div>
                </div>
                
                {post.content && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-4 leading-relaxed">
                    {post.content}
                  </p>
                )}

                {post.medias && post.medias.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {post.medias.slice(0, 3).map((media, index) => (
                      <div key={media.mediaId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        <img
                          src={media.mediaUrl}
                          alt={`Media ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {index === 2 && post.medias && post.medias.length > 3 && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-white font-semibold text-lg">+{post.medias.length - 3}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 text-sm text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              {/* Media Upload Button */}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="share-media-upload"
                disabled={isSharing}
              />
              <label htmlFor="share-media-upload">
                <div className="p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <ImageIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </label>

              {/* Visibility Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  disabled={isSharing}
                >
                  {selectedVisibility?.icon}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedVisibility?.label}
                  </span>
                </button>

                {showVisibilityDropdown && (
                  <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[240px] z-10">
                    {VISIBILITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setVisibility(option.value)
                          setShowVisibilityDropdown(false)
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                          visibility === option.value ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <div className={`mt-0.5 ${visibility === option.value ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}`}>
                          {option.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`text-sm font-medium ${
                            visibility === option.value 
                              ? "text-blue-600 dark:text-blue-400" 
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {option.description}
                          </p>
                        </div>
                        {visibility === option.value && (
                          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleClose}
                disabled={isSharing}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={isSharing || (!content.trim() && mediaFiles.length === 0)}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
              >
                {isSharing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Share Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}