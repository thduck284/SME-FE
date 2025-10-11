import type { User, SearchUsersResponse, UploadAvatarResponse, DeleteAvatarResponse } from "@/lib/types/users/UserDTO"

export interface SearchUsersParams {
  keyword?: string
  cursor?: string
  limit?: number
}

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type')
  
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text()
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error(`Server returned HTML page. Status: ${response.status}`)
    }
    throw new Error(`Expected JSON but got ${contentType}. Status: ${response.status}`)
  }
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

const transformUserData = (user: any) => ({
  ...user,
  displayName: user.username,
  fullName: `${user.firstName} ${user.lastName}`.trim()
})

export const userApi = {
  searchUsers: async (params: SearchUsersParams): Promise<SearchUsersResponse> => {
    const queryParams: Record<string, any> = {}
    
    if (params.keyword) queryParams.keyword = params.keyword
    if (params.cursor) queryParams.cursor = params.cursor
    if (params.limit) queryParams.limit = params.limit
    
    const queryString = buildQueryString(queryParams)
    
    const url = `/users/search${queryString}`
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const data = await handleResponse(response)
      
      const transformedData = {
        ...data,
        users: data.data?.map((user: any) => transformUserData(user)) || [] 
      }
      
      return transformedData
    } catch (error) {
      console.error('Search API error:', error)
      throw error
    }
  },

  uploadAvatar: async (userId: string, file: File): Promise<UploadAvatarResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
    })
    
    const data = await handleResponse(response)
    
    if (data.data) {
      data.data = transformUserData(data.data)
    }
    
    return data
  },

  deleteAvatar: async (userId: string): Promise<DeleteAvatarResponse> => {
    const response = await fetch(`/users/${userId}/avatar/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await handleResponse(response)
    
    if (data.data) {
      data.data = transformUserData(data.data)
    }
    
    return data
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await fetch(`/users/${userId}/metadata`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const data = await handleResponse(response)
    
    return transformUserData(data)
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await fetch(`/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to fetch user: ${response.status} - ${errorText}`)
    }
    
    const json = await response.json()
    const userData = json.data
    
    return transformUserData(userData)
  }
}