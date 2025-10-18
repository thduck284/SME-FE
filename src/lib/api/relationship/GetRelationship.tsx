import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'
import apiClient from '@/lib/services/ApiClient'

export const relationshipService = {
  async getFollowers(userId: string): Promise<UserRelationshipsResponseDto> {
    const response = await apiClient.get(`/relationships/${userId}/followers`);
    return response.data;
  },

  async getFollowing(userId: string): Promise<UserRelationshipsResponseDto> {
    const response = await apiClient.get(`/relationships/${userId}/following`);
    return response.data;
  }
}