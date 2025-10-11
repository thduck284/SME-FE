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
    const res = await fetch("/posts", {
      method: "POST",
      body: formData,
    })

    const contentType = res.headers.get("content-type")
    let data

    if (contentType && contentType.includes("application/json")) {
      data = await res.json()
    } else {
      data = await res.text()
      if (typeof data === 'string') {
        data = { postId: data }
      }
    }

    if (!res.ok) {
      throw new Error(data?.message || `Create post failed: ${res.status}`)
    }

    console.log("Post created:", data)
    return data
    
  } catch (error: any) {
    const message = error.message || "Failed to create post"
    throw new Error(message)
  }
}