import apiClient from '@/lib/services/ApiClient'

export interface Conversation {
  conversationId: string
  conversationType?: string
  type?: string  // Backend returns 'type', frontend uses 'conversationType'
  title?: string
  lastMessage?: string
  lastMessageSender?: string
  unreadCount: number
  createdAt: Date
  updatedAt?: Date
  participants?: Participant[]
}

export interface Participant {
  userId: string
  role: string
}

export interface Message {
  messageId: string
  conversationId: string
  senderId: string
  content?: string
  attachments?: string[]
  status?: string
  action?: string
  userStatus?: 'SENT' | 'DELIVERED' | 'READ' // Status of message for the current user
  readByUserIds?: string[] // List of user IDs who have read this message
  createdAt: Date
  updatedAt?: Date
}

export interface MessageReactionCounts {
  [reaction: string]: number
}

export interface MessageReactionUser {
  userId: string
  name?: string
  avatar?: string
  reaction: string
  reactedAt?: string | Date
}

export interface CreateConversationDto {
  type: 'direct' | 'group'
  participantIds: string[]
  title?: string
}

export interface SendMessageDto {
  content?: string
  attachments?: string[]
}

export interface EditMessageDto {
  content?: string
  attachments?: string[]
}

export interface GetConversationsResponse {
  conversations: Conversation[]
  nextCursor?: string
}

export interface GetMessagesResponse {
  messages: Message[]
  nextCursor?: string
}

// Type guard for API errors
function isApiError(error: unknown): error is { 
  response?: { 
    data?: any 
    status?: number 
  } 
  message: string 
} {
  return typeof error === 'object' && error !== null && 'message' in error
}

export class ChatService {
  private static readonly BASE_URL = '/conversations'

  static async createConversation(dto: CreateConversationDto): Promise<{ conversationId: string }> {
    try {
      // Add validation
      if (!dto.participantIds || !Array.isArray(dto.participantIds) || dto.participantIds.length === 0) {
        throw new Error('participantIds must be a non-empty array')
      }

      // Clean the participantIds
      const cleanParticipantIds = dto.participantIds
        .map(id => id?.toString().trim())
        .filter(id => id && id.length > 0)

      if (cleanParticipantIds.length === 0) {
        throw new Error('No valid participant IDs provided')
      }

      // Log the request for debugging
      console.log('Creating conversation with payload:', {
        type: dto.type,
        participantIds: cleanParticipantIds,
        title: dto.title
      })

      const payload = {
        // Backend expects enum values in uppercase: 'DIRECT' | 'GROUP'
        type: dto.type.toUpperCase(),
        participantIds: cleanParticipantIds,
        ...(dto.title && { title: dto.title })
      }

      const response = await apiClient.post(this.BASE_URL, payload)
      
      // Handle different response formats
      if (response.data && response.data.conversationId) {
        return { conversationId: response.data.conversationId }
      } else if (response.data && response.data.data && response.data.data.conversationId) {
        return { conversationId: response.data.data.conversationId }
      } else if (response.data && response.data.id) {
        return { conversationId: response.data.id }
      } else {
        console.error('Unexpected response format:', response.data)
        throw new Error('Unexpected response format from server')
      }
    } catch (error) {
      if (isApiError(error)) {
        console.error('ChatService.createConversation error:', {
          error: error.response?.data,
          status: error.response?.status,
          payload: dto
        })
      } else {
        console.error('ChatService.createConversation unknown error:', error)
      }
      throw error
    }
  }

  static async getConversations(fetchSize: number = 20, pageState?: string): Promise<GetConversationsResponse> {
    try {
      const params: any = { fetchSize }
      if (pageState) {
        params.pageState = pageState
      }
      
      const response = await apiClient.get(this.BASE_URL, { params })
      
      // Handle different response formats
      let conversations: Conversation[] = []
      let nextCursor: string | undefined

      if (Array.isArray(response.data)) {
        conversations = response.data
      } else if (response.data && Array.isArray(response.data.data)) {
        conversations = response.data.data
        nextCursor = response.data.metadata?.nextCursor || response.data.nextCursor
      } else if (response.data && Array.isArray(response.data.conversations)) {
        conversations = response.data.conversations
        nextCursor = response.data.nextCursor
      }

      // Map backend field 'type' to frontend 'conversationType'
      conversations = conversations.map(conv => ({
        ...conv,
        conversationType: conv.conversationType || conv.type || 'direct'
      }))

      return {
        conversations,
        nextCursor
      }
    } catch (error) {
      console.error('ChatService.getConversations error:', error)
      throw error
    }
  }

