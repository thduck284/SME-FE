export interface PostMentionDto {
  userId: string
  startIndex: number
  endIndex: number
}

export type PostType = "ORIGINAL" | "SHARE"

export type Visibility = "PUBLIC" | "PRIVATE" | "FRIEND" | "FOLLOWER"

export interface CreatePostDto {
  content?: string
  type?: PostType
  visibility?: Visibility
  mentions?: PostMentionDto[]
}

export interface CreateSharePostDto extends CreatePostDto {
  rootPostId: string
  mediaFiles?: File[]
}