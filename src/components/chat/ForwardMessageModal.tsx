"use client"

import { useState, useEffect } from 'react'
import { X, Check, Search, Users, User } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { ChatService, Conversation } from '@/lib/api/chat/ChatService'
import { UserService } from '@/lib/api/users/UserService'
import { getUserId } from '@/lib/utils/Jwt'
import { userApi } from '@/lib/api/users/User'

interface ForwardMessageModalProps {
  isOpen: boolean
  onClose: () => void
  message: {
    messageId: string
    content?: string
    attachments?: string[]
    senderId: string
  } | null
  onForward: (targets: Array<{ type: 'conversation' | 'friend'; id: string }>) => Promise<void>
}

interface ConversationWithDetails extends Conversation {
  displayName?: string
  displayAvatar?: string
  isGroup?: boolean
}

interface FriendWithDetails {
  userId: string
  displayName: string
  displayAvatar: string
  hasConversation: boolean
  conversationId?: string
}

interface ForwardTarget {
  type: 'conversation' | 'friend'
  id: string
  displayName: string
  displayAvatar: string
  isGroup?: boolean
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function ForwardMessageModal({
  isOpen,
  onClose,
  message,
  onForward
}: ForwardMessageModalProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [friends, setFriends] = useState<FriendWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTargets, setSelectedTargets] = useState<Map<string, ForwardTarget>>(new Map())
  const [forwarding, setForwarding] = useState(false)
  const userId = getUserId()