  static async getMessages(
    conversationId: string,
    fetchSize: number = 10,
    pageState?: string
  ): Promise<GetMessagesResponse> {
    try {
      const params: any = { fetchSize }
      if (pageState) {
        params.pageState = pageState
      }
      
      const response = await apiClient.get(`${this.BASE_URL}/${conversationId}/messages`, { params })
      
      // Handle different response formats
      let messages: Message[] = []
      let nextCursor: string | undefined

      if (Array.isArray(response.data)) {
        messages = response.data
      } else if (response.data && Array.isArray(response.data.data)) {
        messages = response.data.data
        nextCursor = response.data.meta?.nextCursor
          || response.data.metadata?.nextCursor
          || response.data.nextCursor
      } else if (response.data && Array.isArray(response.data.messages)) {
        messages = response.data.messages
        nextCursor = response.data.meta?.nextCursor
          || response.data.metadata?.nextCursor
          || response.data.nextCursor
      }
      
      return {
        messages,
        nextCursor
      }
    } catch (error) {
      console.error('ChatService.getMessages error:', error)
      throw error
    }
  }

  static async sendMessage(conversationId: string, dto: SendMessageDto): Promise<{ messageId: string }> {
    try {
      const response = await apiClient.post(`${this.BASE_URL}/${conversationId}/messages`, dto)
      
      // Handle different response formats
      if (response.data && response.data.messageId) {
        return { messageId: response.data.messageId }
      } else if (response.data && response.data.data && response.data.data.messageId) {
        return { messageId: response.data.data.messageId }
      } else if (response.data && response.data.id) {
        return { messageId: response.data.id }
      } else {
        console.error('Unexpected response format:', response.data)
        throw new Error('Unexpected response format from server')
      }
    } catch (error) {
      console.error('ChatService.sendMessage error:', error)
      throw error
    }
  }

  static async getConversation(conversationId: string): Promise<Conversation> {
    try {
      const response = await apiClient.get(`${this.BASE_URL}/${conversationId}`)
      
      // Handle different response formats
      if (response.data) {
        return response.data.data || response.data
      }
      
      throw new Error('Invalid response format')
    } catch (error) {
      console.error('ChatService.getConversation error:', error)
      throw error
    }
  }

  // Helper method to find or create direct conversation
  static async findOrCreateDirectConversation(recipientId: string): Promise<string> {
    try {
      // First, try to find existing direct conversation
      const { conversations } = await this.getConversations(50)
      
      const existingConversation = conversations.find(conv => {
        // Check if it's a direct conversation
        if (conv.conversationType !== 'direct' && conv.conversationType !== 'DIRECT') {
          return false
        }
        
        // Check if recipient is a participant
        if (conv.participants && Array.isArray(conv.participants)) {
          return conv.participants.some(participant => participant.id === recipientId)
        }
        
        return false
      })

      if (existingConversation) {
        console.log('Found existing conversation:', existingConversation.conversationId)
        return existingConversation.conversationId
      }

      // If no existing conversation, create a new one
      console.log('Creating new conversation with recipient:', recipientId)
      const result = await this.createConversation({
        type: 'direct',
        participantIds: [recipientId]
      })
      
      return result.conversationId
    } catch (error) {
      console.error('ChatService.findOrCreateDirectConversation error:', error)
      throw error
    }
  }

  // Fetch reaction counts for a specific message
  static async getMessageReactionCounts(conversationId: string, messageId: string): Promise<MessageReactionCounts> {
    try {
      const url = `${this.BASE_URL}/${conversationId}/messages/${messageId}/reactions/counts`
      const response = await apiClient.get(url)
      
      // Handle ApiResponse wrapper: { success: true, data: {...}, message: "..." }
      let data = {}
      if (response.data?.data) {
        data = response.data.data
      } else if (response.data && typeof response.data === 'object' && !response.data.success) {
        // Direct object, not wrapped
        data = response.data
      }
      
      // Normalize keys to uppercase for UI mapping
      const normalized: MessageReactionCounts = {}
      Object.entries(data).forEach(([k, v]) => {
        const key = (k || '').toString().toUpperCase()
        const val = typeof v === 'number' ? v : Number(v) || 0
        if (key && val > 0) normalized[key] = val
      })
      
      return normalized
    } catch (e: any) {
      // Silent fail - message might not have reactions yet
      return {}
    }
  }

