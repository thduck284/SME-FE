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
  const [position, setPosition] = useState({ top: 300, left: 100, width: 300 }) 
  const portalRef = useRef<HTMLDivElement>(null)

  // Giữ fixed position nhưng bỏ màu mè debug
  useEffect(() => {
    if (show) {
      setPosition({
        top: 400,
        left: 50, 
        width: 250
      })
    }
  }, [show])

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