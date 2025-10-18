import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'
import apiClient from '@/lib/services/ApiClient'

export const relationshipService = {
  async getFollowers(userId: string): Promise<UserRelationshipsResponseDto> {
    const { data } = await apiClient.get(`/relationships/${userId}/followers`)
    return data
  },

  async getFollowing(userId: string): Promise<UserRelationshipsResponseDto> {
    const { data } = await apiClient.get(`/relationships/${userId}/following`)
    return data
  },
}
