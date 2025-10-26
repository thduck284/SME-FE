import apiClient from "@/lib/services/ApiClient"
import type { User, SearchUsersResponse, UploadAvatarResponse, DeleteAvatarResponse, UpdateUserRequest, UpdateUserResponse } from "@/lib/types/users/UserDTO"

export interface SearchUsersParams {
  keyword?: string
  cursor?: string
  limit?: number
}

const transformUserData = (user: any) => ({
  ...user,
  displayName: user.username,
  fullName: `${user.firstName} ${user.lastName}`.trim()
})

export const userApi = {
  searchUsers: async (params: SearchUsersParams): Promise<SearchUsersResponse> => {
    try {
      const response = await apiClient.get('/users/search', {
        params
      })
      
      const transformedData = {
        ...response.data,
        users: response.data?.data?.map((user: any) => transformUserData(user)) || [] 
      }
      
      return transformedData
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to search users"
      throw new Error(message)
    }
  },

  uploadAvatar: async (userId: string, file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await apiClient.post('/users/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (response.data.data) {
        response.data.data = transformUserData(response.data.data)
      }
      
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to upload avatar"
      throw new Error(message)
    }
  },

  deleteAvatar: async (userId: string): Promise<DeleteAvatarResponse> => {
    try {
      const response = await apiClient.delete(`/users/avatar`)
      
      if (response.data.data) {
        response.data.data = transformUserData(response.data.data)
      }
      
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to delete avatar"
      throw new Error(message)
    }
  },

  getUserById: async (userId: string): Promise<User> => {
    try {
      const response = await apiClient.get(`/users/${userId}/metadata`)
      return transformUserData(response.data)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to get user by ID"
      throw new Error(message)
    }
  },

  getUser: async (userId: string): Promise<User> => {
    try {
      const response = await apiClient.get(`/users/${userId}`)
      const userData = response.data
      return transformUserData(userData)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to get user"
      throw new Error(message)
    }
  },

  updateUser: async (userId: string, updateUserDto: UpdateUserRequest): Promise<UpdateUserResponse> => {
    try {
      const response = await apiClient.patch(`/users/edit`, updateUserDto)
      
      if (response.data.data) {
        response.data.data = transformUserData(response.data.data)
      }
      
      return response.data
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to update user"
      throw new Error(message)
    }
  },
}