import apiClient from "@/lib/services/ApiClient"

interface CreatePostPayload {
  content?: string
  type?: string
  visibility?: string
  files?: File[]
  mentions?: Array<{
    userId: string
    startIndex: number
    endIndex: number
  }>
}

export async function createPost(payload: CreatePostPayload) {
  const { content, type, visibility, files, mentions } = payload

  if (!content?.trim() && (!files || files.length === 0)) {
    throw new Error("Post cannot be empty")
  }

  const formData = new FormData()
  if (content) formData.append("content", content)
  if (type) formData.append("type", type)
  if (visibility) formData.append("visibility", visibility)
  files?.forEach((file) => formData.append("mediaFiles", file))
  
  if (mentions && mentions.length > 0) {
    mentions.forEach((mention, index) => {
      formData.append(`mentions[${index}][userId]`, mention.userId)
      formData.append(`mentions[${index}][startIndex]`, mention.startIndex.toString())
      formData.append(`mentions[${index}][endIndex]`, mention.endIndex.toString())
    })
  }

  try {
    // Send as JSON if no files, FormData if files present
    if (!files || files.length === 0) {
      const jsonPayload: any = {
        content,
        type,
        visibility
      }
      
      // Only include mentions if they exist and are not empty
      if (mentions && mentions.length > 0) {
        jsonPayload.mentions = mentions
      }
      
      const res = await apiClient.post("/posts", jsonPayload, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      return res.data
    } else {
      const res = await apiClient.post("/posts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      return res.data
    }
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to create post"
    throw new Error(message)
  }
}
