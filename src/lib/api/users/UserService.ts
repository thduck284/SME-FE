import { UserMetadata, UserMetadataResponse } from "@/lib/types/User"
import { RelationshipSuggestion, RelationshipResponse, RelationshipDto } from "@/lib/types/Relationship"

export class UserService {
  private static readonly RELATIONSHIPS_BASE_URL = 'http://localhost:3002'
  private static readonly USERS_BASE_URL = 'http://localhost:3001'

  /**
   * Lấy danh sách gợi ý kết bạn
   */
  static async getSuggestedUsers(currentUserId: string): Promise<RelationshipSuggestion[]> {
    try {
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/relationships/${currentUserId}/suggestion`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      })
      
      if (!response.ok) return []
      
      const result: RelationshipResponse = await response.json()
      
      if (!result.success) return []
      
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
      const response = await fetch(`${this.USERS_BASE_URL}/users/${userId}/metadata`, {
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
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/relationships/${fromUserId}/follow`, {
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
      const response = await fetch(`${this.RELATIONSHIPS_BASE_URL}/relationships/${fromUserId}/unfollow`, {
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
}
