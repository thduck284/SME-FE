"use client"

import { X, Check } from 'lucide-react'
import { Avatar } from '@/components/ui'

interface Friend {
  id: string
  name: string
  avatar: string
}

interface CreateGroupModalProps {
  open: boolean
  groupName: string
  onGroupNameChange: (name: string) => void
  friends: Friend[]
  selectedParticipants: Set<string>
  onToggleParticipant: (friendId: string) => void
  creatingGroup: boolean
  onCreateGroup: () => void
  onClose: () => void
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function CreateGroupModal({
  open,
  groupName,
  onGroupNameChange,
  friends,
  selectedParticipants,
  onToggleParticipant,
  creatingGroup,
  onCreateGroup,
  onClose
}: CreateGroupModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Create New Group</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={creatingGroup}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Members ({selectedParticipants.size} selected)
            </label>
            <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Loading friends list...
                </div>
              ) : (
                <div className="p-2">
                  {friends.map((friend) => {
                    const isSelected = selectedParticipants.has(friend.id)
                    return (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => onToggleParticipant(friend.id)}
                        disabled={creatingGroup}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                          isSelected
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50'
                        } ${creatingGroup ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <Avatar
                          src={friend.avatar}
                          alt={friend.name}
                          fallback={getAvatarFallback(friend.name)}
                          className="w-10 h-10"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{friend.name}</p>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={creatingGroup}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onCreateGroup}
            disabled={!groupName.trim() || selectedParticipants.size === 0 || creatingGroup}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creatingGroup ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Group</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}




