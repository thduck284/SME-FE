export interface UserMetadata {
  userId: string
  firstName: string
  lastName: string
  avtUrl: string | null
}

export interface UserMetadataResponse {
  success: boolean
  message: string
  data: UserMetadata
}


