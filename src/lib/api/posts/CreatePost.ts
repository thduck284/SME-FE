interface CreatePostPayload {
  content?: string
  type?: string
  visibility?: string
  files?: File[]
}

export async function createPost(payload: CreatePostPayload) {
  const { content, type, visibility, files } = payload

  if (!content?.trim() && (!files || files.length === 0)) {
    throw new Error("Post cannot be empty")
  }

  const formData = new FormData()
  if (content) formData.append("content", content)
  if (type) formData.append("type", type)
  if (visibility) formData.append("visibility", visibility)
  files?.forEach((file) => formData.append("mediaFiles", file))

  try {
    const res = await fetch("/posts", {
      method: "POST",
      body: formData,
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Create post failed: ${res.statusText} - ${errorText}`)
    }

    console.log("Post", res)
    
    return await res.json()
  } catch (error: any) {
    const message = error.message || "Failed to create post"
    throw new Error(message)
  }
}