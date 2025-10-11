"use client"

import { useState } from "react"
import { X, ImageIcon, Video, Smile, MapPin } from "lucide-react"
import toast from "react-hot-toast"
import { EmojiPicker, MentionPortal } from "@/components/ui"
import { FilePreviewGrid } from "./FilePreviewGrid"
import { getVisibilityIcon, VISIBILITY_OPTIONS } from "@/lib/utils/PostUtils"
import { useCreatePostModal } from "@/lib/hooks/useCreatePostModal"

interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  onPostCreated?: () => void
  currentUserId?: string
}

export function CreatePostModal({ isOpen, onClose, onPostCreated, currentUserId }: CreatePostModalProps) {
  const preventClose = () => {}

  const {
    content,
    visibility,
    setVisibility,
    files,
    loading,
    isDragging,
    showEmojiPicker,
    setShowEmojiPicker,
    fileInputRef,
    textareaRef,
    handleFileChange,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleAddEmoji,
    handleSubmit: originalHandleSubmit,
    // Mention related
    mentionUsers,
    isMentionLoading,
    showMentionDropdown,
    mentionSelectedIndex,
    handleContentChange,
    handleTextareaKeyDown,
    selectMentionUser,
    closeMentionDropdown,
  } = useCreatePostModal(preventClose, onPostCreated, currentUserId)

  const [visibilityDropdownOpen, setVisibilityDropdownOpen] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    try {
      await originalHandleSubmit()
      toast.success("Post created successfully!", { duration: 2000 })
      setTimeout(() => {
        onClose()
      }, 800)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post", { duration: 3000 })
    }
  }

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
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent select-none">
            Create Post
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6 relative">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-extrabold text-xl select-none">
              Y
            </div>

            {/* Visibility dropdown */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-orange-50 hover:border-orange-400"
                onClick={() => setVisibilityDropdownOpen((v) => !v)}
              >
                {getVisibilityIcon(visibility)}
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
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-gray-700 hover:bg-orange-100 ${
                        visibility === value ? "bg-orange-200 font-semibold" : ""
                      }`}
                      onClick={() => {
                        setVisibility(value)
                        setVisibilityDropdownOpen(false)
                      }}
                    >
                      {getVisibilityIcon(value)}
                      <span>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              ref={textareaRef}
              className="w-full border-0 text-lg resize-none min-h-[120px] max-h-[180px] focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400 rounded-2xl p-4 bg-gray-50 shadow-inner"
              placeholder="What's inspiring you today? Type @ to see all users..."
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleTextareaKeyDown}
              maxLength={1000}
          />

          {/* Mention Portal - Renders outside modal container */}
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

          {files.length > 0 && <FilePreviewGrid files={files} onRemoveFile={handleRemoveFile} />}

          <div
            className={`mt-4 border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer select-none ${
              isDragging
                ? "border-orange-400 bg-orange-50 shadow-lg"
                : "border-gray-300 hover:border-orange-400 hover:bg-orange-50/70"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-orange-100 rounded-full">
                <ImageIcon className="w-8 h-8 text-orange-500" />
              </div>
              <p className="font-semibold text-gray-900 select-none">Drop images or videos here</p>
              <p className="text-sm text-gray-500 select-none">or</p>
              <button
                type="button"
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full shadow-md hover:from-orange-600 hover:to-orange-700 transition-colors font-semibold"
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
              className="p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Video className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors relative"
              onClick={(e) => {
                e.stopPropagation()
                setShowEmojiPicker((v) => !v)
              }}
            >
              <Smile className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 rounded-full hover:bg-orange-50 hover:text-orange-500 transition-colors"
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
              className="px-7 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full hover:from-orange-600 hover:to-orange-700 transition-all shadow-sm hover:shadow-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && files.length === 0)}
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
                "Post"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