  useEffect(() => {
    if (isOpen && message) {
      loadData()
      setSelectedTargets(new Map())
      setSearchQuery('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, message])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load conversations and friends in parallel
      const [conversationsResponse, friendIds] = await Promise.all([
        ChatService.getConversations(100),
        UserService.getFriends(userId || '')
      ])

      const allConversations = conversationsResponse.conversations || []

      // Enrich conversations with display info
      const enrichedConversations = await Promise.all(
        allConversations.map(async (conv) => {
          const enriched: ConversationWithDetails = { ...conv }
          const convType = (conv.conversationType || conv.type || '').toLowerCase()
          const isGroup = convType === 'group'

          enriched.isGroup = isGroup

          if (isGroup) {
            // For groups, use title
            enriched.displayName = conv.title || 'Group Chat'
            enriched.displayAvatar = '/group.jpg'
          } else {
            // For direct conversations, get the other participant
            const participants = conv.participants || []
            const otherParticipant = participants.find((p: any) => {
              const participantId = p.userId || p.id || p
              return participantId && participantId !== userId
            })

            if (otherParticipant) {
              const participantId = otherParticipant.userId || otherParticipant.id || otherParticipant
              try {
                const userInfo = await userApi.getUser(participantId)
                const userData = userInfo.data || userInfo
                enriched.displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User'
                enriched.displayAvatar = userData.avtUrl || "/assets/images/default.png"
              } catch (error) {
                console.error(`Error loading participant ${participantId}:`, error)
                enriched.displayName = conv.title || 'Unknown User'
                enriched.displayAvatar = "/assets/images/default.png"
              }
            } else {
              enriched.displayName = conv.title || 'Chat'
              enriched.displayAvatar = "/assets/images/default.png"
            }
          }

          return enriched
        })
      )

      // Filter out invalid conversations
      const validConversations = enrichedConversations.filter(conv => {
        if (!conv.conversationId) return false
        if (!conv.displayName || conv.displayName === 'Unknown User') return false
        if (!conv.isGroup) {
          const participants = conv.participants || []
          if (participants.length === 0) return false
        }
        return true
      })

      // Create a map of friend IDs to conversation IDs for direct conversations
      const friendConversationMap = new Map<string, string>()
      validConversations.forEach(conv => {
        if (!conv.isGroup) {
          const participants = conv.participants || []
          const otherParticipant = participants.find((p: any) => {
            const participantId = p.userId || p.id || p
            return participantId && participantId !== userId
          })
          if (otherParticipant) {
            const participantId = otherParticipant.userId || otherParticipant.id || otherParticipant
            friendConversationMap.set(participantId, conv.conversationId)
          }
        }
      })

      // Load friends with details
      const friendsWithDetails = await Promise.all(
        friendIds.map(async (friendId) => {
          try {
            const userInfo = await userApi.getUser(friendId)
            const userData = userInfo.data || userInfo
            const displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'User'
            const displayAvatar = userData.avtUrl || "/assets/images/default.png"
            const conversationId = friendConversationMap.get(friendId)

            return {
              userId: friendId,
              displayName,
              displayAvatar,
              hasConversation: !!conversationId,
              conversationId
            }
          } catch (error) {
            console.error(`Error loading friend ${friendId}:`, error)
            return {
              userId: friendId,
              displayName: `User ${friendId}`,
              displayAvatar: "/assets/images/default.png",
              hasConversation: false
            }
          }
        })
      )

      setConversations(validConversations)
      setFriends(friendsWithDetails.filter(f => f.displayName !== `User ${f.userId}`))
    } catch (error) {
      console.error('Error loading data:', error)
      setConversations([])
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTarget = (target: ForwardTarget) => {
    setSelectedTargets(prev => {
      const newMap = new Map(prev)
      const key = `${target.type}-${target.id}`
      if (newMap.has(key)) {
        newMap.delete(key)
      } else {
        newMap.set(key, target)
      }
      return newMap
    })
  }

  const handleForward = async () => {
    if (selectedTargets.size === 0 || !message) {
      console.error('handleForward: No targets selected or no message')
      return
    }

    console.log('Starting forward process:', {
      messageId: message.messageId,
      selectedCount: selectedTargets.size,
      selectedTargets: Array.from(selectedTargets.values())
    })

    try {
      setForwarding(true)
      await onForward(Array.from(selectedTargets.values()))
      console.log('Forward completed successfully')
      onClose()
    } catch (error: any) {
      console.error('Error forwarding message:', error)
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        stack: error?.stack
      })
      const errorMessage = error?.message || error?.toString() || 'An error occurred while forwarding the message'
      
      // Check if it's a complete failure (all targets failed)
      const isCompleteFailure = errorMessage.includes('Failed to forward message')
      const is404Error = errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('does not exist')
      
      if (isCompleteFailure) {
        // All targets failed - show error and suggest retry
        const suggestion = is404Error 
          ? '\n\nAll selected conversations may have been deleted. Please close the modal, reopen it and select different conversations.'
          : '\n\nWould you like to try again?'
        
        const userChoice = confirm(`${errorMessage}${suggestion}`)
        if (userChoice && !is404Error) {
          // User wants to retry, don't close modal
          setForwarding(false)
          return
        }
        // Close modal (user doesn't want to retry or it's 404 error)
        onClose()
      } else {
        // Some succeeded - this shouldn't happen as we handle it in the hook, but just in case
        console.warn('Partial success or unexpected error handling')
        onClose()
      }
    } finally {
      setForwarding(false)
    }
  }

  // Combine conversations and friends for display
  const allTargets: ForwardTarget[] = [
    // Add groups first
    ...conversations
      .filter(conv => conv.isGroup)
      .map(conv => ({
        type: 'conversation' as const,
        id: conv.conversationId!,
        displayName: conv.displayName || 'Group Chat',
        displayAvatar: conv.displayAvatar || '/group.jpg',
        isGroup: true
      })),
    // Add direct conversations
    ...conversations
      .filter(conv => !conv.isGroup)
      .map(conv => ({
        type: 'conversation' as const,
        id: conv.conversationId!,
        displayName: conv.displayName || 'Chat',
        displayAvatar: conv.displayAvatar || '/assets/images/default.png',
        isGroup: false
      })),
    // Add friends without conversations
    ...friends
      .filter(friend => !friend.hasConversation)
      .map(friend => ({
        type: 'friend' as const,
        id: friend.userId,
        displayName: friend.displayName,
        displayAvatar: friend.displayAvatar,
        isGroup: false
      }))
  ]

  const filteredTargets = allTargets.filter(target => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return target.displayName?.toLowerCase().includes(query)
  })

  if (!isOpen || !message) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Forward Message</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={forwarding}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 mb-2">Message to forward:</p>
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            {message.content && (
              <p className="text-sm text-gray-900 mb-2">{message.content}</p>
            )}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <span>📎 {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends or groups..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={forwarding}
            />
          </div>
        </div>

        {/* Targets list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredTargets.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? 'No results found' : 'No friends or groups available'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTargets.map((target) => {
                const key = `${target.type}-${target.id}`
                const isSelected = selectedTargets.has(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleToggleTarget(target)}
                    disabled={forwarding}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    } ${forwarding ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Avatar
                      src={target.displayAvatar}
                      alt={target.displayName || 'Chat'}
                      fallback={getAvatarFallback(target.displayName || 'Chat')}
                      className="w-10 h-10 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{target.displayName || 'Chat'}</p>
                        {target.isGroup ? (
                          <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        ) : (
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {target.type === 'friend' && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          Friend
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {selectedTargets.size > 0 && (
              <span>{selectedTargets.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={forwarding}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedTargets.size === 0 || forwarding}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {forwarding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Forwarding...</span>
                </>
              ) : (
                <span>Forward ({selectedTargets.size})</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
