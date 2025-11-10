"use client"

import { ArrowLeft, Search, User, Users, Plus, ChevronDown, ChevronUp, FileText, Link as LinkIcon, Image, Video, MoreVertical, Crown, UserMinus, MessageSquare } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { GroupAvatar } from './GroupAvatar'
import { Link } from 'react-router-dom'
import { Message } from '@/lib/api/chat/ChatService'
import { formatTimeAgo } from '@/lib/utils/PostUtils'
import { UserMetadata } from '@/lib/types/User'
import { getUserId } from '@/lib/utils/Jwt'
import { useState, useRef, useEffect } from 'react'

interface Conversation {
  conversationId: string
  conversationType?: string
  type?: string
  title?: string
  recipientId?: string
  recipientName?: string
  recipientAvatar?: string
}

interface MediaFile {
  url: string
  messageId: string
  senderId: string
  createdAt: Date
  isVideo: boolean
}

interface FileItem {
  url: string
  messageId: string
  senderId: string
  createdAt: Date
}

interface ChatRightSidebarProps {
  selectedConversation: Conversation | null
  isSearchMode: boolean
  onEnterSearchMode: () => void
  onExitSearchMode: () => void
  chatSearchQuery: string
  onChatSearchChange: (query: string) => void
  searchResults: Message[]
  showMediaSearch: boolean
  onMessageClick: (messageId: string) => void
  expandedSections: { members: boolean; media: boolean; files: boolean }
  onToggleSection: (section: 'members' | 'media' | 'files') => void
  expandedFileSubSections: { media: boolean; files: boolean; links: boolean }
  onToggleFileSubSection: (subSection: 'media' | 'files' | 'links') => void
  participantsData: Array<{ userId: string; metadata: UserMetadata | null; role?: string }>
  loadingParticipants: boolean
  mediaFilesList: MediaFile[]
  filesList: FileItem[]
  linksList: FileItem[]
  onAddMember: () => void
  onRemoveParticipant?: (userId: string) => void
  onAssignAdmin?: (userId: string) => void
  onMessageParticipant?: (userId: string, userName: string, userAvatar?: string) => void
  currentUserRole?: string
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function ChatRightSidebar({
  selectedConversation,
  isSearchMode,
  onEnterSearchMode,
  onExitSearchMode,
  chatSearchQuery,
  onChatSearchChange,
  searchResults,
  showMediaSearch,
  onMessageClick,
  expandedSections,
  onToggleSection,
  expandedFileSubSections,
  onToggleFileSubSection,
  participantsData,
  loadingParticipants,
  mediaFilesList,
  filesList,
  linksList,
  onAddMember,
  onRemoveParticipant,
  onAssignAdmin,
  onMessageParticipant,
  currentUserRole
}: ChatRightSidebarProps) {
  const userId = getUserId()
  const isGroup = selectedConversation && ((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'group')
  const isDirect = selectedConversation && ((selectedConversation.conversationType || selectedConversation.type)?.toLowerCase() === 'direct')
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  const isAdmin = currentUserRole === 'ADMIN' || currentUserRole === 'SUPER_ADMIN'
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuFor(null)
      }
    }
    
