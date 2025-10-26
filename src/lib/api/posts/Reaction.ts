import { ReactionsMetaResponse, ReactDto, ReactionMeta } from "@/lib/types/posts/Reaction"
import apiClient from "@/lib/services/ApiClient"

export const reactionService = {
  async getPostsReactions(userId: string, postIds: string[]): Promise<ReactionsMetaResponse> {
    const params = new URLSearchParams({
      userId,
      targetType: 'POST'
    })

    postIds.forEach(id => {
      params.append('targetIds', id)
    })

    const response = await apiClient.get(`/reaction/metadata?${params.toString()}`);
    return response.data;
  },

  async getCommentsReactions(userId: string, commentIds: string[]): Promise<ReactionsMetaResponse> {
    const params = new URLSearchParams({
      userId,
      targetType: 'COMMENT'
    })

    commentIds.forEach(id => {
      params.append('targetIds', id)
    })

    const response = await apiClient.get(`/reaction/metadata?${params.toString()}`);
    return response.data;
  },

  async getPostReactions(userId: string, postId: string): Promise<ReactionMeta> {
    const response = await this.getPostsReactions(userId, [postId])
    return response[postId]
  },

  async react(dto: ReactDto): Promise<void> {
    await apiClient.post(`/reaction`, dto);
  },

  async removeReaction(targetId: string, targetType: string, userId: string): Promise<void> {
    await apiClient.delete(`/reaction/${targetId}/${targetType}`)
  },
}
