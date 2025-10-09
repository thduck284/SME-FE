import { injectToken } from "@/lib/api/auth/Interceptor"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"

export const shareApi = {
  sharePost: async (rootPostId: string, data: CreatePostDto & { mediaFiles?: File[] }): Promise<PostFullDto> => {
    const formData = new FormData()
    
    if (data.content) {
      formData.append('content', data.content)
    }
    
    formData.append('type', 'SHARE')
    
    formData.append('visibility', data.visibility || 'PUBLIC')
    
    // Add media files if any
    if (data.mediaFiles && data.mediaFiles.length > 0) {
      data.mediaFiles.forEach(file => {
        formData.append('mediaFiles', file)
      })
    }

    // KHÔNG gửi mentions array rỗng
    if (data.mentions && data.mentions.length > 0) {
      formData.append('mentions', JSON.stringify(data.mentions))
    }

    // Sử dụng injectToken - KHÔNG set Content-Type header
    const config = injectToken({
      method: 'POST',
      body: formData,
    })

    const res = await fetch(`/posts/${rootPostId}/share`, config)
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Share post failed: ${res.statusText} - ${errorText}`)
    }
    
    const response = await res.json()
    return response.data
  },
}