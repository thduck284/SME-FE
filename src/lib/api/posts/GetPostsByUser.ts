import apiClient from "@/lib/services/ApiClient"
import { getUserId } from '@/lib/context/AuthContext'

export const getPostsByUser = async (limit?: number, cursor?: string) => {
  const userId = getUserId || ''
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  
  
  const res = await apiClient.get(`/posts/user/${userId}`, { params })
  return res.data
}

export const getPostsCount = async () => {
  const userId = getUserId || ''
  const res = await apiClient.get(`/posts/user/${userId}/count`)
  return res.data
}