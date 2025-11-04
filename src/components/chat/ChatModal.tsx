"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useChat } from '@/lib/context/ChatSocketContext'
import { ChatService, Message } from '@/lib/api/chat/ChatService'
import { getUserId } from '@/lib/utils/Jwt'
import { formatTimeAgo } from '@/lib/utils/PostUtils'

interface ChatModalProps {
  conversationId: string
  recipientName: string
  recipientAvatar?: string
  onClose: () => void
}

export function ChatModal({ conversationId, recipientName, recipientAvatar, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { sendMessage, onNewMessage, offNewMessage } = useChat()
  const userId = getUserId()

  useEffect(() => {
    loadMessages()
  }, [conversationId])

  useEffect(() => {
    const handleNewMessage = (event: { conversationId: string; message: Message }) => {
      if (event.conversationId === conversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m.messageId === event.message.messageId)
          if (exists) return prev
          return [...prev, event.message]
        })
      }
    }

    onNewMessage(handleNewMessage)

    return () => {
      offNewMessage(handleNewMessage)
    }
  }, [conversationId, onNewMessage, offNewMessage])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await ChatService.getMessages(conversationId, 50)
      setMessages(response.messages.reverse())
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return

    try {
      setSending(true)
      await sendMessage(conversationId, { content: inputMessage.trim() })
      setInputMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getAvatarFallback = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl h-[80vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Avatar
              src={recipientAvatar}
              alt={recipientName}
              fallback={getAvatarFallback(recipientName)}
              className="w-10 h-10"
            />
            <div>
              <h3 className="font-semibold text-lg">{recipientName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.senderId === userId
                return (
                  <div
                    key={message.messageId}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwn
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                        {formatTimeAgo(message.createdAt.toString())}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || sending}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


