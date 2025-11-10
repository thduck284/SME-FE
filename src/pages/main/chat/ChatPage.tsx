"use client"

import { useState, useEffect, useRef } from 'react'
import { User, Video, Phone } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { Link } from 'react-router-dom'
import { ChatService, Message, Conversation } from '@/lib/api/chat/ChatService'
import { ChatContent } from '@/components/chat/ChatContent'
import { ChatHeader } from '@/components/chat/ChatHeader'
import { ConversationList } from '@/components/chat/ConversationList'
import { ChatRightSidebar } from '@/components/chat/ChatRightSidebar'
import { CreateGroupModal } from '@/components/chat/CreateGroupModal'
import { AddMemberModal } from '@/components/chat/AddMemberModal'
import { VideoCallModal } from '@/components/chat/VideoCallModal'
import { GroupAvatar } from '@/components/chat/GroupAvatar'
import { UserService } from '@/lib/api/users/UserService'
import { getUserId } from '@/lib/utils/Jwt'
import { useLiveness } from '@/lib/context/LivenessSocketContext'
import { useChat } from '@/lib/context/ChatSocketContext'
import { userApi } from '@/lib/api/users/User'
import { UserMetadata } from '@/lib/types/User'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { AlertModal } from '@/components/ui/AlertModal'

type TabType = 'all' | 'unread' | 'groups'

interface ConversationWithDetails extends Omit<Conversation, 'createdAt'> {
  recipientId?: string
  recipientName?: string
  recipientAvatar?: string
  createdAt?: Date
}

