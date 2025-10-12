import { useState, useCallback, useRef, useEffect } from 'react'
import { mentionApi } from '@/lib/api/users/Mention'
import type { MentionUser, MentionData } from '@/lib/types/users/MentionDto'

interface UseMentionProps {
  onMentionAdd?: (mentions: MentionData[]) => void
  onTextChange?: (newText: string, cursorPosition: number) => void
  currentText?: string // Current text content from parent component
}

const DEBOUNCE_DELAY = 300

export function useMention({ onMentionAdd, onTextChange, currentText }: UseMentionProps) {
  const [users, setUsers] = useState<MentionUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentions, setMentions] = useState<MentionData[]>([])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setIsLoading(true)
      try {
        const response = await mentionApi.searchUsers("")
        setUsers(response.data)
        setShowDropdown(true)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Error searching users:', error)
        setUsers([])
        setShowDropdown(false)
      } finally {
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    try {
      const response = await mentionApi.searchUsers(query)
      setUsers(response.data)
      setShowDropdown(true)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Error searching users:', error)
      setUsers([])
      setShowDropdown(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleTextChange = useCallback((text: string, cursorPosition: number) => {
    const beforeCursor = text.slice(0, cursorPosition)
    const mentionMatch = beforeCursor.match(/@(\w*)$/)
    
    // Clean up mentions that are no longer in the text
    const validMentions = mentions.filter(mention => {
      const mentionText = text.slice(mention.startIndex, mention.endIndex)
      return mentionText === mention.displayName && 
             mention.startIndex < text.length && 
             mention.endIndex <= text.length
    })
    
    // Update mentions if any were removed
    if (validMentions.length !== mentions.length) {
      setMentions(validMentions)
      onMentionAdd?.(validMentions)
    }
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
      // Find the actual position of @ in the text
      const atPosition = beforeCursor.lastIndexOf('@')
      setMentionStartIndex(atPosition)
      if (query === '') {
        searchUsers('')
      } else {
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current)
        }
        
        searchTimeoutRef.current = setTimeout(() => {
          searchUsers(query)
        }, DEBOUNCE_DELAY)
      }
    } else {
      setShowDropdown(false)
      setMentionQuery('')
      setMentionStartIndex(-1)
    }
  }, [searchUsers, mentions, onMentionAdd])

  const selectUser = useCallback((user: MentionUser) => {
    // Use currentText from props or fallback to textarea value
    const textToUse = currentText || textareaRef.current?.value || ''
    
    // Find the actual @ position in the text by searching backwards
    let actualStart = mentionStartIndex
    for (let i = mentionStartIndex; i >= 0; i--) {
      if (textToUse[i] === '@') {
        actualStart = i
        break
      }
    }
    
    // Calculate positions for text replacement
    const end = actualStart + mentionQuery.length + 1
    const beforeMention = textToUse.slice(0, actualStart)
    const afterMention = textToUse.slice(end)
    const mentionText = `@${user.firstName} ${user.lastName}`
    
    // Build the new text with mention inserted
    const newText = beforeMention + mentionText + afterMention
    const newCursorPosition = actualStart + mentionText.length

    // Update textarea directly first to avoid race conditions
    if (textareaRef.current) {
      textareaRef.current.value = newText
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
    }
    
    // Update parent component's state
    onTextChange?.(newText, newCursorPosition)

    // Create mention data for tracking
    const newMention: MentionData = {
      userId: user.userId,
      startIndex: actualStart,
      endIndex: actualStart + mentionText.length,
      displayName: mentionText
    }
    
    console.log('📍 Mention created:', {
      userId: newMention.userId,
      startIndex: newMention.startIndex,
      endIndex: newMention.endIndex,
      displayName: newMention.displayName,
      text: newText.slice(newMention.startIndex, newMention.endIndex)
    })
    
    // Recalculate positions for existing mentions that come after the new mention
    const recalculatedMentions = mentions.map(mention => {
      if (mention.startIndex >= actualStart) {
        // This mention comes after the new mention, adjust its position
        const positionShift = mentionText.length - (end - actualStart)
        return {
          ...mention,
          startIndex: mention.startIndex + positionShift,
          endIndex: mention.endIndex + positionShift
        }
      }
      return mention
    })
    
    // Update mentions state with the new mention and recalculated positions
    const updatedMentions = [...recalculatedMentions, newMention]
    setMentions(updatedMentions)
    onMentionAdd?.(updatedMentions)
    
    console.log('📝 All mentions:', updatedMentions.map(m => ({
      userId: m.userId,
      startIndex: m.startIndex,
      endIndex: m.endIndex,
      displayName: m.displayName
    })))
    
    // Reset mention state
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
    setSelectedIndex(0)
    
    // Ensure focus and cursor position after state updates
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 0)
  }, [mentionQuery, mentionStartIndex, mentions, onMentionAdd, onTextChange, currentText])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || users.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % users.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length)
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        selectUser(users[selectedIndex])
        break
      case 'Escape':
        setShowDropdown(false)
        break
    }
  }, [showDropdown, users, selectedIndex, selectUser])

  const closeDropdown = useCallback(() => {
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
    setSelectedIndex(0)
  }, [])

  const clearMentions = useCallback(() => {
    setMentions([])
    onMentionAdd?.([])
  }, [onMentionAdd])

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return {
    users,
    isLoading,
    showDropdown,
    selectedIndex,
    mentions,
    textareaRef,
    handleTextChange,
    handleKeyDown,
    selectUser,
    closeDropdown,
    setMentions,
    clearMentions
  }
}
