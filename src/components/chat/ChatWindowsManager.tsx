"use client"

import { useState, useCallback, useEffect } from 'react'
import { ChatWindow } from './ChatWindow'
import { ChatService } from '@/lib/api/chat/ChatService'
import { getUserId } from '@/lib/utils/Jwt'

interface ChatWindowData {
  id: string
  conversationId: string
  recipientId: string
  recipientName: string
  recipientAvatar?: string
  position: { x: number; y: number }
  isMinimized: boolean
}

// Type guard to check if error is an AxiosError
function isAxiosError(error: unknown): error is { 
  response?: { 
    status: number
    data?: { 
      message?: string 
    } 
  } 
  message: string 
} {
  return typeof error === 'object' && error !== null && 'message' in error
}

// Type guard to check if error has a response property
function hasResponse(error: unknown): error is { 
  response: { 
    status: number
    data?: { 
      message?: string 
    } 
  } 
} {
  return typeof error === 'object' && error !== null && 'response' in error
}

let globalOpenChat: ((recipientId: string, recipientName: string, recipientAvatar?: string) => void) | null = null
// Queue to store open requests before manager is initialized
const pendingOpenRequests: Array<{ recipientId: string; recipientName: string; recipientAvatar?: string }> = []

export function ChatWindowsManager() {
  const [windows, setWindows] = useState<ChatWindowData[]>([])

  const openChat = useCallback(async (recipientId: string, recipientName: string, recipientAvatar?: string) => {
    const userId = getUserId() || localStorage.getItem('userId')
    if (!userId) {
      console.error('No user ID found - user may not be authenticated')
      alert('Please log in to start a chat')
      return
    }

    // Validate recipient ID
    if (!recipientId || recipientId.trim() === '') {
      console.error('Invalid recipient ID:', recipientId)
      alert('Cannot start chat: Invalid user ID')
      return
    }

    if (recipientId === userId) {
      console.error('Cannot start chat with yourself')
      alert('Cannot start chat with yourself')
      return
    }

    console.log('Opening chat with:', {
      recipientId,
      recipientName,
      userId
    })

    // Check if window already open
    const existingWindow = windows.find(w => w.recipientId === recipientId)
    if (existingWindow) {
      // If minimized, restore it
      if (existingWindow.isMinimized) {
        setWindows(prev => prev.map(w => 
          w.id === existingWindow.id 
            ? { ...w, isMinimized: false }
            : w
        ))
      }
      return
    }

    try {
      // Use the helper method to find or create conversation
      const conversationId = await ChatService.findOrCreateDirectConversation(recipientId)
      
      if (!conversationId) {
        throw new Error('Failed to get conversation ID')
      }

      // Calculate position for new window (stack from right, bottom-up)
      const visibleWindows = windows.filter(w => !w.isMinimized)
      const windowIndex = visibleWindows.length
      const RIGHT_BAR_WIDTH = 280
      const GAP_RIGHT = 0 // flush to right bar
      const x = RIGHT_BAR_WIDTH + GAP_RIGHT
      const WINDOW_HEIGHT = 420 // must match ChatWindow height
      const WINDOW_SPACING = 16
      const BOTTOM_MARGIN = 0 // flush to bottom
      const y = BOTTOM_MARGIN + (windowIndex * (WINDOW_HEIGHT + WINDOW_SPACING))

      const newWindow: ChatWindowData = {
        id: `${recipientId}-${Date.now()}`,
        conversationId,
        recipientId,
        recipientName,
        recipientAvatar,
        position: { x, y },
        isMinimized: false
      }

      setWindows(prev => {
        const next = [...prev, newWindow]
        console.log('Chat windows count:', next.length)
        return next
      })
      
    } catch (error) {
      console.error('Failed to open chat:', error)
      
      // Provide more specific error messages with proper type checking
      if (hasResponse(error)) {
        const status = error.response.status
        const errorDetail = error.response.data?.message || JSON.stringify(error.response.data)
        
        console.error(`HTTP ${status} details:`, errorDetail)
        
        switch (status) {
          case 400:
            alert(`Cannot start chat: ${errorDetail || 'Invalid request. Please check the user exists.'}`)
            break
          case 401:
            alert('Please log in to start a chat')
            break
          case 403:
            alert('You do not have permission to start a chat with this user')
            break
          case 404:
            alert('User not found or cannot start chat')
            break
          default:
            alert(`Failed to open chat (${status}). Please try again.`)
        }
      } else if (isAxiosError(error)) {
        // Handle other axios errors
        alert(`Network error: ${error.message}`)
      } else if (error instanceof Error) {
        // Handle standard JavaScript errors
        alert(`Error: ${error.message}`)
      } else {
        // Handle unknown errors
        alert('Failed to open chat. Please try again.')
      }
    }
  }, [windows])

  const closeChat = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const minimizeChat = useCallback((id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: true } : w
    ))
  }, [])

  const restoreChat = useCallback((id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: false } : w
    ))
  }, [])

  // Store global reference
  useEffect(() => {
    globalOpenChat = openChat
    // Drain any pending requests
    if (pendingOpenRequests.length > 0) {
      console.log('ChatWindowsManager initialized, processing pending chat requests:', pendingOpenRequests.length)
      const requests = pendingOpenRequests.splice(0, pendingOpenRequests.length)
      requests.forEach(({ recipientId, recipientName, recipientAvatar }) => {
        openChat(recipientId, recipientName, recipientAvatar)
      })
    }
    return () => {
      globalOpenChat = null
    }
  }, [openChat])

  return (
    <>
      {windows
        .filter(w => !w.isMinimized)
        .map((window) => (
          <ChatWindow
            key={window.id}
            conversationId={window.conversationId}
            recipientId={window.recipientId}
            recipientName={window.recipientName}
            recipientAvatar={window.recipientAvatar}
            onClose={() => closeChat(window.id)}
            onMinimize={() => minimizeChat(window.id)}
            position={window.position}
          />
        ))}
      {/* Minimized windows - show as small buttons */}
      <div className="fixed right-[280px] bottom-0 flex flex-col-reverse gap-2 z-[9998]">
        {windows
          .filter(w => w.isMinimized)
          .map((window) => (
            <button
              key={window.id}
              onClick={() => restoreChat(window.id)}
              className="bg-blue-500 text-white px-4 py-2 rounded-t-lg hover:bg-blue-600 transition-colors text-sm font-semibold shadow-lg max-w-32 truncate"
              title={`Restore chat with ${window.recipientName}`}
            >
              {window.recipientName}
            </button>
          ))}
      </div>
    </>
  )
}

// Hook to use chat manager
export function useChatManager() {
  const openChat = useCallback((recipientId: string, recipientName: string, recipientAvatar?: string) => {
    if (globalOpenChat) {
      console.log('useChatManager: dispatching openChat for', recipientId)
      globalOpenChat(recipientId, recipientName, recipientAvatar)
    } else {
      console.warn('Chat manager not initialized. Queuing open request for', recipientId)
      pendingOpenRequests.push({ recipientId, recipientName, recipientAvatar })
    }
  }, [])

  return { openChat }
}