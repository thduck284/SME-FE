
export interface MentionUser {
  userId: string
  firstName: string
  lastName: string
  avtUrl: string | null
  relationshipTypes: string[]
}

export interface MentionResponse {
  success: boolean
  message: string
  data: MentionUser[]
}


export interface MentionData {
  userId: string
  startIndex: number
  endIndex: number
  displayName: string
}