export function ChatPage() {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('') // For searching conversations (left sidebar)
  const [chatSearchQuery, setChatSearchQuery] = useState('') // For searching messages in chat (right sidebar)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showMediaSearch, setShowMediaSearch] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [friends, setFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([])
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set())
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [expandedSections, setExpandedSections] = useState<{ members: boolean; media: boolean; files: boolean }>({
    members: false,
    media: false,
    files: false
  })
  const [expandedFileSubSections, setExpandedFileSubSections] = useState<{ media: boolean; files: boolean; links: boolean }>({
    media: false,
    files: false,
    links: false
  })
  const [participantsData, setParticipantsData] = useState<Array<{ userId: string; metadata: UserMetadata | null }>>([])
  const [groupParticipantsDataMap, setGroupParticipantsDataMap] = useState<Map<string, Array<{ userId: string; metadata?: UserMetadata | null }>>>(new Map())
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [availableFriends, setAvailableFriends] = useState<Array<{ id: string; name: string; avatar: string }>>([])
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState<Set<string>>(new Set())
  const [addingMembers, setAddingMembers] = useState(false)
  const [senderNameCache, setSenderNameCache] = useState<Map<string, string>>(new Map())
  const [newMessageConversations, setNewMessageConversations] = useState<Set<string>>(new Set())
  const [showVideoCall, setShowVideoCall] = useState(false)
  const [videoCallType, setVideoCallType] = useState<'video' | 'voice'>('video')
  const [incomingCall, setIncomingCall] = useState<{ conversationId: string; callerId: string; callerName?: string; type: 'video' | 'voice' } | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'confirm' | 'warning' | 'danger' | 'info'; onConfirm: () => void } | null>(null)
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'success' | 'error' | 'warning' | 'info' } | null>(null)
  const userId = getUserId()
  const { getFriendStatus, isConnected, sendHeartbeat } = useLiveness()
  const { 
    onNewMessage, 
    offNewMessage, 
    socket,
    onParticipantAdded,
    offParticipantAdded,
    onParticipantRemoved,
    offParticipantRemoved,
    onAdminAssigned,
    offAdminAssigned
  } = useChat()
  const hasSentInitialHeartbeatRef = useRef(false)

  const getFullName = (userInfo: any): string => {
    if (!userInfo) return `User`
    // userApi.getUser returns transformed data directly (not wrapped in data)
    // Check if it's wrapped in data first, then check for fullName
    const userData = userInfo.data || userInfo
    if (userData.fullName) return userData.fullName
    const firstName = userData.firstName || ''
    const lastName = userData.lastName || ''
    return `${firstName} ${lastName}`.trim() || userData.username || userData.displayName || `User`
  }

  const getAvatarUrl = (userInfo: any): string => {
    if (!userInfo) return "/assets/images/default.png"
    // userApi.getUser returns transformed data directly
    const userData = userInfo.data || userInfo
    return userData.avtUrl || userData.avatarUrl || userData.avatar || "/assets/images/default.png"
  }

  useEffect(() => {
    if (!userId) return

    const loadConversations = async () => {
      try {
        setLoading(true)
        const response = await ChatService.getConversations(100)
        const conversationsList = response.conversations || []
        
        // Enrich conversations with participant details
        const enrichedConversations = await Promise.all(
          conversationsList.map(async (conv) => {
            const enriched: ConversationWithDetails = { ...conv }
            
            // Check conversation type (handle both lowercase and uppercase)
            // Backend returns 'type', frontend uses 'conversationType'
            const convType = (conv.conversationType || conv.type || '').toLowerCase()
            const isDirect = convType === 'direct'
            const isGroup = convType === 'group'
            
            if (isDirect) {
              // Get the other participant (not current user) from participants array
              let participantId: string | null = null
              
              if (conv.participants && Array.isArray(conv.participants) && conv.participants.length > 0) {
                // Find the participant that is not the current user
                const otherParticipant = conv.participants.find((p) => p.userId && p.userId !== userId)
                participantId = otherParticipant?.userId || null
              }
              
              if (participantId) {
                try {
                  // Fetch user metadata from UserService
                  const userInfo = await userApi.getUser(participantId)
                  
                  // Set recipient info
                  enriched.recipientId = participantId
                  enriched.recipientName = getFullName(userInfo)
                  enriched.recipientAvatar = getAvatarUrl(userInfo)
                } catch (error) {
                  console.error(`Error loading participant ${participantId}:`, error)
                  // Fallback: use title or default
                  enriched.recipientId = participantId
                  enriched.recipientName = conv.title || 'Unknown User'
                  enriched.recipientAvatar = "/assets/images/default.png"
                }
              } else {
                // No participant found, use fallback
                enriched.recipientName = conv.title || 'Unknown User'
                enriched.recipientAvatar = "/assets/images/default.png"
              }
            } else if (isGroup) {
              // For groups, use title as name and default group avatar
              enriched.recipientName = conv.title || 'Group Chat'
              enriched.recipientAvatar = '/group.jpg'
            } else {
              // Unknown type, use fallback
              enriched.recipientName = conv.title || 'Chat'
              enriched.recipientAvatar = "/assets/images/default.png"
            }
            
            return enriched
          })
        )
        
        setConversations(enrichedConversations)
        
        // Collect all lastMessageSender IDs (excluding current user) to fetch names
        const senderIds = new Set<string>()
        enrichedConversations.forEach(conv => {
          if (conv.lastMessageSender && conv.lastMessageSender !== userId) {
            senderIds.add(conv.lastMessageSender)
          }
        })
        
        // Collect all participant IDs from group conversations for metadata
        const groupParticipantIds = new Set<string>()
        enrichedConversations.forEach(conv => {
          const convType = (conv.conversationType || conv.type || '').toLowerCase()
          if (convType === 'group' && conv.participants && Array.isArray(conv.participants)) {
            conv.participants.forEach((p: any) => {
              if (p.userId && p.userId !== userId) {
                groupParticipantIds.add(p.userId)
              }
            })
          }
        })
        
        // Fetch sender names for cache
        if (senderIds.size > 0) {
          try {
            const senderIdsArray = Array.from(senderIds)
            const metadataList = await UserService.getMultipleUsersMetadata(senderIdsArray)
            const newCache = new Map<string, string>()
            
            metadataList.forEach(metadata => {
              if (metadata) {
                const fullName = `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() || 'User'
                newCache.set(metadata.userId, fullName)
              }
            })
            
            setSenderNameCache(prev => {
              const updated = new Map(prev)
              newCache.forEach((name, id) => updated.set(id, name))
              return updated
            })
          } catch (error) {
            console.error('Error loading sender names:', error)
          }
        }
        
        // Fetch participant metadata for group conversations
        let groupParticipantsMetadataMap = new Map<string, UserMetadata>()
        if (groupParticipantIds.size > 0) {
          try {
            const participantIdsArray = Array.from(groupParticipantIds)
            const metadataList = await UserService.getMultipleUsersMetadata(participantIdsArray)
            metadataList.forEach(metadata => {
              if (metadata) {
                groupParticipantsMetadataMap.set(metadata.userId, metadata)
              }
            })
          } catch (error) {
            console.error('Error loading group participant metadata:', error)
          }
        }
        
        // Create participantsDataMap with metadata for group conversations
        // Sort participants: admins first, then members, then by name
        const participantsDataMap = new Map(
          enrichedConversations
            .filter(conv => (conv.conversationType || conv.type)?.toLowerCase() === 'group')
            .map(conv => {
              const participantsWithMetadata = (conv.participants || []).map((p: any) => ({
                userId: p.userId,
                role: p.role || 'MEMBER',
                metadata: groupParticipantsMetadataMap.get(p.userId) || null
              }))
              
              // Sort: Admin first, then members, then by name (same logic as loadParticipants)
              const sortedParticipants = participantsWithMetadata.sort((a, b) => {
                const aRole = a.role || 'MEMBER'
                const bRole = b.role || 'MEMBER'
                const aIsAdmin = aRole === 'ADMIN' || aRole === 'SUPER_ADMIN'
                const bIsAdmin = bRole === 'ADMIN' || bRole === 'SUPER_ADMIN'
                
                // Admin luôn hiển thị trên cùng
                if (aIsAdmin && !bIsAdmin) return -1
                if (!aIsAdmin && bIsAdmin) return 1
                
                // Nếu cùng role, sắp xếp theo tên
                const aName = a.metadata ? `${a.metadata.firstName} ${a.metadata.lastName}`.trim() : ''
                const bName = b.metadata ? `${b.metadata.firstName} ${b.metadata.lastName}`.trim() : ''
                return aName.localeCompare(bName)
              })
              
              return [
                conv.conversationId,
                sortedParticipants.map(p => ({
                  userId: p.userId,
                  metadata: p.metadata
                }))
              ]
            })
        )
        
        // Store participantsDataMap in state for ConversationList
        setGroupParticipantsDataMap(participantsDataMap)
        
        // Collect all participant IDs (excluding current user) for heartbeat
        const participantIds = new Set<string>()
        enrichedConversations.forEach(conv => {
          if (conv.participants && Array.isArray(conv.participants)) {
            conv.participants.forEach(p => {
              if (p.userId && p.userId !== userId) {
                participantIds.add(p.userId)
              }
            })
          }
          // Also add recipientId if it exists
          if (conv.recipientId && conv.recipientId !== userId) {
            participantIds.add(conv.recipientId)
          }
        })
        
        // Send heartbeat for all participants
        if (isConnected && userId && participantIds.size > 0 && !hasSentInitialHeartbeatRef.current) {
          sendHeartbeat(Array.from(participantIds))
          hasSentInitialHeartbeatRef.current = true
        }
      } catch (error) {
        console.error('Error loading conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()
  }, [userId, isConnected, sendHeartbeat])

  // Listen for new messages and update conversations
  useEffect(() => {
    if (!userId) return

    const handleNewMessage = async (event: { conversationId: string; message: Message }) => {
      const { conversationId, message } = event
      
      // Don't update if message is from current user and conversation is selected
      if (message.senderId === userId && selectedConversation?.conversationId === conversationId) {
        return
      }

      // Update conversations list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.conversationId === conversationId) {
            // Update last message and unread count
            const newUnreadCount = (selectedConversation?.conversationId === conversationId) 
              ? 0 
              : (conv.unreadCount || 0) + 1
            
            return {
              ...conv,
              lastMessage: message.content || '[Attachment]',
              lastMessageSender: message.senderId,
              updatedAt: new Date(message.createdAt),
              unreadCount: newUnreadCount
            }
          }
          return conv
        })

        // If conversation doesn't exist, we might need to reload
        const exists = updated.some(c => c.conversationId === conversationId)
        if (!exists) {
          // Conversation not in list, reload conversations
          setTimeout(() => {
            ChatService.getConversations(100).then(response => {
              if (response?.conversations) {
                // Re-enrich conversations (simplified - you might want to reuse the enrichment logic)
                setConversations(response.conversations as ConversationWithDetails[])
              }
            }).catch(console.error)
          }, 500)
        }

        return updated
      })

      // Add highlight animation for new message
      if (selectedConversation?.conversationId !== conversationId) {
        setNewMessageConversations(prev => new Set(prev).add(conversationId))
        
        // Play notification sound (optional)
        try {
          const audio = new Audio('/assets/sounds/notification.mp3')
          audio.volume = 0.3
          audio.play().catch(() => {
            // Ignore if audio fails (browser restrictions)
          })
        } catch (e) {
          // Ignore audio errors
        }

        // Remove highlight after animation
        setTimeout(() => {
          setNewMessageConversations(prev => {
            const next = new Set(prev)
            next.delete(conversationId)
            return next
          })
        }, 2000)
      }

      // Update sender name cache if needed
      if (message.senderId !== userId && !senderNameCache.has(message.senderId)) {
        try {
          const metadata = await UserService.getMultipleUsersMetadata([message.senderId])
          if (metadata && metadata[0]) {
            const fullName = `${metadata[0].firstName || ''} ${metadata[0].lastName || ''}`.trim() || 'User'
            setSenderNameCache(prev => {
              const next = new Map(prev)
              next.set(message.senderId, fullName)
              return next
            })
          }
        } catch (error) {
          console.error('Error loading sender name:', error)
        }
      }
    }

    onNewMessage(handleNewMessage)

    return () => {
      offNewMessage(handleNewMessage)
    }
  }, [userId, selectedConversation, onNewMessage, offNewMessage, senderNameCache])

  // Listen for participant events
  useEffect(() => {
    if (!conversationId) return

    const handleParticipantAdded = async (event: { conversationId: string; userId: string; addedBy?: string }) => {
      if (event.conversationId !== conversationId) return
      
      // Reload conversations to get updated participant list
      try {
        const response = await ChatService.getConversations(100)
        if (response?.conversations) {
          const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
          if (updatedConv) {
            // Enrich conversation if needed
            const convType = (updatedConv.conversationType || updatedConv.type || '').toLowerCase()
            if (convType === 'group') {
              updatedConv.recipientName = updatedConv.title || 'Group Chat'
              updatedConv.recipientAvatar = '/group.jpg'
            }
            setSelectedConversation(updatedConv as ConversationWithDetails)
            // Clear participants data to force reload
            setParticipantsData([])
          }
        }
      } catch (error: any) {
        console.error('Error reloading conversation after participant added:', error)
        // Don't show error to user, just log it
        // The participant was already added successfully
      }
    }

    const handleParticipantRemoved = async (event: { conversationId: string; userId: string; removedBy?: string }) => {
      if (event.conversationId !== conversationId) return
      
      // If current user was removed, close the conversation
      if (event.userId === userId) {
        setSelectedConversation(null)
        setConversationId(null)
        return
      }
      
      // Reload conversations to get updated participant list
      try {
        const response = await ChatService.getConversations(100)
        if (response?.conversations) {
          const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
          if (updatedConv) {
            setSelectedConversation(updatedConv as ConversationWithDetails)
          }
        }
      } catch (error) {
        console.error('Error reloading conversation after participant removed:', error)
      }
    }

    const handleAdminAssigned = async (event: { conversationId: string; userId: string; assignedBy?: string }) => {
      if (event.conversationId !== conversationId) return
      
      // Reload conversations to get updated participant list
      try {
        const response = await ChatService.getConversations(100)
        if (response?.conversations) {
          const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
          if (updatedConv) {
            setSelectedConversation(updatedConv as ConversationWithDetails)
          }
        }
      } catch (error) {
        console.error('Error reloading conversation after admin assigned:', error)
      }
    }

    onParticipantAdded(handleParticipantAdded)
    onParticipantRemoved(handleParticipantRemoved)
    onAdminAssigned(handleAdminAssigned)

    return () => {
      offParticipantAdded(handleParticipantAdded)
      offParticipantRemoved(handleParticipantRemoved)
      offAdminAssigned(handleAdminAssigned)
    }
  }, [conversationId, userId, onParticipantAdded, offParticipantAdded, onParticipantRemoved, offParticipantRemoved, onAdminAssigned, offAdminAssigned])

  // Listen for incoming calls
  useEffect(() => {
    if (!socket || !userId) return

    const handleCallOffer = async (data: {
      conversationId: string
      callerId: string
      offer: RTCSessionDescriptionInit
      type: 'video' | 'voice'
    }) => {
      // Only show if not already in a call
      if (showVideoCall) return

      // Get caller name
      let callerName = 'Unknown'
      try {
        const metadata = await UserService.getMultipleUsersMetadata([data.callerId])
        if (metadata && metadata[0]) {
          callerName = `${metadata[0].firstName || ''} ${metadata[0].lastName || ''}`.trim() || 'User'
        }
      } catch (error) {
        console.error('Error loading caller name:', error)
      }

      setIncomingCall({
        conversationId: data.conversationId,
        callerId: data.callerId,
        callerName,
        type: data.type
      })
      setVideoCallType(data.type)
      setShowVideoCall(true)
    }

    socket.on('call-offer', handleCallOffer)

    return () => {
      socket.off('call-offer', handleCallOffer)
    }
  }, [socket, userId, showVideoCall])

  // Handler to start a call
  const handleStartCall = (type: 'video' | 'voice') => {
    if (!selectedConversation || !conversationId) return
    setVideoCallType(type)
    setIncomingCall(null)
    setShowVideoCall(true)
  }

  // Load friends for group creation
  useEffect(() => {
    if (!userId || !showCreateGroupModal) return

    const loadFriends = async () => {
      try {
        const friendIds = await UserService.getFriends(userId)
        const friendsWithDetails = await Promise.all(
          friendIds.map(async (friendId) => {
            try {
              const userInfo = await userApi.getUser(friendId)
              return {
                id: friendId,
                name: getFullName(userInfo),
                avatar: getAvatarUrl(userInfo)
              }
            } catch (error) {
              console.error(`Error loading friend ${friendId}:`, error)
              return {
                id: friendId,
                name: `User ${friendId}`,
                avatar: "/assets/images/default.png"
              }
            }
          })
        )
        setFriends(friendsWithDetails)
      } catch (error) {
        console.error('Error loading friends:', error)
      }
    }

    loadFriends()
  }, [userId, showCreateGroupModal])

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.size === 0 || creatingGroup) return

    try {
      setCreatingGroup(true)
      const participantIds = Array.from(selectedParticipants)
      
      const result = await ChatService.createConversation({
        type: 'group',
        participantIds,
        title: groupName.trim()
      })

      // Reload conversations
      const response = await ChatService.getConversations(100)
      const conversationsList = response.conversations || []
      
      // Enrich conversations (simplified version)
      const enrichedConversations = await Promise.all(
        conversationsList.map(async (conv) => {
          const enriched: ConversationWithDetails = { ...conv }
          const convType = (conv.conversationType || conv.type || '').toLowerCase()
          
          if (convType === 'group') {
            enriched.recipientName = conv.title || 'Group Chat'
            enriched.recipientAvatar = '/group.jpg'
          } else if (convType === 'direct') {
            let participantId: string | null = null
            if (conv.participants && Array.isArray(conv.participants) && conv.participants.length > 0) {
              const otherParticipant = conv.participants.find((p) => p.userId && p.userId !== userId)
              participantId = otherParticipant?.userId || null
            }
            if (participantId) {
              try {
                const userInfo = await userApi.getUser(participantId)
                enriched.recipientId = participantId
                enriched.recipientName = getFullName(userInfo)
                enriched.recipientAvatar = getAvatarUrl(userInfo)
              } catch (error) {
                enriched.recipientName = conv.title || 'Unknown User'
                enriched.recipientAvatar = "/assets/images/default.png"
              }
            }
          }
          return enriched
        })
      )

      setConversations(enrichedConversations)
      
      // Find and select the newly created group
      const newGroup = enrichedConversations.find(c => c.conversationId === result.conversationId)
      if (newGroup) {
        setSelectedConversation(newGroup)
        setConversationId(newGroup.conversationId)
      }

      // Reset modal
      setShowCreateGroupModal(false)
      setGroupName('')
      setSelectedParticipants(new Set())
    } catch (error) {
      console.error('Error creating group:', error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to create group. Please try again.',
        type: 'error'
      })
    } finally {
      setCreatingGroup(false)
    }
  }

  const toggleParticipant = (friendId: string) => {
    setSelectedParticipants(prev => {
      const newSet = new Set(prev)
      if (newSet.has(friendId)) {
        newSet.delete(friendId)
      } else {
        newSet.add(friendId)
      }
      return newSet
    })
  }

  const handleSelectConversation = (conversation: ConversationWithDetails) => {
    // Update unreadCount to 0 when conversation is selected (mark as read)
    const updatedConversation = { ...conversation, unreadCount: 0 }
    setSelectedConversation(updatedConversation)
    setConversationId(conversation.conversationId)
    
    // Update unreadCount in conversations list
    if (conversation.unreadCount > 0) {
      setConversations(prev => 
        prev.map(conv => 
          conv.conversationId === conversation.conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      )
    }
  }

  const handleSelectFriend = async (friendId: string, friendName: string, friendAvatar?: string) => {
    if (!userId) return

    try {
      // Find or create direct conversation
      const conversationId = await ChatService.findOrCreateDirectConversation(friendId)
      
      // Reload conversations to get the new/updated conversation
      const response = await ChatService.getConversations(100)
      const conversationsList = response.conversations || []
      
      // Find the conversation we just created/found
      const conversation = conversationsList.find(c => c.conversationId === conversationId)
      
      if (conversation) {
        // Enrich conversation with recipient details
        const enriched: ConversationWithDetails = {
          ...conversation,
          recipientId: friendId,
          recipientName: friendName,
          recipientAvatar: friendAvatar || "/assets/images/default.png"
        }
        
        // Update conversations list - enrich all conversations
        const enrichedConversations = await Promise.all(
          conversationsList.map(async (conv) => {
            if (conv.conversationId === conversationId) {
              return enriched
            }
            
            const enrichedConv: ConversationWithDetails = { ...conv }
            const convType = (conv.conversationType || conv.type || '').toLowerCase()
            
            if (convType === 'direct') {
              let participantId: string | null = null
              if (conv.participants && Array.isArray(conv.participants) && conv.participants.length > 0) {
                const otherParticipant = conv.participants.find((p) => p.userId && p.userId !== userId)
                participantId = otherParticipant?.userId || null
              }
              if (participantId) {
                try {
                  const userInfo = await userApi.getUser(participantId)
                  enrichedConv.recipientId = participantId
                  enrichedConv.recipientName = getFullName(userInfo)
                  enrichedConv.recipientAvatar = getAvatarUrl(userInfo)
                } catch (error) {
                  enrichedConv.recipientName = conv.title || 'Unknown User'
                  enrichedConv.recipientAvatar = "/assets/images/default.png"
                }
              }
            } else if (convType === 'group') {
              enrichedConv.recipientName = conv.title || 'Group Chat'
              enrichedConv.recipientAvatar = '/group.jpg'
            }
            
            return enrichedConv
          })
        )
        
        setConversations(enrichedConversations)
        setSelectedConversation(enriched)
        setConversationId(conversationId)
      }
    } catch (error) {
      console.error('Error selecting friend:', error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to start conversation. Please try again.',
        type: 'error'
      })
    }
  }

  const handleSearchMedia = async (query?: string) => {
    const searchTerm = query || chatSearchQuery
    if (!conversationId || !searchTerm.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      const response = await ChatService.getMessages(conversationId, 1000)
      const filtered = response.messages.filter(msg => {
        if (msg.content && msg.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true
        }
        if (msg.attachments && msg.attachments.length > 0) {
          return true
        }
        return false
      })
      setSearchResults(filtered)
      setShowMediaSearch(true)
    } catch (error) {
      console.error('Error searching messages:', error)
      setSearchResults([])
    }
  }

  // Auto-search when chatSearchQuery changes
  useEffect(() => {
    if (!isSearchMode || !conversationId) return
    
    const timeoutId = setTimeout(() => {
      handleSearchMedia()
    }, 300) // Debounce 300ms

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSearchQuery, isSearchMode, conversationId])

  const handleMessageClick = (messageId: string) => {
    setScrollToMessageId(messageId)
    // Reset after a short delay to allow scroll
    setTimeout(() => setScrollToMessageId(null), 1000)
  }

  // Load participants when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !expandedSections.members) return

    const loadParticipants = async () => {
      if (!selectedConversation.participants || selectedConversation.participants.length === 0) {
        setParticipantsData([])
        return
      }

      setLoadingParticipants(true)
      try {
        const participantIds = selectedConversation.participants.map(p => p.userId)
        const metadataList = await UserService.getMultipleUsersMetadata(participantIds)
        const participantsWithMetadata = participantIds.map(userId => {
          const metadata = metadataList.find(m => m.userId === userId) || null
          const role = selectedConversation.participants?.find(p => p.userId === userId)?.role
          return { userId, metadata, role }
        })
        
        // Sắp xếp: Admin hiển thị trên cùng, sau đó là member, sắp xếp theo tên trong mỗi nhóm
        participantsWithMetadata.sort((a, b) => {
          const aRole = a.role || 'MEMBER'
          const bRole = b.role || 'MEMBER'
          const aIsAdmin = aRole === 'ADMIN' || aRole === 'SUPER_ADMIN'
          const bIsAdmin = bRole === 'ADMIN' || bRole === 'SUPER_ADMIN'
          
          // Admin luôn hiển thị trên cùng
          if (aIsAdmin && !bIsAdmin) return -1
          if (!aIsAdmin && bIsAdmin) return 1
          
          // Nếu cùng role, sắp xếp theo tên
          const aName = a.metadata ? `${a.metadata.firstName} ${a.metadata.lastName}`.trim() : ''
          const bName = b.metadata ? `${b.metadata.firstName} ${b.metadata.lastName}`.trim() : ''
          return aName.localeCompare(bName)
        })
        
        setParticipantsData(participantsWithMetadata)
      } catch (error) {
        console.error('Error loading participants:', error)
        setParticipantsData([])
      } finally {
        setLoadingParticipants(false)
      }
    }

    loadParticipants()
  }, [selectedConversation, expandedSections.members, userId])

  // Load available friends for adding to group
  useEffect(() => {
    if (!showAddMemberModal || !userId || !selectedConversation) return

    const loadAvailableFriends = async () => {
      try {
        const friendIds = await UserService.getFriends(userId)
        // Filter out existing participants
        const existingParticipantIds = new Set(
          selectedConversation.participants?.map(p => p.userId) || []
        )
        const availableFriendIds = friendIds.filter(id => !existingParticipantIds.has(id))
        
        const friendsWithDetails = await Promise.all(
          availableFriendIds.map(async (friendId) => {
            try {
              const userInfo = await userApi.getUser(friendId)
              return {
                id: friendId,
                name: getFullName(userInfo),
                avatar: getAvatarUrl(userInfo)
              }
            } catch (error) {
              console.error(`Error loading friend ${friendId}:`, error)
              return {
                id: friendId,
                name: `User ${friendId}`,
                avatar: "/assets/images/default.png"
              }
            }
          })
        )
        setAvailableFriends(friendsWithDetails)
      } catch (error) {
        console.error('Error loading available friends:', error)
        setAvailableFriends([])
      }
    }

    loadAvailableFriends()
  }, [showAddMemberModal, userId, selectedConversation])

  const handleAddMembers = async () => {
    if (!conversationId || selectedFriendsToAdd.size === 0 || addingMembers) return

    try {
      setAddingMembers(true)
      // Add each selected friend as a participant
      await Promise.all(
        Array.from(selectedFriendsToAdd).map(userId => 
          ChatService.addParticipant(conversationId, userId)
        )
      )
      
      // Reload conversations to get updated participant list
      try {
        const response = await ChatService.getConversations(100)
        if (response?.conversations) {
          const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
          if (updatedConv) {
            // Enrich conversation if needed
            const convType = (updatedConv.conversationType || updatedConv.type || '').toLowerCase()
            if (convType === 'group') {
              updatedConv.recipientName = updatedConv.title || 'Group Chat'
              updatedConv.recipientAvatar = '/group.jpg'
            }
            setSelectedConversation(updatedConv as ConversationWithDetails)
            // Force reload participants
            setParticipantsData([])
          }
        }
      } catch (reloadError) {
        console.error('Error reloading conversations after adding members:', reloadError)
        // Don't show error to user, just log it
        // Participants will be reloaded via WebSocket event
      }
      
      setShowAddMemberModal(false)
      setSelectedFriendsToAdd(new Set())
    } catch (error: any) {
      console.error('Error adding members:', error)
      const errorMessage = error?.message || error?.response?.data?.message || 'Failed to add member. Please try again.'
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: errorMessage,
        type: 'error'
      })
    } finally {
      setAddingMembers(false)
    }
  }

  const handleRemoveParticipant = async (targetUserId: string) => {
    if (!conversationId || !targetUserId) return
    
    setConfirmModal({
      isOpen: true,
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member from the group?',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          await ChatService.removeParticipant(conversationId, targetUserId)
          
          // Reload conversations to get updated participant list
          const response = await ChatService.getConversations(100)
          if (response?.conversations) {
            const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
            if (updatedConv) {
              setSelectedConversation(updatedConv as ConversationWithDetails)
              // Force reload participants
              if (expandedSections.members) {
                const participantIds = updatedConv.participants?.map(p => p.userId) || []
                if (participantIds.length > 0) {
                  try {
                    const metadataList = await UserService.getMultipleUsersMetadata(participantIds)
                    const participantsWithMetadata = participantIds.map(uid => {
                      const metadata = metadataList.find(m => m.userId === uid) || null
                      const role = updatedConv.participants?.find(p => p.userId === uid)?.role
                      return { userId: uid, metadata, role }
                    })
                    
                    // Sắp xếp lại: Admin hiển thị trên cùng, sau đó là member
                    participantsWithMetadata.sort((a, b) => {
                      const aRole = a.role || 'MEMBER'
                      const bRole = b.role || 'MEMBER'
                      const aIsAdmin = aRole === 'ADMIN' || aRole === 'SUPER_ADMIN'
                      const bIsAdmin = bRole === 'ADMIN' || bRole === 'SUPER_ADMIN'
                      
                      // Admin luôn hiển thị trên cùng
                      if (aIsAdmin && !bIsAdmin) return -1
                      if (!aIsAdmin && bIsAdmin) return 1
                      
                      // Nếu cùng role, sắp xếp theo tên
                      const aName = a.metadata ? `${a.metadata.firstName} ${a.metadata.lastName}`.trim() : ''
                      const bName = b.metadata ? `${b.metadata.firstName} ${b.metadata.lastName}`.trim() : ''
                      return aName.localeCompare(bName)
                    })
                    
                    setParticipantsData(participantsWithMetadata)
                  } catch (error) {
                    console.error('Error reloading participants:', error)
                  }
                } else {
                  setParticipantsData([])
                }
              }
            }
          }
        } catch (error: any) {
          console.error('Error removing participant:', error)
          const errorMessage = error?.response?.data?.message || error?.message || 'Failed to remove member. Please try again.'
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      }
    })
  }

  const handleAssignAdmin = async (targetUserId: string) => {
    if (!conversationId || !targetUserId) return

    try {
      await ChatService.assignAdmin(conversationId, targetUserId)
      
      // Reload conversations to get updated participant list
      const response = await ChatService.getConversations(100)
      if (response?.conversations) {
        const updatedConv = response.conversations.find(c => c.conversationId === conversationId)
        if (updatedConv) {
          setSelectedConversation(updatedConv as ConversationWithDetails)
        }
      }
    } catch (error: any) {
      console.error('Error assigning admin:', error)
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: error?.response?.data?.message || 'Failed to assign admin role. Please try again.',
        type: 'error'
      })
    }
  }

  // Load all messages when sections are expanded
  useEffect(() => {
    if (!conversationId || !expandedSections.files) return

    const loadMessages = async () => {
      try {
        const response = await ChatService.getMessages(conversationId, 1000) // Load more messages for media/files
        setAllMessages(response.messages)
      } catch (error) {
        console.error('Error loading messages:', error)
        setAllMessages([])
      }
    }

    loadMessages()
  }, [conversationId, expandedSections.files])

  const toggleSection = (section: 'members' | 'media' | 'files') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleFileSubSection = (subSection: 'media' | 'files' | 'links') => {
    setExpandedFileSubSections(prev => ({
      ...prev,
      [subSection]: !prev[subSection]
    }))
  }

  // Extract media files (images and videos) from attachments
  const mediaFilesList = allMessages
    .filter(msg => msg.attachments && msg.attachments.length > 0)
    .flatMap(msg => 
      msg.attachments!.map(att => ({
        url: att,
        messageId: msg.messageId,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
        isVideo: !!(att.includes('video') || att.match(/\.(mp4|webm|ogg|mov|m4v)$/i))
      }))
    )

  // Extract links from message content
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const allLinksList = allMessages
    .filter(msg => msg.content)
    .flatMap(msg => {
      const matches = msg.content!.match(urlRegex) || []
      return matches.map(link => ({
        url: link,
        messageId: msg.messageId,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
        content: msg.content
      }))
    })

  // Extract file links (non-media attachments or file URLs)
  const filesList = allLinksList.filter(link => {
    const url = link.url.toLowerCase()
    return url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|txt|csv)$/i)
  })

  // Extract non-file links (URLs that are not files)
  const linksList = allLinksList.filter(link => {
    const url = link.url.toLowerCase()
    const isFile = url.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|txt|csv|jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov|m4v)$/i)
    return !isFile
  })

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  // Helper function to format status text for chat header
  const getStatusText = (userId: string | undefined): string | null => {
    if (!userId) return null
    
    const status = getFriendStatus(userId)
    if (!status) return null
    
    // If online, show "Online"
    if (status.status === 'ONLINE') {
      return 'Online'
    }
    
    // If not online, check lastActiveAt
    if (status.lastActiveAt) {
      const lastActive = new Date(status.lastActiveAt)
      const now = new Date()
      const diffInMs = now.getTime() - lastActive.getTime()
      const diffInHours = diffInMs / (1000 * 60 * 60)
      const diffInDays = diffInHours / 24
      
      // If more than 1 day, show "Offline"
      if (diffInDays >= 1) {
        return 'Offline'
      }
      
      // If less than 1 day, format as "Xs ago" or "X hours ago"
      const diffInSeconds = Math.floor(diffInMs / 1000)
      const diffInMinutes = Math.floor(diffInSeconds / 60)
      const diffInHoursFloor = Math.floor(diffInHours)
      
      if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
      } else {
        return `${diffInHoursFloor}h ago`
      }
    }
    
    // If no lastActiveAt, show "Offline"
    return 'Offline'
  }

  // Helper function to get group status text based on all participants
  const getGroupStatusText = (participants: Array<{ userId: string }> | undefined): string | null => {
    if (!participants || participants.length === 0) return null
    
    const now = new Date()
    let hasOnline = false
    let mostRecentLastActive: Date | null = null
    
    // Check all participants (excluding current user)
    participants.forEach((p: any) => {
      if (!p.userId || p.userId === userId) return
      
      const status = getFriendStatus(p.userId)
      if (!status) return
      
      // Check if any participant is online
      if (status.status === 'ONLINE') {
        hasOnline = true
      }
      
      // Track most recent lastActiveAt
      if (status.lastActiveAt) {
        const lastActive = new Date(status.lastActiveAt)
        if (!mostRecentLastActive || lastActive > mostRecentLastActive) {
          mostRecentLastActive = lastActive
        }
      }
    })
    
    // If any participant is online, show "Online"
    if (hasOnline) {
      return 'Online'
    }
    
    // If no one is online, check most recent lastActiveAt
    if (mostRecentLastActive) {
      const diffInMs = now.getTime() - mostRecentLastActive.getTime()
      const diffInHours = diffInMs / (1000 * 60 * 60)
      const diffInDays = diffInHours / 24
      
      // If more than 1 day, show "Offline"
      if (diffInDays >= 1) {
        return 'Offline'
      }
      
      // If less than 1 day, format as "Xs ago" or "X hours ago"
      const diffInSeconds = Math.floor(diffInMs / 1000)
      const diffInMinutes = Math.floor(diffInSeconds / 60)
      const diffInHoursFloor = Math.floor(diffInHours)
      
      if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`
      } else {
        return `${diffInHoursFloor}h ago`
      }
    }
    
    // If no lastActiveAt for any participant, show "Offline"
    return 'Offline'
  }

  return (
    <>
      <style>{`
        @keyframes newMessageHighlight {
          0% {
            background-color: rgba(59, 130, 246, 0.3);
            transform: scale(1);
          }
          50% {
            background-color: rgba(59, 130, 246, 0.5);
            transform: scale(1.02);
          }
          100% {
            background-color: rgba(239, 246, 255, 1);
            transform: scale(1);
          }
        }
      `}</style>
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <ChatHeader />

      {/* Main Content - 3 Columns */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        <ConversationList
          conversations={conversations}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          selectedConversationId={selectedConversation?.conversationId}
          onSelectConversation={handleSelectConversation}
          newMessageConversations={newMessageConversations}
          onClearNewMessage={(id) => setNewMessageConversations(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })}
          senderNameCache={senderNameCache}
          onCreateGroup={() => setShowCreateGroupModal(true)}
          getFriendStatus={getFriendStatus}
          participantsDataMap={groupParticipantsDataMap}
          onSelectFriend={handleSelectFriend}
        />

        {/* Middle Column - Chat Window */}
        <div className="flex-1 flex flex-col bg-gray-200 min-h-0 overflow-hidden px-4 pb-4 pt-0">
          {selectedConversation && conversationId ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white rounded-lg shadow-sm">
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-white rounded-t-lg">
                {((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'direct') && selectedConversation.recipientId ? (
                  <Link to={`/profile/${selectedConversation.recipientId}`} className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity">
                    <div className="relative">
                      <Avatar
                        src={selectedConversation.recipientAvatar}
                        alt={selectedConversation.recipientName || selectedConversation.title || 'Chat'}
                        fallback={getAvatarFallback(selectedConversation.recipientName || selectedConversation.title || 'C')}
                        className="w-10 h-10 cursor-pointer"
                      />
                      {/* Online indicator - green dot at bottom right */}
                      {getFriendStatus(selectedConversation.recipientId)?.status === 'ONLINE' && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold cursor-pointer">{selectedConversation.recipientName || selectedConversation.title || 'Chat'}</h3>
                      {(() => {
                        const statusText = getStatusText(selectedConversation.recipientId)
                        return statusText ? (
                          <p className="text-xs text-gray-500">{statusText}</p>
                        ) : null
                      })()}
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="relative">
                      {((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'group') ? (
                        <GroupAvatar
                          participants={participantsData}
                          currentUserId={userId}
                          size="md"
                          className="w-10 h-10"
                        />
                      ) : (
                        <Avatar
                          src={selectedConversation.recipientAvatar}
                          alt={selectedConversation.recipientName || selectedConversation.title || 'Chat'}
                          fallback={getAvatarFallback(selectedConversation.recipientName || selectedConversation.title || 'C')}
                          className="w-10 h-10"
                        />
                      )}
                      {/* Online indicator - green dot at bottom right for group if at least one participant is online */}
                      {((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'group') && (
                        (() => {
                          const participants = selectedConversation.participants || []
                          const hasOnlineParticipant = participants.some((p: any) => {
                            if (!p.userId || p.userId === userId) return false
                            const status = getFriendStatus(p.userId)
                            return status?.status === 'ONLINE'
                          })
                          return hasOnlineParticipant ? (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></span>
                          ) : null
                        })()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedConversation.recipientName || selectedConversation.title || 'Chat'}</h3>
                      {/* Show status for group similar to direct chat */}
                      {((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'group') && (
                        (() => {
                          const statusText = getGroupStatusText(selectedConversation.participants)
                          return statusText ? (
                            <p className="text-xs text-gray-500">{statusText}</p>
                          ) : null
                        })()
                      )}
                    </div>
                  </>
                )}
                {/* Call Buttons - hiển thị cho cả direct và group chat */}
                <div className="flex items-center gap-2">
                  {/* Voice Call Button */}
                  <button
                    onClick={() => handleStartCall('voice')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Start voice call"
                  >
                    <Phone className="w-5 h-5 text-green-600" />
                  </button>
                  {/* Video Call Button */}
                  <button
                    onClick={() => handleStartCall('video')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Start video call"
                  >
                    <Video className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>
              {/* Chat Content */}
              <ChatContent 
                conversationId={conversationId}
                recipientId={selectedConversation.recipientId}
                recipientName={selectedConversation.recipientName}
                recipientAvatar={selectedConversation.recipientAvatar}
                conversationType={(selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() as 'direct' | 'group'}
                scrollToMessageId={scrollToMessageId}
                onStartCall={handleStartCall}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-white rounded-lg">
              <div className="text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>

        <ChatRightSidebar
          selectedConversation={selectedConversation}
          isSearchMode={isSearchMode}
          onEnterSearchMode={() => {
            setIsSearchMode(true)
            setChatSearchQuery('')
            setSearchResults([])
            setShowMediaSearch(false)
          }}
          onExitSearchMode={() => {
            setIsSearchMode(false)
            setChatSearchQuery('')
            setSearchResults([])
            setShowMediaSearch(false)
          }}
          chatSearchQuery={chatSearchQuery}
          onChatSearchChange={setChatSearchQuery}
          searchResults={searchResults}
          showMediaSearch={showMediaSearch}
          onMessageClick={handleMessageClick}
          expandedSections={expandedSections}
          onToggleSection={toggleSection}
          expandedFileSubSections={expandedFileSubSections}
          onToggleFileSubSection={toggleFileSubSection}
          participantsData={participantsData.map(p => ({
            ...p,
            role: selectedConversation?.participants?.find(part => part.userId === p.userId)?.role
          }))}
          loadingParticipants={loadingParticipants}
          mediaFilesList={mediaFilesList}
          filesList={filesList}
          linksList={linksList}
          onAddMember={() => setShowAddMemberModal(true)}
          onRemoveParticipant={handleRemoveParticipant}
          onAssignAdmin={handleAssignAdmin}
          onMessageParticipant={handleSelectFriend}
          currentUserRole={selectedConversation?.participants?.find(p => p.userId === userId)?.role}
        />
      </div>

      <AddMemberModal
        open={showAddMemberModal}
        availableFriends={availableFriends}
        selectedFriends={selectedFriendsToAdd}
        onToggleFriend={(friendId) => {
          setSelectedFriendsToAdd(prev => {
            const next = new Set(prev)
            if (next.has(friendId)) {
              next.delete(friendId)
            } else {
              next.add(friendId)
            }
            return next
          })
        }}
        addingMembers={addingMembers}
        onAddMembers={handleAddMembers}
        onClose={() => {
          setShowAddMemberModal(false)
          setSelectedFriendsToAdd(new Set())
        }}
      />

      <CreateGroupModal
        open={showCreateGroupModal}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        friends={friends}
        selectedParticipants={selectedParticipants}
        onToggleParticipant={toggleParticipant}
        creatingGroup={creatingGroup}
        onCreateGroup={handleCreateGroup}
        onClose={() => {
                  setShowCreateGroupModal(false)
                  setGroupName('')
                  setSelectedParticipants(new Set())
                }}
      />

      {/* Video Call Modal */}
      {showVideoCall && conversationId && (
        <VideoCallModal
          open={showVideoCall}
          onClose={() => {
            setShowVideoCall(false)
            setIncomingCall(null)
          }}
          conversationId={conversationId}
          recipientId={selectedConversation?.recipientId}
          recipientName={selectedConversation?.recipientName || selectedConversation?.title}
          callType={videoCallType}
          isIncoming={!!incomingCall}
          callerId={incomingCall?.callerId}
          callerName={incomingCall?.callerName}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type || 'confirm'}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type || 'info'}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
    </>
  )
}

