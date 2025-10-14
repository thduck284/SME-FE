import { useState, useCallback, useRef, useEffect } from 'react'
import { mentionApi } from '@/lib/api/users/Mention'
import type { MentionUser, MentionData } from '@/lib/types/users/MentionDto'

interface UseMentionProps {
  onMentionAdd?: (mentions: MentionData[]) => void
  onTextChange?: (newText: string, cursorPosition: number) => void
  currentText?: string
  initialMentions?: MentionData[]
}

const DEBOUNCE_DELAY = 300

export function useMention({ onMentionAdd, onTextChange, currentText, initialMentions = [] }: UseMentionProps) {
  const [users, setUsers] = useState<MentionUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentions, setMentions] = useState<MentionData[]>(initialMentions)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // ✅ FIX: Sử dụng useRef để track initialMentions, không trigger re-render
  const initialMentionsRef = useRef(initialMentions)

  useEffect(() => {
    if (JSON.stringify(initialMentionsRef.current) !== JSON.stringify(initialMentions)) {
      initialMentionsRef.current = initialMentions
      setMentions(initialMentions)
    }
  }, [initialMentions])

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
    
    // ✅ FIX: Dùng hàm cập nhật để tránh dependency trên mentions
    setMentions(prevMentions => {
      const validMentions = prevMentions.filter(mention => {
        const isValid = mention.startIndex >= 0 && 
                       mention.endIndex > mention.startIndex && 
                       mention.endIndex <= text.length &&
                       mention.userId
        
        const mentionTextInContent = text.slice(mention.startIndex, mention.endIndex)
        const isTextMatched = mentionTextInContent === mention.displayName
        
        return isValid && isTextMatched
      })
      
      if (validMentions.length !== prevMentions.length) {
        onMentionAdd?.(validMentions)
      }
      
      return validMentions
    })
    
    if (mentionMatch) {
      const query = mentionMatch[1]
      setMentionQuery(query)
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
  }, [searchUsers, onMentionAdd])

  const selectUser = useCallback((user: MentionUser) => {
    const textToUse = currentText || textareaRef.current?.value || ''
    
    let actualStart = mentionStartIndex
    for (let i = mentionStartIndex; i >= 0; i--) {
      if (textToUse[i] === '@') {
        actualStart = i
        break
      }
    }
    
    const end = actualStart + mentionQuery.length + 1
    const beforeMention = textToUse.slice(0, actualStart)
    const afterMention = textToUse.slice(end)
    const mentionText = `@${user.firstName} ${user.lastName}`
    
    const newText = beforeMention + mentionText + afterMention
    const newCursorPosition = actualStart + mentionText.length

    if (textareaRef.current) {
      textareaRef.current.value = newText
      textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
    }
    
    onTextChange?.(newText, newCursorPosition)

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
    
    // ✅ FIX: Dùng hàm cập nhật để lấy mentions hiện tại
    setMentions(prevMentions => {
      const recalculatedMentions = prevMentions.map(mention => {
        if (mention.startIndex >= actualStart) {
          const positionShift = mentionText.length - (end - actualStart)
          return {
            ...mention,
            startIndex: mention.startIndex + positionShift,
            endIndex: mention.endIndex + positionShift
          }
        }
        return mention
      })
      
      const updatedMentions = [...recalculatedMentions, newMention]
      onMentionAdd?.(updatedMentions)
      
      console.log('📝 All mentions:', updatedMentions.map(m => ({
        userId: m.userId,
        startIndex: m.startIndex,
        endIndex: m.endIndex,
        displayName: m.displayName
      })))
      
      return updatedMentions
    })
    
    setShowDropdown(false)
    setMentionQuery('')
    setMentionStartIndex(-1)
    setSelectedIndex(0)
    
    setTimeout(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(newCursorPosition, newCursorPosition)
    }, 0)
  }, [mentionQuery, mentionStartIndex, onMentionAdd, onTextChange, currentText])

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