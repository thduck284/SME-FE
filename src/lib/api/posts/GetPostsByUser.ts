import apiClient from "@/lib/services/ApiClient"
import { decodeJWT } from '@/lib/utils/Jwt'

// Helper function để lấy userId từ token
const getCurrentUserId = (): string => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    throw new Error('User not authenticated')
  }
  
  const decoded = decodeJWT(token)
  if (!decoded || !decoded.sub) {
    throw new Error('Invalid token format')
  }
  
  return decoded.sub 
}

export const getPostsByUser = async (limit?: number, cursor?: string) => {
  const userId = getCurrentUserId()
  const params: Record<string, any> = {}
  
  if (limit) params.fetchSize = limit  
  if (cursor) params.pageState = cursor  
  
  const res = await apiClient.get(`/posts/user/${userId}`, { params })
  return res.data
}

export const getPostsCount = async () => {
  const userId = getCurrentUserId()
  const res = await apiClient.get(`/posts/user/${userId}/count`)
  return res.data
}