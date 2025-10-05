"use client"
import React from "react"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui"
import { Button } from "@/components/ui"
import { useState } from "react"

interface FriendsSearchProps {
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function FriendsSearch({ searchQuery, onSearchChange }: FriendsSearchProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    onlineOnly: false,
    mutualFriends: false,
    recentlyAdded: false
  })

  const handleClearSearch = () => {
    onSearchChange("")
  }

  const handleFilterChange = (filterKey: keyof typeof filters) => {
    setFilters((prev: typeof filters) => ({
      ...prev,
      [filterKey]: !prev[filterKey]
    }))
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          type="text"
          placeholder="Tìm kiếm bạn bè..."
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
          {hasActiveFilters && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            onClick={() => setFilters({
              onlineOnly: false,
              mutualFriends: false,
              recentlyAdded: false
            })}
            variant="ghost"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Xóa bộ lọc
          </Button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-gray-900 text-sm">Bộ lọc nâng cao</h3>
          
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.onlineOnly}
                onChange={() => handleFilterChange('onlineOnly')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Chỉ hiển thị bạn bè đang online</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.mutualFriends}
                onChange={() => handleFilterChange('mutualFriends')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Có bạn chung</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.recentlyAdded}
                onChange={() => handleFilterChange('recentlyAdded')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Thêm gần đây</span>
            </label>
          </div>
        </div>
      )}

      {/* Search Results Info */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          Tìm kiếm: "<span className="font-medium">{searchQuery}</span>"
        </div>
      )}
    </div>
  )
}