    if (openMenuFor) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuFor])

  if (!selectedConversation) {
    return (
      <div className="w-80 border-l border-gray-200 flex flex-col">
        <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
          <p className="text-center">Select a friend to view their profile</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-80 border-l border-gray-200 flex flex-col">
      {isSearchMode ? (
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={onExitSearchMode}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h3 className="font-semibold text-lg">Search Messages</h3>
            </div>

            <div className="px-4 pb-4">
              <input
                type="text"
                placeholder="Enter message to search..."
                value={chatSearchQuery}
                onChange={(e) => onChatSearchChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>

          {searchResults.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="font-semibold mb-3 text-sm text-gray-600">
                {searchResults.length} search results
              </h4>
              <div className="space-y-2">
                {searchResults.map((msg) => (
                  <div
                    key={msg.messageId}
                    onClick={() => onMessageClick(msg.messageId)}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    {msg.content && (
                      <p className="text-sm text-gray-800 mb-2 line-clamp-3">{msg.content}</p>
                    )}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        {msg.attachments.slice(0, 3).map((att, idx) => (
                          <div key={idx} className="w-16 h-16 rounded overflow-hidden">
                            {att.includes('video') || att.match(/\.(mp4|webm|ogg|mov)/i) ? (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Video className="w-4 h-4 text-gray-400" />
                              </div>
                            ) : (
                              <img src={att} alt="attachment" className="w-full h-full object-cover" />
                            )}
                          </div>
                        ))}
                        {msg.attachments.length > 3 && (
                          <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center">
                            <span className="text-xs text-gray-500">+{msg.attachments.length - 3}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">{formatTimeAgo(msg.createdAt.toString())}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : showMediaSearch && chatSearchQuery.trim() ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p className="text-sm">No results found</p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col items-center mb-4">
              {isGroup ? (
                <GroupAvatar
                  participants={participantsData}
                  currentUserId={userId}
                  size="lg"
                  className="mb-4"
                />
              ) : (
                <Avatar
                  src={selectedConversation.recipientAvatar}
                  alt={selectedConversation.recipientName || selectedConversation.title || 'Chat'}
                  fallback={getAvatarFallback(selectedConversation.recipientName || selectedConversation.title || 'C')}
                  className="w-20 h-20 mb-4"
                />
              )}
              <h3 className="text-lg font-semibold mb-1">
                {selectedConversation.recipientName || selectedConversation.title || 'Chat'}
              </h3>
            </div>
            
            {isDirect ? (
              <div className="flex items-center justify-center gap-6 pb-6 border-b border-gray-200">
                {selectedConversation.recipientId ? (
                  <Link
                    to={`/profile/${selectedConversation.recipientId}`}
                    className="flex flex-col items-center gap-1.5 hover:bg-gray-50 rounded-lg p-2 transition-colors flex-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Profile</span>
                  </Link>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-400">Profile</span>
                  </div>
                )}
                
                <div 
                  className="flex flex-col items-center gap-1.5 hover:bg-gray-50 rounded-lg p-2 transition-colors flex-1 cursor-pointer" 
                  onClick={onEnterSearchMode}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Search className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Search</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center pb-6 border-b border-gray-200">
                <div 
                  className="flex flex-col items-center gap-1.5 hover:bg-gray-50 rounded-lg p-2 transition-colors cursor-pointer" 
                  onClick={onEnterSearchMode}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Search className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">Search</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {isGroup && (
                <div className="border-b border-gray-200 pb-4">
                  <button
                    onClick={() => onToggleSection('members')}
                    className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-600" />
                      <span className="font-semibold text-sm">Chat Members</span>
                    </div>
                    {expandedSections.members ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  {expandedSections.members && (
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {loadingParticipants ? (
                        <div className="text-center text-sm text-gray-500 py-4">Loading...</div>
                      ) : participantsData.length === 0 ? (
                        <div className="text-center text-sm text-gray-500 py-4">No members</div>
                      ) : (
                        <>
                          {participantsData.map(({ userId: participantId, metadata, role }) => {
                            const participantRole = role || selectedConversation?.participants?.find(p => p.userId === participantId)?.role
                            const isParticipantAdmin = participantRole === 'ADMIN' || participantRole === 'SUPER_ADMIN'
                            const isCurrentUser = participantId === userId
                            const canManage = isAdmin && !isCurrentUser
                            
                            return (
                              <div key={participantId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group relative">
                                <Link 
                                  to={`/profile/${participantId}`}
                                  className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                                >
                                  <Avatar
                                    src={metadata?.avtUrl || "/assets/images/default.png"}
                                    alt={metadata ? `${metadata.firstName} ${metadata.lastName}` : 'User'}
                                    fallback={getAvatarFallback(metadata ? `${metadata.firstName} ${metadata.lastName}` : 'U')}
                                    className="w-10 h-10 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium truncate cursor-pointer">
                                        {metadata ? `${metadata.firstName} ${metadata.lastName}`.trim() || 'User' : 'User'}
                                      </p>
                                      {isParticipantAdmin && (
                                        <Crown className="w-4 h-4 text-yellow-500" title="Admin" />
                                      )}
                                    </div>
                                    {isCurrentUser ? (
                                      <p className="text-xs text-gray-500">You</p>
                                    ) : participantRole && (
                                      <p className="text-xs text-gray-500 capitalize">{participantRole.toLowerCase()}</p>
                                    )}
                                  </div>
                                </Link>
                                {/* Menu button - Show for all participants except current user */}
                                {!isCurrentUser && (
                                  <div className="relative flex-shrink-0" ref={menuRef}>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setOpenMenuFor(openMenuFor === participantId ? null : participantId)
                                      }}
                                      onMouseDown={(e) => {
                                        // Prevent Link navigation when clicking menu button
                                        e.preventDefault()
                                      }}
                                      className="p-1 hover:bg-gray-200 rounded transition-colors opacity-0 group-hover:opacity-100 z-20"
                                      type="button"
                                    >
                                      <MoreVertical className="w-4 h-4 text-gray-600" />
                                    </button>
                                    {openMenuFor === participantId && (
                                      <div 
                                        className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[150px]"
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        {/* Message Participant - Show for all participants */}
                                        {onMessageParticipant && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              const participantName = metadata ? `${metadata.firstName} ${metadata.lastName}`.trim() : 'User'
                                              const participantAvatar = metadata?.avtUrl || "/assets/images/default.png"
                                              onMessageParticipant(participantId, participantName, participantAvatar)
                                              setOpenMenuFor(null)
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-b border-gray-100"
                                            type="button"
                                          >
                                            <MessageSquare className="w-4 h-4 text-blue-500" />
                                            Message
                                          </button>
                                        )}
                                        {/* Make Admin - Show only for admins managing members */}
                                        {canManage && !isParticipantAdmin && onAssignAdmin && (
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              onAssignAdmin(participantId)
                                              setOpenMenuFor(null)
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                            type="button"
                                          >
                                            <Crown className="w-4 h-4 text-yellow-500" />
                                            Make Admin
                                          </button>
                                        )}
                                        {/* Remove - Show only for admins managing members */}
                                        {canManage && onRemoveParticipant && !isParticipantAdmin && (
                                          <button
                                            onClick={async (e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              try {
                                                await onRemoveParticipant(participantId)
                                              } catch (error) {
                                                console.error('Error removing participant:', error)
                                              }
                                              setOpenMenuFor(null)
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                            type="button"
                                          >
                                            <UserMinus className="w-4 h-4" />
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          <button
                            onClick={onAddMember}
                            className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 transition-colors mt-2"
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <Plus className="w-5 h-5 text-gray-600" />
                            </div>
                            <span className="text-sm font-medium text-gray-700">Add People</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="border-b border-gray-200 pb-4">
                <button
                  onClick={() => onToggleSection('files')}
                  className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-sm">Files and Media</span>
                  </div>
                  {expandedSections.files ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {expandedSections.files && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <button
                        onClick={() => onToggleFileSubSection('media')}
                        className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-sm">Media Files</span>
                        </div>
                        {expandedFileSubSections.media ? (
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                      {expandedFileSubSections.media && (
                        <div className="mt-2 grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {mediaFilesList.length === 0 ? (
                            <div className="col-span-3 text-center text-xs text-gray-500 py-4">No media files</div>
                          ) : (
                            mediaFilesList.map((media, idx) => (
                              <div key={`${media.messageId}-${idx}`} className="relative aspect-square group">
                                {media.isVideo ? (
                                  <div className="w-full h-full rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative bg-gray-200">
                                    <video
                                      src={media.url}
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                      muted
                                      loop
                                      onMouseEnter={(e) => {
                                        const video = e.currentTarget
                                        video.play().catch(() => {})
                                      }}
                                      onMouseLeave={(e) => {
                                        const video = e.currentTarget
                                        video.pause()
                                        video.currentTime = 0
                                      }}
                                      onClick={() => window.open(media.url, '_blank')}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="bg-black bg-opacity-50 rounded-full p-2">
                                        <Video className="w-6 h-6 text-white" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={media.url}
                                    alt="media"
                                    className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => window.open(media.url, '_blank')}
                                  />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        onClick={() => onToggleFileSubSection('files')}
                        className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-sm">File</span>
                        </div>
                        {expandedFileSubSections.files ? (
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                      {expandedFileSubSections.files && (
                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                          {filesList.length === 0 ? (
                            <div className="text-center text-xs text-gray-500 py-4">No files</div>
                          ) : (
                            filesList.map((file, idx) => (
                              <a
                                key={`file-${idx}`}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{file.url}</p>
                                  <p className="text-[10px] text-gray-500">{formatTimeAgo(file.createdAt.toString())}</p>
                                </div>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <button
                        onClick={() => onToggleFileSubSection('links')}
                        className="w-full flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 text-gray-600" />
                          <span className="font-medium text-sm">Links</span>
                        </div>
                        {expandedFileSubSections.links ? (
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                      </button>
                      {expandedFileSubSections.links && (
                        <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                          {linksList.length === 0 ? (
                            <div className="text-center text-xs text-gray-500 py-4">No links</div>
                          ) : (
                            linksList.map((link, idx) => (
                              <a
                                key={`link-${idx}`}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg border border-gray-200"
                              >
                                <LinkIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{link.url}</p>
                                  <p className="text-[10px] text-gray-500">{formatTimeAgo(link.createdAt.toString())}</p>
                                </div>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

