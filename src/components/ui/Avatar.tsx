"use client"
import { ReactNode, useState, useEffect } from "react"

interface AvatarProps {
  src?: string
  alt?: string
  fallback?: ReactNode
  className?: string
}

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  // Reset error state và cập nhật src khi prop src thay đổi
  useEffect(() => {
    setCurrentSrc(src)
    setImageError(false)
  }, [src])

  const showImage = currentSrc && !imageError
  const showFallback = !showImage

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
    >
      {showImage && (
        <img 
          src={currentSrc} 
          alt={alt} 
          className="w-full h-full object-cover object-center"
          onError={() => setImageError(true)}
        />
      )}
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            {fallback}
          </span>
        </div>
      )}
    </div>
  )
}