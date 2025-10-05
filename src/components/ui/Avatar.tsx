"use client"

import { ReactNode, useState, useEffect } from "react"

// Avatar component với cả hai cách sử dụng
interface AvatarProps {
  src?: string
  alt?: string
  fallback?: ReactNode
  className?: string
  children?: ReactNode
}

export function Avatar({ src, alt, fallback, className, children }: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  // Reset error state và cập nhật src khi prop src thay đổi
  useEffect(() => {
    setCurrentSrc(src)
    setImageError(false)
  }, [src])

  // Nếu có children, sử dụng cách compose
  if (children) {
    return (
      <div
        className={`relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      >
        {children}
      </div>
    )
  }

  // Nếu không có children, sử dụng cách tự động với fallback
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

// Các component con để sử dụng theo cách compose
interface AvatarImageProps {
  src?: string
  alt?: string
  className?: string
}

export function AvatarImage({ src, alt, className }: AvatarImageProps) {
  if (!src) return null
  return <img src={src} alt={alt} className={`w-full h-full object-cover ${className}`} />
}

interface AvatarFallbackProps {
  children: ReactNode
  className?: string
}

export function AvatarFallback({ children, className }: AvatarFallbackProps) {
  return (
    <span className={`text-sm font-medium text-gray-700 ${className}`}>
      {children}
    </span>
  )
}