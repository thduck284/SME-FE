"use client"

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Badge } from './'
import type { MentionUser } from '@/lib/types/users/MentionDto'

interface MentionPortalProps {
  users: MentionUser[]
  selectedIndex: number
  onSelect: (user: MentionUser) => void
  onClose: () => void
  isLoading: boolean
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
  show: boolean
}

export function MentionPortal({ 
  users, 
  selectedIndex, 
  onSelect, 
  onClose, 
  isLoading,
  inputRef,
  show
}: MentionPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 300 }) 
  const portalRef = useRef<HTMLDivElement>(null)

  // Calculate position based on input element
  useEffect(() => {
    if (!show || !inputRef.current) return

    const updatePosition = () => {
      const input = inputRef.current
      if (!input) return

      const rect = input.getBoundingClientRect()
      
      const DROPDOWN_HEIGHT = 300 // Approximate max height
      const DROPDOWN_WIDTH = 350
      const GAP = 8
      
      // Always try to position below input first
      let top = rect.bottom + GAP
      let left = rect.left

      // Check if dropdown would go off-screen at the bottom
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top

      // Only flip to above if there's literally not enough space below AND there's good space above
      // For comments, we want to avoid flipping up as much as possible
      const MIN_SPACE_REQUIRED = 100 // Minimum space needed for dropdown
      if (spaceBelow < MIN_SPACE_REQUIRED && spaceAbove > DROPDOWN_HEIGHT + 20) {
        top = rect.top - DROPDOWN_HEIGHT - GAP
      }

      // Ensure it doesn't go off-screen horizontally
      const maxWidth = Math.min(DROPDOWN_WIDTH, window.innerWidth - 16)
      const finalWidth = Math.min(DROPDOWN_WIDTH, maxWidth)
      
      // Adjust left position to keep dropdown visible
      let finalLeft = left
      if (left + finalWidth > window.innerWidth - 8) {
        finalLeft = window.innerWidth - finalWidth - 8
      }
      if (finalLeft < 8) {
        finalLeft = 8
      }

      setPosition({
        top,
        left: finalLeft,
        width: finalWidth
      })
    }

    updatePosition()

    // Recalculate on scroll/resize with throttle
    let timeoutId: NodeJS.Timeout
    const throttledUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updatePosition, 10)
    }

    window.addEventListener('scroll', throttledUpdate, true)
    window.addEventListener('resize', throttledUpdate)

    return () => {
      window.removeEventListener('scroll', throttledUpdate, true)
      window.removeEventListener('resize', throttledUpdate)
      clearTimeout(timeoutId)
    }
  }, [show, inputRef])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (portalRef.current && !portalRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (show) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [show, onClose, inputRef])

  if (!show) return null

  return createPortal(
    <div
      ref={portalRef}
      className="fixed z-[99999] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: '300px',
      }}
    >
      <div className="w-full overflow-y-auto max-h-60">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
            Đang tìm kiếm...
          </div>
        ) : users.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Không tìm thấy người dùng
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={user.userId}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onSelect(user)}
            >
              <Avatar 
                src={user.avtUrl || '/assets/images/default.png'} 
                alt={`${user.firstName} ${user.lastName}`}
                className="h-10 w-10 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.relationshipTypes && user.relationshipTypes.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-2 py-0.5 flex-shrink-0"
                    >
                      {user.relationshipTypes[0]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  )
}