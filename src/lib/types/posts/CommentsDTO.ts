export interface Comment {
  id: string
  content: string
  authorId: string
  authorName: string
  authorAvatar?: string
  createdAt: string
  likes: number
  isLiked: boolean
  postId: string
  parentCommentId?: string
  mentions?: CommentMention[]
  medias?: CommentMedia[]
}

export interface CommentMedia {
  mediaId: string
  mediaUrl: string
  mediaType: string
}

export interface CommentMention {
  userId: string
  startIndex: number
  endIndex: number
  userName?: string
}

export interface CommentsResponse {
  comments: Comment[]
  nextCursor?: string
  hasMore: boolean
}

export interface CreateCommentRequest {
  postId: string
  parentCommentId?: string
  content?: string
  mentions?: CommentMention[]
}