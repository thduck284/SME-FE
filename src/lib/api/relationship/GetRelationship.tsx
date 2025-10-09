import { UserRelationshipsResponseDto } from '@/lib/types/Relationship'

const userId = "572a51cc-38a3-4225-a7f2-203a514293f5";

export const relationshipService = {
  async getFollowers(): Promise<UserRelationshipsResponseDto> {
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

  async getFollowing(): Promise<UserRelationshipsResponseDto> {
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