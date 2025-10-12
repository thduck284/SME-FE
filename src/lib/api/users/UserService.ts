import { UserMetadata, UserMetadataResponse } from "@/lib/types/User"
import { RelationshipSuggestion, RelationshipResponse, RelationshipDto } from "@/lib/types/Relationship"

export class UserService {
  private static readonly RELATIONSHIPS_BASE_URL = '/relationships'
  private static readonly USERS_BASE_URL = '/users'

  /**
   * Lấy danh sách gợi ý kết bạn
   */
  static async getSuggestedUsers(currentUserId: string): Promise<RelationshipSuggestion[]> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${currentUserId}/suggestion`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
    
      if (!response.ok) return []
      
      const result: RelationshipResponse = await response.json()
      
      if (!result.success) return []
      console.log("aaaa", result.data)

      return result.data
    } catch (error) {
      console.error('Error fetching suggested users:', error)
      return []
    }
  }

  /**
   * Lấy thông tin chi tiết của user
   */
  static async getUserMetadata(userId: string): Promise<UserMetadata> {
    try {
      const response = await fetch(`${this.USERS_BASE_URL}/${userId}/metadata`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) throw new Error(`User metadata not found for ${userId}`)
      
      const result: UserMetadataResponse = await response.json()
      
      if (!result.success) throw new Error(`User metadata API error for ${userId}`)
      
      return result.data
    } catch (error) {
      console.error('Error fetching user metadata:', error)
      throw error
    }
  }

  /**
   * Lấy thông tin chi tiết của nhiều users
   */
  static async getMultipleUsersMetadata(userIds: string[]): Promise<UserMetadata[]> {
    try {
      const promises = userIds.map(userId => this.getUserMetadata(userId))
      const results = await Promise.all(promises)
      return results
    } catch (error) {
      console.error('Error fetching multiple users metadata:', error)
      throw error
    }
  }

  /**
   * Lấy danh sách gợi ý kết bạn với thông tin chi tiết
   */
  static async getSuggestedUsersWithDetails(currentUserId: string): Promise<Array<RelationshipSuggestion & { userInfo: UserMetadata }>> {
    try {
      const suggestions = await this.getSuggestedUsers(currentUserId)
      
      const userIds = suggestions.map(s => s.userId)
      const userInfos = await this.getMultipleUsersMetadata(userIds)
      
      return suggestions.map(suggestion => ({
        ...suggestion,
        userInfo: userInfos.find(info => info.userId === suggestion.userId)!
      }))
    } catch (error) {
      console.error('Error fetching suggested users with details:', error)
      throw error
    }
  }

  /**
   * Theo dõi một user
   */
  static async followUser(fromUserId: string, toUserId: string): Promise<RelationshipDto> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Follow API request failed')
      }

      const result: RelationshipDto = await response.json()
      return result
    } catch (error) {
      console.error('Error following user:', error)
      throw error
    }
  }

  /**
   * Hủy theo dõi một user
   */
  static async unfollowUser(fromUserId: string, toUserId: string): Promise<void> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unfollow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Unfollow API request failed')
      }
    } catch (error) {
      console.error('Error unfollowing user:', error)
      throw error
    }
  }

  /**
   * Lấy relationship giữa hai users
   */
  static async getRelationship(fromUserId: string, toUserId: string): Promise<{
    fromUser: { userId: string; relationshipTypes: string[] }
    toUser: { userId: string; relationshipTypes: string[] }
    mutualRelationships: string[]
  }> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/relationship/${toUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })

      if (!response.ok) {
        throw new Error('Get relationship API request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting relationship:', error)
      throw error
    }
  }

  /**
   * Mute một user
   */
  static async muteUser(fromUserId: string, toUserId: string): Promise<RelationshipDto> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Mute user API request failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error muting user:', error)
      throw error
    }
  }

  /**
   * Unmute một user
   */
  static async unmuteUser(fromUserId: string, toUserId: string): Promise<void> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unmute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Unmute user API request failed')
      }
    } catch (error) {
      console.error('Error unmuting user:', error)
      throw error
    }
  }

  /**
   * Block một user
   */
  static async blockUser(fromUserId: string, toUserId: string): Promise<void> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/block`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Block user API request failed')
      }
    } catch (error) {
      console.error('Error blocking user:', error)
      throw error
    }
  }

  /**
   * Unblock một user
   */
  static async unblockUser(fromUserId: string, toUserId: string): Promise<void> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ toUserId })
      })

      if (!response.ok) {
        throw new Error('Unblock user API request failed')
      }
    } catch (error) {
      console.error('Error unblocking user:', error)
      throw error
    }
  }
}
