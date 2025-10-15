// lib/types/users/UserDTO.ts
export interface User {
  id: number
  userId: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  avtUrl?: string
  createdAt?: string
  updatedAt?: string
  // Computed fields for display
  displayName?: string
  fullName?: string
}

export interface SearchUsersResponse {
  users: User[]
  nextCursor?: string
  hasMore: boolean
  total?: number
}

export interface UploadAvatarResponse {
  message: string
  data: User
}

export interface DeleteAvatarResponse {
  message: string
  data: User
}

export interface SearchUsersParams {
  keyword?: string
  cursor?: string
  limit?: number
}

export interface UpdateUserRequest {
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  avtUrl?: string
}

export interface UpdateUserResponse {
  success: boolean
  data: User
  message?: string
}