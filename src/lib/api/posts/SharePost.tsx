import apiClient from "@/lib/services/ApiClient"
import type { PostFullDto } from "@/lib/types/posts/PostFullDto"
import type { CreatePostDto } from "@/lib/types/posts/CreatePostDto"

export const shareApi = {
  sharePost: async (rootPostId: string, data: CreatePostDto & { mediaFiles?: File[] }): Promise<PostFullDto> => {
    const formData = new FormData()
    
    if (data.content) {
      formData.append('content', data.content)
    }
    
    formData.append('type', 'SHARE')
    
    // Gửi visibility, mặc định là PUBLIC nếu không có
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

    const res = await apiClient.post(`/posts/${rootPostId}/share`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    return res.data.data
  },
}