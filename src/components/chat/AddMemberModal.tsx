"use client"

import { X, Check } from 'lucide-react'
import { Avatar } from '@/components/ui'

interface Friend {
  id: string
  name: string
  avatar: string
}

interface AddMemberModalProps {
  open: boolean
  availableFriends: Friend[]
  selectedFriends: Set<string>
  onToggleFriend: (friendId: string) => void
  addingMembers: boolean
  onAddMembers: () => void
  onClose: () => void
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function AddMemberModal({
  open,
  availableFriends,
  selectedFriends,
  onToggleFriend,
  addingMembers,
  onAddMembers,
  onClose
}: AddMemberModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Add Members</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {availableFriends.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No friends available to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableFriends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => onToggleFriend(friend.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFriends.has(friend.id)
                      ? 'bg-blue-50 border-2 border-blue-400'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <Avatar
                    src={friend.avatar}
                    alt={friend.name}
                    fallback={getAvatarFallback(friend.name)}
                    className="w-10 h-10"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{friend.name}</p>
                  </div>
                  {selectedFriends.has(friend.id) && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAddMembers}
            disabled={selectedFriends.size === 0 || addingMembers}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {addingMembers ? 'Adding...' : `Add (${selectedFriends.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}




