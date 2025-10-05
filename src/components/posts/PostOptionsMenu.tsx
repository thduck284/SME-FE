"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui"
import { MoreHorizontal, Edit2, Trash2, BookmarkPlus, Pin, Flag, EyeOff, Loader2 } from "lucide-react"

interface PostOptionsMenuProps {
  postId: string
  isOwnPost?: boolean
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => Promise<void> | void // Cho phép async
  onSave?: (postId: string) => void
  onPin?: (postId: string) => void
  onHide?: (postId: string) => void
  onReport?: (postId: string) => void
  isDeleting?: boolean 
}

export function PostOptionsMenu({
  postId,
  isOwnPost = true,
  onEdit,
  onDelete,
  onSave,
  onPin,
  onHide,
  onReport,
  isDeleting = false // Default value
}: PostOptionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localDeleting, setLocalDeleting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
    
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }

    setLocalDeleting(true)
    try {
      // CHỈ gọi onDelete từ props (không dùng hook ở đây nữa)
      await onDelete?.(postId)
      setIsOpen(false)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setLocalDeleting(false)
    }
  }

  const MenuItem = ({ 
    icon: Icon, 
    label, 
    onClick, 
    danger = false,
    loading = false
  }: { 
    icon: React.ElementType
    label: string
    onClick: () => void
    danger?: boolean 
    loading?: boolean
  }) => (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full px-4 py-2.5 flex items-center gap-3 text-left text-sm transition-colors ${
        danger 
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
      ) : (
        <Icon className="h-4 w-4 flex-shrink-0" />
      )}
      <span className="font-medium">{label}</span>
    </button>
  )

  const Divider = () => <div className="my-1 border-t border-gray-200 dark:border-gray-700" />

  // Tính toán trạng thái loading (từ component cha hoặc local)
  const deleting = isDeleting || localDeleting

  return (
    <div ref={menuRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-9 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        aria-label="Post options"
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1">
            {/* Own Post Actions */}
            {isOwnPost && (
              <>
                {onEdit && (
                  <MenuItem
                    icon={Edit2}
                    label="Edit post"
                    onClick={() => handleAction(() => onEdit?.(postId))}
                  />
                )}

                {onPin && (
                  <MenuItem
                    icon={Pin}
                    label="Pin to profile"
                    onClick={() => handleAction(() => onPin?.(postId))}
                  />
                )}

                {onSave && (
                  <MenuItem
                    icon={BookmarkPlus}
                    label="Save post"
                    onClick={() => handleAction(() => onSave?.(postId))}
                  />
                )}

                {/* Hiển thị divider nếu có các action khác và có delete */}
                {(onEdit || onPin || onSave) && onDelete && <Divider />}

                {/* Delete button - CHỈ hiển thị khi có onDelete từ props */}
                {onDelete && (
                  <MenuItem
                    icon={Trash2}
                    label={deleting ? "Deleting..." : "Delete post"}
                    onClick={handleDelete}
                    danger
                    loading={deleting}
                  />
                )}
              </>
            )}

            {/* Other user's post actions */}
            {!isOwnPost && (
              <>
                {onSave && (
                  <MenuItem
                    icon={BookmarkPlus}
                    label="Save post"
                    onClick={() => handleAction(() => onSave?.(postId))}
                  />
                )}

                {onHide && (
                  <MenuItem
                    icon={EyeOff}
                    label="Hide post"
                    onClick={() => handleAction(() => onHide?.(postId))}
                  />
                )}

                {(onSave || onHide) && onReport && <Divider />}

                {onReport && (
                  <MenuItem
                    icon={Flag}
                    label="Report post"
                    onClick={() => handleAction(() => onReport?.(postId))}
                    danger
                  />
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}