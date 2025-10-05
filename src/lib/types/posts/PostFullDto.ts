export interface PostFullDto {
  postId: string
  authorId: string
  content?: string
  type: string
  visibility: string
  createdAt: string
  updatedAt?: string
  medias: { mediaId: string; mediaUrl: string }[]
  mentions: { userId: string; startIndex: number; endIndex: number }[]
  rootPost?: PostFullDto
}
