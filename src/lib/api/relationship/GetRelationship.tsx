import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'
import apiClient from '@/lib/services/ApiClient'

export const relationshipService = {
  async getFollowers(userId: string): Promise<UserRelationshipsResponseDto> {
    const response = await apiClient.get(`/relationships/${userId}/followers`);
    console.log("Followers response", response.data);
    return response.data;
  },

  async getFollowing(userId: string): Promise<UserRelationshipsResponseDto> {
    const response = await apiClient.get(`/relationships/${userId}/following`);
    console.log("Followers response", response.data);
    return response.data;
  }
}