import { UserMetadata, UserMetadataResponse } from "@/lib/types/User"
import { RelationshipSuggestion, RelationshipResponse, RelationshipDto } from "@/lib/types/Relationship"
import apiClient from "@/lib/services/ApiClient"

export class UserService {
  private static readonly RELATIONSHIPS_BASE_URL = '/relationships'
  private static readonly USERS_BASE_URL = '/users'

  /**
   * Lấy danh sách gợi ý kết bạn
   */
  static async getSuggestedUsers(currentUserId: string): Promise<RelationshipSuggestion[]> {
    try {
      const { data: result } = await apiClient.get<RelationshipResponse>(
        `${this.RELATIONSHIPS_BASE_URL}/${currentUserId}/suggestion`
      )

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
      const { data: result } = await apiClient.get<UserMetadataResponse>(
        `${this.USERS_BASE_URL}/${userId}/metadata`
      )

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
      const { data } = await apiClient.post<RelationshipDto>(
        `${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/follow`,
        { toUserId }
      )
      return data
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
      await apiClient.post(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unfollow`, { toUserId })
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
      const { data } = await apiClient.get(
        `${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/relationship/${toUserId}`
      )
      return data
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
      const { data } = await apiClient.post<RelationshipDto>(
        `${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/mute`,
        { toUserId }
      )
      return data
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
      await apiClient.post(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unmute`, { toUserId })
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
      await apiClient.post(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/block`, { toUserId })
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
      await apiClient.post(`${this.RELATIONSHIPS_BASE_URL}/${fromUserId}/unblock`, { toUserId })
    } catch (error) {
      console.error('Error unblocking user:', error)
      throw error
    }
  }
}
