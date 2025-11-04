"use client"

import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { ChatService, Conversation } from '@/lib/api/chat/ChatService'
import { ChatModal } from './ChatModal'
import { formatTimeAgo } from '@/lib/utils/PostUtils'

interface ChatListProps {
  friendIds: string[]
}

export function ChatList({ friendIds }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<{
    conversationId: string
    recipientName: string
    recipientAvatar?: string
  } | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const response = await ChatService.getConversations(20)
      setConversations(response?.conversations || [])
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChat = async (conversation: Conversation) => {
    try {
      // Get recipient info from conversation
      // For direct conversations, we need to get the other participant
      // For now, we'll use the conversation title or try to get user info
      let recipientName = conversation.title || 'Chat'
      let recipientAvatar: string | undefined

      // Try to get user info if we have participant info
      // This is a simplified version - you might need to fetch participant details
      if (conversation.conversationType === 'direct' && friendIds && friendIds.length > 0) {
        // In a real app, you'd fetch the participant details
        // For now, we'll use a placeholder
        recipientName = conversation.title || 'Friend'
      }

      setSelectedConversation({
        conversationId: conversation.conversationId,
        recipientName,
        recipientAvatar
      })
    } catch (error) {
      console.error('Failed to open chat:', error)
    }
  }

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Chats</h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-300 rounded animate-pulse w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 border-b border-gray-300">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-5 h-5" />
          <h3 className="font-semibold text-lg">Chats</h3>
        </div>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {!conversations || conversations.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No conversations yet</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                onClick={() => handleOpenChat(conversation)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-300 rounded-lg transition-colors text-left"
              >
                <Avatar
                  src={undefined}
                  alt={conversation.title || 'Chat'}
                  fallback={getAvatarFallback(conversation.title || 'C')}
                  className="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">
                      {conversation.title || 'Chat'}
                    </p>
                    {conversation.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="text-xs text-gray-600 truncate">
                      {conversation.lastMessage}
                    </p>
                  )}
                  {conversation.updatedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatTimeAgo(conversation.updatedAt.toString())}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedConversation && (
        <ChatModal
          conversationId={selectedConversation.conversationId}
          recipientName={selectedConversation.recipientName}
          recipientAvatar={selectedConversation.recipientAvatar}
          onClose={() => setSelectedConversation(null)}
        />
      )}
    </>
  )
}


