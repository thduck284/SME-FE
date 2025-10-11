"use client"

import { Button } from "@/components/ui" 
import { X, ChevronLeft, ChevronRight } from "lucide-react"
import { PostFullDto } from "@/lib/types/posts/PostFullDto"
import { ImageModalContent } from "./ImageModalContent"
import { useState, useCallback } from "react"
import type { PostStats } from "@/lib/api/posts/PostStats"

interface ImageModalProps {
  imageUrl: string | null
  post: PostFullDto | null
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
  hasNext?: boolean
  hasPrev?: boolean
  isLoading?: boolean
  reactions?: {
    userReaction: string | null
    counters: Record<string, number>
  }
  onReact: (reactionType: string) => void
  onRemoveReaction: () => void
  reactionsLoading: boolean
  postStats?: PostStats
}

export function ImageModal({ 
  imageUrl, 
  post,
  onClose, 
  onNext, 
  onPrev, 
  hasNext = false, 
  hasPrev = false,
  isLoading = false,
  reactions,
  onReact,
  onRemoveReaction: _onRemoveReaction,
  reactionsLoading: _reactionsLoading,
  postStats
}: ImageModalProps) {
  if (!imageUrl || !post) return null

  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const minSwipeDistance = 50

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose()
    if (e.key === "ArrowLeft" && hasPrev) onPrev?.()
    if (e.key === "ArrowRight" && hasNext) onNext?.()
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    if (distance > minSwipeDistance && hasNext) onNext?.()
    if (distance < -minSwipeDistance && hasPrev) onPrev?.()
  }, [touchStart, touchEnd, hasNext, hasPrev, onNext, onPrev])

  return (
    <div
      className="fixed inset-0 z-[9999] flex bg-black bg-opacity-95"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-[10001]">
          <div className="text-white text-lg">Loading more posts...</div>
        </div>
      )}

      {/* Nút đóng góc trên trái */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 left-4 z-[10000] h-10 w-10 p-0 bg-gray-700/80 hover:bg-gray-500/80 text-white border-0 transition-all duration-200"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </Button>

      {/* Panel ảnh - FULL HEIGHT */}
      <div className="flex-1 flex items-center justify-center relative select-none h-full">
        <div
          className="w-full h-full flex items-center justify-center relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={imageUrl}
            alt="Selected media"
            className="w-auto h-full object-contain"
            draggable={false}
          />

          {/* Dấu chấm chỉ vị trí */}
          {(hasPrev || hasNext) && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 bg-gray-700/70 backdrop-blur-sm rounded-full px-3 py-2 z-[10000]">
              {hasPrev && <div className="w-2 h-2 rounded-full bg-white/60"></div>}
              <div className="w-2 h-2 rounded-full bg-white"></div>
              {hasNext && <div className="w-2 h-2 rounded-full bg-white/60"></div>}
            </div>
          )}
        </div>

        {/* NÚT 2 BÊN ẢNH - LUÔN HIỂN THỊ NHƯNG CÓ THỂ DISABLED */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none z-[10000]">
          {/* Nút bên trái - LUÔN HIỂN THỊ */}
          <div className="pointer-events-auto">
            <Button
              variant="ghost"
              size="sm"
              className={`ml-4 h-14 w-14 p-0 text-white border-0 transition-all duration-200 rounded-full shadow-lg ${
                hasPrev 
                  ? "bg-gray-700/70 hover:bg-gray-500/80 cursor-pointer" 
                  : "bg-gray-400/30 cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                if (!hasPrev) return
                e.stopPropagation()
                onPrev?.()
              }}
              disabled={!hasPrev || isLoading}
            >
              <ChevronLeft className="h-7 w-7" />
            </Button>
          </div>

          {/* Nút bên phải - LUÔN HIỂN THỊ */}
          <div className="pointer-events-auto">
            <Button
              variant="ghost"
              size="sm"
              className={`mr-4 h-14 w-14 p-0 text-white border-0 transition-all duration-200 rounded-full shadow-lg ${
                hasNext 
                  ? "bg-gray-700/70 hover:bg-gray-500/80 cursor-pointer" 
                  : "bg-gray-400/30 cursor-not-allowed opacity-50"
              }`}
              onClick={(e) => {
                if (!hasNext || isLoading) return
                e.stopPropagation()
                onNext?.()
              }}
              disabled={!hasNext || isLoading}
            >
              <ChevronRight className="h-7 w-7" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panel thông tin bên phải */}
      <ImageModalContent 
        post={post} 
        reactions={reactions}
        onReact={async (reactionType) => {
          await onReact(reactionType)
        }}
        onShareSuccess={() => {
          // Handle share success if needed
          console.log('Share success')
        }}
        postStats={postStats}
      />
    </div>
  )
}