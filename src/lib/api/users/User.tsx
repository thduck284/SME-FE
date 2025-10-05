import apiClient from "@/lib/services/ApiClient"
import type { User, SearchUsersResponse, UploadAvatarResponse, DeleteAvatarResponse } from "@/lib/types/users/UserDTO"

export interface SearchUsersParams {
  keyword?: string
  cursor?: string
  limit?: number
}

export const userApi = {
  // Tìm kiếm users
  searchUsers: async (params: SearchUsersParams): Promise<SearchUsersResponse> => {
    const queryParams: Record<string, any> = {}
    
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.cursor) queryParams.cursor = params.cursor
    if (params.limit) queryParams.limit = params.limit
    
    const res = await apiClient.get('/users/search', { params: queryParams })
    
    // Transform data để thêm computed fields
    const transformedData = {
      ...res.data,
      users: res.data.users?.map((user: any) => ({
        ...user,
        displayName: user.username,
        fullName: `${user.firstName} ${user.lastName}`.trim()
      })) || []
    }
    
    return transformedData
  },

  // Upload avatar
  uploadAvatar: async (userId: string, file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await apiClient.post(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    
    // Transform response data
    if (res.data.data) {
      res.data.data = {
        ...res.data.data,
        displayName: res.data.data.username,
        fullName: `${res.data.data.firstName} ${res.data.data.lastName}`.trim()
      }
    }
    
    return res.data
  },

  // Delete avatar
  deleteAvatar: async (userId: string): Promise<DeleteAvatarResponse> => {
    const res = await apiClient.delete(`/users/${userId}/avatar/delete`)
    
    // Transform response data
    if (res.data.data) {
      res.data.data = {
        ...res.data.data,
        displayName: res.data.data.username,
        fullName: `${res.data.data.firstName} ${res.data.data.lastName}`.trim()
      }
    }
    
    return res.data
  },

  // Get user by ID (nếu có API này)
  getUserById: async (userId: string): Promise<User> => {
    const res = await apiClient.get(`/users/${userId}`)
    
    // Transform data
    return {
      ...res.data,
      displayName: res.data.username,
      fullName: `${res.data.firstName} ${res.data.lastName}`.trim()
    }
  }
}