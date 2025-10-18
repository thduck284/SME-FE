import apiClient from "@/lib/services/ApiClient"

interface UpdatePostPayload {
  content?: string
  visibility?: string
  files?: File[]
  existingMedias?: Array<{ mediaId: string; mediaUrl: string }>
  mentions?: Array<{
    userId: string
    startIndex: number
    endIndex: number
  }>
}

export async function updatePost(postId: string, payload: UpdatePostPayload) {
  const { content, visibility, files, existingMedias, mentions } = payload

  if (!content?.trim() && (!files || files.length === 0) && (!existingMedias || existingMedias.length === 0)) {
    throw new Error("Post cannot be empty")
  }

  try {
    const formData = new FormData()

    if (content !== undefined) {
      formData.append("content", content)
    }

    if (visibility !== undefined) {
      formData.append("visibility", visibility)
    }
    
    if (existingMedias && existingMedias.length > 0) {
      for (const media of existingMedias) {
        try {
          const response = await fetch(media.mediaUrl)
          const blob = await response.blob()
          const file = new File([blob], `existing_${media.mediaId}.jpg`, { type: blob.type })
          formData.append("mediaFiles", file)
        } catch (error) {
          console.error(`Failed to convert existing media ${media.mediaId}:`, error)
        }
      }
    }

    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append("mediaFiles", file)
      })
    }

    if (mentions && mentions.length > 0) {
      mentions.forEach((mention, index) => {
        formData.append(`mentions[${index}][userId]`, mention.userId)
        formData.append(`mentions[${index}][startIndex]`, mention.startIndex.toString())
        formData.append(`mentions[${index}][endIndex]`, mention.endIndex.toString())
      })
    }

    const res = await apiClient.patch(`/posts/${postId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
    
    return res.data
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to update post"
    throw new Error(message)
  }
}