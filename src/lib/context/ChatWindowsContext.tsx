import { createContext, useContext, ReactNode } from 'react'

interface ChatWindowsContextType {
  openChat: (recipientId: string, recipientName: string, recipientAvatar?: string) => void
}

const ChatWindowsContext = createContext<ChatWindowsContextType | undefined>(undefined)

interface ChatWindowsProviderProps {
  children: ReactNode
  openChat: (recipientId: string, recipientName: string, recipientAvatar?: string) => void
}

export function ChatWindowsProvider({ children, openChat }: ChatWindowsProviderProps) {
  return (
    <ChatWindowsContext.Provider value={{ openChat }}>
      {children}
    </ChatWindowsContext.Provider>
  )
}

export function useChatWindows() {
  const context = useContext(ChatWindowsContext)
  if (context === undefined) {
    throw new Error('useChatWindows must be used within a ChatWindowsProvider')
  }
  return context
}

