"use client"

import { FileText } from "lucide-react"
import type { CommentMedia } from "@/lib/types/posts/CommentsDTO"

interface CommentMediaGridProps {
  medias: CommentMedia[]
}

export function CommentMediaGrid({ medias }: CommentMediaGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {medias.map((media, idx) => {
        const isImage = media.mediaUrl.includes('image') || 
                       media.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        const isVideo = media.mediaUrl.includes('video') || 
                       media.mediaUrl.match(/\.(mp4|webm|ogg)$/i)

        return (
          <div
            key={idx}
            className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm"
          >
            {isImage ? (
              <img
                src={media.mediaUrl}
                alt={`Media ${idx + 1}`}
                className="w-full h-24 object-contain select-none rounded-lg bg-gray-100"
              />
            ) : isVideo ? (
              <video
                src={media.mediaUrl}
                className="w-full h-24 object-contain rounded-lg bg-gray-100"
                controls
                preload="metadata"
                muted
              />
            ) : (
              <div className="w-full h-24 bg-gray-100 flex items-center justify-center rounded-lg select-none">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}