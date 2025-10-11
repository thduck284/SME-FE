import { useState, useCallback, useRef } from 'react'
import { useUsers } from './useUsers'

export function useUserSearch() {
  const { users, isLoading, error, pagination, searchUsers, loadMoreUsers, clearError, clearUsers } = useUsers()
  const [searchKeyword, setSearchKeyword] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Search với debounce
  const searchWithDebounce = useCallback((keyword: string, delay: number = 500) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = setTimeout(async () => {
      if (keyword.trim()) {
        await searchUsers({ keyword: keyword.trim(), limit: 20 })
      } else {
        clearUsers()
      }
    }, delay)
  }, [searchUsers, clearUsers])

  // Handle search input change
  const handleSearchChange = useCallback((keyword: string) => {
    setSearchKeyword(keyword)
    searchWithDebounce(keyword)
  }, [searchWithDebounce])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchKeyword('')
    clearUsers()
    clearError()
  }, [clearUsers, clearError])

  return {
    // State
    users,
    isLoading,
    error,
    searchKeyword,
    pagination,
    
    // Actions
    handleSearchChange,
    loadMoreUsers,
    clearSearch,
    clearError
  }
}