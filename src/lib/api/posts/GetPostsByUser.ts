export const getPostsByUser = async (userId: string, limit?: number, cursor?: string) => {
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  

  const res = await fetch(`/posts/user/${userId}?${new URLSearchParams(params)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Get posts failed: ${res.statusText} - ${errorText}`)
  }
  
  return await res.json()
}

export const getPostsCount = async (userId: string) => {
  const res = await fetch(`/posts/user/${userId}/count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Get posts count failed: ${res.statusText} - ${errorText}`)
  }
  
  return await res.json()
}