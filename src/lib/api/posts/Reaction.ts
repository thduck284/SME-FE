import { ReactionsMetaResponse, ReactDto, ReactionMeta } from "@/lib/types/posts/Reaction"
import apiClient from "@/lib/services/ApiClient"

export const reactionService = {
  async getPostsReactions(userId: string, postIds: string[]): Promise<ReactionsMetaResponse> {
    const params = new URLSearchParams({
      userId,
      targetType: 'POST'
    });

    postIds.forEach(id => {
      params.append('targetIds', id);
    });

    const res = await fetch(`/reaction/metadata?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch reactions: ${res.statusText} - ${errorText}`)
    }
    
    const data = await res.json();
    return data;
  },

  async getPostReactions(userId: string, postId: string): Promise<ReactionMeta> {
    const response = await this.getPostsReactions(userId, [postId])
    return response[postId]
  },

  async react(dto: ReactDto): Promise<void> {
    const res = await fetch(`/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    })
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to react: ${res.statusText} - ${errorText}`)
    }
  },

  async removeReaction(targetId: string, targetType: string, userId: string): Promise<void> {
    try {
      await apiClient.delete(`/reaction/${targetId}/${targetType}`)
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to remove reaction"
      throw new Error(message)
    }
  },
}