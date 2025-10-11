import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'

export const relationshipService = {
  async getFollowers(userId: string): Promise<UserRelationshipsResponseDto> {
    const res = await fetch(`/relationships/${userId}/followers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch followers: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json();
  },

  async getFollowing(userId: string): Promise<UserRelationshipsResponseDto> {
    const res = await fetch(`/relationships/${userId}/following`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to fetch following: ${res.statusText} - ${errorText}`)
    }
    
    return await res.json();
  }
}