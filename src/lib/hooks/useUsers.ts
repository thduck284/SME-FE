import { useState, useCallback } from 'react'
import { userApi } from "@/lib/api/users/User"
import type { User, SearchUsersParams, UpdateUserRequest } from "@/lib/types/users/UserDTO"

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<{
    nextCursor?: string
    hasMore: boolean
  }>({ hasMore: false })

  // Tìm kiếm users
  const searchUsers = useCallback(async (params: SearchUsersParams) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await userApi.searchUsers(params)
      
      // Nếu có cursor, append users; không thì replace
      if (params.cursor) {
        setUsers(prev => [...prev, ...response.users])
      } else {
        setUsers(response.users)
      }
      
      setPagination({
        nextCursor: response.nextCursor,
        hasMore: response.hasMore
      })
      
      return response
    } catch (error: any) {
      console.error('Failed to search users:', error)
      setError(error.response?.data?.message || 'Failed to search users')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load more users
  const loadMoreUsers = useCallback(async () => {
    if (!pagination.hasMore || !pagination.nextCursor) return
    
    await searchUsers({
      cursor: pagination.nextCursor,
      limit: 20
    })
  }, [pagination, searchUsers])

  // Upload avatar
  const uploadAvatar = useCallback(async (userId: string, file: File): Promise<User> => {
    setIsUploading(true)
    setError(null)
    
    try {
      const response = await userApi.uploadAvatar(userId, file)
      return response.data
    } catch (error: any) {
      console.error('Failed to upload avatar:', error)
      setError(error.response?.data?.message || 'Failed to upload avatar')
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [])

  // Delete avatar
  const deleteAvatar = useCallback(async (userId: string): Promise<User> => {
    setIsDeleting(true)
    setError(null)
    
    try {
      const response = await userApi.deleteAvatar(userId)
      return response.data
    } catch (error: any) {
      console.error('Failed to delete avatar:', error)
      setError(error.response?.data?.message || 'Failed to delete avatar')
      throw error
    } finally {
      setIsDeleting(false)
    }
  }, [])

  // Get user by ID
  const getUserById = useCallback(async (userId: string): Promise<User> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const user = await userApi.getUserById(userId)
      return user
    } catch (error: any) {
      console.error('Failed to get user:', error)
      setError(error.response?.data?.message || 'Failed to get user')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Update user
  const updateUser = useCallback(async (userId: string, updateData: UpdateUserRequest): Promise<User> => {
    setIsUpdating(true)
    setError(null)
    
    try {
      const response = await userApi.updateUser(userId, updateData)
      return response.data
    } catch (error: any) {
      console.error('Failed to update user:', error)
      setError(error.message || 'Failed to update user')
      throw error
    } finally {
      setIsUpdating(false)
    }
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Clear users
  const clearUsers = useCallback(() => {
    setUsers([])
    setPagination({ hasMore: false })
  }, [])

  return {
    // State
    users,
    isLoading,
    isUploading,
    isDeleting,
    isUpdating, // Thêm vào đây
    error,
    pagination,
    
    // Actions
    searchUsers,
    loadMoreUsers,
    uploadAvatar,
    deleteAvatar,
    getUserById,
    updateUser, // Thêm vào đây
    clearError,
    clearUsers
  }
}