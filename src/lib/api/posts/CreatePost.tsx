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
    formData.append("mentions", JSON.stringify(mentions))
  }

  try {
    const res = await apiClient.post("/posts", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    return res.data
  } catch (error: any) {
    const message = error.response?.data?.message || "Failed to create post"
    throw new Error(message)
  }
}
