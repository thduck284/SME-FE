"use client"

import { Avatar } from '@/components/ui'
import { UserMetadata } from '@/lib/types/User'

interface GroupAvatarProps {
  participants: Array<{ userId: string; metadata?: UserMetadata | null }>
  currentUserId?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const getAvatarFallback = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

const containerSizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-12 h-12',
  lg: 'w-20 h-20'
}

export function GroupAvatar({ participants, currentUserId, size = 'md', className = '' }: GroupAvatarProps) {
  // Get first 3-4 participants from the list (participants are already sorted: admins first, then members by name)
  // Priority: other users first, but if we need more to reach 3-4, include current user
  const otherParticipants = participants.filter(p => p.userId !== currentUserId)
  const currentUserParticipant = participants.find(p => p.userId === currentUserId)
  
  // Take first 3-4 participants, prioritizing others over current user
  let selectedParticipants: Array<{ userId: string; metadata?: UserMetadata | null }> = []
  
  if (otherParticipants.length >= 4) {
    // We have enough other participants, take first 4
    selectedParticipants = otherParticipants.slice(0, 4)
  } else if (otherParticipants.length === 3) {
    // We have 3 others, that's perfect
    selectedParticipants = otherParticipants.slice(0, 3)
  } else if (otherParticipants.length === 2) {
    // We have 2 others, add current user if available to make it 3
    selectedParticipants = [...otherParticipants]
    if (currentUserParticipant && selectedParticipants.length < 3) {
      selectedParticipants.push(currentUserParticipant)
    }
  } else if (otherParticipants.length === 1) {
    // We have 1 other, add current user if available to make it 2
    selectedParticipants = [...otherParticipants]
    if (currentUserParticipant) {
      selectedParticipants.push(currentUserParticipant)
    }
  } else {
    // No other participants, use current user if available
    if (currentUserParticipant) {
      selectedParticipants = [currentUserParticipant]
    }
  }
  
  // Limit to 4 participants max
  const displayParticipants = selectedParticipants.slice(0, 4)

  // Fallback if no participants
  if (displayParticipants.length === 0) {
    return (
      <div className={`${containerSizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
        <span className={`${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-lg'} font-semibold text-gray-600`}>G</span>
      </div>
    )
  }

  const containerSize = containerSizeClasses[size]

  // Get avatar URLs
  const getAvatarUrl = (participant: { userId: string; metadata?: UserMetadata | null }): string => {
    return participant.metadata?.avtUrl || "/assets/images/default.png"
  }

  const getAvatarName = (participant: { userId: string; metadata?: UserMetadata | null }): string => {
    if (participant.metadata) {
      const name = `${participant.metadata.firstName || ''} ${participant.metadata.lastName || ''}`.trim()
      return name || 'User'
    }
    return 'User'
  }

  if (displayParticipants.length === 1) {
    // Single avatar
    return (
      <div className={`${containerSize} rounded-full overflow-hidden ${className}`}>
        <Avatar
          src={getAvatarUrl(displayParticipants[0])}
          alt={getAvatarName(displayParticipants[0])}
          fallback={getAvatarFallback(getAvatarName(displayParticipants[0]))}
          className={`${containerSize} rounded-full`}
        />
      </div>
    )
  }

  if (displayParticipants.length === 2) {
    // 2 avatars - split vertically (50/50) with overlap
    const avatarSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
    return (
      <div className={`${containerSize} rounded-full overflow-hidden flex flex-col ${className}`}>
        <div className="flex-1 overflow-hidden">
          <Avatar
            src={getAvatarUrl(displayParticipants[0])}
            alt={getAvatarName(displayParticipants[0])}
            fallback={getAvatarFallback(getAvatarName(displayParticipants[0]))}
            className={`${avatarSize} w-full h-full rounded-t-full border-b-4 border-white`}
          />
        </div>
        <div className="flex-1 overflow-hidden">
          <Avatar
            src={getAvatarUrl(displayParticipants[1])}
            alt={getAvatarName(displayParticipants[1])}
            fallback={getAvatarFallback(getAvatarName(displayParticipants[1]))}
            className={`${avatarSize} w-full h-full rounded-b-full border-4 border-white`}
          />
        </div>
      </div>
    )
  }

  if (displayParticipants.length === 3) {
    // 3 avatars - 2 on top (50% each), 1 on bottom (centered, 50% width) with overlap
    const topAvatarSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
    const bottomAvatarSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
    return (
      <div className={`${containerSize} rounded-full overflow-hidden flex flex-col ${className}`}>
        <div className="flex flex-1">
          <div className="flex-1 overflow-hidden">
            <Avatar
              src={getAvatarUrl(displayParticipants[0])}
              alt={getAvatarName(displayParticipants[0])}
              fallback={getAvatarFallback(getAvatarName(displayParticipants[0]))}
              className={`${topAvatarSize} w-full h-full rounded-tl-full border-r-4 border-b-4 border-white`}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <Avatar
              src={getAvatarUrl(displayParticipants[1])}
              alt={getAvatarName(displayParticipants[1])}
              fallback={getAvatarFallback(getAvatarName(displayParticipants[1]))}
              className={`${topAvatarSize} w-full h-full rounded-tr-full border-b-4 border-white`}
            />
          </div>
        </div>
        <div className="flex-1 overflow-hidden flex justify-center">
          <div className="w-1/2 h-full overflow-hidden">
            <Avatar
              src={getAvatarUrl(displayParticipants[2])}
              alt={getAvatarName(displayParticipants[2])}
              fallback={getAvatarFallback(getAvatarName(displayParticipants[2]))}
              className={`${bottomAvatarSize} w-full h-full rounded-b-full border-4 border-white`}
            />
          </div>
        </div>
      </div>
    )
  }

  // 4 avatars - 2x2 grid (25% each) with thicker borders
  const gridAvatarSize = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return (
    <div className={`${containerSize} rounded-full overflow-hidden grid grid-cols-2 ${className}`}>
      <div className="overflow-hidden">
        <Avatar
          src={getAvatarUrl(displayParticipants[0])}
          alt={getAvatarName(displayParticipants[0])}
          fallback={getAvatarFallback(getAvatarName(displayParticipants[0]))}
          className={`${gridAvatarSize} w-full h-full rounded-tl-full border-r-4 border-b-4 border-white`}
        />
      </div>
      <div className="overflow-hidden">
        <Avatar
          src={getAvatarUrl(displayParticipants[1])}
          alt={getAvatarName(displayParticipants[1])}
          fallback={getAvatarFallback(getAvatarName(displayParticipants[1]))}
          className={`${gridAvatarSize} w-full h-full rounded-tr-full border-b-4 border-white`}
        />
      </div>
      <div className="overflow-hidden">
        <Avatar
          src={getAvatarUrl(displayParticipants[2])}
          alt={getAvatarName(displayParticipants[2])}
          fallback={getAvatarFallback(getAvatarName(displayParticipants[2]))}
          className={`${gridAvatarSize} w-full h-full rounded-bl-full border-r-4 border-white`}
        />
      </div>
      <div className="overflow-hidden">
        <Avatar
          src={getAvatarUrl(displayParticipants[3])}
          alt={getAvatarName(displayParticipants[3])}
          fallback={getAvatarFallback(getAvatarName(displayParticipants[3]))}
          className={`${gridAvatarSize} w-full h-full rounded-br-full border-4 border-white`}
        />
      </div>
    </div>
  )
}
