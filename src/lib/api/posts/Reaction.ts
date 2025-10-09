import { ReactionsMetaResponse, ReactDto, ReactionMeta } from "@/lib/types/posts/Reaction"
import { injectToken } from "@/lib/api/auth/Interceptor"

export const reactionService = {
  async getPostsReactions(userId: string, postIds: string[]): Promise<ReactionsMetaResponse> {
    const params = new URLSearchParams({
      userId,
      targetType: 'POST'
    });

    postIds.forEach(id => {
      params.append('targetIds', id);
    });

    const config = injectToken({
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await fetch(`/reaction/metadata?${params.toString()}`, config)
    
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
    const config = injectToken({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dto),
    })

    const res = await fetch(`/reaction`, config)
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to react: ${res.statusText} - ${errorText}`)
    }
  },

  async removeReaction(targetId: string, targetType: string, userId: string): Promise<void> {
    const config = injectToken({
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const res = await fetch(`/reaction/${targetId}/${targetType}/${userId}`, config)
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to remove reaction: ${res.statusText} - ${errorText}`)
    }
  },
}