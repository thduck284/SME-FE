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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const portalRef = useRef<HTMLDivElement>(null)

  // Update position when input changes
  useEffect(() => {
    if (!show || !inputRef.current) return

    const updatePosition = () => {
      const inputRect = inputRef.current!.getBoundingClientRect()
      setPosition({
        top: inputRect.bottom + window.scrollY + 4,
        left: inputRect.left + window.scrollX,
        width: inputRect.width
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
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
      className="fixed z-[9999]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 w-full overflow-y-auto">
        {isLoading ? (
          <div className="p-3 text-center text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
            Đang tìm kiếm...
          </div>
        ) : users.length === 0 ? (
          <div className="p-3 text-center text-gray-500 dark:text-gray-400">
            Không tìm thấy người dùng
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={user.userId}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                index === selectedIndex ? 'bg-orange-50 dark:bg-orange-900/20' : ''
              }`}
              onClick={() => onSelect(user)}
            >
              <Avatar 
                src={user.avtUrl || '/assets/images/default.png'} 
                alt={`${user.firstName} ${user.lastName}`}
                className="h-8 w-8"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.firstName} {user.lastName}
                  </span>
                  {user.relationshipTypes.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0.5"
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
