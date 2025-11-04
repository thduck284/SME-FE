"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { ReactionType, reactionIcons } from '@/lib/constants/reactions'
import { ChatService, MessageReactionCounts, MessageReactionUser } from '@/lib/api/chat/ChatService'
import { Avatar } from '@/components/ui'
import { UserService } from '@/lib/api/users/UserService'
import type { UserMetadata } from '@/lib/types/User'
import { getUserId } from '@/lib/utils/Jwt'

interface ChatReactionDetailsModalProps {
  open: boolean
  onClose: () => void
  conversationId: string
  messageId: string
  initialCounts?: MessageReactionCounts
}

interface EnrichedUser extends MessageReactionUser {
  metadata?: UserMetadata
}

export function ChatReactionDetailsModal({ open, onClose, conversationId, messageId, initialCounts }: ChatReactionDetailsModalProps) {
  const navigate = useNavigate()
  const currentUserId = getUserId()
  const [counts, setCounts] = useState<MessageReactionCounts>(initialCounts || {})
  const [active, setActive] = useState<ReactionType | 'ALL'>('ALL')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<EnrichedUser[]>([])
  const [userMetadataMap, setUserMetadataMap] = useState<Map<string, UserMetadata>>(new Map())

  const handleUserClick = useCallback((userId: string) => {
    navigate(`/profile/${userId}`)
    onClose()
  }, [navigate, onClose])

  useEffect(() => {
    if (!open) return
    // Refresh counts on open
    ChatService.getMessageReactionCounts(conversationId, messageId).then(setCounts)
  }, [open, conversationId, messageId])

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      try {
        const list = await ChatService.getMessageReactions(
          conversationId,
          messageId,
          active === 'ALL' ? undefined : active.toLowerCase()
        )
        
        // Fetch user metadata for all users
        const userIds = [...new Set(list.map(u => u.userId).filter(id => id && id.trim() !== ''))]
        let metadataMap = new Map<string, UserMetadata>()
        
        if (userIds.length > 0) {
          try {
            const metadataList = await UserService.getMultipleUsersMetadata(userIds)
            metadataList.forEach(user => {
              metadataMap.set(user.userId, user)
            })
            setUserMetadataMap(prev => {
              const merged = new Map(prev)
              metadataMap.forEach((v, k) => merged.set(k, v))
              return merged
            })
          } catch (e) {
            console.warn('Failed to fetch user metadata', e)
          }
        }
        
        // Merge metadata into users list
        setUsers(list.map(u => ({
          ...u,
          metadata: metadataMap.get(u.userId) || userMetadataMap.get(u.userId)
        })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open, conversationId, messageId, active])

  const tabs = useMemo(() => {
    const entries = Object.entries(counts || {})
      .filter(([, c]) => (c as number) > 0)
      .map(([type, c]) => ({ type: type as ReactionType, count: c as number }))
    const total = entries.reduce((s, e) => s + e.count, 0)
    return { entries, total }
  }, [counts])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[10050] bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Reactions</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              className={`px-2 py-1 rounded-full border text-sm ${active === 'ALL' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
              onClick={() => setActive('ALL')}
            >
              All <span className="ml-1 text-xs">{tabs.total}</span>
            </button>
            {tabs.entries.map(({ type, count }) => (
              <button
                key={type}
                className={`px-2 py-1 rounded-full border text-sm flex items-center gap-1 ${active === type ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300'}`}
                onClick={() => setActive(type)}
                title={reactionIcons[type]?.label}
              >
                <span>{reactionIcons[type]?.icon}</span>
                <span className="text-xs">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="p-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">No reactions</div>
          ) : (
            <ul className="space-y-2">
              {users.map((u) => {
                const isCurrentUser = currentUserId && u.userId === currentUserId
                const metadata = u.metadata
                const fullName = isCurrentUser 
                  ? 'You'
                  : (metadata 
                    ? `${metadata.firstName} ${metadata.lastName}`.trim() 
                    : (u.name || u.userId))
                const avatarUrl = metadata?.avtUrl || u.avatar
                const fallback = metadata
                  ? `${metadata.firstName?.[0] || ''}${metadata.lastName?.[0] || ''}`.toUpperCase() || '?'
                  : (u.name || '?').slice(0, 2).toUpperCase()
                
                return (
                  <li 
                    key={`${u.userId}-${u.reaction}`} 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => !isCurrentUser && handleUserClick(u.userId)}
                  >
                    <Avatar 
                      src={avatarUrl || undefined} 
                      alt={fullName} 
                      fallback={fallback} 
                      className="w-8 h-8"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{fullName}</div>
                    </div>
                    <div className="text-lg">{reactionIcons[(u.reaction || '').toUpperCase() as ReactionType]?.icon}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}