// components/comments/modals/CommentOptionsModal.tsx
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui"
import { Edit, Trash2, Flag, Copy } from "lucide-react"
import type { Comment as CommentType } from "@/lib/types/posts/CommentsDTO"

interface CommentOptionsModalProps {
  isOpen: boolean
  comment: CommentType | null
  position: { x: number; y: number }
  currentUserId?: string
  onDelete: (commentId: string) => void
  onEdit: (comment: CommentType) => void
  onClose: () => void
}

export function CommentOptionsModal({
  isOpen,
  comment,
  position,
  currentUserId,
  onDelete,
  onEdit,
  onClose
}: CommentOptionsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  const handleCopyText = async () => {
    if (comment?.content) {
      try {
        await navigator.clipboard.writeText(comment.content)
        onClose()
        // You might want to show a toast notification here
      } catch (error) {
        console.error('Failed to copy text:', error)
      }
    }
  }

  const handleReport = () => {
    // Implement report functionality
    console.log('Report comment:', comment?.id)
    onClose()
  }

  if (!isOpen || !comment) return null

  const isOwner = currentUserId && comment.authorId === currentUserId

  // Calculate position to ensure modal stays within viewport
  const modalWidth = 200
  const modalHeight = 160
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let adjustedX = position.x
  let adjustedY = position.y

  if (position.x + modalWidth > viewportWidth) {
    adjustedX = position.x - modalWidth
  }

  if (position.y + modalHeight > viewportHeight) {
    adjustedY = position.y - modalHeight
  }

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
      <div
        ref={modalRef}
        className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px] z-50"
        style={{
          left: adjustedX,
          top: adjustedY,
          pointerEvents: 'auto'
        }}
      >
        {isOwner ? (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                onEdit(comment)
                onClose()
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Comment
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-50 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                onDelete(comment.id)
                onClose()
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Comment
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-50"
              onClick={handleCopyText}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Text
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-sm hover:bg-gray-50 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleReport}
            >
              <Flag className="h-4 w-4 mr-2" />
              Report Comment
            </Button>
          </>
        )}
      </div>
    </div>
  )
}