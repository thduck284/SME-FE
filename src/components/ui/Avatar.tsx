"use client"
import { ReactNode } from "react"

interface AvatarProps {
  children: ReactNode
  className?: string
}

export function Avatar({ children, className }: AvatarProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  )
}

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