  // Fetch users who reacted to a message, optionally filter by reaction
  static async getMessageReactions(
    conversationId: string,
    messageId: string,
    reaction?: string
  ): Promise<MessageReactionUser[]> {
    try {
      const url = `${this.BASE_URL}/${conversationId}/messages/${messageId}/reactions`
      const params = reaction ? { reaction } : undefined
      const response = await apiClient.get(url, { params })
      const raw = response.data?.data || response.data || []
      const list: MessageReactionUser[] = Array.isArray(raw) ? raw : (raw.items || [])
      return list.map((u: any) => ({
        userId: u.userId || u.id || u.user_id,
        name: u.name || u.fullName || u.username,
        avatar: u.avatar || u.avatarUrl,
        reaction: (u.reaction || reaction || '').toString(),
        reactedAt: u.reactedAt || u.createdAt
      }))
    } catch (e) {
      console.warn('getMessageReactions failed', e)
      return []
    }
  }

  // Add participant to group conversation
  static async addParticipant(conversationId: string, userId: string): Promise<void> {
    try {
      const response = await apiClient.post(`${this.BASE_URL}/${conversationId}/participants`, {
        userId
      })
      
      // Handle ApiResponse wrapper (success: true/false)
      // If response has success field, it's wrapped in ApiResponse format
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        // ApiResponse format: { success: true, data: {...}, message: '...' }
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to add participant')
        }
        // Success case, just return
        return
      }
      
      // Direct response (no wrapper)
      return
    } catch (error: any) {
      console.error('ChatService.addParticipant error:', error)
      // Re-throw with better error message
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error?.message) {
        throw error
      }
      throw new Error('Failed to add participant')
    }
  }

  // Remove participant from group conversation
  static async removeParticipant(conversationId: string, userId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.BASE_URL}/${conversationId}/participants/${userId}`)
      
      // Handle ApiResponse wrapper (success: true/false)
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to remove participant')
        }
        return
      }
      
      return
    } catch (error: any) {
      console.error('ChatService.removeParticipant error:', error)
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error?.message) {
        throw error
      }
      throw new Error('Failed to remove participant')
    }
  }

  // Assign admin role to participant
  static async assignAdmin(conversationId: string, userId: string): Promise<void> {
    try {
      const response = await apiClient.post(`${this.BASE_URL}/${conversationId}/participants/${userId}/admin`)
      
      // Handle ApiResponse wrapper (success: true/false)
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to assign admin role')
        }
        return
      }
      
      return
    } catch (error: any) {
      console.error('ChatService.assignAdmin error:', error)
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error?.message) {
        throw error
      }
      throw new Error('Failed to assign admin role')
    }
  }

  // Delete message (only unread messages)
  static async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.BASE_URL}/${conversationId}/messages/${messageId}`)
      
      // Handle ApiResponse wrapper
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to delete message')
        }
        return
      }
      
      return
    } catch (error: any) {
      console.error('ChatService.deleteMessage error:', error)
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error?.message) {
        throw error
      }
      throw new Error('Failed to delete message')
    }
  }

  // Edit message (only unread messages)
  static async editMessage(conversationId: string, messageId: string, dto: EditMessageDto): Promise<Message> {
    try {
      const response = await apiClient.put(`${this.BASE_URL}/${conversationId}/messages/${messageId}`, dto)
      
      // Handle ApiResponse wrapper
      if (response.data && typeof response.data === 'object' && 'success' in response.data) {
        if (response.data.success === false) {
          throw new Error(response.data.message || 'Failed to edit message')
        }
        // Return the updated message
        return response.data.data?.message || response.data.data
      }
      
      // Direct response
      return response.data?.message || response.data
    } catch (error: any) {
      console.error('ChatService.editMessage error:', error)
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message)
      }
      if (error?.message) {
        throw error
      }
      throw new Error('Failed to edit message')
    }
  }
}